import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import arrowLeft from "@iconify-icons/ph/arrow-left"

import { AppIcon } from "@/components/app-icon"
import { EpubReader } from "@/components/epub-reader"
import { PdfReader } from "@/components/pdf-reader"
import { Button } from "@/components/ui/button"
import { readingFormat } from "@/lib/reading-file"
import { getBookPdfUrl, getBookWithLog } from "@/lib/queries"

export const metadata: Metadata = {
  title: "Leitor",
}

export default async function ReaderPage({
  params,
}: PageProps<"/livro/[id]/ler">) {
  const { id } = await params
  const [readerData, bookData] = await Promise.all([
    getBookPdfUrl(id),
    getBookWithLog(id),
  ])

  if (!readerData || !bookData) notFound()
  if (!readerData.url) {
    return (
      <div className="space-y-5">
        <Button variant="ghost" size="sm" render={<Link href={`/livro/${id}`} />}>
          <AppIcon icon={arrowLeft} data-icon="inline-start" />
          Voltar ao livro
        </Button>
        <div className="rounded-3xl border border-dashed border-border bg-card/80 px-5 py-14 text-center">
          <p className="font-semibold">Este livro ainda não tem um arquivo de leitura.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Volte aos detalhes do livro para anexar um PDF ou EPUB.
          </p>
        </div>
      </div>
    )
  }

  const { book } = readerData
  const format = readingFormat(book.pdf_path ?? "")
  const readerProps = {
    bookId: book.id,
    bookTitle: book.title,
    url: readerData.url,
    currentPage: book.current_page,
    totalPages: book.pdf_page_count ?? book.total_pages,
    notes: bookData.notes,
  }
  return (
    <div className="space-y-5 lg:space-y-7">
      <Button variant="ghost" size="sm" render={<Link href={`/livro/${id}`} />}>
        <AppIcon icon={arrowLeft} data-icon="inline-start" />
        Voltar ao livro
      </Button>
      {format === "epub" ? <EpubReader {...readerProps} /> : <PdfReader {...readerProps} />}
    </div>
  )
}
