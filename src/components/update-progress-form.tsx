"use client"

import { useActionState } from "react"

import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { updateProgress, type ActionState } from "@/lib/actions/books"
import { localDateString } from "@/lib/types"

export function UpdateProgressForm({
  bookId,
  currentPage,
  totalPages,
}: {
  bookId: string
  currentPage: number
  totalPages: number | null
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateProgress,
    undefined
  )

  function submit(formData: FormData) {
    formData.set("read_on", localDateString())
    formAction(formData)
  }

  return (
    <form action={submit} className="space-y-2.5">
      <input type="hidden" name="id" value={bookId} />
      {state?.error && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label
            htmlFor={`page-${bookId}`}
            className="text-xs text-muted-foreground"
          >
            Página atual {totalPages ? `de ${totalPages}` : ""}
          </label>
          <Input
            id={`page-${bookId}`}
            name="current_page"
            type="number"
            min={0}
            max={totalPages ?? undefined}
            inputMode="numeric"
            defaultValue={currentPage || ""}
            key={currentPage}
            placeholder="0"
            className="h-11"
            required
          />
        </div>
        <SubmitButton className="h-11" size="lg">
          Salvar
        </SubmitButton>
      </div>
    </form>
  )
}
