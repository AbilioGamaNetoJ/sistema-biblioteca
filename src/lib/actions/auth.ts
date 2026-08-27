"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export type AuthState = { error?: string } | undefined

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

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
