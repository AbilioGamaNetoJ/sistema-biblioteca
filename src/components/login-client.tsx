"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { LoginForm } from "@/components/login-form"
import { SignupSuccess } from "@/components/signup-success"

export function LoginClient({ showSuccess }: { showSuccess: boolean }) {
  const router = useRouter()
  const [success, setSuccess] = useState(showSuccess)

  if (success) {
    return (
      <SignupSuccess
        onContinue={() => {
          setSuccess(false)
          router.replace("/login")
        }}
      />
    )
  }

  return (
    <div>
      <p className="text-sm font-semibold text-primary">Que bom ter você de volta</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight">Entrar</h2>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Continue acompanhando suas leituras.
      </p>
      <LoginForm />
    </div>
  )
}
