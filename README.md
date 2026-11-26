# Orizon

Plataforma Orizon Sports para gestão de eventos esportivos (corridas de rua e beach tênis). App: **Orizon Pass**.

## Estrutura

```
apps/
  web/        Next.js: login, painel administrativo e portal público (Vercel)
  mobile/     Flutter: app Orizon Pass (Android e iOS)
packages/
  brand/      cores, fontes e logos da marca (fonte única)
supabase/
  migrations/ alterações do banco, numeradas, aplicadas em homologação e depois em produção
  templates/  e-mails de login (código de 6 dígitos e link)
  seed.sql    dados de teste do ambiente local
docs/         passo a passo de ambientes e decisões
.github/      verificações automáticas
```

## Ambientes

| Ambiente | Branch | Banco (Supabase) | Site | App |
| --- | --- | --- | --- | --- |
| Homologação | `homolog` | `orizon-homolog` | deploy da branch `homolog` na Vercel | Orizon Pass HML (`br.com.orizon.pass.hml`) |
| Produção | `main` | `orizon-prod` (criado após a Fase 1) | deploy de produção na Vercel | Orizon Pass (`br.com.orizon.pass`) |

Toda mudança entra por pull request em `homolog`. A `main` só recebe código na liberação da Fase 1.
Passo a passo de configuração: [docs/homologacao.md](docs/homologacao.md).

## Rodar localmente

Site:

```bash
cd apps/web
cp .env.example .env.local   # preencha com os dados do Supabase de homologação
npm install
npm run dev                  # http://localhost:3000
```

App (Android):

```bash
cd apps/mobile
cp env/homolog.example.json env/homolog.json   # preencha
flutter run --flavor homolog --dart-define-from-file=env/homolog.json
```

Banco local (opcional, precisa de Docker): `npx supabase start` na raiz aplica as migrações e o `seed.sql`.
