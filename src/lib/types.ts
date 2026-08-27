export type BookStatus = "want_to_read" | "reading" | "read"

export type AchievementKind =
  | "daily_pages"
  | "monthly_books"
  | "yearly_books"

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
  pdf_path: string | null
  pdf_file_name: string | null
  pdf_file_size: number | null
  pdf_uploaded_at: string | null
  pdf_page_count: number | null
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

export interface Note {
  id: string
  book_id: string
  page_number: number
  content: string
  created_at: string
  updated_at: string
}

export interface ReadingGoals {
  user_id: string
  pages_per_day: number | null
  books_per_month: number | null
  books_per_year: number | null
  created_at: string
  updated_at: string
}

export interface Achievement {
  id: string
  user_id: string
  kind: AchievementKind
  period_key: string
  target_value: number
  actual_value: number
  unlocked_at: string
}

export interface DailyPagesStat {
  date: string
  pages: number
}

export interface ReadingStats {
  todayPages: number
  monthBooks: number
  yearBooks: number
  monthPages: number
  readingDays: number
  averagePages: number
  dailyPages: DailyPagesStat[]
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

export function effectiveTotalPages(
  book: Pick<Book, "total_pages"> & Partial<Pick<Book, "pdf_page_count">>
) {
  return book.pdf_page_count ?? book.total_pages
}

export function progressPercent(
  book: Pick<Book, "current_page" | "total_pages"> &
    Partial<Pick<Book, "pdf_page_count">>
) {
  const totalPages = effectiveTotalPages(book)
  if (!totalPages || totalPages <= 0) return null
  return Math.min(100, Math.max(0, Math.round((book.current_page / totalPages) * 100)))
}

export function localDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function monthKey(date: string) {
  return date.slice(0, 7)
}

export function achievementLabel(kind: AchievementKind) {
  if (kind === "daily_pages") return "Meta diária de páginas"
  if (kind === "monthly_books") return "Meta mensal de livros"
  return "Meta anual de livros"
}
