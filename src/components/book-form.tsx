"use client"

import { useActionState, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import image from "@iconify-icons/ph/image"
import uploadSimple from "@iconify-icons/ph/upload-simple"
import uploadingLoop from "@iconify-icons/line-md/uploading-loop"

import { AppIcon } from "@/components/app-icon"
import { BookCover } from "@/components/book-cover"
import { SubmitButton } from "@/components/submit-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  addBook,
  createManualBook,
  updateBook,
  updateManualBook,
  type ActionState,
} from "@/lib/actions/books"
import { attachPdf } from "@/lib/actions/reading"
import {
  inspectReadingFile,
  uploadCoverBlob,
  uploadReadingFile,
} from "@/lib/reading-file-client"
import { READING_FILE_ACCEPT, readingFormatLabel } from "@/lib/reading-file"
import { createClient } from "@/lib/supabase/client"
import { STATUS_LABELS, STATUS_VALUES, type Book } from "@/lib/types"
import { cn } from "@/lib/utils"

interface BookFormProps {
  mode: "create" | "edit"
  book?: Book
}

const inputClass = "h-11"

type PendingReadingFile = {
  file: File
  pageCount: number
}

export function BookForm({ mode, book }: BookFormProps) {
  const action = mode === "create" ? addBook : updateBook
  const [state, formAction] = useActionState<ActionState, FormData>(
    action,
    undefined
  )
  const router = useRouter()

  const [coverUrl, setCoverUrl] = useState(book?.cover_url ?? "")
  const [title, setTitle] = useState(book?.title ?? "")
  const [authors, setAuthors] = useState(book?.authors ?? "")
  const [totalPages, setTotalPages] = useState(
    book?.total_pages ? String(book.total_pages) : ""
  )
  const [uploading, setUploading] = useState(false)
  const [inspecting, setInspecting] = useState(false)
  const [savingFile, setSavingFile] = useState(false)
  const [readingFile, setReadingFile] = useState<PendingReadingFile | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const createdIdRef = useRef<string | null>(null)
  const savingRef = useRef(false)
  const inspectRequest = useRef(0)

  async function handleCoverFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.")
      return
    }

    setUploading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Sua sessão expirou. Entre novamente.")
        return
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage
        .from("covers")
        .upload(path, file, { contentType: file.type })
      if (error) throw error

      const { data } = supabase.storage.from("covers").getPublicUrl(path)
      setCoverUrl(data.publicUrl)
      toast.success("Capa enviada!")
    } catch {
      toast.error("Não foi possível enviar a capa.")
    } finally {
      setUploading(false)
    }
  }

  async function handleReadingFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    const requestId = ++inspectRequest.current
    setInspecting(true)
    setFileError(null)
    try {
      const info = await inspectReadingFile(file)
      if (requestId !== inspectRequest.current) return
      if (info.title) setTitle(info.title)
      if (info.authors) setAuthors(info.authors)
      if (info.pageCount > 0) setTotalPages(String(info.pageCount))
      if (info.coverBlob) {
        const uploadedCover = await uploadCoverBlob(info.coverBlob)
        if (requestId !== inspectRequest.current) return
        if (uploadedCover) setCoverUrl(uploadedCover)
        else toast.error("Não foi possível usar a capa do arquivo.")
      }
      setReadingFile({ file, pageCount: info.pageCount })
      toast.success("Arquivo lido. Os campos encontrados foram preenchidos.")
    } catch (error) {
      if (requestId !== inspectRequest.current) return
      setReadingFile(null)
      setFileError(
        error instanceof Error ? error.message : "Não foi possível ler o arquivo."
      )
    } finally {
      if (requestId === inspectRequest.current) setInspecting(false)
    }
  }

  function clearReadingFile() {
    inspectRequest.current += 1
    setReadingFile(null)
    setInspecting(false)
  }

  async function submitWithFile(formData: FormData) {
    if (!readingFile || savingRef.current) return
    savingRef.current = true
    setSavingFile(true)
    setFileError(null)
    try {
      let bookId = createdIdRef.current
      if (!bookId) {
        const created = await createManualBook(formData)
        if ("error" in created) {
          setFileError(created.error)
          return
        }
        bookId = created.id
        createdIdRef.current = bookId
        setCreatedId(bookId)
      } else {
        formData.set("id", bookId)
        const updated = await updateManualBook(formData)
        if ("error" in updated) {
          setFileError(updated.error)
          return
        }
      }

      const uploaded = await uploadReadingFile({
        bookId,
        file: readingFile.file,
        pageCount: readingFile.pageCount,
      })
      if ("error" in uploaded) {
        setFileError(uploaded.error)
        return
      }

      const attached = await attachPdf(undefined, uploaded.formData)
      if (attached?.error) {
        setFileError(attached.error)
        return
      }

      router.push(`/livro/${bookId}`)
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : "Não foi possível salvar o livro."
      )
    } finally {
      savingRef.current = false
      setSavingFile(false)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (mode !== "create" || (!readingFile && !createdIdRef.current)) return
    event.preventDefault()
    if (!readingFile && createdIdRef.current) {
      router.push(`/livro/${createdIdRef.current}`)
      return
    }
    const formData = new FormData(event.currentTarget)
    void submitWithFile(formData)
  }

  const formError = fileError ?? state?.error

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-5">
      {book && <input type="hidden" name="id" value={book.id} />}

      {formError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      )}
      {createdId && fileError && (
        <Button type="button" variant="outline" className="w-full" render={<Link href={`/livro/${createdId}`} />}>
          Abrir livro criado
        </Button>
      )}

      {mode === "create" && (
        <div className="space-y-2">
          <Label htmlFor="reading-file">PDF ou EPUB</Label>
          <label
            htmlFor="reading-file"
            className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-primary/35 bg-primary/5 px-4 py-3 text-center transition-colors hover:bg-primary/10"
          >
            <AppIcon
              icon={inspecting ? uploadingLoop : uploadSimple}
              className="size-5 text-primary"
            />
            <span className="max-w-full truncate text-sm font-semibold">
              {inspecting
                ? "Lendo arquivo..."
                : readingFile
                  ? readingFile.file.name
                  : "Enviar PDF ou EPUB"}
            </span>
            <span className="text-xs text-muted-foreground">
              {readingFile
                ? `${readingFormatLabel(readingFile.file.name)} · ${readingFile.pageCount} páginas · até 50 MB`
                : "Preenche título, autor, páginas e capa quando o arquivo tiver esses dados"}
            </span>
            <input
              id="reading-file"
              type="file"
              accept={READING_FILE_ACCEPT}
              className="hidden"
              onChange={handleReadingFile}
              disabled={inspecting || savingFile}
            />
          </label>
          {readingFile && (
            <button
              type="button"
              onClick={clearReadingFile}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Remover arquivo
            </button>
          )}
        </div>
      )}

      <div className="flex gap-4">
        <div className="w-22 shrink-0 sm:w-24">
          <BookCover title={title || "Livro"} coverUrl={coverUrl || null} />
        </div>
        <div className="flex-1 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              name="title"
              className={inputClass}
              placeholder="Nome do livro"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="authors">Autor(es)</Label>
            <Input
              id="authors"
              name="authors"
              className={inputClass}
              placeholder="Ex.: Machado de Assis"
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="total_pages">Total de páginas</Label>
          <Input
            id="total_pages"
            name="total_pages"
            type="number"
            min={1}
            inputMode="numeric"
            className={inputClass}
            placeholder="Ex.: 320"
            value={totalPages}
            onChange={(e) => setTotalPages(e.target.value)}
          />
        </div>
        {mode === "create" ? (
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue="want_to_read"
              className={cn(
                inputClass,
              "w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              )}
            >
              {STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="rating">Avaliação</Label>
            <select
              id="rating"
              name="rating"
              defaultValue={book?.rating ?? ""}
              className={cn(
                inputClass,
              "w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              )}
            >
              <option value="">Sem nota</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {"★".repeat(n)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="cover_url">Capa (URL)</Label>
        <div className="flex gap-2">
          <Input
            id="cover_url"
            name="cover_url"
            className={inputClass}
            placeholder="https://..."
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="cover-file"
            className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-input bg-background px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            {uploading ? (
              <AppIcon icon={uploadingLoop} className="size-4" />
            ) : (
              <AppIcon icon={uploadSimple} className="size-4" />
            )}
            Enviar imagem do dispositivo
          </label>
          <input
            id="cover-file"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverFile}
          />
          {coverUrl && (
            <button
              type="button"
              onClick={() => setCoverUrl("")}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <AppIcon icon={image} className="size-3.5" />
              Remover capa
            </button>
          )}
        </div>
      </div>

      <SubmitButton
        className="h-11 w-full"
        size="lg"
        disabled={savingFile || inspecting}
      >
        {savingFile
          ? "Salvando..."
          : createdId && readingFile
            ? "Tentar anexar novamente"
            : createdId
              ? "Abrir livro criado"
              : mode === "create"
                ? "Adicionar livro"
                : "Salvar alterações"}
      </SubmitButton>
    </form>
  )
}
