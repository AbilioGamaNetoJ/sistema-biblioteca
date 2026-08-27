"use client"

import Link from "next/link"
import { useActionState } from "react"

import { SubmitButton } from "@/components/submit-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/password-input"
import { signUp, type AuthState } from "@/lib/actions/auth"

export function SignupForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(
    signUp,
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
        <Label htmlFor="username">Nome de usuário</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          placeholder="Como quer ser chamado?"
          className="h-11"
          required
        />
      </div>
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
      <SubmitButton className="h-11 w-full" size="lg">
        Criar conta
      </SubmitButton>
      <Button
        variant="ghost"
        className="h-11 w-full"
        size="lg"
        render={<Link href="/login" />}
      >
        Já tem conta? Entrar
      </Button>
    </form>
  )
}
