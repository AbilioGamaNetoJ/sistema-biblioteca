"use client"

import { useActionState } from "react"
import signOutIcon from "@iconify-icons/ph/sign-out"

import { AppIcon } from "@/components/app-icon"
import { SubmitButton } from "@/components/submit-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signOut } from "@/lib/actions/auth"
import { updateProfile, type ActionState } from "@/lib/actions/books"

export function ProfileForm({ username }: { username: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateProfile,
    undefined
  )

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
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
            className="h-11"
            defaultValue={username}
            required
          />
        </div>
        <SubmitButton className="h-11 w-full" size="lg">
          Salvar
        </SubmitButton>
      </form>

      <form action={signOut}>
        <Button
          type="submit"
          variant="outline"
          className="h-11 w-full"
          size="lg"
        >
          <AppIcon icon={signOutIcon} data-icon="inline-start" />
          Sair da conta
        </Button>
      </form>
    </div>
  )
}
