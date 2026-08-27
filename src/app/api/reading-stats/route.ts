import { syncAchievements } from "@/lib/achievements"
import { createClient } from "@/lib/supabase/server"
import { getAchievements, getReadingGoals, getReadingStats } from "@/lib/queries"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 })

  const url = new URL(request.url)
  const startDate = url.searchParams.get("start") ?? ""
  const endDate = url.searchParams.get("end") ?? ""
  const today = url.searchParams.get("today") ?? ""
  if (![startDate, endDate, today].every((value) => DATE_RE.test(value))) {
    return Response.json({ error: "Intervalo de datas inválido." }, { status: 400 })
  }

  try {
    await syncAchievements(supabase, user.id, today)
    const [stats, goals, achievements] = await Promise.all([
      getReadingStats({ startDate, endDate, today }),
      getReadingGoals(),
      getAchievements(),
    ])
    return Response.json({ stats, goals, achievements })
  } catch {
    return Response.json(
      { error: "Não foi possível carregar as estatísticas." },
      { status: 500 }
    )
  }
}
