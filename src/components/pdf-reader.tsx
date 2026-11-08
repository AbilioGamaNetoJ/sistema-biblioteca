"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useActionState } from "react"

import { NotesPanel } from "@/components/notes-panel"
import { ReaderShell } from "@/components/reader-shell"
import { updateProgress, type ActionState } from "@/lib/actions/books"
import { pdfjsLib } from "@/lib/pdfjs"
import { localDateString, type Note } from "@/lib/types"

const GAP = 12
const OVERSCAN = 1
const MIN_ZOOM = 0.8
const MAX_ZOOM = 2.5
const TAP_SLOP = 10

type PdfDocument = Awaited<ReturnType<typeof pdfjsLib.getDocument>["promise"]>

function stepZoom(value: number, direction: -1 | 1) {
  const next = Math.round((value + direction * 0.1) * 10) / 10
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next))
}

function screenScale() {
  return Math.min(window.devicePixelRatio || 1, 3)
}

function mostVisiblePage(scrollTop: number, viewHeight: number, stride: number, pageHeight: number, count: number) {
  if (!count || stride <= 0) return 1
  const viewBottom = scrollTop + Math.max(viewHeight, 1)
  const first = Math.max(0, Math.floor(scrollTop / stride) - 1)
  const last = Math.min(count - 1, Math.ceil(viewBottom / stride))
  let best = 1
  let bestOverlap = -1
  for (let index = first; index <= last; index += 1) {
    const top = index * stride
    const overlap = Math.min(top + pageHeight, viewBottom) - Math.max(top, scrollTop)
    if (overlap > bestOverlap) {
      bestOverlap = overlap
      best = index + 1
    }
  }
  return best
}

function lockCrispText(context: CanvasRenderingContext2D) {
  context.imageSmoothingEnabled = false
  const prototype = Object.getPrototypeOf(context) as CanvasRenderingContext2D
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "imageSmoothingEnabled")
  if (!descriptor?.set) return
  try {
    Object.defineProperty(context, "imageSmoothingEnabled", {
      configurable: true,
      enumerable: true,
      get: () => false,
      set: () => {
        descriptor.set?.call(context, false)
      },
    })
  } catch {
    context.imageSmoothingEnabled = false
  }
}

function PdfPageCanvas({
  pdf,
  pageNumber,
  cssWidth,
  cssHeight,
  top,
  left,
  dpr,
}: {
  pdf: PdfDocument
  pageNumber: number
  cssWidth: number
  cssHeight: number
  top: number
  left: number
  dpr: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false
    let cancelRender = () => {}

    pdf
      .getPage(pageNumber)
      .then((page) => {
        if (cancelled) return
        const base = page.getViewport({ scale: 1 })
        const pixelWidth = Math.max(1, Math.round(cssWidth * dpr))
        const pixelHeight = Math.max(1, Math.round(cssHeight * dpr))
        const viewport = page.getViewport({ scale: pixelWidth / base.width })
        canvas.width = pixelWidth
        canvas.height = pixelHeight
        const context = canvas.getContext("2d", { alpha: false })
        if (!context) return
        lockCrispText(context)
        const renderTask = page.render({ canvas: null, canvasContext: context, viewport })
        cancelRender = () => {
          renderTask.cancel()
        }
        return renderTask.promise
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
      cancelRender()
    }
  }, [pdf, pageNumber, cssWidth, cssHeight, dpr])

  return (
    <canvas
      ref={canvasRef}
      className="absolute bg-white shadow-md"
      style={{ top, left, width: cssWidth, height: cssHeight }}
      aria-label={`Página ${pageNumber}`}
    />
  )
}

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
  const scrollRef = useRef<HTMLDivElement>(null)
  const initialPage = Math.max(1, currentPage || 1)
  const pageNumberRef = useRef(initialPage)
  const gestureRef = useRef<{ x: number; y: number; pointerId: number } | null>(null)
  const scrollFrameRef = useRef(0)
  const [pdf, setPdf] = useState<PdfDocument | null>(null)
  const [base, setBase] = useState<{ width: number; height: number } | null>(null)
  const [pageNumber, setPageNumber] = useState(initialPage)
  const [pageCount, setPageCount] = useState(totalPages ?? 0)
  const [zoom, setZoom] = useState(1)
  const [scrollTop, setScrollTop] = useState(0)
  const [frame, setFrame] = useState({ width: 0, height: 0, dpr: 1 })
  const [error, setError] = useState<string | null>(null)
  const [documentUrl, setDocumentUrl] = useState(url)
  const [pinnedScroll, setPinnedScroll] = useState<number | null>(null)
  const [state, formAction] = useActionState<ActionState, FormData>(updateProgress, undefined)

  const metrics = useMemo(() => {
    if (!base || frame.width < 8 || !pageCount) return null
    const fitWidth = Math.floor(frame.width)
    const cssWidth = Math.max(1, Math.round(fitWidth * zoom))
    const cssHeight = Math.max(1, Math.round(base.height * (cssWidth / base.width)))
    return {
      cssWidth,
      cssHeight,
      stride: cssHeight + GAP,
      pageCount,
      contentWidth: Math.max(fitWidth, cssWidth),
    }
  }, [base, frame.width, pageCount, zoom])

  const visiblePages = useMemo(() => {
    if (!metrics) return []
    const start = Math.max(1, Math.floor(scrollTop / metrics.stride) + 1 - OVERSCAN)
    const end = Math.min(metrics.pageCount, Math.ceil((scrollTop + frame.height) / metrics.stride) + OVERSCAN)
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, offset) => start + offset)
  }, [metrics, scrollTop, frame.height])

  const layoutKey = metrics ? `${url}:${metrics.stride}:${metrics.cssWidth}` : ""
  const [appliedLayout, setAppliedLayout] = useState("")
  if (metrics && layoutKey !== appliedLayout) {
    const sameBook = appliedLayout.startsWith(`${url}:`)
    const page = sameBook ? pageNumber : Math.min(metrics.pageCount, Math.max(1, currentPage || 1))
    const top = (page - 1) * metrics.stride
    setAppliedLayout(layoutKey)
    if (page !== pageNumber) setPageNumber(page)
    setScrollTop(top)
    setPinnedScroll(top)
  }

  if (documentUrl !== url) {
    setDocumentUrl(url)
    setPdf(null)
    setBase(null)
    setError(null)
  }

  function savePage(formData: FormData) {
    formData.set("current_page", String(pageNumberRef.current))
    formData.set("read_on", localDateString())
    formAction(formData)
  }

  useEffect(() => {
    pageNumberRef.current = pageNumber
  }, [pageNumber])

  useEffect(() => {
    let cancelled = false
    const task = pdfjsLib.getDocument({ url })
    task.promise
      .then(async (document) => {
        if (cancelled) {
          await task.destroy()
          return
        }
        const first = await document.getPage(1)
        if (cancelled) {
          await task.destroy()
          return
        }
        const viewport = first.getViewport({ scale: 1 })
        setPdf(document)
        setBase({ width: viewport.width, height: viewport.height })
        setPageCount(document.numPages)
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível abrir este PDF.")
      })

    return () => {
      cancelled = true
      void task.destroy()
    }
  }, [url])

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const measure = () => {
      const width = element.clientWidth
      const height = element.clientHeight
      const dpr = screenScale()
      setFrame((current) =>
        current.width === width && current.height === height && current.dpr === dpr
          ? current
          : { width, height, dpr }
      )
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    window.addEventListener("resize", measure)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [error, pdf])

  useLayoutEffect(() => {
    const scroller = scrollRef.current
    if (!scroller || pinnedScroll === null) return
    scroller.scrollTop = pinnedScroll
  }, [pinnedScroll])

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current)
    }
  }, [])

  function remember(page: number) {
    pageNumberRef.current = page
    setPageNumber(page)
  }

  function jump(page: number) {
    const scroller = scrollRef.current
    if (!scroller || !metrics) return
    const next = Math.min(metrics.pageCount, Math.max(1, page))
    remember(next)
    const top = (next - 1) * metrics.stride
    scroller.scrollTop = top
    setScrollTop(top)
  }

  function onScroll() {
    const scroller = scrollRef.current
    if (!scroller || !metrics) return
    if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current)
    scrollFrameRef.current = requestAnimationFrame(() => {
      const top = scroller.scrollTop
      setScrollTop((current) => (Math.abs(current - top) < 1 ? current : top))
      const visible = mostVisiblePage(top, scroller.clientHeight, metrics.stride, metrics.cssHeight, metrics.pageCount)
      if (visible !== pageNumberRef.current) remember(visible)
    })
  }

  return (
    <ReaderShell
      bookTitle={bookTitle}
      pageNumber={pageNumber}
      pageCount={pageCount}
      onPrev={() => jump(pageNumberRef.current - 1)}
      onNext={() => jump(pageNumberRef.current + 1)}
      prevDisabled={pageNumber <= 1}
      nextDisabled={!pageCount || pageNumber >= pageCount}
      onCommitPage={jump}
      zoom={zoom}
      onZoomOut={() => setZoom((value) => stepZoom(value, -1))}
      onZoomIn={() => setZoom((value) => stepZoom(value, 1))}
      bookId={bookId}
      onSave={savePage}
      saveError={state?.error}
      notes={<NotesPanel bookId={bookId} pageNumber={pageNumber} notes={notes} />}
    >
      {({ toggleTools }) => (
        <div
          ref={scrollRef}
          className="h-full w-full overflow-auto overscroll-contain bg-muted/40"
          onScroll={onScroll}
          onPointerDown={(event) => {
            if (event.button !== 0) return
            gestureRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId }
          }}
          onPointerUp={(event) => {
            const start = gestureRef.current
            gestureRef.current = null
            if (!start || start.pointerId !== event.pointerId) return
            if (Math.abs(event.clientX - start.x) > TAP_SLOP || Math.abs(event.clientY - start.y) > TAP_SLOP) return
            toggleTools()
          }}
          onPointerCancel={() => {
            gestureRef.current = null
          }}
        >
          {error ? (
            <p className="px-6 py-20 text-center text-sm text-destructive">{error}</p>
          ) : !pdf || !metrics ? (
            <p className="px-6 py-20 text-center text-sm text-muted-foreground">Carregando páginas...</p>
          ) : (
            <div
              className="relative"
              style={{
                width: metrics.contentWidth,
                height: Math.max(metrics.cssHeight, (metrics.pageCount - 1) * metrics.stride + metrics.cssHeight),
              }}
            >
              {visiblePages.map((page) => (
                <PdfPageCanvas
                  key={page}
                  pdf={pdf}
                  pageNumber={page}
                  cssWidth={metrics.cssWidth}
                  cssHeight={metrics.cssHeight}
                  top={(page - 1) * metrics.stride}
                  left={(metrics.contentWidth - metrics.cssWidth) / 2}
                  dpr={frame.dpr}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </ReaderShell>
  )
}
