export const READING_FILE_MAX_BYTES = 200 * 1024 * 1024
export const READING_FILE_MAX_LABEL = "200 MB"
export const READING_FILE_EMPTY_MESSAGE = "O arquivo está vazio."
export const READING_FILE_TOO_LARGE_MESSAGE =
  "O arquivo precisa ter no máximo 200 MB."
export const EPUB_LOCATION_CHARS = 1600
export const READING_FILE_ACCEPT =
  "application/pdf,.pdf,application/epub+zip,.epub"

export const EPUB_MIME_MIGRATION_MESSAGE =
  "O bucket book-pdfs ainda não aceita EPUB. No SQL Editor do Supabase, execute a migration supabase/migrations/0004_epub.sql para permitir application/pdf e application/epub+zip."

export const BUCKET_SIZE_MIGRATION_MESSAGE =
  "O Supabase recusou o arquivo por tamanho. Aumente o limite do bucket book-pdfs para 200 MB no SQL Editor do Supabase."

export type ReadingFormat = "pdf" | "epub"

export function readingFormat(fileName: string): ReadingFormat | null {
  const lower = fileName.toLowerCase().split("?")[0] ?? ""
  if (lower.endsWith(".pdf")) return "pdf"
  if (lower.endsWith(".epub")) return "epub"
  return null
}

export function readingFormatLabel(fileName: string | null) {
  return readingFormat(fileName ?? "") === "epub" ? "EPUB" : "PDF"
}

export function readingContentType(format: ReadingFormat) {
  return format === "pdf" ? "application/pdf" : "application/epub+zip"
}

export function readingStoragePath(
  userId: string,
  bookId: string,
  format: ReadingFormat
) {
  return `${userId}/${bookId}.${format}`
}

export function readingUploadErrorMessage(error: unknown, fallback: string) {
  const record =
    error && typeof error === "object"
      ? (error as { message?: unknown; error?: unknown; statusCode?: unknown })
      : undefined
  const text = [
    error instanceof Error ? error.message : undefined,
    record?.message,
    record?.error,
    record?.statusCode,
  ]
    .filter((value) => typeof value === "string" || typeof value === "number")
    .join(" ")
    .toLowerCase()

  if (text.includes("mime") || text.includes("415")) {
    return EPUB_MIME_MIGRATION_MESSAGE
  }

  if (
    text.includes("maximum allowed size") ||
    text.includes("payload too large") ||
    text.includes("entity too large") ||
    text.includes("file size limit") ||
    text.includes("file_size_limit") ||
    /\b413\b/.test(text)
  ) {
    return BUCKET_SIZE_MIGRATION_MESSAGE
  }

  if (error instanceof Error && error.message) return error.message
  return fallback
}
