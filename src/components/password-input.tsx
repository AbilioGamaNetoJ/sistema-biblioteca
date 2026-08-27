"use client"

import eye from "@iconify-icons/ph/eye"
import eyeSlash from "@iconify-icons/ph/eye-slash"
import { useState, type ComponentProps } from "react"

import { AppIcon } from "@/components/app-icon"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type PasswordInputProps = Omit<ComponentProps<typeof Input>, "type">

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-9", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
      >
        {visible ? (
          <AppIcon icon={eyeSlash} className="size-4" />
        ) : (
          <AppIcon icon={eye} className="size-4" />
        )}
      </button>
    </div>
  )
}
