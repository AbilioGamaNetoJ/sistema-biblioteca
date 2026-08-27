# Plano — Biblioteca (Book Tracker PWA)

> Plano original + status de execução. Criado antes do desenvolvimento; atualizado conforme o progresso.

## Objetivo

Sistema pessoal para acompanhar o estado atual de leitura de cada livro:
progresso (página atual), o que quero ler, estou lendo e já li — com busca
automática de metadados (título, autor, capa, nº de páginas), cadastro/login,
edição/capa personalizada, mobile-first com navegação inferior e PWA.

## Decisões de arquitetura

| Decisão | Escolha | Motivo |
|---|---|---|
| API de livros | **Google Books** | Gratuita, capas em alta qualidade, nº de páginas, boa busca em PT-BR. A Amazon **não tem API pública da Kindle** (só Product Advertising API, que não serve) |
| PDF (leitor/anotações) | **Fora do MVP** | Feature futura; arquitetura deixa porta aberta (Supabase Storage) |
| Idioma UI | **Português (BR)** | — |
| Deploy | **Cloudflare Workers** via `@opennextjs/cloudflare` | Projeto privado sem pagar Vercel Pro |
| DB/Auth | **Supabase** (Postgres + RLS + Auth + Storage) | — |
| UI | **Tailwind v4 + shadcn/ui** (Base UI) | Mobile-first |
| PWA | **Service worker próprio** (`public/sw.js`) + manifest | Offline básico + cache de capas |
| Runtime/PM | **Bun** | Migração feita após MVP (`bun.lock`, `trustedDependencies`) |

## Modelo de dados

```
profiles     (id → auth.users, username ÚNICO, timestamps)
books        (id, user_id, google_books_id?, title, authors, cover_url,
              total_pages?, current_page, status: want_to_read|reading|read,
              rating?, started_at?, finished_at?)
progress_log (id, book_id, read_on, pages_read)   ← histórico p/ stats futuras
notes        (id, book_id, page_number, content)   ← anotações do leitor PDF
reading_goals (user_id, páginas/dia, livros/mês, livros/ano)
achievements (user_id, kind, period_key, target_value, actual_value)
storage      bucket público "covers" (pasta por user_id, RLS por prefixo)
             bucket privado "book-pdfs" (um PDF por livro)
```

RLS em todas as tabelas: `user_id = auth.uid()` (ou via join em progress_log).

## Telas (PT-BR)

- `/login`, `/cadastro` — Supabase Auth; sucesso do cadastro → tela centralizada
  com check grande → botão "Ir para o login"
- `/` — Dashboard: saudação, contadores, "continuar lendo" com anel de progresso
  e atualização rápida de página
- `/estante` — Abas: Quero ler · Lendo · Lidos (contadores + grid de capas)
- `/livro/[id]` — Detalhe, status segmentado, progresso c/ auto-conclusão,
  histórico, avaliação ★, editar/excluir
- `/livro/[id]/ler` — Leitor PDF, navegação, progresso e notas por página
- `/estatisticas` — Páginas por dia, livros por período, metas e conquistas
- `/livro/[id]/editar` — Edição completa (capa por URL ou upload)
- `/adicionar` — Busca Google Books (debounce + cache 1h server-side) +
  cadastro manual
- `/perfil` — Editar username, sair
- Bottom nav fixa: Início · Estante · **+** · Perfil

## Fases

| # | Fase | Status |
|---|---|---|
| 1 | Scaffold Next.js + deps (OpenNext, Supabase, shadcn, PWA) | ✅ Concluída |
| 2 | Migrations SQL (tabelas, RLS, triggers, bucket covers) | ✅ Concluída (0001 + 0002 username único) |
| 3 | Auth (login/cadastro, mensagens de erro específicas, proxy/middleware) | ✅ Concluída |
| 4 | Shell mobile-first + bottom nav + PWA (manifest, SW, ícones) | ✅ Concluída |
| 5 | CRUD livros (busca, estante, detalhe, progresso, edição) | ✅ Concluída |
| 6 | Wrangler/deploy + lint/typecheck/build worker | ✅ Concluída |
| 7 | Migração npm → bun | ✅ Concluída |
| 8 | Leitor PDF, notas, estatísticas, metas, conquistas e backup | ✅ Implementada |

## Próximos passos imediatos

- [ ] Deploy no Cloudflare: `bunx wrangler login && bun run deploy`
- [ ] Teste E2E manual do fluxo completo (cadastro → adicionar → progresso)

## Roadmap futuro (fora desta fase)

- Busca textual e ferramentas avançadas de destaque no leitor PDF
- Exportação de PDFs dentro de um pacote ZIP
- ~~Sincronização Kindle~~ — sem API pública da Amazon; só via scraping
  não-oficial (instável, contra os termos)
