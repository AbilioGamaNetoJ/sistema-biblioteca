import { createClient } from "@/lib/supabase/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response("Não autenticado.", { status: 401 })

  const { data: book } = await supabase
    .from("books")
    .select("pdf_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()
  if (!book?.pdf_path) return new Response("PDF não encontrado.", { status: 404 })

  const { data, error } = await supabase.storage
    .from("book-pdfs")
    .createSignedUrl(book.pdf_path, 60 * 60, { download: true })
  if (error || !data?.signedUrl) return new Response("PDF indisponível.", { status: 404 })

  return Response.redirect(data.signedUrl)
}
