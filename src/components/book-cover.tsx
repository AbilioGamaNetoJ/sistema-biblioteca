import { cn } from "@/lib/utils"

interface BookCoverProps {
  title: string
  coverUrl?: string | null
  className?: string
}

export function BookCover({ title, coverUrl, className }: BookCoverProps) {
  if (coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coverUrl}
        alt={`Capa de ${title}`}
        loading="lazy"
        className={cn(
          "aspect-2/3 w-full rounded-xl bg-muted object-cover",
          className
        )}
      />
    )
  }

  const initials = title
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")

  return (
    <div
      className={cn(
        "flex aspect-2/3 w-full items-center justify-center rounded-xl bg-linear-to-br from-primary/85 to-violet-400 p-2 text-center",
        className
      )}
    >
      <span className="text-lg font-bold text-primary-foreground">
        {initials || "?"}
      </span>
    </div>
  )
}
