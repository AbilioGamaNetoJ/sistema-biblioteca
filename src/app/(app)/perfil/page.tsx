import type { Metadata } from "next"

import { ProfileForm } from "@/components/profile-form"
import { DataTransfer } from "@/components/data-transfer"
import { PwaInstallCard } from "@/components/pwa-install"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { getProfile } from "@/lib/queries"

export const metadata: Metadata = {
  title: "Perfil",
}

export default async function PerfilPage() {
  const profile = await getProfile()
  const initials = profile.username
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")

  return (
    <div className="mx-auto max-w-3xl space-y-6 lg:space-y-8">
      <header>
        <p className="text-sm font-semibold text-primary">Sua conta</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Perfil</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Personalize como sua biblioteca aparece para você.
        </p>
      </header>

      <Card className="bg-linear-to-br from-[#EEECFF] to-card">
        <CardContent className="flex items-center gap-4 sm:gap-5">
          <Avatar className="size-16 ring-4 ring-white shadow-lg sm:size-20">
            <AvatarFallback className="bg-linear-to-br from-indigo-500 to-violet-500 text-xl font-bold text-white">
            {initials || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold tracking-tight">{profile.username}</p>
            <p className="mt-1 truncate text-sm text-muted-foreground">{profile.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/90">
        <CardContent className="space-y-5">
          <div>
            <h2 className="font-bold tracking-tight">Dados do perfil</h2>
            <p className="mt-1 text-sm text-muted-foreground">Seu nome é usado na saudação inicial da biblioteca.</p>
          </div>
          <ProfileForm username={profile.username} />
        </CardContent>
      </Card>

      <PwaInstallCard />

      <DataTransfer />

      <p className="pt-2 text-center text-xs text-muted-foreground">
        Biblioteca v0.1.0
      </p>
    </div>
  )
}
