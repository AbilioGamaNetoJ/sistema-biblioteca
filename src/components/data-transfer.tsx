"use client"

import { useState } from "react"
import downloadSimple from "@iconify-icons/ph/download-simple"
import uploadSimple from "@iconify-icons/ph/upload-simple"

import { AppIcon } from "@/components/app-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type ImportResult = {
  message?: string
  error?: string
  createdBooks?: number
  updatedBooks?: number
  importedProgress?: number
  importedNotes?: number
  pendingPdfs?: number
}

export function DataTransfer() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function importBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: await file.text(),
      })
      const result = (await response.json()) as ImportResult
      if (!response.ok) throw new Error(result.error || "Não foi possível importar o backup.")
      setMessage(`${result.message} ${result.createdBooks ?? 0} livros adicionados, ${result.importedProgress ?? 0} registros de progresso e ${result.importedNotes ?? 0} notas.` + (result.pendingPdfs ? ` ${result.pendingPdfs} PDF(s) precisam ser reenviados.` : ""))
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Não foi possível importar o backup.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="bg-card/90">
      <CardContent className="space-y-4">
        <div>
          <h2 className="font-bold tracking-tight">Dados e backup</h2>
          <p className="mt-1 text-sm text-muted-foreground">Exporte seus livros, progresso, notas, metas e conquistas. PDFs são baixados separadamente na página de cada livro.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button render={<a href="/api/export" download="biblioteca-backup.json" />} variant="outline" className="flex-1" disabled={busy}>
            <AppIcon icon={downloadSimple} data-icon="inline-start" />
            Exportar JSON
          </Button>
          <label className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-4 text-sm font-semibold shadow-sm transition-all hover:-translate-y-px hover:bg-muted hover:shadow-md">
            <AppIcon icon={uploadSimple} className="size-4" />
            {busy ? "Importando..." : "Importar JSON"}
            <input type="file" accept="application/json,.json" className="hidden" onChange={importBackup} disabled={busy} />
          </label>
        </div>
        {message && <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">{message}</p>}
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
