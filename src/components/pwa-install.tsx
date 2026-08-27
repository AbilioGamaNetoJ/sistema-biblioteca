"use client"

import { useCallback, useState, useSyncExternalStore } from "react"
import downloadSimple from "@iconify-icons/ph/download-simple"
import x from "@iconify-icons/ph/x"

import { AppIcon } from "@/components/app-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const DISMISS_KEY = "biblioteca-pwa-install-dismissed-v2"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

type PwaInstallSnapshot = {
  prompt: BeforeInstallPromptEvent | null
  installed: boolean
}

const listeners = new Set<() => void>()
let snapshot: PwaInstallSnapshot = { prompt: null, installed: false }
const SERVER_SNAPSHOT: PwaInstallSnapshot = { prompt: null, installed: false }
let eventsBound = false

function emit() {
  for (const listener of listeners) listener()
}

function isStandaloneDisplay() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  )
}

function isIosDevice() {
  const ua = navigator.userAgent
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  )
}

function isChromiumBrowser() {
  const ua = navigator.userAgent
  return /Chrome|Chromium|Edg\//.test(ua) && !/OPR|Opera/.test(ua)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  bindInstallEvents()
  return () => {
    listeners.delete(listener)
  }
}

function waitForPrompt(timeoutMs: number) {
  if (snapshot.prompt) return Promise.resolve(snapshot.prompt)

  return new Promise<BeforeInstallPromptEvent | null>((resolve) => {
    const timeoutId = window.setTimeout(() => {
      unsubscribe()
      resolve(snapshot.prompt)
    }, timeoutMs)

    const unsubscribe = subscribe(() => {
      if (!snapshot.prompt) return
      window.clearTimeout(timeoutId)
      unsubscribe()
      resolve(snapshot.prompt)
    })
  })
}

function bindInstallEvents() {
  if (eventsBound) return
  eventsBound = true
  snapshot = { ...snapshot, installed: isStandaloneDisplay() }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault()
    snapshot = { prompt: event as BeforeInstallPromptEvent, installed: false }
    emit()
  })
  window.addEventListener("appinstalled", () => {
    snapshot = { prompt: null, installed: true }
    emit()
  })
}

function getSnapshot() {
  return snapshot
}

function getServerSnapshot(): PwaInstallSnapshot {
  return SERVER_SNAPSHOT
}

function getEnvironmentSnapshot() {
  const ios = isIosDevice() ? "1" : "0"
  const chromium = isChromiumBrowser() ? "1" : "0"
  const dismissed = window.localStorage.getItem(DISMISS_KEY) === "1" ? "1" : "0"
  return `${ios}:${chromium}:${dismissed}`
}

function getServerEnvironmentSnapshot() {
  return "0:0:1"
}

function usePwaInstall() {
  const { prompt, installed } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )
  const environment = useSyncExternalStore(
    subscribe,
    getEnvironmentSnapshot,
    getServerEnvironmentSnapshot
  )
  const [iosValue, chromiumValue, dismissedValue] = environment.split(":")
  const ios = iosValue === "1"
  const chromium = chromiumValue === "1"
  const dismissed = dismissedValue === "1"

  const install = useCallback(async () => {
    const nextPrompt = prompt ?? (await waitForPrompt(4000))
    if (!nextPrompt) return false
    await nextPrompt.prompt()
    const { outcome } = await nextPrompt.userChoice
    snapshot = {
      prompt: null,
      installed: outcome === "accepted" || isStandaloneDisplay(),
    }
    emit()
    return outcome === "accepted"
  }, [prompt])

  const dismiss = useCallback(() => {
    window.localStorage.setItem(DISMISS_KEY, "1")
    emit()
  }, [])

  return { installed, ios, chromium, dismissed, install, dismiss }
}

export function PwaInstallPrompt() {
  const { installed, ios, chromium, dismissed, install, dismiss } =
    usePwaInstall()
  const [iosHint, setIosHint] = useState(false)
  const [installing, setInstalling] = useState(false)

  if (installed || dismissed || (!ios && !chromium)) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 px-3 lg:bottom-6 lg:left-auto lg:right-6 lg:w-[22rem] lg:px-0">
      <div className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-white/80 bg-card/95 p-3 shadow-[0_16px_40px_-24px_oklch(0.29_0.06_285_/_0.55)] backdrop-blur-xl">
        <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
          <AppIcon icon={downloadSimple} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold tracking-tight">Biblioteca</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Adicione à tela inicial para abrir como um app.
          </p>
          {ios && iosHint ? (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Toque em Compartilhar e depois em Adicionar à Tela de Início.
            </p>
          ) : (
            <Button
              className="mt-2 h-8"
              size="sm"
              disabled={installing}
              onClick={() => {
                if (ios) {
                  setIosHint(true)
                  return
                }
                setInstalling(true)
                void install().finally(() => setInstalling(false))
              }}
            >
              {installing ? "Adicionando…" : "Adicionar"}
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          className="shrink-0"
          aria-label="Dispensar"
          onClick={dismiss}
        >
          <AppIcon icon={x} />
        </Button>
      </div>
    </div>
  )
}

export function PwaInstallCard() {
  const { installed, ios, chromium, install } = usePwaInstall()
  const [iosHint, setIosHint] = useState(false)
  const [installing, setInstalling] = useState(false)

  if (installed || (!ios && !chromium)) return null

  return (
    <Card className="bg-card/90">
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <AppIcon icon={downloadSimple} className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-bold tracking-tight">Adicionar à tela inicial</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Abra a Biblioteca direto da tela inicial, sem o navegador.
            </p>
          </div>
        </div>
        {ios && iosHint ? (
          <p className="text-sm text-muted-foreground">
            Toque em Compartilhar e escolha Adicionar à Tela de Início.
          </p>
        ) : (
          <Button
            className="h-11 w-full"
            size="lg"
            disabled={installing}
            onClick={() => {
              if (ios) {
                setIosHint(true)
                return
              }
              setInstalling(true)
              void install().finally(() => setInstalling(false))
            }}
          >
            {installing ? "Adicionando…" : "Adicionar"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
