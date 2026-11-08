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
    .select("pdf_path, pdf_file_name")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()
  if (!book?.pdf_path) return new Response("Arquivo não encontrado.", { status: 404 })

  const fileName =
    typeof book.pdf_file_name === "string"
      ? book.pdf_file_name.replace(/[\r\n"]/g, "").slice(0, 255)
      : ""
  const { data, error } = await supabase.storage
    .from("book-pdfs")
    .createSignedUrl(book.pdf_path, 60 * 60, { download: fileName || true })
  if (error || !data?.signedUrl) return new Response("Arquivo indisponível.", { status: 404 })

  return Response.redirect(data.signedUrl)
}
