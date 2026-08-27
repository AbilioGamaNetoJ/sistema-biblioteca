export type BookStatus = "want_to_read" | "reading" | "read"

export interface Book {
  id: string
  user_id: string
  google_books_id: string | null
  title: string
  authors: string | null
  cover_url: string | null
  total_pages: number | null
  current_page: number
  status: BookStatus
  rating: number | null
  started_at: string | null
  finished_at: string | null
  created_at: string
  updated_at: string
}

export interface ProgressEntry {
  id: string
  book_id: string
  read_on: string
  pages_read: number
  created_at: string
}

export const STATUS_VALUES: BookStatus[] = [
  "want_to_read",
  "reading",
  "read",
]

export const STATUS_LABELS: Record<BookStatus, string> = {
  want_to_read: "Quero ler",
  reading: "Lendo",
  read: "Lido",
}

export function progressPercent(book: Pick<Book, "current_page" | "total_pages">) {
  if (!book.total_pages || book.total_pages <= 0) return null
  return Math.min(100, Math.max(0, Math.round((book.current_page / book.total_pages) * 100)))
}
