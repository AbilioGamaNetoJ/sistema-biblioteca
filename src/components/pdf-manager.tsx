"use client"

import { useState, useActionState } from "react"
import Link from "next/link"
import downloadSimple from "@iconify-icons/ph/download-simple"
import filePdf from "@iconify-icons/ph/file-pdf"
import trash from "@iconify-icons/ph/trash"
import uploadSimple from "@iconify-icons/ph/upload-simple"

import { AppIcon } from "@/components/app-icon"
import { SubmitButton } from "@/components/submit-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { attachPdf, removePdf, type ActionState } from "@/lib/actions/reading"
import { createClient } from "@/lib/supabase/client"
import { pdfjsLib } from "@/lib/pdfjs"

const MAX_PDF_SIZE = 50 * 1024 * 1024

export function PdfManager({
  bookId,
  fileName,
  fileSize,
  pageCount,
}: {
  bookId: string
  fileName: string | null
  fileSize: number | null
  pageCount: number | null
}) {
  const [uploadState, uploadAction] = useActionState<ActionState, FormData>(
    attachPdf,
    undefined
  )
  const [removeState, removeAction] = useActionState<ActionState, FormData>(
    removePdf,
    undefined
  )
  const [busy, setBusy] = useState(false)
  const [clientError, setClientError] = useState<string | null>(null)

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setClientError(null)

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setClientError("Selecione um arquivo PDF.")
      return
    }
    if (file.size <= 0 || file.size > MAX_PDF_SIZE) {
      setClientError("O PDF precisa ter entre 1 byte e 50 MB.")
      return
    }

    setBusy(true)
    try {
      const loadingTask = pdfjsLib.getDocument({ data: await file.arrayBuffer() })
      const document = await loadingTask.promise
      const detectedPageCount = document.numPages
      document.cleanup()

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Sua sessão expirou. Entre novamente.")

      const path = `${user.id}/${bookId}.pdf`
      const { error } = await supabase.storage.from("book-pdfs").upload(path, file, {
        contentType: "application/pdf",
        upsert: true,
      })
      if (error) throw error

      const formData = new FormData()
      formData.set("book_id", bookId)
      formData.set("pdf_path", path)
      formData.set("pdf_file_name", file.name)
      formData.set("pdf_file_size", String(file.size))
      formData.set("pdf_page_count", String(detectedPageCount))
      uploadAction(formData)
    } catch (error) {
      setClientError(error instanceof Error ? error.message : "Não foi possível enviar o PDF.")
    } finally {
      setBusy(false)
    }
  }

  const error = clientError ?? uploadState?.error ?? removeState?.error

  return (
    <Card className="bg-card/90">
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <AppIcon icon={filePdf} className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold tracking-tight">Leitura em PDF</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Anexe um PDF privado para ler, marcar a página atual e fazer anotações.
            </p>
          </div>
        </div>

        {fileName ? (
          <div className="rounded-2xl border border-border/70 bg-muted/40 p-3">
            <p className="truncate text-sm font-semibold">{fileName}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {pageCount ? `${pageCount} páginas` : "Quantidade de páginas desconhecida"}
              {fileSize ? ` · ${(fileSize / (1024 * 1024)).toFixed(1)} MB` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" render={<Link href={`/livro/${bookId}/ler`} />}>
                <AppIcon icon={filePdf} data-icon="inline-start" />
                Ler PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                render={<a href={`/api/books/${bookId}/pdf`} download />}
              >
                <AppIcon icon={downloadSimple} data-icon="inline-start" />
                Baixar
              </Button>
              <label className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-xl border border-border bg-background px-2.5 text-[0.8rem] font-semibold hover:bg-muted">
                <AppIcon icon={uploadSimple} className="size-3.5" />
                Substituir
                <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={handleFile} />
              </label>
              <form action={removeAction}>
                <input type="hidden" name="book_id" value={bookId} />
                <SubmitButton size="sm" variant="destructive" disabled={busy}>
                  <AppIcon icon={trash} data-icon="inline-start" />
                  Remover
                </SubmitButton>
              </form>
            </div>
          </div>
        ) : (
          <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/35 bg-primary/5 px-4 text-center transition-colors hover:bg-primary/10">
            <AppIcon icon={uploadSimple} className="size-5 text-primary" />
            <span className="text-sm font-semibold">Escolher PDF</span>
            <span className="text-xs text-muted-foreground">Até 50 MB</span>
            <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={handleFile} />
          </label>
        )}

        {busy && <p className="text-xs text-muted-foreground">Processando PDF...</p>}
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
