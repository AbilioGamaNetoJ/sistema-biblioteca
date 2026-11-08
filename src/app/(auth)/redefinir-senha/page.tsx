import type { Metadata } from "next"

import { ResetPasswordForm } from "@/components/reset-password-form"

export const metadata: Metadata = {
  title: "Redefinir senha",
}

export default function RedefinirSenhaPage() {
  return (
    <div>
      <p className="text-sm font-semibold text-primary">Nova senha</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight">Redefinir senha</h2>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Escolha uma senha com no mínimo 6 caracteres.
      </p>
      <ResetPasswordForm />
    </div>
  )
}
