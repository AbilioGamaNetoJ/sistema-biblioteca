"use client"

import trash from "@iconify-icons/ph/trash"

import { AppIcon } from "@/components/app-icon"
import { Button } from "@/components/ui/button"
import { deleteBook } from "@/lib/actions/books"

export function DeleteBookButton({
  bookId,
  bookTitle,
}: {
  bookId: string
  bookTitle: string
}) {
  return (
    <form
      action={deleteBook}
      onSubmit={(e) => {
        if (!confirm(`Excluir "${bookTitle}"? Esta ação não pode ser desfeita.`)) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="id" value={bookId} />
      <Button type="submit" variant="destructive" className="w-full" size="lg">
        <AppIcon icon={trash} data-icon="inline-start" />
        Excluir livro
      </Button>
    </form>
  )
}
