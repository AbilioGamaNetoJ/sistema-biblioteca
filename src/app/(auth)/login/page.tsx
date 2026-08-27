import type { Metadata } from "next"

import { LoginClient } from "@/components/login-client"

export const metadata: Metadata = {
  title: "Entrar",
}

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { cadastro } = await searchParams
  const showSuccess = cadastro === "sucesso"

  return <LoginClient showSuccess={showSuccess} />
}
