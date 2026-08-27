"use client"

import { useActionState } from "react"

import { setStatus, type ActionState } from "@/lib/actions/books"
import { localDateString, STATUS_LABELS, STATUS_VALUES, type BookStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

export function StatusSegmented({
  bookId,
  status,
}: {
  bookId: string
  status: BookStatus
}) {
  const [, formAction] = useActionState<ActionState, FormData>(
    setStatus,
    undefined
  )

  function submit(formData: FormData) {
    formData.set("read_on", localDateString())
    formAction(formData)
  }

  return (
    <div className="flex rounded-2xl bg-muted/80 p-1.5">
      {STATUS_VALUES.map((value) => (
        <form key={value} action={submit} className="flex-1">
          <input type="hidden" name="id" value={bookId} />
          <input type="hidden" name="status" value={value} />
          <button
            type="submit"
            className={cn(
              "h-9 w-full rounded-xl text-sm font-semibold transition-all",
              value === status
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {STATUS_LABELS[value]}
          </button>
        </form>
      ))}
    </div>
  )
}
