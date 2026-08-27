"use client"

import { Icon } from "@iconify/react"
import type { IconifyIcon } from "@iconify/react"
import type { ComponentProps } from "react"

type AppIconProps = Omit<ComponentProps<typeof Icon>, "icon"> & {
  icon: IconifyIcon
}

/**
 * Iconify wrapper that accepts the statically bundled icon data selected for
 * Biblioteca. This keeps icons available offline and lets animated SVGs run
 * without contacting the Iconify API at runtime.
 */
export function AppIcon({ icon, "aria-label": ariaLabel, ...props }: AppIconProps) {
  return (
    <Icon
      icon={icon}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      {...props}
    />
  )
}
