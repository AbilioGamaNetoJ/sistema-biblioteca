import type { Metadata } from "next"

import { SignupForm } from "@/components/signup-form"

export const metadata: Metadata = {
  title: "Criar conta",
}

export default function CadastroPage() {
  return (
    <div>
      <p className="text-sm font-semibold text-primary">Comece sua estante</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight">Criar conta</h2>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Leva apenas um momento para guardar suas próximas histórias.
      </p>
      <SignupForm />
    </div>
  )
}
