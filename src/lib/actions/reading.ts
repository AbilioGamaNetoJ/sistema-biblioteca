"use server"

import { revalidatePath } from "next/cache"

import { syncAchievements } from "@/lib/achievements"
import { type ActionState } from "@/lib/actions/books"
import { readingFormat, readingStoragePath } from "@/lib/reading-file"
import { createClient } from "@/lib/supabase/server"
import { localDateString } from "@/lib/types"

export type { ActionState } from "@/lib/actions/books"
const MAX_PDF_SIZE = 50 * 1024 * 1024

function text(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === "string" ? value.trim() : ""
}

function positiveInt(formData: FormData, name: string) {
  const value = Number.parseInt(text(formData, name), 10)
  return Number.isFinite(value) && value > 0 ? value : null
}

function revalidateReading(bookId?: string) {
  revalidatePath("/")
  revalidatePath("/estante")
  revalidatePath("/estatisticas")
  revalidatePath("/perfil")
  if (bookId) {
    revalidatePath(`/livro/${bookId}`)
    revalidatePath(`/livro/${bookId}/ler`)
  }
}

async function currentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function saveReadingGoals(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const pagesPerDay = positiveInt(formData, "pages_per_day")
  const booksPerMonth = positiveInt(formData, "books_per_month")
  const booksPerYear = positiveInt(formData, "books_per_year")
  const { supabase, user } = await currentUser()
  if (!user) return { error: "Sua sessão expirou. Entre novamente." }

  if (!pagesPerDay && !booksPerMonth && !booksPerYear) {
    const { error } = await supabase
      .from("reading_goals")
      .delete()
      .eq("user_id", user.id)
    if (error) return { error: "Não foi possível remover as metas." }
    revalidateReading()
    return { success: "Metas atualizadas." }
  }

  const { data: goals, error } = await supabase
    .from("reading_goals")
    .upsert(
      {
        user_id: user.id,
        pages_per_day: pagesPerDay,
        books_per_month: booksPerMonth,
        books_per_year: booksPerYear,
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single()

  if (error || !goals) return { error: "Não foi possível salvar as metas." }

  const unlocked = await syncAchievements(
    supabase,
    user.id,
    localDateString(),
    goals
  )
  revalidateReading()
  return unlocked.length
    ? { success: "Metas atualizadas.", unlocked }
    : { success: "Metas atualizadas." }
}

export async function saveNote(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const bookId = text(formData, "book_id")
  const noteId = text(formData, "note_id")
  const pageNumber = positiveInt(formData, "page_number")
  const content = text(formData, "content")
  if (!bookId || !pageNumber || !content) {
    return { error: "Informe a página e o conteúdo da anotação." }
  }

  const { supabase, user } = await currentUser()
  if (!user) return { error: "Sua sessão expirou. Entre novamente." }

  const query = noteId
    ? supabase
        .from("notes")
        .update({ page_number: pageNumber, content })
        .eq("id", noteId)
        .eq("book_id", bookId)
    : supabase.from("notes").insert({
        book_id: bookId,
        page_number: pageNumber,
        content,
      })
  const { error } = await query
  if (error) return { error: "Não foi possível salvar a anotação." }

  revalidateReading(bookId)
  return undefined
}

export async function deleteNote(formData: FormData) {
  const noteId = text(formData, "note_id")
  const bookId = text(formData, "book_id")
  if (!noteId || !bookId) return

  const { supabase } = await currentUser()
  await supabase.from("notes").delete().eq("id", noteId).eq("book_id", bookId)
  revalidateReading(bookId)
}

export async function attachPdf(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const bookId = text(formData, "book_id")
  const path = text(formData, "pdf_path")
  const fileName = text(formData, "pdf_file_name")
  const fileSize = positiveInt(formData, "pdf_file_size")
  const pageCount = positiveInt(formData, "pdf_page_count")
  const format = readingFormat(path)
  if (!bookId || !path || !fileName || !fileSize || !pageCount || !format) {
    return { error: "Os dados do arquivo estão incompletos." }
  }
  if (readingFormat(fileName) !== format) {
    return { error: "O arquivo precisa ser PDF ou EPUB." }
  }
  if (fileSize > MAX_PDF_SIZE) {
    return { error: "O arquivo precisa ter no máximo 50 MB." }
  }

  const { supabase, user } = await currentUser()
  if (!user) return { error: "Sua sessão expirou. Entre novamente." }
  if (path !== readingStoragePath(user.id, bookId, format)) {
    return { error: "Caminho de arquivo inválido." }
  }

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("pdf_path, total_pages")
    .eq("id", bookId)
    .single()
  if (bookError || !book) return { error: "Livro não encontrado." }

  const updates: Record<string, unknown> = {
    pdf_path: path,
    pdf_file_name: fileName.slice(0, 255),
    pdf_file_size: fileSize,
    pdf_uploaded_at: new Date().toISOString(),
    pdf_page_count: pageCount,
  }
  if (book.total_pages === null) updates.total_pages = pageCount

  const { error } = await supabase.from("books").update(updates).eq("id", bookId)
  if (error) return { error: "Não foi possível associar o arquivo ao livro." }

  const stale = new Set<string>()
  if (book.pdf_path && book.pdf_path !== path) stale.add(book.pdf_path)
  const sibling = readingStoragePath(user.id, bookId, format === "pdf" ? "epub" : "pdf")
  if (sibling !== path) stale.add(sibling)
  if (stale.size) await supabase.storage.from("book-pdfs").remove([...stale])
  revalidateReading(bookId)
  return undefined
}

export async function removePdf(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const bookId = text(formData, "book_id")
  if (!bookId) return { error: "Livro inválido." }
  const { supabase, user } = await currentUser()
  if (!user) return { error: "Sua sessão expirou. Entre novamente." }

  const { data: book } = await supabase
    .from("books")
    .select("pdf_path")
    .eq("id", bookId)
    .single()
  if (!book) return { error: "Livro não encontrado." }

  if (book.pdf_path) {
    const { error } = await supabase.storage.from("book-pdfs").remove([book.pdf_path])
    if (error) return { error: "Não foi possível remover o arquivo de leitura." }
  }

  const { error } = await supabase
    .from("books")
    .update({
      pdf_path: null,
      pdf_file_name: null,
      pdf_file_size: null,
      pdf_uploaded_at: null,
      pdf_page_count: null,
    })
    .eq("id", bookId)
  if (error) return { error: "Não foi possível remover o arquivo de leitura." }

  revalidateReading(bookId)
  return undefined
}
