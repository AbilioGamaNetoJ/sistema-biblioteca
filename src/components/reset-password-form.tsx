"use client"

import Link from "next/link"
import { useActionState } from "react"

import { PasswordInput } from "@/components/password-input"
import { SubmitButton } from "@/components/submit-button"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { updatePassword, type AuthState } from "@/lib/actions/auth"

export function ResetPasswordForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(
    updatePassword,
    undefined
  )

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="password">Nova senha</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          placeholder="Mínimo de 6 caracteres"
          className="h-11"
          minLength={6}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar senha</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Repita a senha"
          className="h-11"
          minLength={6}
          required
        />
      </div>
      <SubmitButton className="h-11 w-full" size="lg" pendingLabel="Salvando...">
        Salvar nova senha
      </SubmitButton>
      <Button
        variant="ghost"
        className="h-11 w-full"
        size="lg"
        render={<Link href="/esqueci-senha" />}
      >
        Pedir um novo link
      </Button>
    </form>
  )
}
