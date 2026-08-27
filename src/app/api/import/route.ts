import { syncAchievements } from "@/lib/achievements"
import { createClient } from "@/lib/supabase/server"
import { STATUS_VALUES, type BookStatus } from "@/lib/types"

const MAX_IMPORT_SIZE = 10 * 1024 * 1024
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function uuid(value: unknown) {
  const text = stringValue(value)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null
}

function positive(value: unknown) {
  const number = typeof value === "number" ? value : Number(value)
  return Number.isInteger(number) && number > 0 ? number : null
}

function nonNegative(value: unknown) {
  const number = typeof value === "number" ? value : Number(value)
  return Number.isInteger(number) && number >= 0 ? number : null
}

function dateValue(value: unknown) {
  const text = stringValue(value)
  return DATE_RE.test(text) ? text : null
}

function normalizeBook(title: unknown, authors: unknown) {
  return `${stringValue(title).toLocaleLowerCase("pt-BR")}::${stringValue(authors).toLocaleLowerCase("pt-BR")}`
}

function bookStatus(value: unknown): BookStatus {
  return STATUS_VALUES.includes(value as BookStatus) ? (value as BookStatus) : "want_to_read"
}

export async function POST(request: Request) {
  const raw = await request.text()
  if (raw.length > MAX_IMPORT_SIZE) {
    return Response.json({ error: "O backup JSON precisa ter no máximo 10 MB." }, { status: 413 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return Response.json({ error: "O arquivo não contém um JSON válido." }, { status: 400 })
  }
  if (payload.schema_version !== 1 || !Array.isArray(payload.books)) {
    return Response.json({ error: "Formato de backup não reconhecido." }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 })

  const { data: existingBooks, error: existingError } = await supabase.from("books").select("*")
  if (existingError) return Response.json({ error: "Não foi possível ler os livros atuais." }, { status: 500 })

  const existingById = new Map((existingBooks ?? []).map((book) => [book.id, book]))
  const existingByGoogleId = new Map(
    (existingBooks ?? [])
      .filter((book) => book.google_books_id)
      .map((book) => [book.google_books_id, book])
  )
  const existingByKey = new Map((existingBooks ?? []).map((book) => [normalizeBook(book.title, book.authors), book]))
  const bookMap = new Map<string, string>()
  let createdBooks = 0
  let updatedBooks = 0
  let skippedBooks = 0
  let pendingPdfs = 0

  for (const rawBook of payload.books) {
    if (!rawBook || typeof rawBook !== "object") continue
    const source = rawBook as Record<string, unknown>
    const title = stringValue(source.title)
    if (!title) continue
    const sourceId = stringValue(source.id)
    const importedId = uuid(source.id)
    const googleBooksId = stringValue(source.google_books_id)
    const existing =
      (importedId ? existingById.get(importedId) : undefined) ??
      (googleBooksId ? existingByGoogleId.get(googleBooksId) : undefined) ??
      existingByKey.get(normalizeBook(title, source.authors))
    const importedCurrent = nonNegative(source.current_page) ?? 0
    const fields = {
      title,
      authors: stringValue(source.authors) || null,
      cover_url: stringValue(source.cover_url) || null,
      google_books_id: stringValue(source.google_books_id) || null,
      total_pages: positive(source.total_pages),
      current_page: existing ? Math.max(existing.current_page ?? 0, importedCurrent) : importedCurrent,
      status: bookStatus(source.status),
      rating: positive(source.rating) && Number(source.rating) <= 5 ? Number(source.rating) : null,
      started_at: dateValue(source.started_at),
      finished_at: dateValue(source.finished_at),
    }

    if (existing) {
      const { error } = await supabase.from("books").update(fields).eq("id", existing.id)
      if (error) {
        skippedBooks++
        continue
      }
      bookMap.set(sourceId, existing.id)
      existingByKey.set(normalizeBook(title, source.authors), existing)
      if (googleBooksId) existingByGoogleId.set(googleBooksId, existing)
      updatedBooks++
    } else {
      const insertData = importedId ? { ...fields, id: importedId, user_id: user.id } : { ...fields, user_id: user.id }
      const { data: created, error } = await supabase.from("books").insert(insertData).select("id").single()
      if (error || !created) {
        skippedBooks++
        continue
      }
      bookMap.set(sourceId, created.id)
      existingByKey.set(normalizeBook(title, source.authors), { ...fields, id: created.id })
      if (googleBooksId) existingByGoogleId.set(googleBooksId, { ...fields, id: created.id })
      createdBooks++
    }
    if (source.pdf_path) pendingPdfs++
  }

  const progressRows = Array.isArray(payload.progress_log) ? payload.progress_log : []
  let importedProgress = 0
  for (const rawEntry of progressRows) {
    if (!rawEntry || typeof rawEntry !== "object") continue
    const source = rawEntry as Record<string, unknown>
    const bookId = bookMap.get(stringValue(source.book_id))
    const readOn = dateValue(source.read_on)
    const pagesRead = positive(source.pages_read)
    if (!bookId || !readOn || !pagesRead) continue
    const id = uuid(source.id)
    const { error } = id
      ? await supabase.from("progress_log").upsert(
          { id, book_id: bookId, read_on: readOn, pages_read: pagesRead },
          { onConflict: "id", ignoreDuplicates: true }
        )
      : await supabase.from("progress_log").insert({
          book_id: bookId,
          read_on: readOn,
          pages_read: pagesRead,
        })
    if (!error) importedProgress++
  }

  const notes = Array.isArray(payload.notes) ? payload.notes : []
  let importedNotes = 0
  for (const rawNote of notes) {
    if (!rawNote || typeof rawNote !== "object") continue
    const source = rawNote as Record<string, unknown>
    const bookId = bookMap.get(stringValue(source.book_id))
    const pageNumber = positive(source.page_number)
    const content = stringValue(source.content)
    if (!bookId || !pageNumber || !content) continue
    const id = uuid(source.id)
    const { error } = id
      ? await supabase.from("notes").upsert(
          { id, book_id: bookId, page_number: pageNumber, content },
          { onConflict: "id", ignoreDuplicates: true }
        )
      : await supabase.from("notes").insert({
          book_id: bookId,
          page_number: pageNumber,
          content,
        })
    if (!error) importedNotes++
  }

  const goals = payload.reading_goals
  if (goals && typeof goals === "object") {
    const source = goals as Record<string, unknown>
    await supabase.from("reading_goals").upsert({
      user_id: user.id,
      pages_per_day: positive(source.pages_per_day),
      books_per_month: positive(source.books_per_month),
      books_per_year: positive(source.books_per_year),
    }, { onConflict: "user_id" })
  }

  const achievements = Array.isArray(payload.achievements) ? payload.achievements : []
  let importedAchievements = 0
  for (const rawAchievement of achievements) {
    if (!rawAchievement || typeof rawAchievement !== "object") continue
    const source = rawAchievement as Record<string, unknown>
    const kind = stringValue(source.kind)
    const periodKey = stringValue(source.period_key)
    const targetValue = positive(source.target_value)
    const actualValue = positive(source.actual_value)
    if (!['daily_pages', 'monthly_books', 'yearly_books'].includes(kind) || !periodKey || !targetValue || !actualValue || actualValue < targetValue) continue
    const { error } = await supabase.from("achievements").upsert({
      user_id: user.id,
      kind,
      period_key: periodKey,
      target_value: targetValue,
      actual_value: actualValue,
      unlocked_at: stringValue(source.unlocked_at) || new Date().toISOString(),
    }, { onConflict: "user_id,kind,period_key", ignoreDuplicates: true })
    if (!error) importedAchievements++
  }

  const achievementDates = new Set<string>([
    new Date().toISOString().slice(0, 10),
    ...progressRows.map((entry) =>
      entry && typeof entry === "object"
        ? dateValue((entry as Record<string, unknown>).read_on)
        : null
    ).filter((value): value is string => Boolean(value)),
    ...payload.books.map((book) =>
      book && typeof book === "object"
        ? dateValue((book as Record<string, unknown>).finished_at)
        : null
    ).filter((value): value is string => Boolean(value)),
  ])
  for (const date of achievementDates) {
    await syncAchievements(supabase, user.id, date)
  }

  return Response.json({
    message: "Backup mesclado com sucesso.",
    createdBooks,
    updatedBooks,
    skippedBooks,
    importedProgress,
    importedNotes,
    importedAchievements,
    pendingPdfs,
  })
}
