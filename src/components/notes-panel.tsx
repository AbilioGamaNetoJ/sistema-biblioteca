"use client"

import { useState, useActionState } from "react"
import notePencil from "@iconify-icons/ph/note-pencil"
import trash from "@iconify-icons/ph/trash"

import { AppIcon } from "@/components/app-icon"
import { SubmitButton } from "@/components/submit-button"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { deleteNote, saveNote, type ActionState } from "@/lib/actions/reading"
import type { Note } from "@/lib/types"

export function NotesPanel({
  bookId,
  pageNumber,
  notes,
}: {
  bookId: string
  pageNumber: number
  notes: Note[]
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveNote, undefined)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [content, setContent] = useState("")
  const pageNotes = notes.filter((note) => note.page_number === pageNumber)
  function cancelEdit() {
    setEditingId(null)
    setContent("")
  }

  return (
    <aside className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-primary">Página {pageNumber}</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight">Anotações</h2>
      </div>

      <form action={formAction} className="space-y-3 rounded-2xl border border-border/70 bg-card p-4">
        <input type="hidden" name="book_id" value={bookId} />
        <input type="hidden" name="page_number" value={pageNumber} />
        {editingId && <input type="hidden" name="note_id" value={editingId} />}
        <Textarea
          name="content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Escreva uma ideia, citação ou lembrete..."
          rows={4}
          required
        />
        {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
        <div className="flex gap-2">
          <SubmitButton className="flex-1" size="sm">
            {editingId ? "Atualizar anotação" : "Salvar anotação"}
          </SubmitButton>
          {editingId && (
            <Button type="button" size="sm" variant="outline" onClick={cancelEdit}>
              Cancelar
            </Button>
          )}
        </div>
      </form>

      {pageNotes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
          Nenhuma anotação nesta página.
        </p>
      ) : (
        <ul className="space-y-3">
          {pageNotes.map((note) => (
            <li key={note.id} className="rounded-2xl border border-border/70 bg-card p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{note.content}</p>
              <div className="mt-3 flex justify-end gap-1">
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Editar anotação"
                  onClick={() => {
                    setEditingId(note.id)
                    setContent(note.content)
                  }}
                >
                  <AppIcon icon={notePencil} />
                </Button>
                <form action={deleteNote}>
                  <input type="hidden" name="note_id" value={note.id} />
                  <input type="hidden" name="book_id" value={bookId} />
                  <Button type="submit" size="icon-xs" variant="ghost" aria-label="Excluir anotação">
                    <AppIcon icon={trash} />
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
