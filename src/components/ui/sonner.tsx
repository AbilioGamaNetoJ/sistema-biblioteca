"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import checkCircle from "@iconify-icons/ph/check-circle"
import info from "@iconify-icons/ph/info"
import warning from "@iconify-icons/ph/warning"
import xCircle from "@iconify-icons/ph/x-circle"
import loadingLoop from "@iconify-icons/line-md/loading-loop"
import { AppIcon } from "@/components/app-icon"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <AppIcon icon={checkCircle} className="size-4" />
        ),
        info: (
          <AppIcon icon={info} className="size-4" />
        ),
        warning: (
          <AppIcon icon={warning} className="size-4" />
        ),
        error: (
          <AppIcon icon={xCircle} className="size-4" />
        ),
        loading: (
          <AppIcon icon={loadingLoop} className="size-4" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
