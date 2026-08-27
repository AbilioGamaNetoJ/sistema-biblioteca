import type { SupabaseClient } from "@supabase/supabase-js"

import type { Achievement, AchievementKind, ReadingGoals } from "@/lib/types"

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function periodFor(date: string, kind: AchievementKind) {
  if (kind === "daily_pages") return date
  if (kind === "monthly_books") return date.slice(0, 7)
  return date.slice(0, 4)
}

function monthRange(date: string) {
  const current = parseDate(date)
  const start = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 1))
  const end = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0))
  return { start: formatDate(start), end: formatDate(end) }
}

function yearRange(date: string) {
  const year = parseDate(date).getUTCFullYear()
  return { start: `${year}-01-01`, end: `${year}-12-31` }
}

export async function syncAchievements(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  goals?: ReadingGoals | null
): Promise<Achievement[]> {
  const { data: storedGoals } = goals
    ? { data: goals }
    : await supabase.from("reading_goals").select("*").eq("user_id", userId).maybeSingle()

  if (!storedGoals) return []

  const month = monthRange(date)
  const year = yearRange(date)
  const [{ data: dayRows }, { count: monthBooks }, { count: yearBooks }] = await Promise.all([
    storedGoals.pages_per_day
      ? supabase
          .from("progress_log")
          .select("pages_read")
          .eq("read_on", date)
      : Promise.resolve({ data: [] as Array<{ pages_read: number }> }),
    storedGoals.books_per_month
      ? supabase
          .from("books")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "read")
          .gte("finished_at", month.start)
          .lte("finished_at", month.end)
      : Promise.resolve({ count: 0 }),
    storedGoals.books_per_year
      ? supabase
          .from("books")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "read")
          .gte("finished_at", year.start)
          .lte("finished_at", year.end)
      : Promise.resolve({ count: 0 }),
  ])

  const values: Array<{
    kind: AchievementKind
    target: number | null
    actual: number
  }> = [
    {
      kind: "daily_pages",
      target: storedGoals.pages_per_day,
      actual: (dayRows ?? []).reduce((total, row) => total + row.pages_read, 0),
    },
    {
      kind: "monthly_books",
      target: storedGoals.books_per_month,
      actual: monthBooks ?? 0,
    },
    {
      kind: "yearly_books",
      target: storedGoals.books_per_year,
      actual: yearBooks ?? 0,
    },
  ]

  const achieved = values.filter(
    (value): value is typeof value & { target: number } =>
      value.target !== null && value.actual >= value.target
  )
  if (achieved.length === 0) return []

  const periods = achieved.map((value) => periodFor(date, value.kind))
  const { data: existing } = await supabase
    .from("achievements")
    .select("kind, period_key")
    .eq("user_id", userId)
    .in("kind", achieved.map((value) => value.kind))
    .in("period_key", periods)

  const existingKeys = new Set(
    (existing ?? []).map((value) => `${value.kind}:${value.period_key}`)
  )
  const rows = achieved.map((value) => ({
    user_id: userId,
    kind: value.kind,
    period_key: periodFor(date, value.kind),
    target_value: value.target,
    actual_value: value.actual,
  }))

  const { error } = await supabase
    .from("achievements")
    .upsert(rows, { onConflict: "user_id,kind,period_key" })
  if (error) throw error

  const newKeys = new Set(
    rows
      .map((row) => `${row.kind}:${row.period_key}`)
      .filter((key) => !existingKeys.has(key))
  )
  if (newKeys.size === 0) return []

  const { data: unlocked } = await supabase
    .from("achievements")
    .select("*")
    .eq("user_id", userId)
    .in("kind", [...newKeys].map((key) => key.split(":")[0]))
    .in("period_key", [...newKeys].map((key) => key.split(":")[1]))

  return (unlocked ?? []).filter((item) =>
    newKeys.has(`${item.kind}:${item.period_key}`)
  ) as Achievement[]
}
