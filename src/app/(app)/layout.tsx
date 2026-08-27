import type { ReactNode } from "react"

import { BottomNav } from "@/components/bottom-nav"
import { getProfile } from "@/lib/queries"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await getProfile()

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <BottomNav username={profile.username} />
      <main className="min-w-0 px-4 pt-5 pb-28 sm:px-6 sm:pt-7 lg:px-10 lg:py-10 xl:px-14">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  )
}
