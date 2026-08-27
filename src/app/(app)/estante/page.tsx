import type { Metadata } from "next"
import Link from "next/link"
import bookOpen from "@iconify-icons/ph/book-open"
import plusCircle from "@iconify-icons/ph/plus-circle"

import { AppIcon } from "@/components/app-icon"
import { BookCard } from "@/components/book-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getBooks } from "@/lib/queries"
import {
  STATUS_LABELS,
  STATUS_VALUES,
  type BookStatus,
} from "@/lib/types"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Estante",
}

const EMPTY_MESSAGES: Record<BookStatus, string> = {
  want_to_read: "Nenhum livro na sua lista de desejos ainda.",
  reading: "Você não está lendo nada no momento.",
  read: "Nenhum livro concluído ainda.",
}

export default async function EstantePage({
  searchParams,
}: PageProps<"/estante">) {
  const { status } = await searchParams
  const statusParam = typeof status === "string" ? status : undefined
  const current: BookStatus = STATUS_VALUES.includes(
    statusParam as BookStatus
  )
    ? (statusParam as BookStatus)
    : "reading"

  const books = await getBooks(current)

  const counts = await Promise.all(
    STATUS_VALUES.map(async (value) => ({
      value,
      count: value === current
        ? books.length
        : (await getBooks(value)).length,
    }))
  )

  return (
    <div className="space-y-6 lg:space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Sua coleção</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Estante</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Organize cada capítulo da sua jornada de leitura.
          </p>
        </div>
        <Button render={<Link href="/adicionar" />} className="w-full sm:w-auto">
          <AppIcon icon={plusCircle} data-icon="inline-start" />
          Adicionar livro
        </Button>
      </header>

      <div className="sticky top-2 z-10 rounded-2xl border border-white/70 bg-background/85 p-1.5 shadow-sm backdrop-blur-xl lg:top-6">
        <div className="grid grid-cols-3 gap-1">
          {STATUS_VALUES.map((value) => {
            const count = counts.find((item) => item.value === value)?.count ?? 0
            const active = value === current
            return (
              <Link
                key={value}
                href={`/estante?status=${value}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-center text-xs font-semibold transition-all sm:text-sm",
                  active
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/15"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span>{STATUS_LABELS[value]}</span>
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[0.65rem]",
                    active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </Link>
            )
          })}
        </div>
      </div>

      {books.length === 0 ? (
        <Card className="border-dashed bg-card/75">
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
              <AppIcon icon={bookOpen} className="size-6" />
            </span>
            <div className="space-y-1">
              <p className="font-semibold">Esta prateleira está vazia</p>
              <p className="text-sm text-muted-foreground">{EMPTY_MESSAGES[current]}</p>
            </div>
            <Button render={<Link href="/adicionar" />}>
              <AppIcon icon={plusCircle} data-icon="inline-start" />
              Adicionar livro
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  )
}
