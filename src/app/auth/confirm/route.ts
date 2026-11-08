import type { EmailOtpType } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const RECOVERY_TYPE: EmailOtpType = "recovery"

function redirectTo(request: NextRequest, pathname: string, search = "") {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = search
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const tokenHash = request.nextUrl.searchParams.get("token_hash")
  const type = request.nextUrl.searchParams.get("type")

  const success = redirectTo(request, "/redefinir-senha")
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            success.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return success
  } else if (tokenHash && type === RECOVERY_TYPE) {
    const { error } = await supabase.auth.verifyOtp({
      type: RECOVERY_TYPE,
      token_hash: tokenHash,
    })
    if (!error) return success
  }

  return redirectTo(request, "/esqueci-senha", "?erro=link")
}
