import { createClient } from "@/lib/supabase/server"
import type {
  Achievement,
  Book,
  BookStatus,
  Note,
  ProgressEntry,
  ReadingGoals,
  ReadingStats,
} from "@/lib/types"

export async function getBooks(status?: BookStatus): Promise<Book[]> {
  const supabase = await createClient()
  let query = supabase
    .from("books")
    .select("*")
    .order("updated_at", { ascending: false })

  if (status) query = query.eq("status", status)

  const { data, error } = await query
  if (error) throw error
  return data as Book[]
}

export async function getBook(id: string): Promise<Book | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) return null
  return data as Book
}

export async function getBookWithLog(id: string): Promise<{
  book: Book
  log: ProgressEntry[]
  notes: Note[]
} | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) return null

  const [{ data: log }, { data: notes }] = await Promise.all([
    supabase
      .from("progress_log")
      .select("*")
      .eq("book_id", id)
      .order("read_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("notes")
      .select("*")
      .eq("book_id", id)
      .order("page_number", { ascending: true })
      .order("created_at", { ascending: false }),
  ])

  return {
    book: data as Book,
    log: (log ?? []) as ProgressEntry[],
    notes: (notes ?? []) as Note[],
  }
}

export async function getStats(): Promise<Record<BookStatus, number>> {
  const books = await getBooks()
  return {
    want_to_read: books.filter((b) => b.status === "want_to_read").length,
    reading: books.filter((b) => b.status === "reading").length,
    read: books.filter((b) => b.status === "read").length,
  }
}

export async function getProfile(): Promise<{
  id: string
  username: string
  email: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", user!.id)
    .single()

  return {
    id: user!.id,
    username: data?.username ?? "",
    email: user!.email ?? "",
  }
}

export async function getReadingGoals(): Promise<ReadingGoals | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("reading_goals")
    .select("*")
    .maybeSingle()

  if (error) throw error
  return data as ReadingGoals | null
}

export async function getAchievements(limit = 50): Promise<Achievement[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("achievements")
    .select("*")
    .order("unlocked_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as Achievement[]
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export async function getReadingStats({
  startDate,
  endDate,
  today,
}: {
  startDate: string
  endDate: string
  today: string
}): Promise<ReadingStats> {
  if (!validDate(startDate) || !validDate(endDate) || !validDate(today)) {
    throw new Error("Invalid stats date range")
  }

  const supabase = await createClient()
  const [
    { data: logs, error: logsError },
    { data: todayLogs, error: todayError },
    { count: monthBooks, error: monthError },
    { count: yearBooks, error: yearError },
  ] =
    await Promise.all([
      supabase
        .from("progress_log")
        .select("read_on, pages_read")
        .gte("read_on", startDate)
        .lte("read_on", endDate),
      supabase.from("progress_log").select("pages_read").eq("read_on", today),
      supabase
        .from("books")
        .select("id", { count: "exact", head: true })
        .eq("status", "read")
        .gte("finished_at", startDate.slice(0, 7) + "-01")
        .lte("finished_at", endDate),
      supabase
        .from("books")
        .select("id", { count: "exact", head: true })
        .eq("status", "read")
        .gte("finished_at", `${startDate.slice(0, 4)}-01-01`)
        .lte("finished_at", `${endDate.slice(0, 4)}-12-31`),
    ])

  if (logsError) throw logsError
  if (todayError) throw todayError
  if (monthError) throw monthError
  if (yearError) throw yearError

  const daily = new Map<string, number>()
  for (const row of logs ?? []) {
    daily.set(row.read_on, (daily.get(row.read_on) ?? 0) + row.pages_read)
  }

  const dailyPages = [...daily.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, pages]) => ({ date, pages }))
  const monthPages = dailyPages.reduce((total, row) => total + row.pages, 0)
  const todayPages = (todayLogs ?? []).reduce((total, row) => total + row.pages_read, 0)

  return {
    todayPages,
    monthBooks: monthBooks ?? 0,
    yearBooks: yearBooks ?? 0,
    monthPages,
    readingDays: dailyPages.length,
    averagePages: dailyPages.length ? Math.round(monthPages / dailyPages.length) : 0,
    dailyPages,
  }
}

export async function getBookPdfUrl(id: string): Promise<{
  book: Book
  url: string | null
} | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) return null
  const book = data as Book
  if (!book.pdf_path) return { book, url: null }

  const { data: signed, error: signedError } = await supabase.storage
    .from("book-pdfs")
    .createSignedUrl(book.pdf_path, 60 * 60)

  if (signedError) return { book, url: null }
  return { book, url: signed.signedUrl }
}
