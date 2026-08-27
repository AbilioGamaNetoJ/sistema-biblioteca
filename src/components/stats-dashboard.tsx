"use client"

import { useEffect, useState, useSyncExternalStore, useActionState } from "react"
import chartLine from "@iconify-icons/ph/chart-line"
import medal from "@iconify-icons/ph/medal"
import target from "@iconify-icons/ph/target"
import trophy from "@iconify-icons/ph/trophy"

import { AppIcon } from "@/components/app-icon"
import { SubmitButton } from "@/components/submit-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { saveReadingGoals } from "@/lib/actions/reading"
import {
  achievementLabel,
  localDateString,
  type Achievement,
  type ReadingGoals,
  type ReadingStats,
} from "@/lib/types"

type StatsPayload = {
  stats: ReadingStats
  goals: ReadingGoals | null
  achievements: Achievement[]
}

function monthRange(value: string) {
  const [year, month] = value.split("-").map(Number)
  return {
    start: localDateString(new Date(year, month - 1, 1)),
    end: localDateString(new Date(year, month, 0)),
  }
}

function shiftMonth(value: string, amount: number) {
  const [year, month] = value.split("-").map(Number)
  return localDateString(new Date(year, month - 1 + amount, 1)).slice(0, 7)
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number)
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1)
  )
}

function percent(actual: number, goal: number | null) {
  if (!goal) return 0
  return Math.min(100, Math.round((actual / goal) * 100))
}

function GoalCard({
  label,
  actual,
  goal,
  suffix,
}: {
  label: string
  actual: number
  goal: number | null
  suffix: string
}) {
  const value = percent(actual, goal)
  return (
    <Card size="sm" className="bg-card/90">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold">{label}</p>
          <AppIcon icon={target} className="size-5 text-primary" />
        </div>
        {goal ? (
          <>
            <p className="text-2xl font-bold tracking-tight">
              {actual} <span className="text-sm font-medium text-muted-foreground">/ {goal} {suffix}</span>
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-muted" aria-label={`${value}% da meta`}>
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${value}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{value}% concluída</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Configure uma meta para acompanhar seu ritmo.</p>
        )}
      </CardContent>
    </Card>
  )
}

export function StatsDashboard() {
  const deviceToday = useSyncExternalStore(
    () => () => undefined,
    () => localDateString(),
    () => ""
  )
  const defaultMonth = deviceToday.slice(0, 7)
  const [selectedMonth, setSelectedMonth] = useState("")
  const month = selectedMonth || defaultMonth
  const today = deviceToday
  const [payload, setPayload] = useState<StatsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [goalValues, setGoalValues] = useState({ pages: "", monthly: "", yearly: "" })
  const [goalState, goalAction] = useActionState(saveReadingGoals, undefined)

  useEffect(() => {
    if (!month || !today) return
    let cancelled = false
    const range = monthRange(month)
    fetch(`/api/reading-stats?start=${range.start}&end=${range.end}&today=${today}`)
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || "Falha ao carregar estatísticas.")
        return body as StatsPayload
      })
      .then((body) => {
        if (!cancelled) {
          setPayload(body)
          setGoalValues({
            pages: body.goals?.pages_per_day?.toString() ?? "",
            monthly: body.goals?.books_per_month?.toString() ?? "",
            yearly: body.goals?.books_per_year?.toString() ?? "",
          })
          setError(null)
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Falha ao carregar estatísticas.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [month, today, goalState])

  if (loading && !payload) {
    return <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">Carregando suas estatísticas...</CardContent></Card>
  }
  if (error && !payload) {
    return <Card><CardContent className="py-16 text-center text-sm text-destructive">{error}</CardContent></Card>
  }
  if (!payload || !month) return null

  const { stats, goals, achievements } = payload
  const [year, monthNumber] = month.split("-").map(Number)
  const daysInMonth = new Date(year, monthNumber, 0).getDate()
  const pagesByDay = new Map(stats.dailyPages.map((item) => [item.date, item.pages]))
  const chartRows = Array.from({ length: daysInMonth }, (_, index) => {
    const date = localDateString(new Date(year, monthNumber - 1, index + 1))
    return { day: index + 1, pages: pagesByDay.get(date) ?? 0 }
  })
  const chartMax = Math.max(1, goals?.pages_per_day ?? 0, ...chartRows.map((row) => row.pages))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Seu ritmo</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Estatísticas</h1>
          <p className="mt-2 text-sm text-muted-foreground">Acompanhe cada página e cada livro concluído.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setSelectedMonth(shiftMonth(month, -1))}>Anterior</Button>
          <Input type="month" value={month} onChange={(event) => setSelectedMonth(event.target.value)} className="h-9 w-36" aria-label="Mês das estatísticas" />
          <Button type="button" size="sm" variant="outline" onClick={() => setSelectedMonth(shiftMonth(month, 1))}>Próximo</Button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <GoalCard label="Páginas hoje" actual={stats.todayPages} goal={goals?.pages_per_day ?? null} suffix="páginas" />
        <GoalCard label={`Livros em ${monthLabel(month)}`} actual={stats.monthBooks} goal={goals?.books_per_month ?? null} suffix="livros" />
        <GoalCard label={`Livros em ${year}`} actual={stats.yearBooks} goal={goals?.books_per_year ?? null} suffix="livros" />
      </section>

      <Card className="bg-card/90">
        <CardContent className="space-y-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><AppIcon icon={chartLine} className="size-5" /></span>
            <div>
              <h2 className="font-bold tracking-tight">Páginas por dia</h2>
              <p className="mt-1 text-sm text-muted-foreground">{stats.monthPages} páginas · {stats.readingDays} dias de leitura · média de {stats.averagePages}/dia</p>
            </div>
          </div>
          <div className="flex h-48 items-end gap-1 overflow-x-auto border-b border-border/70 pb-6 pt-4">
            {chartRows.map((row) => (
              <div key={row.day} className="group flex h-full min-w-2.5 flex-1 flex-col items-center justify-end gap-1">
                <span className="pointer-events-none text-[0.58rem] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">{row.pages}</span>
                <div className="w-full rounded-t-sm bg-primary/80 transition-all group-hover:bg-primary" style={{ height: `${row.pages ? Math.max(4, (row.pages / chartMax) * 100) : 2}%` }} title={`${row.day}: ${row.pages} páginas`} />
                <span className="text-[0.58rem] text-muted-foreground">{row.day}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/90">
        <CardContent className="space-y-4">
          <div>
            <h2 className="font-bold tracking-tight">Minhas metas</h2>
            <p className="mt-1 text-sm text-muted-foreground">Deixe em branco o que não quiser acompanhar.</p>
          </div>
          <form action={goalAction} className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1.5 text-sm font-medium">Páginas por dia<Input name="pages_per_day" type="number" min={1} value={goalValues.pages} onChange={(event) => setGoalValues((values) => ({ ...values, pages: event.target.value }))} placeholder="Ex.: 20" /></label>
            <label className="space-y-1.5 text-sm font-medium">Livros por mês<Input name="books_per_month" type="number" min={1} value={goalValues.monthly} onChange={(event) => setGoalValues((values) => ({ ...values, monthly: event.target.value }))} placeholder="Ex.: 2" /></label>
            <label className="space-y-1.5 text-sm font-medium">Livros por ano<Input name="books_per_year" type="number" min={1} value={goalValues.yearly} onChange={(event) => setGoalValues((values) => ({ ...values, yearly: event.target.value }))} placeholder="Ex.: 24" /></label>
            <div className="sm:col-span-3"><SubmitButton size="lg">Salvar metas</SubmitButton></div>
          </form>
          {goalState?.error && <p className="text-sm text-destructive">{goalState.error}</p>}
          {goalState?.success && <p className="text-sm text-emerald-600">{goalState.success}</p>}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center gap-3"><AppIcon icon={trophy} className="size-5 text-amber-500" /><div><h2 className="text-xl font-bold tracking-tight">Conquistas</h2><p className="text-sm text-muted-foreground">Metas alcançadas ao longo da sua jornada.</p></div></div>
        {achievements.length === 0 ? (
          <Card className="border-dashed"><CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground"><AppIcon icon={medal} className="size-6 text-primary" />As primeiras conquistas aparecem quando você atingir uma meta.</CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {achievements.map((achievement) => (
              <Card key={achievement.id} size="sm"><CardContent className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><AppIcon icon={trophy} className="size-5" /></span><div className="min-w-0"><p className="font-semibold">{achievementLabel(achievement.kind)}</p><p className="mt-1 text-sm text-muted-foreground">{achievement.actual_value} de {achievement.target_value} · {achievement.period_key}</p><p className="mt-1 text-xs text-muted-foreground">Desbloqueada em {new Intl.DateTimeFormat("pt-BR").format(new Date(achievement.unlocked_at))}</p></div></CardContent></Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
