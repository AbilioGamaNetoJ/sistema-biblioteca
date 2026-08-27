"use client"

import { useFormStatus } from "react-dom"
import type { ComponentProps } from "react"

import { Button } from "@/components/ui/button"

type SubmitButtonProps = ComponentProps<typeof Button>

export function SubmitButton({ children, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? "Salvando..." : children}
    </Button>
  )
}
