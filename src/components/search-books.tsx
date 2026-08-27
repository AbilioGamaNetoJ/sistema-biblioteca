"use client"

import { useActionState, useEffect, useState } from "react"
import magnifyingGlass from "@iconify-icons/ph/magnifying-glass"
import plusCircle from "@iconify-icons/ph/plus-circle"
import loadingLoop from "@iconify-icons/line-md/loading-loop"

import { AppIcon } from "@/components/app-icon"
import { BookCover } from "@/components/book-cover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { addBook, type ActionState } from "@/lib/actions/books"
import { STATUS_LABELS, STATUS_VALUES } from "@/lib/types"
import { cn } from "@/lib/utils"
import type { GoogleBookResult } from "@/app/api/books/search/route"

export function SearchBooks() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    addBook,
    undefined
  )

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<GoogleBookResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const trimmed = query.trim()

    const timeout = setTimeout(async () => {
      if (!trimmed) {
        setResults([])
        setSearched(false)
        setLoading(false)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/books/search?q=${encodeURIComponent(trimmed)}`
        )
        const data = await res.json()
        if (!res.ok || data.error) {
          setResults([])
          setError(data.error ?? "Não foi possível buscar livros agora.")
        } else {
          setResults(data.results ?? [])
        }
        setSearched(true)
      } catch {
        setResults([])
        setError("Não foi possível conectar ao serviço de busca.")
        setSearched(true)
      } finally {
        setLoading(false)
      }
    }, 450)

    return () => clearTimeout(timeout)
  }, [query])

  return (
    <div className="space-y-5">
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="relative">
        <AppIcon icon={magnifyingGlass} className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por título, autor, ISBN..."
          className="h-12 pl-10 text-base"
          inputMode="search"
          autoComplete="off"
        />
        {loading && (
          <AppIcon icon={loadingLoop} className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
        )}
      </div>

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((book) => (
            <li
              key={book.google_books_id}
              className="flex gap-3 rounded-2xl border border-border/70 bg-background/70 p-3 shadow-sm"
            >
              <div className="w-14 shrink-0 sm:w-16">
                <BookCover
                  title={book.title}
                  coverUrl={book.cover_url}
                  className="shadow-sm"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm leading-snug font-semibold">
                  {book.title}
                </p>
                {book.authors && (
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {book.authors}
                  </p>
                )}
                {book.total_pages && (
                  <p className="text-xs text-muted-foreground">
                    {book.total_pages} páginas
                  </p>
                )}
              </div>
              <form action={formAction} className="w-22 shrink-0 space-y-1.5 sm:w-24">
                <input
                  type="hidden"
                  name="google_books_id"
                  value={book.google_books_id}
                />
                <input type="hidden" name="title" value={book.title} />
                {book.authors && (
                  <input type="hidden" name="authors" value={book.authors} />
                )}
                {book.cover_url && (
                  <input
                    type="hidden"
                    name="cover_url"
                    value={book.cover_url}
                  />
                )}
                {book.total_pages && (
                  <input
                    type="hidden"
                    name="total_pages"
                    value={book.total_pages}
                  />
                )}
                <select
                  name="status"
                  aria-label="Status inicial"
                  defaultValue="want_to_read"
                  className="h-8 w-full rounded-lg border border-input bg-background px-1.5 text-xs outline-none focus-visible:border-ring dark:bg-input/30"
                >
                  {STATUS_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {STATUS_LABELS[value]}
                    </option>
                  ))}
                </select>
                <Button type="submit" size="sm" className="h-8 w-full text-xs">
                  <AppIcon icon={plusCircle} data-icon="inline-start" />
                  Adicionar
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {loading && (
        <p className="rounded-xl bg-muted/50 py-6 text-center text-sm text-muted-foreground" aria-live="polite">
          Buscando no Google Books...
        </p>
      )}

      {!loading && searched && error && (
        <p className="rounded-xl bg-destructive/10 px-4 py-6 text-center text-sm text-destructive">
          {error}
        </p>
      )}

      {!loading && searched && !error && results.length === 0 && (
        <p className={cn("rounded-xl bg-muted/50 py-6 text-center text-sm text-muted-foreground")}>
          Nenhum livro encontrado. Tente outro termo ou cadastre manualmente
          abaixo.
        </p>
      )}

      {!loading && !searched && !query.trim() && (
        <p className="rounded-xl bg-muted/50 py-6 text-center text-sm text-muted-foreground">
          Busque no Google Books ou cadastre um livro manualmente abaixo.
        </p>
      )}
    </div>
  )
}
