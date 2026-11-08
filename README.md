# Biblioteca — Tracker de Leitura (PWA)

Acompanhe o progresso dos seus livros: o que você está lendo, quer ler e já leu.
Mobile-first, com navegação inferior, instalável como PWA e deploy no Cloudflare Workers.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ECF8E?logo=supabase&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Deploy-Cloudflare%20Workers-F38020?logo=cloudflare&logoColor=white)

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Deploy | Cloudflare Workers via `@opennextjs/cloudflare` |
| Banco/Auth | Supabase (Postgres + RLS + Auth email/senha + Storage) |
| UI | Tailwind CSS v4 + shadcn/ui (Base UI) + Poppins + Iconify |
| Busca de livros | Google Books API |
| PWA | Manifest + Service Worker próprio (offline básico + cache de capas) |

## Setup

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, execute as migrations em ordem:
   - `supabase/migrations/0001_init.sql` — tabelas `profiles`, `books`, `progress_log`, RLS, triggers e bucket `covers`
   - `supabase/migrations/0002_username_unique.sql` — username único e checagem de disponibilidade
   - `supabase/migrations/0003_reading_features.sql` — PDFs privados, notas, metas, conquistas e registro transacional de progresso
   - `supabase/migrations/0004_epub.sql` — permite EPUB (`application/epub+zip`) no bucket privado `book-pdfs`
3. Em **Authentication → Providers**, confirme que *Email* está habilitado.
   - Para testar sem servidor de e-mail: **Authentication → Sign In / Up →
     Confirm email = OFF**.
4. Em **Project Settings → API**, copie a *Project URL* e a *anon key*.

### 2. Variáveis de ambiente

```bash
cp .env.example .env.local
# preencha as variáveis do Supabase e GOOGLE_BOOKS_API_KEY
```

No Cloudflare, cadastre como **Secrets** (Workers → Settings → Variables and Secrets):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GOOGLE_BOOKS_API_KEY`

Se o deploy for pelo Git (Workers Builds), coloque as mesmas em **Build variables and secrets**. Sem `--keep-vars`, o próximo deploy apaga Variables do painel (Secrets não).

Para habilitar a busca de livros, ative a **Google Books API** no Google Cloud
Console, crie uma chave em **APIs e serviços → Credenciais** e informe-a em
`GOOGLE_BOOKS_API_KEY`.

### 3. Desenvolvimento

```bash
bun install
bun dev          # http://localhost:3000
```

Outros scripts:

```bash
bun run lint         # ESLint
bun run build        # build Next.js
bun run build:worker # build do worker Cloudflare (.open-next/worker.js)
bun run preview      # testar o worker localmente via wrangler
bun run deploy       # build + deploy no Cloudflare
bun run icons        # regenerar ícones do PWA (scripts/generate-icons.mjs)
```

> Dica: se um pacote tiver postinstall bloqueado no install,
> rode `bun pm untrusted` para ver e `bun pm trust <pacote>` para liberar.
> Os pacotes confiados ficam registrados em `trustedDependencies` no `package.json`.

### 4. Deploy no Cloudflare

```bash
bunx wrangler login
bun run deploy
```

O script `bun run deploy` usa `--keep-vars` para não apagar as Secrets do
painel. No Workers Builds, o **Deploy command** deve ser:

```bash
npx opennextjs-cloudflare deploy -- --keep-vars
```

## Funcionalidades

- Cadastro e login (email/senha, confirmação de senha, sessão via cookies httpOnly)
- Busca no Google Books com 1 clique (título, autor, capa, nº de páginas)
- Cadastro manual com capa personalizada (URL ou upload para o Supabase Storage)
- Estante com abas: **Quero ler · Lendo · Lidos**
- Anel de progresso + atualização rápida de página atual
- Marcar como lido automaticamente ao chegar à última página
- Histórico de leitura (data + páginas lidas por dia)
- Upload de um PDF privado por livro, leitor com navegação e anotações por página
- Estatísticas de páginas/dia, livros por mês/ano, metas e conquistas
- Exportação/importação de dados em JSON e download separado dos PDFs
- Avaliação de 1–5 estrelas, datas de início/fim
- PWA: instala na tela inicial, página offline, cache de capas

## Estrutura

```
src/
├── app/
│   ├── (auth)/            # login e cadastro
│   ├── (app)/             # app em si (com bottom nav)
│   │   ├── page.tsx       # dashboard (continuar lendo)
│   │   ├── estante/       # abas por status
│   │   ├── adicionar/     # busca Google Books + manual
│   │   ├── livro/[id]/    # detalhe, progresso, edição
│   │   └── perfil/
│   ├── api/books/search/  # proxy server-side do Google Books (cache 1h)
│   ├── manifest.ts        # manifest do PWA
│   └── layout.tsx
├── components/            # UI da aplicação
├── lib/
│   ├── actions/           # server actions (auth, livros, perfil)
│   ├── supabase/          # clients SSR/browser/proxy
│   ├── queries.ts         # consultas
│   └── types.ts
└── proxy.ts               # proteção de rotas + refresh de sessão
supabase/migrations/       # SQL inicial
public/sw.js               # service worker
scripts/generate-icons.mjs # geração dos ícones PWA
```

## Roadmap (futuro)

- Nota: **não existe API pública da Amazon Kindle**; sincronização Kindle
  exigiria scraping não-oficial (instável e contra os termos de uso).
