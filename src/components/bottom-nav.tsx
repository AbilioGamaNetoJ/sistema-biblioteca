"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import arrowHome from "@iconify-icons/ph/house"
import books from "@iconify-icons/ph/books"
import bookOpen from "@iconify-icons/ph/book-open"
import plusCircle from "@iconify-icons/ph/plus-circle"
import userCircle from "@iconify-icons/ph/user-circle"
import chartLineUp from "@iconify-icons/ph/chart-line-up"

import { AppIcon } from "@/components/app-icon"
import { cn } from "@/lib/utils"

const ITEMS = [
  { href: "/", label: "Início", icon: arrowHome },
  { href: "/estante", label: "Estante", icon: books },
  { href: "/estatisticas", label: "Estatísticas", icon: chartLineUp },
  { href: "/adicionar", label: "Adicionar", icon: plusCircle, primary: true },
  { href: "/perfil", label: "Perfil", icon: userCircle },
]

export function BottomNav({ username }: { username: string }) {
  const pathname = usePathname()
  const initials = username
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href)
  }

  return (
    <>
      <aside className="hidden border-r border-sidebar-border/80 bg-sidebar/85 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:p-5">
        <Link href="/" className="mb-10 flex items-center gap-3 px-2">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <AppIcon icon={bookOpen} className="size-5" />
          </span>
          <span>
            <span className="block text-lg leading-none font-bold tracking-tight">
              Biblioteca
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Sua jornada de leitura
            </span>
          </span>
        </Link>

        <nav aria-label="Navegação principal" className="space-y-1">
          {ITEMS.map(({ href, label, icon: Icon, primary }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-all",
                  primary
                    ? "mt-5 bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
                    : active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <AppIcon icon={Icon} className="size-[1.15rem]" />
                {label}
              </Link>
            )
          })}
        </nav>

        <Link
          href="/perfil"
          className="mt-auto flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 p-3 transition-colors hover:bg-muted"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white">
            {initials || "?"}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{username || "Perfil"}</span>
            <span className="block text-xs text-muted-foreground">Ver perfil</span>
          </span>
        </Link>
      </aside>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto grid max-w-2xl grid-cols-5 px-1">
          {ITEMS.map(({ href, label, icon: Icon, primary }) => {
            const active = isActive(href)

            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-15 flex-col items-center justify-center gap-1 py-2 text-[0.65rem] font-semibold transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {primary ? (
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-95">
                    <AppIcon icon={Icon} className="size-5" />
                  </span>
                ) : (
                  <AppIcon icon={Icon} className="size-5" />
                )}
                {label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
