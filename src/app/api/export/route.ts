import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 })

  const [{ data: books, error: booksError }, { data: progress, error: progressError }, { data: notes, error: notesError }, { data: goals, error: goalsError }, { data: achievements, error: achievementsError }] = await Promise.all([
    supabase.from("books").select("*").order("created_at", { ascending: true }),
    supabase.from("progress_log").select("*").order("read_on", { ascending: true }),
    supabase.from("notes").select("*").order("created_at", { ascending: true }),
    supabase.from("reading_goals").select("*").maybeSingle(),
    supabase.from("achievements").select("*").order("unlocked_at", { ascending: true }),
  ])

  if (booksError || progressError || notesError || goalsError || achievementsError) {
    return Response.json({ error: "Não foi possível gerar o backup." }, { status: 500 })
  }

  const payload = {
    schema_version: 1,
    exported_at: new Date().toISOString(),
    account: { username: user.user_metadata?.username ?? "" },
    books: books ?? [],
    progress_log: progress ?? [],
    notes: notes ?? [],
    reading_goals: goals ?? null,
    achievements: achievements ?? [],
    pdfs: (books ?? [])
      .filter((book) => book.pdf_path)
      .map((book) => ({
        book_id: book.id,
        file_name: book.pdf_file_name,
        file_size: book.pdf_file_size,
        page_count: book.pdf_page_count,
      })),
  }

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="biblioteca-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  })
}
