"use client"

import { useEffect, useRef, useState, useActionState } from "react"
import arrowLeft from "@iconify-icons/ph/arrow-left"
import arrowRight from "@iconify-icons/ph/arrow-right"
import minus from "@iconify-icons/ph/minus"
import plus from "@iconify-icons/ph/plus"

import { AppIcon } from "@/components/app-icon"
import { NotesPanel } from "@/components/notes-panel"
import { SubmitButton } from "@/components/submit-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { updateProgress, type ActionState } from "@/lib/actions/books"
import { pdfjsLib } from "@/lib/pdfjs"
import { localDateString, type Note } from "@/lib/types"

export function PdfReader({
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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const documentRef = useRef<Awaited<ReturnType<typeof pdfjsLib.getDocument>["promise"]> | null>(null)
  const [pageNumber, setPageNumber] = useState(Math.max(1, currentPage || 1))
  const [pageCount, setPageCount] = useState(totalPages ?? 0)
  const [zoom, setZoom] = useState(1.15)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [state, formAction] = useActionState<ActionState, FormData>(updateProgress, undefined)

  function savePage(formData: FormData) {
    formData.set("read_on", localDateString())
    formAction(formData)
  }

  useEffect(() => {
    let cancelled = false
    const task = pdfjsLib.getDocument({ url })
    task.promise
      .then((document) => {
        if (cancelled) {
          document.cleanup()
          return
        }
        documentRef.current = document
        setPageCount(document.numPages)
        setPageNumber((page) => Math.min(Math.max(1, page), document.numPages))
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError("Não foi possível abrir este PDF.")
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
      void task.destroy()
      documentRef.current = null
    }
  }, [url])

  useEffect(() => {
    const document = documentRef.current
    const canvas = canvasRef.current
    if (!document || !canvas || !pageNumber) return
    let cancelled = false
    document
      .getPage(pageNumber)
      .then((page) => {
        if (cancelled) return
        const viewport = page.getViewport({ scale: zoom })
        const context = canvas.getContext("2d")
        if (!context) throw new Error("Canvas indisponível")
        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`
        return page.render({ canvas, canvasContext: context, viewport }).promise
      })
      .then(() => {
        if (!cancelled) setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError("Não foi possível renderizar esta página.")
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [pageNumber, zoom, pageCount])

  function goToPage(value: number) {
    if (!pageCount) return
    setPageNumber(Math.min(Math.max(1, value), pageCount))
  }

  return (
    <div className="space-y-5">
      <Card className="bg-card/90">
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">Leitor</p>
              <h1 className="truncate text-xl font-bold tracking-tight">{bookTitle}</h1>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl bg-muted p-1">
              <Button type="button" size="icon-sm" variant="ghost" aria-label="Página anterior" disabled={pageNumber <= 1} onClick={() => goToPage(pageNumber - 1)}>
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
              <Button type="button" size="icon-sm" variant="ghost" aria-label="Próxima página" disabled={!pageCount || pageNumber >= pageCount} onClick={() => goToPage(pageNumber + 1)}>
                <AppIcon icon={arrowRight} />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
            <div className="flex items-center gap-1">
              <span className="mr-1 text-xs text-muted-foreground">Zoom</span>
              <Button type="button" size="icon-xs" variant="outline" aria-label="Diminuir zoom" onClick={() => setZoom((value) => Math.max(0.7, value - 0.1))}>
                <AppIcon icon={minus} />
              </Button>
              <span className="w-12 text-center text-xs font-semibold">{Math.round(zoom * 100)}%</span>
              <Button type="button" size="icon-xs" variant="outline" aria-label="Aumentar zoom" onClick={() => setZoom((value) => Math.min(2.5, value + 0.1))}>
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
        <Card className="overflow-auto bg-muted/50">
          <CardContent className="flex min-h-[26rem] min-w-full items-start justify-center p-3 sm:p-6">
            {error ? (
              <p className="py-20 text-sm text-destructive">{error}</p>
            ) : (
              <div className="relative">
                {loading && <p className="absolute inset-x-0 top-4 z-10 text-center text-xs text-muted-foreground">Carregando página...</p>}
                <canvas ref={canvasRef} className="mx-auto rounded-sm bg-white shadow-xl" aria-label={`Página ${pageNumber}`} />
              </div>
            )}
          </CardContent>
        </Card>
        <NotesPanel bookId={bookId} pageNumber={pageNumber} notes={notes} />
      </div>
    </div>
  )
}
