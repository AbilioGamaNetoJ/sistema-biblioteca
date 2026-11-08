"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export type AuthState = { error?: string; success?: string } | undefined

async function requestOrigin() {
  const headerStore = await headers()
  const origin = headerStore.get("origin")
  if (origin) return origin

  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host")
  if (!host) return "http://localhost:3000"

  const proto =
    headerStore.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https")

  return `${proto}://${host}`
}

function field(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === "string" ? value.trim() : ""
}

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = field(formData, "email")
  const password = field(formData, "password")

  if (!email || !password) return { error: "Preencha e-mail e senha." }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    const message = error.message.toLowerCase()

    if (message.includes("invalid login")) {
      return { error: "E-mail ou senha incorretos." }
    }
    if (message.includes("not confirmed")) {
      return {
        error:
          "Sua conta ainda não foi confirmada. Verifique seu e-mail (inclusive spam) ou confirme manualmente no painel do Supabase em Authentication → Users.",
      }
    }
    if (message.includes("email not enabled")) {
      return { error: "O login por e-mail está desativado no Supabase." }
    }
    return { error: `Não foi possível entrar: ${error.message}` }
  }

  redirect("/")
}

export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const username = field(formData, "username")
  const email = field(formData, "email")
  const password = field(formData, "password")

  if (!username || !email || !password) {
    return { error: "Preencha todos os campos." }
  }
  if (password.length < 6) {
    return { error: "A senha precisa ter no mínimo 6 caracteres." }
  }

  const supabase = await createClient()

  // Checa o username antes de criar o usuário (evita órfão no auth)
  const { data: taken } = await supabase.rpc("is_username_taken", {
    p_username: username,
  })
  if (taken) {
    return { error: "Este nome de usuário já está em uso." }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  })

  if (error) {
    const message = error.message.toLowerCase()

    if (message.includes("already") || message.includes("registered")) {
      return {
        error:
          "Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.",
      }
    }
    if (message.includes("database error")) {
      return { error: "Este nome de usuário já está em uso." }
    }
    if (message.includes("weak password")) {
      return { error: "A senha é muito fraca. Use no mínimo 6 caracteres." }
    }
    if (message.includes("rate limit")) {
      return { error: "Muitas tentativas. Aguarde alguns minutos." }
    }
    return { error: `Não foi possível criar a conta: ${error.message}` }
  }

  if (!data.session) {
    redirect("/login?cadastro=sucesso")
  }

  redirect("/")
}

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = field(formData, "email")
  if (!email) return { error: "Informe o e-mail da conta." }

  const origin = await requestOrigin()
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm`,
  })

  if (error) {
    const message = error.message.toLowerCase()

    if (message.includes("redirect") || message.includes("not allowed")) {
      return {
        error:
          "O link de retorno não está liberado no Supabase. Em Authentication → URL Configuration, adicione a URL do app terminando em /auth/confirm.",
      }
    }
    if (message.includes("rate")) {
      return { error: "Muitas tentativas. Aguarde alguns minutos." }
    }
    return { error: "Não foi possível enviar o e-mail agora. Tente de novo em instantes." }
  }

  return {
    success:
      "Se esse e-mail estiver cadastrado, enviamos um link para redefinir a senha. Confira também o spam.",
  }
}

export async function updatePassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = field(formData, "password")
  const confirmPassword = field(formData, "confirmPassword")

  if (!password || !confirmPassword) {
    return { error: "Preencha a nova senha e a confirmação." }
  }
  if (password.length < 6) {
    return { error: "A senha precisa ter no mínimo 6 caracteres." }
  }
  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: "Esse link expirou. Solicite um novo e-mail de redefinição.",
    }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    const message = error.message.toLowerCase()

    if (message.includes("weak password")) {
      return { error: "A senha é muito fraca. Use no mínimo 6 caracteres." }
    }
    if (message.includes("session") || message.includes("auth")) {
      return {
        error: "Esse link expirou. Solicite um novo e-mail de redefinição.",
      }
    }
    return { error: `Não foi possível atualizar a senha: ${error.message}` }
  }

  redirect("/")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
