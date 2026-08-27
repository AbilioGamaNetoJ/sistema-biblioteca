"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import arrowUpRight from "@iconify-icons/ph/arrow-up-right"
import target from "@iconify-icons/ph/target"

import { AppIcon } from "@/components/app-icon"
import { Card, CardContent } from "@/components/ui/card"
import { localDateString, type ReadingGoals, type ReadingStats } from "@/lib/types"

export function GoalSummary() {
  const [data, setData] = useState<{ goals: ReadingGoals; stats: ReadingStats } | null>(null)

  useEffect(() => {
    const now = new Date()
    const start = localDateString(new Date(now.getFullYear(), now.getMonth(), 1))
    const end = localDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0))
    const today = localDateString(now)
    fetch(`/api/reading-stats?start=${start}&end=${end}&today=${today}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((value: { goals: ReadingGoals | null; stats: ReadingStats } | null) => {
        if (value?.goals) setData({ goals: value.goals, stats: value.stats })
      })
      .catch(() => undefined)
  }, [])

  if (!data) return null
  const { goals, stats } = data
  const items = [
    goals.pages_per_day ? { label: "Páginas hoje", current: stats.todayPages, goal: goals.pages_per_day } : null,
    goals.books_per_month ? { label: "Livros no mês", current: stats.monthBooks, goal: goals.books_per_month } : null,
    goals.books_per_year ? { label: "Livros no ano", current: stats.yearBooks, goal: goals.books_per_year } : null,
  ].filter((item): item is { label: string; current: number; goal: number } => Boolean(item))

  return (
    <Card className="bg-linear-to-br from-[#F0EEFF] to-card">
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2"><AppIcon icon={target} className="size-5 text-primary" /><h2 className="font-bold tracking-tight">Metas de leitura</h2></div>
          <Link href="/estatisticas" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">Ver detalhes <AppIcon icon={arrowUpRight} className="size-3.5" /></Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {items.map((item) => {
            const value = Math.min(100, Math.round((item.current / item.goal) * 100))
            return <div key={item.label} className="rounded-2xl border border-white/80 bg-background/60 p-3"><div className="flex items-end justify-between gap-2"><p className="text-xs text-muted-foreground">{item.label}</p><p className="text-sm font-bold">{value}%</p></div><p className="mt-1 font-bold">{item.current} <span className="text-xs font-medium text-muted-foreground">/ {item.goal}</span></p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} /></div></div>
          })}
        </div>
      </CardContent>
    </Card>
  )
}
