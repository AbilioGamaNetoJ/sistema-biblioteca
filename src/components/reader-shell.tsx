"use client"

import { useEffect, useState, type ReactNode } from "react"
import arrowLeft from "@iconify-icons/ph/arrow-left"
import arrowRight from "@iconify-icons/ph/arrow-right"
import arrowsIn from "@iconify-icons/ph/arrows-in"
import arrowsOut from "@iconify-icons/ph/arrows-out"
import minus from "@iconify-icons/ph/minus"
import plus from "@iconify-icons/ph/plus"

import { AppIcon } from "@/components/app-icon"
import { SubmitButton } from "@/components/submit-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type ReaderChrome = {
  fullscreen: boolean
  toolsOpen: boolean
  toggleTools: () => void
}

function PageControl({
  pageNumber,
  pageCount,
  onCommitPage,
}: {
  pageNumber: number
  pageCount: number
  onCommitPage?: (page: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <div className="flex items-center gap-1 text-sm font-semibold">
      {onCommitPage ? (
        <Input
          className="h-8 w-16 text-center tabular-nums"
          type="number"
          inputMode="numeric"
          min={1}
          max={pageCount || undefined}
          value={draft ?? pageNumber}
          aria-label="Página atual"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (draft === null) return
            const value = Number.parseInt(draft, 10)
            setDraft(null)
            if (Number.isFinite(value)) onCommitPage(value)
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return
            event.preventDefault()
            event.currentTarget.blur()
          }}
        />
      ) : (
        <span className="min-w-8 text-center tabular-nums" aria-label="Página atual">
          {pageNumber}
        </span>
      )}
      <span className="text-muted-foreground">/ {pageCount || "—"}</span>
    </div>
  )
}

export function ReaderShell({
  bookTitle,
  pageNumber,
  pageCount,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  onCommitPage,
  zoom,
  onZoomOut,
  onZoomIn,
  bookId,
  onSave,
  saveError,
  notes,
  children,
}: {
  bookTitle: string
  pageNumber: number
  pageCount: number
  onPrev: () => void
  onNext: () => void
  prevDisabled: boolean
  nextDisabled: boolean
  onCommitPage?: (page: number) => void
  zoom: number
  onZoomOut: () => void
  onZoomIn: () => void
  bookId: string
  onSave: (formData: FormData) => void
  saveError?: string
  notes: ReactNode
  children: (chrome: ReaderChrome) => ReactNode
}) {
  const [fullscreen, setFullscreen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)

  useEffect(() => {
    if (!fullscreen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [fullscreen])

  function toggleTools() {
    setToolsOpen((open) => !open)
  }

  function toggleFullscreen() {
    if (fullscreen) {
      setFullscreen(false)
      return
    }
    setToolsOpen(false)
    setFullscreen(true)
  }

  return (
    <div
      className={cn(
        fullscreen
          ? "fixed inset-0 z-[80] flex flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]"
          : "flex flex-col gap-4"
      )}
    >
      {toolsOpen && (
        <div className={cn("shrink-0", fullscreen && "px-3 pt-3")}>
          <div className="rounded-3xl border border-border/70 bg-card/95 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">Leitor</p>
                <h1 className="truncate text-xl font-bold tracking-tight">{bookTitle}</h1>
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
                onClick={toggleFullscreen}
              >
                <AppIcon icon={fullscreen ? arrowsIn : arrowsOut} />
              </Button>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-muted p-1">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Página anterior"
                disabled={prevDisabled}
                onClick={onPrev}
              >
                <AppIcon icon={arrowLeft} />
              </Button>
              <PageControl pageNumber={pageNumber} pageCount={pageCount} onCommitPage={onCommitPage} />
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Próxima página"
                disabled={nextDisabled}
                onClick={onNext}
              >
                <AppIcon icon={arrowRight} />
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
              <div className="flex items-center gap-1">
                <span className="mr-1 text-xs text-muted-foreground">Zoom</span>
                <Button type="button" size="icon-xs" variant="outline" aria-label="Diminuir zoom" onClick={onZoomOut}>
                  <AppIcon icon={minus} />
                </Button>
                <span className="w-12 text-center text-xs font-semibold tabular-nums">{Math.round(zoom * 100)}%</span>
                <Button type="button" size="icon-xs" variant="outline" aria-label="Aumentar zoom" onClick={onZoomIn}>
                  <AppIcon icon={plus} />
                </Button>
              </div>
              <form action={onSave} className="flex items-center gap-2">
                <input type="hidden" name="id" value={bookId} />
                <input type="hidden" name="current_page" value={pageNumber} />
                <SubmitButton size="sm">Salvar página</SubmitButton>
              </form>
            </div>
            {saveError && <p className="mt-2 text-xs text-destructive">{saveError}</p>}
          </div>
        </div>
      )}

      <div
        className={cn(
          "min-h-0 min-w-0",
          fullscreen && "flex min-h-0 flex-1 flex-col",
          !fullscreen && toolsOpen && "grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start"
        )}
      >
        <div
          className={cn(
            "min-h-0 min-w-0",
            fullscreen && "flex-1",
            !fullscreen && !toolsOpen && "h-[calc(100dvh-12.5rem)]",
            !fullscreen && toolsOpen && "h-[min(58dvh,38rem)]"
          )}
        >
          {children({ fullscreen, toolsOpen, toggleTools })}
        </div>
        <div className={cn(!toolsOpen && "hidden", fullscreen && "max-h-[34%] shrink-0 overflow-auto px-3 pb-3")}>
          {notes}
        </div>
      </div>
    </div>
  )
}
