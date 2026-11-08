"use client"

import { createClient } from "@/lib/supabase/client"
import {
  EPUB_LOCATION_CHARS,
  readingContentType,
  readingFormat,
  readingStoragePath,
  readingUploadErrorMessage,
  READING_FILE_MAX_BYTES,
  type ReadingFormat,
} from "@/lib/reading-file"
import type { Book as EpubBook } from "epubjs"

export type ReadingFileInfo = {
  format: ReadingFormat
  title: string | null
  authors: string | null
  pageCount: number
  coverBlob: Blob | null
}

function cleanMeta(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.replace(/\0/g, "").trim()
  return trimmed || null
}

function assertReadingFile(file: File) {
  const format = readingFormat(file.name)
  if (!format) throw new Error("Selecione um arquivo PDF ou EPUB.")
  if (file.size <= 0 || file.size > READING_FILE_MAX_BYTES) {
    throw new Error("O arquivo precisa ter entre 1 byte e 50 MB.")
  }
  return format
}

async function epubFactory() {
  const mod = await import("epubjs")
  if (typeof mod.default !== "function") {
    throw new Error("Não foi possível carregar o leitor de EPUB.")
  }
  return mod.default
}

export async function openEpubBook(data: ArrayBuffer) {
  const ePub = await epubFactory()
  const book = ePub()
  await book.open(data)
  return book
}

export async function countEpubLocations(book: EpubBook) {
  const locations = book.locations as EpubBook["locations"] & { pause: number }
  locations.pause = 0
  const generated = await locations.generate(EPUB_LOCATION_CHARS)
  if (!generated.length) {
    throw new Error("Não foi possível contar as páginas deste EPUB.")
  }
  return generated.length
}

export function epubPageFromCfi(book: EpubBook, cfi: string) {
  const index = book.locations.locationFromCfi(cfi) as unknown as number
  return typeof index === "number" && Number.isFinite(index) && index >= 0
    ? index + 1
    : null
}

export function epubCfiFromPage(book: EpubBook, page: number) {
  const cfi = book.locations.cfiFromLocation(page - 1) as unknown as string | number
  return typeof cfi === "string" && cfi.startsWith("epubcfi(") ? cfi : null
}

async function inspectPdf(file: File): Promise<ReadingFileInfo> {
  const { pdfjsLib } = await import("@/lib/pdfjs")
  const task = pdfjsLib.getDocument({ data: await file.arrayBuffer() })
  const document = await task.promise
  let title: string | null = null
  let authors: string | null = null
  try {
    const meta = await document.getMetadata()
    const info = meta.info as { Title?: unknown; Author?: unknown }
    title = cleanMeta(info?.Title)
    authors = cleanMeta(info?.Author)
  } catch {
    title = null
    authors = null
  }
  const pageCount = document.numPages
  document.cleanup()
  if (pageCount <= 0) {
    throw new Error("Não foi possível contar as páginas deste PDF.")
  }
  return { format: "pdf", title, authors, pageCount, coverBlob: null }
}

async function coverBlobFromBook(book: EpubBook) {
  try {
    const coverUrl = await book.coverUrl()
    if (!coverUrl) return null
    const response = await fetch(coverUrl)
    if (!response.ok) return null
    const blob = await response.blob()
    if (!blob.size || !blob.type.startsWith("image/")) return null
    return blob
  } catch {
    return null
  }
}

async function inspectEpub(file: File): Promise<ReadingFileInfo> {
  const book = await openEpubBook(await file.arrayBuffer())
  try {
    const metadata = await book.loaded.metadata
    const pageCount = await countEpubLocations(book)
    const coverBlob = await coverBlobFromBook(book)
    return {
      format: "epub",
      title: cleanMeta(metadata.title),
      authors: cleanMeta(metadata.creator),
      pageCount,
      coverBlob,
    }
  } finally {
    book.destroy()
  }
}

export async function inspectReadingFile(file: File): Promise<ReadingFileInfo> {
  const format = assertReadingFile(file)
  return format === "pdf" ? inspectPdf(file) : inspectEpub(file)
}

export async function uploadCoverBlob(blob: Blob) {
  if (!blob.size || !blob.type.startsWith("image/")) return null
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const ext = blob.type.includes("png")
    ? "png"
    : blob.type.includes("webp")
      ? "webp"
      : blob.type.includes("gif")
        ? "gif"
        : "jpg"
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from("covers").upload(path, blob, {
    contentType: blob.type,
  })
  if (error) return null
  return supabase.storage.from("covers").getPublicUrl(path).data.publicUrl
}

export async function uploadReadingFile(input: {
  bookId: string
  file: File
  pageCount: number
}): Promise<{ formData: FormData } | { error: string }> {
  let format: ReadingFormat
  try {
    format = assertReadingFile(input.file)
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Selecione um arquivo PDF ou EPUB.",
    }
  }
  if (input.pageCount <= 0) {
    return { error: "Não foi possível contar as páginas deste arquivo." }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Sua sessão expirou. Entre novamente." }

  const path = readingStoragePath(user.id, input.bookId, format)
  const { error } = await supabase.storage.from("book-pdfs").upload(path, input.file, {
    contentType: readingContentType(format),
    upsert: true,
  })
  if (error) {
    return {
      error: readingUploadErrorMessage(error, "Não foi possível enviar o arquivo."),
    }
  }

  const formData = new FormData()
  formData.set("book_id", input.bookId)
  formData.set("pdf_path", path)
  formData.set("pdf_file_name", input.file.name)
  formData.set("pdf_file_size", String(input.file.size))
  formData.set("pdf_page_count", String(input.pageCount))
  return { formData }
}
