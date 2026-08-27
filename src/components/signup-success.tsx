"use client"

import confirmCircle from "@iconify-icons/line-md/confirm-circle"

import { AppIcon } from "@/components/app-icon"
import { Button } from "@/components/ui/button"

export function SignupSuccess({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 py-4 text-center animate-in fade-in-0 zoom-in-95 duration-500">
      <div className="flex size-24 items-center justify-center rounded-full bg-linear-to-br from-emerald-400 to-emerald-600 shadow-xl shadow-emerald-500/30">
        <AppIcon icon={confirmCircle} className="size-14 text-white" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-xl font-bold">Conta criada com sucesso!</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Enviamos um link de confirmação para o seu e-mail.
          <br />
          Confirme para ativar a conta e então faça login.
        </p>
      </div>
      <Button onClick={onContinue} className="h-11 w-full" size="lg">
        Ir para o login
      </Button>
    </div>
  )
}
