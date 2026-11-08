import type { Metadata } from "next"

import { ForgotPasswordForm } from "@/components/forgot-password-form"

export const metadata: Metadata = {
  title: "Esqueci a senha",
}

export default async function EsqueciSenhaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { erro } = await searchParams

  return (
    <div>
      <p className="text-sm font-semibold text-primary">Recuperar acesso</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight">Esqueceu a senha?</h2>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Informe o e-mail da conta. Se ele estiver cadastrado, enviamos um link para criar uma nova senha.
      </p>
      <ForgotPasswordForm linkError={erro === "link"} />
    </div>
  )
}
