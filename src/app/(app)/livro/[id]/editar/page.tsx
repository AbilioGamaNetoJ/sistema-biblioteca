import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import arrowLeft from "@iconify-icons/ph/arrow-left"
import pencilLine from "@iconify-icons/ph/pencil-line"

import { AppIcon } from "@/components/app-icon"
import { BookForm } from "@/components/book-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getBook } from "@/lib/queries"

export const metadata: Metadata = {
  title: "Editar livro",
}

export default async function EditBookPage({
  params,
}: PageProps<"/livro/[id]/editar">) {
  const { id } = await params
  const book = await getBook(id)

  if (!book) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6 lg:space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Sua estante</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Editar livro</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Atualize os detalhes de <span className="font-medium text-foreground">{book.title}</span>.
          </p>
        </div>
        <Button variant="ghost" size="sm" render={<Link href={`/livro/${book.id}`} />}>
          <AppIcon icon={arrowLeft} data-icon="inline-start" />
          Voltar
        </Button>
      </header>
      <Card className="bg-card/90">
        <CardContent className="space-y-5">
          <div className="flex items-center gap-3 border-b border-border/70 pb-4">
            <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <AppIcon icon={pencilLine} className="size-5" />
            </span>
            <div>
              <h2 className="font-bold tracking-tight">Detalhes da edição</h2>
              <p className="text-sm text-muted-foreground">As alterações aparecem na sua estante imediatamente.</p>
            </div>
          </div>
          <BookForm mode="edit" book={book} />
        </CardContent>
      </Card>
    </div>
  )
}
