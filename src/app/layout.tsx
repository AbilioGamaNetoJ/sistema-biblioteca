import type { Metadata, Viewport } from "next"

import { Toaster } from "@/components/ui/sonner"
import { PwaRegister } from "@/components/pwa-register"

import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "Biblioteca",
    template: "%s · Biblioteca",
  },
  description:
    "Acompanhe seu progresso de leitura: o que você está lendo, quer ler e já leu.",
  applicationName: "Biblioteca",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Biblioteca",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/icons/apple-touch-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" richColors />
        <PwaRegister />
      </body>
    </html>
  )
}
