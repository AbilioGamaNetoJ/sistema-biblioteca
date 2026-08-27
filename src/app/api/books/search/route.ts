import { NextResponse, type NextRequest } from "next/server"

export interface GoogleBookResult {
  google_books_id: string
  title: string
  authors: string | null
  cover_url: string | null
  total_pages: number | null
}

interface GoogleVolume {
  id: string
  volumeInfo?: {
    title?: string
    authors?: string[]
    pageCount?: number
    imageLinks?: Record<string, string>
  }
}

function normalizeCover(url?: string) {
  if (!url) return null
  return url
    .replace(/^http:\/\//, "https://")
    .replace(/&edge=curl/, "")
    .replace(/&zoom=\d+/, "&zoom=1")
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim()
  if (!q) {
    return NextResponse.json({ results: [] satisfies GoogleBookResult[] })
  }

  const url = new URL("https://www.googleapis.com/books/v1/volumes")
  url.searchParams.set("q", q)
  url.searchParams.set("maxResults", "24")
  url.searchParams.set("printType", "books")

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY?.trim()
  if (apiKey) url.searchParams.set("key", apiKey)

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) {
      if (res.status === 429) {
        return NextResponse.json(
          {
            error:
              "O limite diário da busca foi atingido. Configure uma chave da Google Books API ou tente novamente mais tarde.",
          },
          { status: 429 }
        )
      }

      if (res.status === 400 || res.status === 403) {
        return NextResponse.json(
          {
            error:
              "A Google Books API recusou a busca. Verifique se a API está ativa e se GOOGLE_BOOKS_API_KEY é válida.",
          },
          { status: 502 }
        )
      }

      return NextResponse.json(
        { error: "A Google Books API está indisponível no momento." },
        { status: 502 }
      )
    }

    const data: { items?: GoogleVolume[] } = await res.json()

    const results: GoogleBookResult[] = (data.items ?? [])
      .filter((item) => item.volumeInfo?.title)
      .map((item) => ({
        google_books_id: item.id,
        title: item.volumeInfo!.title!,
        authors: item.volumeInfo!.authors?.join(", ") ?? null,
        cover_url:
          normalizeCover(
            item.volumeInfo!.imageLinks?.thumbnail ??
              item.volumeInfo!.imageLinks?.smallThumbnail
          ),
        total_pages: item.volumeInfo!.pageCount ?? null,
      }))

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json(
      { error: "Falha ao conectar ao Google Books." },
      { status: 502 }
    )
  }
}
