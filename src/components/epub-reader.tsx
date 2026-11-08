"use client"

import { useEffect, useRef, useState, useActionState } from "react"
import type { Book as EpubBook, Location, Rendition } from "epubjs"

import { NotesPanel } from "@/components/notes-panel"
import { ReaderShell } from "@/components/reader-shell"
import { updateProgress, type ActionState } from "@/lib/actions/books"
import { countEpubLocations, epubCfiFromPage, epubPageFromCfi, openEpubBook } from "@/lib/reading-file-client"
import { localDateString, type Note } from "@/lib/types"

const SWIPE_DISTANCE = 48
const TAP_SLOP = 16
const MIN_ZOOM = 0.8
const MAX_ZOOM = 2

type Turn = "next" | "prev"

function stepZoom(value: number, direction: -1 | 1) {
  const next = Math.round((value + direction * 0.1) * 10) / 10
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next))
}

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
  const savedPageRef = useRef(initialPage)
  const pageNumberRef = useRef(initialPage)
  const atStartRef = useRef(initialPage <= 1)
  const atEndRef = useRef(false)
  const pendingTurn = useRef<Turn | null>(null)
  const zoomRef = useRef(1)
  const gestureRef = useRef<{ x: number; y: number; pointerId: number } | null>(null)
  const [pageNumber, setPageNumber] = useState(initialPage)
  const [pageCount, setPageCount] = useState(totalPages ?? 0)
  const [zoom, setZoom] = useState(1)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [atStart, setAtStart] = useState(initialPage <= 1)
  const [atEnd, setAtEnd] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [state, formAction] = useActionState<ActionState, FormData>(updateProgress, undefined)

  function rememberPage(value: number) {
    pageNumberRef.current = value
    setPageNumber(value)
  }

  function savePage(formData: FormData) {
    formData.set("current_page", String(pageNumberRef.current))
    formData.set("read_on", localDateString())
    formAction(formData)
  }

  useEffect(() => {
    savedPageRef.current = Math.max(1, currentPage || 1)
  }, [currentPage])

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

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
        bookRef.current = null
        return
      }
      const start = Math.min(savedPageRef.current, count)
      setPageCount(count)
      rememberPage(start)
      atStartRef.current = start <= 1
      setAtStart(start <= 1)
      atEndRef.current = false
      setAtEnd(false)
      pendingTurn.current = null

      const width = Math.max(1, Math.floor(viewer!.clientWidth))
      const height = Math.max(1, Math.floor(viewer!.clientHeight))
      const rendition = book.renderTo(viewer!, {
        width,
        height,
        flow: "paginated",
        spread: "none",
        resizeOnOrientationChange: false,
      })
      renditionRef.current = rendition
      await rendition.started
      if (cancelled) return
      rendition.spread("none")
      rendition.themes.fontSize(`${Math.round(zoomRef.current * 100)}%`)
      rendition.on("relocated", (location: Location) => {
        const startEdge = Boolean(location.atStart)
        const endEdge = Boolean(location.atEnd)
        atStartRef.current = startEdge
        atEndRef.current = endEdge
        setAtStart(startEdge)
        setAtEnd(endEdge)
        pendingTurn.current = null
        const cfi = location.start?.cfi
        const currentBook = bookRef.current
        if (!cfi || !currentBook) return
        const page = epubPageFromCfi(currentBook, cfi)
        if (page) rememberPage(page)
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
      setError(message.startsWith("Não foi possível") ? message : "Não foi possível abrir este EPUB.")
      setLoading(false)
    })

    return () => {
      cancelled = true
      pendingTurn.current = null
      renditionRef.current?.destroy()
      bookRef.current?.destroy()
      renditionRef.current = null
      bookRef.current = null
      setReady(false)
    }
  }, [url])

  useEffect(() => {
    if (!ready) return
    renditionRef.current?.themes.fontSize(`${Math.round(zoom * 100)}%`)
  }, [ready, zoom])

  useEffect(() => {
    const viewer = viewerRef.current
    const rendition = renditionRef.current
    if (!viewer || !rendition || !ready) return
    let lastWidth = 0
    let lastHeight = 0
    const apply = () => {
      const width = Math.floor(viewer.clientWidth)
      const height = Math.floor(viewer.clientHeight)
      if (width < 8 || height < 8) return
      if (width === lastWidth && height === lastHeight) return
      lastWidth = width
      lastHeight = height
      rendition.resize(width, height)
      rendition.themes.fontSize(`${Math.round(zoomRef.current * 100)}%`)
    }
    const observer = new ResizeObserver(apply)
    observer.observe(viewer)
    apply()
    return () => observer.disconnect()
  }, [ready])

  function turn(direction: Turn) {
    const rendition = renditionRef.current
    if (!rendition || !ready || pendingTurn.current) return
    if (direction === "next" && atEndRef.current) return
    if (direction === "prev" && atStartRef.current) return
    pendingTurn.current = direction
    const result = direction === "next" ? rendition.next() : rendition.prev()
    void Promise.resolve(result).catch(() => {
      if (pendingTurn.current === direction) pendingTurn.current = null
    })
  }

  return (
    <ReaderShell
      bookTitle={bookTitle}
      pageNumber={pageNumber}
      pageCount={pageCount}
      onPrev={() => turn("prev")}
      onNext={() => turn("next")}
      prevDisabled={loading || atStart}
      nextDisabled={loading || atEnd}
      zoom={zoom}
      onZoomOut={() => setZoom((value) => stepZoom(value, -1))}
      onZoomIn={() => setZoom((value) => stepZoom(value, 1))}
      bookId={bookId}
      onSave={savePage}
      saveError={state?.error}
      notes={<NotesPanel bookId={bookId} pageNumber={pageNumber} notes={notes} />}
    >
      {({ toolsOpen, toggleTools }) => (
        <div className="relative h-full overflow-hidden bg-white">
          {error ? (
            <p className="px-6 py-20 text-center text-sm text-destructive">{error}</p>
          ) : (
            <>
              {loading && (
                <p className="absolute inset-x-0 top-4 z-10 text-center text-xs text-muted-foreground">Abrindo EPUB...</p>
              )}
              <div ref={viewerRef} className="pointer-events-none h-full w-full [&_iframe]:h-full [&_iframe]:w-full" />
              <div
                className="absolute inset-0 z-10 touch-none"
                onPointerDown={(event) => {
                  if (!ready || event.button !== 0) return
                  event.preventDefault()
                  event.currentTarget.setPointerCapture(event.pointerId)
                  gestureRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId }
                }}
                onPointerUp={(event) => {
                  const start = gestureRef.current
                  gestureRef.current = null
                  if (!start || start.pointerId !== event.pointerId) return
                  const dx = event.clientX - start.x
                  const dy = event.clientY - start.y
                  if (Math.abs(dx) <= TAP_SLOP && Math.abs(dy) <= TAP_SLOP) {
                    toggleTools()
                    return
                  }
                  if (!toolsOpen && Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy)) {
                    turn(dx < 0 ? "next" : "prev")
                  }
                }}
                onPointerCancel={() => {
                  gestureRef.current = null
                }}
              />
            </>
          )}
        </div>
      )}
    </ReaderShell>
  )
}
