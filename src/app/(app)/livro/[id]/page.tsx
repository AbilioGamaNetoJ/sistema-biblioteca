import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import arrowLeft from "@iconify-icons/ph/arrow-left"
import arrowCalendar from "@iconify-icons/ph/calendar"
import pencilLine from "@iconify-icons/ph/pencil-line"
import star from "@iconify-icons/ph/star"
import starFill from "@iconify-icons/ph/star-fill"

import { AppIcon } from "@/components/app-icon"
import { BookCover } from "@/components/book-cover"
import { DeleteBookButton } from "@/components/delete-book-button"
import { PdfManager } from "@/components/pdf-manager"
import { ProgressRing } from "@/components/progress-ring"
import { StatusSegmented } from "@/components/status-segmented"
import { UpdateProgressForm } from "@/components/update-progress-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getBookWithLog } from "@/lib/queries"
import { effectiveTotalPages, progressPercent, STATUS_LABELS } from "@/lib/types"

export const metadata: Metadata = {
  title: "Detalhes do livro",
}

function formatDate(date: string | null) {
  if (!date) return null
  const [y, m, d] = date.split("-")
  return `${d}/${m}/${y}`
}

export default async function BookPage({
  params,
}: PageProps<"/livro/[id]">) {
  const { id } = await params
  const data = await getBookWithLog(id)

  if (!data) notFound()

  const { book, log } = data
  const percent = progressPercent(book)
  const totalPages = effectiveTotalPages(book)

  const info: Array<{ label: string; value: string | null }> = [
    { label: "Autor(es)", value: book.authors },
    {
      label: "Páginas",
      value: totalPages ? String(totalPages) : null,
    },
    {
      label: "Comecei em",
      value: formatDate(book.started_at),
    },
    {
      label: "Terminei em",
      value: formatDate(book.finished_at),
    },
  ]

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" render={<Link href="/estante" />}>
          <AppIcon icon={arrowLeft} data-icon="inline-start" />
          Estante
        </Button>
        <Button variant="outline" render={<Link href={`/livro/${book.id}/editar`} />}>
          <AppIcon icon={pencilLine} data-icon="inline-start" />
          Editar
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <div className="space-y-5">
          <Card className="overflow-visible bg-card/90">
            <CardContent className="flex gap-5 sm:gap-6">
              <div className="w-28 shrink-0 sm:w-36">
                <BookCover
                  title={book.title}
                  coverUrl={book.cover_url}
                  className="shadow-xl shadow-primary/15"
                />
              </div>
              <div className="min-w-0 py-1">
                <Badge className="mb-3 bg-secondary px-2.5 py-1 text-secondary-foreground hover:bg-secondary">
                  {STATUS_LABELS[book.status]}
                </Badge>
                <h1 className="text-xl leading-tight font-bold tracking-tight sm:text-3xl">
                  {book.title}
                </h1>
                {book.authors && (
                  <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                    {book.authors}
                  </p>
                )}
                {book.rating && (
                  <p
                    className="mt-4 flex items-center gap-0.5"
                    aria-label={`Avaliação: ${book.rating} de 5`}
                  >
                    {Array.from({ length: 5 }).map((_, index) => (
                      <AppIcon
                        key={index}
                        icon={index < book.rating! ? starFill : star}
                        className={
                          index < book.rating!
                            ? "size-4 fill-amber-400 text-amber-400"
                            : "size-4 text-muted-foreground/25"
                        }
                      />
                    ))}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <section className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-primary">Organização</p>
              <h2 className="mt-1 text-lg font-bold tracking-tight">Status de leitura</h2>
            </div>
            <StatusSegmented bookId={book.id} status={book.status} />
          </section>
        </div>

        <Card className="bg-linear-to-br from-[#F0EEFF] to-card">
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <ProgressRing percent={percent} size={78} strokeWidth={7}>
                <span className="text-sm font-bold text-primary">
                  {percent !== null ? `${percent}%` : "—"}
                </span>
              </ProgressRing>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Seu progresso</p>
                <p className="mt-1 text-lg font-bold tracking-tight">
                  Página {book.current_page}
                  {totalPages ? ` de ${totalPages}` : ""}
                </p>
                {totalPages && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Faltam {Math.max(0, totalPages - book.current_page)} páginas
                  </p>
                )}
              </div>
            </div>
            {book.status !== "read" && (
              <UpdateProgressForm
                bookId={book.id}
                currentPage={book.current_page}
                totalPages={totalPages}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <PdfManager
        bookId={book.id}
        fileName={book.pdf_file_name}
        fileSize={book.pdf_file_size}
        pageCount={book.pdf_page_count}
      />

      <section className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-primary">Sobre o livro</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight">Informações</h2>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {info.map(({ label, value }) => (
            <div key={label} className="rounded-2xl border border-white/80 bg-card/80 px-4 py-3 shadow-sm">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <AppIcon icon={arrowCalendar} className="size-3.5 text-primary" />
                {label}
              </dt>
              <dd className="mt-2 text-sm font-semibold">{value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </section>

      {log.length > 0 && (
        <section className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-primary">Acompanhamento</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">Histórico de leitura</h2>
          </div>
          <Card size="sm">
            <CardContent>
              <ul className="divide-y divide-border/70">
                {log.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between py-3 text-sm first:pt-0 last:pb-0"
                  >
                    <span className="text-muted-foreground">{formatDate(entry.read_on)}</span>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">
                      +{entry.pages_read} {entry.pages_read === 1 ? "página" : "páginas"}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      <div className="border-t border-border/70 pt-6">
        <DeleteBookButton bookId={book.id} bookTitle={book.title} />
      </div>
    </div>
  )
}
