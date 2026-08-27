import { createClient } from "@/lib/supabase/server"
import type { Book, BookStatus, ProgressEntry } from "@/lib/types"

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
} | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) return null

  const { data: log } = await supabase
    .from("progress_log")
    .select("*")
    .eq("book_id", id)
    .order("read_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30)

  return { book: data as Book, log: (log ?? []) as ProgressEntry[] }
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
