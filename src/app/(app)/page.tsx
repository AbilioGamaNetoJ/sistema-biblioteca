import Link from "next/link"
import arrowUpRight from "@iconify-icons/ph/arrow-up-right"
import bookMarked from "@iconify-icons/ph/bookmark-simple"
import bookOpen from "@iconify-icons/ph/book-open"
import checkCircle from "@iconify-icons/ph/check-circle"
import plusCircle from "@iconify-icons/ph/plus-circle"
import bookOpenText from "@iconify-icons/ph/book-open-text"

import { AppIcon } from "@/components/app-icon"
import { BookCover } from "@/components/book-cover"
import { ProgressRing } from "@/components/progress-ring"
import { UpdateProgressForm } from "@/components/update-progress-form"
import { GoalSummary } from "@/components/goal-summary"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getBooks, getProfile, getStats } from "@/lib/queries"
import { effectiveTotalPages, progressPercent } from "@/lib/types"

export default async function DashboardPage() {
  const [profile, reading, stats] = await Promise.all([
    getProfile(),
    getBooks("reading"),
    getStats(),
  ])

  const firstName = profile.username.split(" ")[0] || "leitor"

  const statCards = [
    {
      label: "Lendo",
      value: stats.reading,
      href: "/estante?status=reading",
      icon: bookOpen,
      tone: "bg-indigo-100 text-indigo-700",
    },
    {
      label: "Quero ler",
      value: stats.want_to_read,
      href: "/estante?status=want_to_read",
      icon: bookMarked,
      tone: "bg-violet-100 text-violet-700",
    },
    {
      label: "Lidos",
      value: stats.read,
      href: "/estante?status=read",
      icon: checkCircle,
      tone: "bg-fuchsia-100 text-fuchsia-700",
    },
  ]

  return (
    <div className="space-y-7 lg:space-y-9">
      <header className="relative overflow-hidden rounded-3xl border border-white/80 bg-linear-to-br from-[#EAE7FF] via-[#F5F3FF] to-[#E5F0FF] px-5 py-6 shadow-[0_18px_40px_-30px_oklch(0.38_0.1_285_/_0.5)] sm:px-7 sm:py-7">
        <div className="absolute -top-16 -right-12 size-44 rounded-full bg-violet-300/25 blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
              <AppIcon icon={bookOpenText} className="size-4" />
              Sua jornada de leitura
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Olá, {firstName} <span aria-hidden="true">👋</span>
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
              Um espaço tranquilo para guardar os livros que estão marcando seu caminho.
            </p>
          </div>
          <Button render={<Link href="/adicionar" />} className="w-full sm:w-auto">
            <AppIcon icon={plusCircle} data-icon="inline-start" />
            Adicionar livro
          </Button>
        </div>
      </header>

      <section aria-label="Resumo da estante" className="grid grid-cols-3 gap-3 sm:gap-4">
        {statCards.map(({ label, value, href, icon: Icon, tone }) => (
          <Link key={label} href={href} className="group">
            <Card
              size="sm"
              className="h-full border-transparent transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg"
            >
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className={`flex size-9 items-center justify-center rounded-xl ${tone}`}>
                  <AppIcon icon={Icon} className="size-4" />
                </span>
                <div>
                  <p className="text-2xl leading-none font-bold tracking-tight sm:text-3xl">
                    {value}
                  </p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">
                    {label}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <GoalSummary />

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">Agora</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
              Continue lendo
            </h2>
          </div>
          <Link
            href="/estante?status=reading"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary/75"
          >
            Ver estante
            <AppIcon icon={arrowUpRight} className="size-4" />
          </Link>
        </div>

        {reading.length === 0 ? (
          <Card className="border-dashed bg-card/75">
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
                <AppIcon icon={bookOpen} className="size-6" />
              </span>
              <div className="space-y-1">
                <p className="font-semibold">Sua próxima leitura começa aqui</p>
                <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Adicione um livro à sua estante e acompanhe cada página.
                </p>
              </div>
              <Button render={<Link href="/adicionar" />}>
                <AppIcon icon={plusCircle} data-icon="inline-start" />
                Adicionar livro
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-4 xl:grid-cols-2">
            {reading.map((book) => {
              const percent = progressPercent(book)
              return (
                <li key={book.id}>
                  <Card size="sm" className="h-full transition-shadow hover:shadow-lg">
                    <CardContent className="flex h-full gap-4">
                      <Link href={`/livro/${book.id}`} className="w-20 shrink-0 sm:w-24">
                        <BookCover
                          title={book.title}
                          coverUrl={book.cover_url}
                          className="shadow-md"
                        />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              href={`/livro/${book.id}`}
                              className="line-clamp-2 font-bold tracking-tight hover:text-primary"
                            >
                              {book.title}
                            </Link>
                            {book.authors && (
                              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                {book.authors}
                              </p>
                            )}
                          </div>
                          <ProgressRing percent={percent} size={54} strokeWidth={6}>
                            <span className="text-xs font-bold text-primary">
                              {percent !== null ? `${percent}%` : "—"}
                            </span>
                          </ProgressRing>
                        </div>
                        <div className="mt-auto">
                          <UpdateProgressForm
                            bookId={book.id}
                            currentPage={book.current_page}
                            totalPages={effectiveTotalPages(book)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
