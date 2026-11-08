import type { Metadata } from "next"
import bookOpen from "@iconify-icons/ph/book-open"
import magnifyingGlass from "@iconify-icons/ph/magnifying-glass"

import { AppIcon } from "@/components/app-icon"
import { BookForm } from "@/components/book-form"
import { SearchBooks } from "@/components/search-books"
import { Card, CardContent } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Adicionar livro",
}

export default function AdicionarPage() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <header>
        <p className="text-sm font-semibold text-primary">Amplie sua estante</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Adicionar livro</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Encontre uma edição no Google Books ou registre um livro do seu jeito.
        </p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(21rem,0.9fr)] xl:items-start">
        <Card className="bg-card/90">
          <CardContent className="space-y-5">
            <div className="flex gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                <AppIcon icon={magnifyingGlass} className="size-5" />
              </span>
              <div>
                <h2 className="font-bold tracking-tight">Buscar no Google Books</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Título, autor ou ISBN — escolha e adicione em um clique.
                </p>
              </div>
            </div>
            <SearchBooks />
          </CardContent>
        </Card>

        <Card className="bg-card/90">
          <CardContent className="space-y-5">
            <div className="flex gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <AppIcon icon={bookOpen} className="size-5" />
              </span>
              <div>
                <h2 className="font-bold tracking-tight">Cadastrar manualmente</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Para edições especiais ou não encontradas na busca. Um PDF ou EPUB preenche o formulário.
                </p>
              </div>
            </div>
            <BookForm mode="create" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
