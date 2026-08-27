import Link from "next/link"

import { BookCover } from "@/components/book-cover"
import { progressPercent, type Book } from "@/lib/types"

export function BookCard({ book }: { book: Book }) {
  const percent = progressPercent(book)

  return (
    <Link
      href={`/livro/${book.id}`}
      className="group block space-y-2"
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-muted shadow-[0_12px_24px_-18px_oklch(0.3_0.06_285_/_0.65)] transition duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_18px_28px_-18px_oklch(0.3_0.06_285_/_0.7)] group-active:scale-[0.98]">
        <BookCover
          title={book.title}
          coverUrl={book.cover_url}
          className="rounded-none"
        />
        {book.status === "reading" && percent !== null && (
          <span className="absolute right-2 bottom-2 rounded-full bg-background/95 px-2 py-1 text-[0.65rem] font-bold text-primary shadow-sm backdrop-blur">
            {percent}%
          </span>
        )}
      </div>
      <div>
        <p className="line-clamp-2 text-sm leading-snug font-semibold tracking-tight">
          {book.title}
        </p>
        {book.authors && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {book.authors}
          </p>
        )}
        {book.status === "reading" && (
          <div className="mt-1 space-y-0.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${percent ?? 0}%` }}
              />
            </div>
            <p className="text-[0.68rem] text-muted-foreground">
              {percent !== null
                ? `${percent}% · pág. ${book.current_page}`
                : `pág. ${book.current_page}`}
            </p>
          </div>
        )}
      </div>
    </Link>
  )
}
