"use client"

import Link from "next/link"
import { useActionState } from "react"

import { SubmitButton } from "@/components/submit-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { requestPasswordReset, type AuthState } from "@/lib/actions/auth"

export function ForgotPasswordForm({ linkError = false }: { linkError?: boolean }) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    requestPasswordReset,
    undefined
  )

  return (
    <form action={formAction} className="space-y-5">
      {linkError && !state?.success && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Esse link é inválido ou expirou. Solicite um novo e-mail.
        </p>
      )}
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          className="h-11"
          required
        />
      </div>
      <SubmitButton className="h-11 w-full" size="lg" pendingLabel="Enviando...">
        Enviar link
      </SubmitButton>
      <Button
        variant="ghost"
        className="h-11 w-full"
        size="lg"
        render={<Link href="/login" />}
      >
        Voltar para o login
      </Button>
    </form>
  )
}
