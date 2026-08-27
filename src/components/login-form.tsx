"use client"

import Link from "next/link"
import { useActionState } from "react"

import { SubmitButton } from "@/components/submit-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/password-input"
import { signIn, type AuthState } from "@/lib/actions/auth"

export function LoginForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(
    signIn,
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
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          placeholder="Sua senha"
          className="h-11"
          required
        />
      </div>
      <SubmitButton className="h-11 w-full" size="lg">
        Entrar
      </SubmitButton>
      <Button
        variant="ghost"
        className="h-11 w-full"
        size="lg"
        render={<Link href="/cadastro" />}
      >
        Não tem conta? Cadastre-se
      </Button>
    </form>
  )
}
