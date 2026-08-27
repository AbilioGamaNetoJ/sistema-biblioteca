"use client"

import { useActionState, useState } from "react"
import { toast } from "sonner"
import image from "@iconify-icons/ph/image"
import uploadSimple from "@iconify-icons/ph/upload-simple"
import uploadingLoop from "@iconify-icons/line-md/uploading-loop"

import { AppIcon } from "@/components/app-icon"
import { BookCover } from "@/components/book-cover"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  addBook,
  updateBook,
  type ActionState,
} from "@/lib/actions/books"
import { createClient } from "@/lib/supabase/client"
import { STATUS_LABELS, STATUS_VALUES, type Book } from "@/lib/types"
import { cn } from "@/lib/utils"

interface BookFormProps {
  mode: "create" | "edit"
  book?: Book
}

const inputClass = "h-11"

export function BookForm({ mode, book }: BookFormProps) {
  const action = mode === "create" ? addBook : updateBook
  const [state, formAction] = useActionState<ActionState, FormData>(
    action,
    undefined
  )

  const [coverUrl, setCoverUrl] = useState(book?.cover_url ?? "")
  const [title, setTitle] = useState(book?.title ?? "")
  const [uploading, setUploading] = useState(false)

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

  return (
    <form action={formAction} className="space-y-5">
      {book && <input type="hidden" name="id" value={book.id} />}

      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
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
              defaultValue={book?.authors ?? ""}
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
            defaultValue={book?.total_pages ?? ""}
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

      <SubmitButton className="h-11 w-full" size="lg">
        {mode === "create" ? "Adicionar livro" : "Salvar alterações"}
      </SubmitButton>
    </form>
  )
}
