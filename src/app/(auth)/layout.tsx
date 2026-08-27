import type { ReactNode } from "react"

import bookOpen from "@iconify-icons/ph/book-open"
import bookOpenText from "@iconify-icons/ph/book-open-text"

import { AppIcon } from "@/components/app-icon"
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-linear-to-br from-[#F7F6FC] via-[#F3F1FD] to-[#EAE8FA] lg:grid lg:grid-cols-[minmax(22rem,0.9fr)_minmax(28rem,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-linear-to-br from-[#4F46B5] via-[#6659C9] to-[#8B7BE4] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -top-24 -right-28 size-96 rounded-full bg-white/12 blur-3xl" />
        <div className="absolute right-12 bottom-10 size-64 rounded-full border border-white/15" />
        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15 shadow-lg backdrop-blur">
            <AppIcon icon={bookOpen} className="size-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">Biblioteca</span>
        </div>

        <div className="relative max-w-md">
          <p className="flex items-center gap-2 text-sm font-semibold text-white/80">
            <AppIcon icon={bookOpenText} className="size-4" />
            Sua jornada, página por página
          </p>
          <h1 className="mt-4 text-4xl leading-tight font-bold tracking-tight xl:text-5xl">
            Um lugar só para os livros que ficam com você.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-white/75">
            Organize leituras, celebre seu progresso e mantenha a próxima história sempre por perto.
          </p>
        </div>

        <p className="relative text-sm text-white/60">Biblioteca pessoal de leituras</p>
      </aside>

      <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-500 shadow-lg shadow-primary/25">
            <AppIcon icon={bookOpen} className="size-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight">Biblioteca</h1>
            <p className="text-sm text-muted-foreground">Acompanhe sua jornada de leitura</p>
          </div>
        </div>
        <div className="w-full max-w-md rounded-3xl border border-white/80 bg-card/95 p-6 shadow-[0_24px_60px_-38px_oklch(0.3_0.08_285_/_0.6)] sm:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
