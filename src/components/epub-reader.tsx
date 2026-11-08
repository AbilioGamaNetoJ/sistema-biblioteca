"use client"

import { useEffect, useRef, useState, useActionState } from "react"
import arrowLeft from "@iconify-icons/ph/arrow-left"
import arrowRight from "@iconify-icons/ph/arrow-right"
import minus from "@iconify-icons/ph/minus"
import plus from "@iconify-icons/ph/plus"
import type { Book as EpubBook, Rendition } from "epubjs"

import { AppIcon } from "@/components/app-icon"
import { NotesPanel } from "@/components/notes-panel"
import { SubmitButton } from "@/components/submit-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { updateProgress, type ActionState } from "@/lib/actions/books"
import {
  countEpubLocations,
  epubCfiFromPage,
  epubPageFromCfi,
  openEpubBook,
} from "@/lib/reading-file-client"
import { localDateString, type Note } from "@/lib/types"

export function EpubReader({
  bookId,
  bookTitle,
  url,
  currentPage,
  totalPages,
  notes,
}: {
  bookId: string
  bookTitle: string
  url: string
  currentPage: number
  totalPages: number | null
  notes: Note[]
}) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<EpubBook | null>(null)
  const renditionRef = useRef<Rendition | null>(null)
  const initialPage = Math.max(1, currentPage || 1)
  const [pageNumber, setPageNumber] = useState(initialPage)
  const [pageCount, setPageCount] = useState(totalPages ?? 0)
  const [zoom, setZoom] = useState(1)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [atStart, setAtStart] = useState(initialPage <= 1)
  const [atEnd, setAtEnd] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [state, formAction] = useActionState<ActionState, FormData>(updateProgress, undefined)

  function savePage(formData: FormData) {
    formData.set("read_on", localDateString())
    formAction(formData)
  }

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    let cancelled = false

    async function open() {
      const response = await fetch(url)
      if (!response.ok) throw new Error("Não foi possível baixar o EPUB.")
      const book = await openEpubBook(await response.arrayBuffer())
      if (cancelled) {
        book.destroy()
        return
      }
      bookRef.current = book
      const count = await countEpubLocations(book)
      if (cancelled) {
        book.destroy()
        return
      }
      const start = Math.min(Math.max(1, currentPage || 1), count)
      setPageCount(count)
      setPageNumber(start)

      const rendition = book.renderTo(viewer!, {
        width: "100%",
        height: "100%",
        flow: "paginated",
        spread: "none",
      })
      renditionRef.current = rendition
      await rendition.started
      rendition.spread("none")
      rendition.on("relocated", (location: { start?: { cfi?: string }; atStart?: boolean; atEnd?: boolean }) => {
        const cfi = location.start?.cfi
        if (cfi) {
          const page = epubPageFromCfi(book, cfi)
          if (page) setPageNumber(page)
        }
        setAtStart(Boolean(location.atStart))
        setAtEnd(Boolean(location.atEnd))
      })
      const cfi = epubCfiFromPage(book, start)
      if (cfi) await rendition.display(cfi)
      else await rendition.display()
      if (cancelled) return
      setReady(true)
      setLoading(false)
    }

    open().catch((reason: unknown) => {
      renditionRef.current?.destroy()
      bookRef.current?.destroy()
      renditionRef.current = null
      bookRef.current = null
      if (cancelled) return
      const message = reason instanceof Error ? reason.message : ""
      setError(
        message.startsWith("Não foi possível")
          ? message
          : "Não foi possível abrir este EPUB."
      )
      setLoading(false)
    })

    return () => {
      cancelled = true
      renditionRef.current?.destroy()
      bookRef.current?.destroy()
      renditionRef.current = null
      bookRef.current = null
      setReady(false)
    }
  }, [url, currentPage])

  useEffect(() => {
    if (!ready) return
    renditionRef.current?.themes.fontSize(`${Math.round(zoom * 100)}%`)
  }, [ready, zoom])

  function goToPage(value: number) {
    const book = bookRef.current
    const rendition = renditionRef.current
    if (!book || !rendition || !pageCount) return
    const next = Math.min(Math.max(1, value), pageCount)
    const cfi = epubCfiFromPage(book, next)
    if (!cfi) return
    setPageNumber(next)
    void rendition.display(cfi)
  }

  return (
    <div className="space-y-5">
      <Card className="bg-card/90">
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">Leitor EPUB</p>
              <h1 className="truncate text-xl font-bold tracking-tight">{bookTitle}</h1>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl bg-muted p-1">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Página anterior"
                disabled={loading || atStart}
                onClick={() => void renditionRef.current?.prev()}
              >
                <AppIcon icon={arrowLeft} />
              </Button>
              <div className="flex items-center gap-1 text-sm font-semibold">
                <Input
                  className="h-8 w-16 text-center"
                  type="number"
                  min={1}
                  max={pageCount || undefined}
                  value={pageNumber}
                  onChange={(event) => goToPage(Number(event.target.value) || 1)}
                  aria-label="Página atual"
                />
                <span className="text-muted-foreground">/ {pageCount || "—"}</span>
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Próxima página"
                disabled={loading || atEnd}
                onClick={() => void renditionRef.current?.next()}
              >
                <AppIcon icon={arrowRight} />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
            <div className="flex items-center gap-1">
              <span className="mr-1 text-xs text-muted-foreground">Zoom</span>
              <Button
                type="button"
                size="icon-xs"
                variant="outline"
                aria-label="Diminuir zoom"
                onClick={() => setZoom((value) => Math.max(0.8, Number((value - 0.1).toFixed(2))))}
              >
                <AppIcon icon={minus} />
              </Button>
              <span className="w-12 text-center text-xs font-semibold">{Math.round(zoom * 100)}%</span>
              <Button
                type="button"
                size="icon-xs"
                variant="outline"
                aria-label="Aumentar zoom"
                onClick={() => setZoom((value) => Math.min(2, Number((value + 0.1).toFixed(2))))}
              >
                <AppIcon icon={plus} />
              </Button>
            </div>
            <form action={savePage} className="flex items-center gap-2">
              <input type="hidden" name="id" value={bookId} />
              <input type="hidden" name="current_page" value={pageNumber} />
              <SubmitButton size="sm">Salvar página</SubmitButton>
            </form>
          </div>
          {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <Card className="overflow-hidden bg-muted/50">
          <CardContent className="p-3 sm:p-6">
            {error ? (
              <p className="py-20 text-center text-sm text-destructive">{error}</p>
            ) : (
              <div className="relative h-[72vh] min-h-[28rem] overflow-hidden rounded-sm bg-white shadow-xl">
                {loading && (
                  <p className="absolute inset-x-0 top-4 z-10 text-center text-xs text-muted-foreground">
                    Abrindo EPUB...
                  </p>
                )}
                <div ref={viewerRef} className="h-full w-full" />
              </div>
            )}
          </CardContent>
        </Card>
        <NotesPanel bookId={bookId} pageNumber={pageNumber} notes={notes} />
      </div>
    </div>
  )
}
