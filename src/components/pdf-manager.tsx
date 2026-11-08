"use client"

import { useState, useActionState } from "react"
import Link from "next/link"
import bookOpenText from "@iconify-icons/ph/book-open-text"
import downloadSimple from "@iconify-icons/ph/download-simple"
import filePdf from "@iconify-icons/ph/file-pdf"
import trash from "@iconify-icons/ph/trash"
import uploadSimple from "@iconify-icons/ph/upload-simple"

import { AppIcon } from "@/components/app-icon"
import { SubmitButton } from "@/components/submit-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { attachPdf, removePdf, type ActionState } from "@/lib/actions/reading"
import { inspectReadingFile, uploadReadingFile } from "@/lib/reading-file-client"
import {
  READING_FILE_ACCEPT,
  READING_FILE_MAX_LABEL,
  readingFormatLabel,
} from "@/lib/reading-file"

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
  const formatLabel = fileName ? readingFormatLabel(fileName) : null
  const fileIcon = formatLabel === "EPUB" ? bookOpenText : filePdf

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setClientError(null)
    setBusy(true)
    try {
      const info = await inspectReadingFile(file)
      const uploaded = await uploadReadingFile({
        bookId,
        file,
        pageCount: info.pageCount,
      })
      if ("error" in uploaded) {
        setClientError(uploaded.error)
        return
      }
      uploadAction(uploaded.formData)
    } catch (error) {
      setClientError(
        error instanceof Error ? error.message : "Não foi possível enviar o arquivo."
      )
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
            <AppIcon icon={fileIcon} className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold tracking-tight">Arquivo de leitura</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Anexe um PDF ou EPUB privado para ler, marcar a página atual e fazer anotações.
            </p>
          </div>
        </div>

        {fileName ? (
          <div className="rounded-2xl border border-border/70 bg-muted/40 p-3">
            <p className="truncate text-sm font-semibold">{fileName}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatLabel}
              {pageCount ? ` · ${pageCount} páginas` : " · Quantidade de páginas desconhecida"}
              {fileSize ? ` · ${(fileSize / (1024 * 1024)).toFixed(1)} MB` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" render={<Link href={`/livro/${bookId}/ler`} />}>
                <AppIcon icon={fileIcon} data-icon="inline-start" />
                Ler
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
                <input
                  type="file"
                  accept={READING_FILE_ACCEPT}
                  className="hidden"
                  onChange={handleFile}
                />
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
            <span className="text-sm font-semibold">Escolher PDF ou EPUB</span>
            <span className="text-xs text-muted-foreground">Até {READING_FILE_MAX_LABEL}</span>
            <input
              type="file"
              accept={READING_FILE_ACCEPT}
              className="hidden"
              onChange={handleFile}
            />
          </label>
        )}

        {busy && <p className="text-xs text-muted-foreground">Processando arquivo...</p>}
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
