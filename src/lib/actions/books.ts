"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { STATUS_VALUES, type BookStatus } from "@/lib/types"

export type ActionState = { error?: string } | undefined

function str(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === "string" ? value.trim() : ""
}

function nullableInt(formData: FormData, name: string) {
  const raw = str(formData, name)
  if (!raw) return null
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function parseStatus(value: string): BookStatus {
  return STATUS_VALUES.includes(value as BookStatus)
    ? (value as BookStatus)
    : "want_to_read"
}

function revalidateBook(id: string | null) {
  revalidatePath("/")
  revalidatePath("/estante")
  if (id) revalidatePath(`/livro/${id}`)
}

export async function addBook(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const title = str(formData, "title")
  if (!title) return { error: "Informe o título do livro." }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const status = parseStatus(str(formData, "status"))

  const { data, error } = await supabase
    .from("books")
    .insert({
      user_id: user.id,
      title,
      authors: str(formData, "authors") || null,
      cover_url: str(formData, "cover_url") || null,
      total_pages: nullableInt(formData, "total_pages"),
      google_books_id: str(formData, "google_books_id") || null,
      status,
      started_at: status === "reading" ? new Date().toISOString() : null,
    })
    .select("id")
    .single()

  if (error || !data) return { error: "Não foi possível salvar o livro." }

  revalidateBook(data.id)
  redirect(`/livro/${data.id}`)
}

export async function updateBook(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = str(formData, "id")
  const title = str(formData, "title")
  if (!id) return { error: "Livro inválido." }
  if (!title) return { error: "Informe o título do livro." }

  const rating = nullableInt(formData, "rating")

  const supabase = await createClient()
  const { error } = await supabase
    .from("books")
    .update({
      title,
      authors: str(formData, "authors") || null,
      cover_url: str(formData, "cover_url") || null,
      total_pages: nullableInt(formData, "total_pages"),
      rating: rating && rating >= 1 && rating <= 5 ? rating : null,
    })
    .eq("id", id)

  if (error) return { error: "Não foi possível atualizar o livro." }

  revalidateBook(id)
  redirect(`/livro/${id}`)
}

export async function updateProgress(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = str(formData, "id")
  const page = nullableInt(formData, "current_page")
  if (!id || page === null) return { error: "Informe a página atual." }

  const supabase = await createClient()

  const { data: book } = await supabase
    .from("books")
    .select("current_page, total_pages")
    .eq("id", id)
    .single()

  if (!book) return { error: "Livro não encontrado." }

  const delta = page - book.current_page
  const updates: Record<string, unknown> = { current_page: page }

  const finished =
    book.total_pages !== null && page >= book.total_pages

  if (delta > 0) {
    await supabase.from("progress_log").insert({
      book_id: id,
      pages_read: delta,
    })
  }
  if (book.current_page === 0 && page > 0) {
    updates.started_at = new Date().toISOString()
  }
  if (finished) {
    updates.status = "read"
    updates.finished_at = new Date().toISOString()
  }

  const { error } = await supabase.from("books").update(updates).eq("id", id)
  if (error) return { error: "Não foi possível salvar o progresso." }

  revalidateBook(id)
  return undefined
}

export async function setStatus(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = str(formData, "id")
  const status = parseStatus(str(formData, "status"))
  if (!id) return { error: "Livro inválido." }

  const supabase = await createClient()

  const { data: book } = await supabase
    .from("books")
    .select("status, total_pages, started_at, finished_at")
    .eq("id", id)
    .single()

  if (!book) return { error: "Livro não encontrado." }

  const updates: Record<string, unknown> = { status }

  if (status === "reading" && !book.started_at) {
    updates.started_at = new Date().toISOString()
  }
  if (status === "read") {
    updates.finished_at = new Date().toISOString()
    if (book.total_pages) updates.current_page = book.total_pages
  }
  if (status !== "read") {
    updates.finished_at = null
  }

  const { error } = await supabase.from("books").update(updates).eq("id", id)
  if (error) return { error: "Não foi possível alterar o status." }

  revalidateBook(id)
  return undefined
}

export async function deleteBook(formData: FormData) {
  const id = str(formData, "id")
  if (!id) return

  const supabase = await createClient()
  await supabase.from("books").delete().eq("id", id)

  revalidateBook(id)
  redirect("/estante")
}

export async function updateProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const username = str(formData, "username")
  if (!username) return { error: "Informe um nome de usuário." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ username })
    .eq("id", (await supabase.auth.getUser()).data.user?.id)

  if (error) return { error: "Não foi possível salvar o perfil." }

  revalidatePath("/perfil")
  revalidatePath("/")
  return undefined
}
