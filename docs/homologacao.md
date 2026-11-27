# Configurar o ambiente de homologação

Passos feitos uma única vez. Os que dependem de conta (Supabase, Vercel, Mailgrid) são feitos pelo Gilmar;
o restante já está no repositório.

## Situação em 27/11/2026

| Item | Situação |
| --- | --- |
| Banco `orizon-homolog` (Supabase, São Paulo) | Feito (26/11) |
| Login e e-mails (seção 2) | Feito, **menos o SMTP do Mailgrid**: por enquanto saem os e-mails padrão do Supabase (só link, sem código) |
| Segredos do GitHub (seção 3) | **Não configurados**: as migrações são aplicadas à mão (veja abaixo) |
| Site de homologação (seção 4) | No ar em https://orizon-git-homolog-zumar1.vercel.app (o domínio `homolog.orizonsportss.com.br` fica para depois) |
| Admin (seção 5) | Feito: e-mail do Gilmar, só com o perfil Admin |
| App de celular (seção 6) | Ainda não começou |

**Como aplicar uma migração enquanto não há segredos no GitHub:** abra o **SQL Editor** do Supabase, rode o arquivo
de `supabase/migrations/` e registre a versão em `supabase_migrations.schema_migrations`.
Atenção: neste projeto as tabelas novas **não** ficam liberadas sozinhas para usuários logados; cada tabela nova
precisa dos `grant` (a migração `20261127030000` já deixa a regra padrão para as próximas).

## 1. Supabase: criar o banco de homologação

1. Em https://supabase.com, crie a organização Orizon (plano gratuito) e um projeto:
   - Nome: `orizon-homolog`
   - Região: **South America (São Paulo)**
   - Guarde a senha do banco num gerenciador de senhas.
2. Em **Project Settings › API Keys**, anote:
   - Project URL
   - chave **Publishable** (pública; antiga `anon`)
   - chave **Secret** (secreta, antiga `service_role`: nunca colar em chat, e-mail ou no app)
   - o **Project ID** (aparece na URL do painel)

## 2. Supabase: login e e-mails

Em **Authentication**:

- **URL Configuration**
  - Site URL: endereço da homologação (hoje `https://orizon-git-homolog-zumar1.vercel.app`; no futuro `https://homolog.orizonsportss.com.br`)
  - Redirect URLs: o mesmo endereço com `/**` no final
- **Providers › Email**: Confirm email ligado; Email OTP length = 6; Email OTP expiration = 86400 (24 horas)
- **Policies / Passwords**: mínimo 8 caracteres; exigir minúsculas, maiúsculas, números e símbolos
- **Emails › SMTP Settings** (Mailgrid):
  - Host, porta, usuário e senha SMTP do Mailgrid
  - Remetente: `nao-responda@orizonsportss.com.br`, nome `Orizon Pass`
  - O domínio precisa estar verificado no Mailgrid (SPF e DKIM) para os e-mails não caírem no spam
- **Emails › Templates**: cole o conteúdo dos arquivos de `supabase/templates/`
  - Invite user → `convite.html` (assunto: "Orizon Pass: crie a sua senha")
  - Reset password → `redefinir-senha.html` (assunto: "Orizon Pass: código para redefinir a senha")
  - Confirm signup → `confirmar-email.html` (assunto: "Orizon Pass: confirme o seu e-mail")
  - Magic link → `codigo-acesso.html` (assunto: "Orizon Pass: seu código de acesso")
  - Os modelos só podem ser trocados depois que o SMTP próprio (Mailgrid) estiver ligado.

## 3. GitHub: segredos e proteção das branches

1. **Settings › Environments › New environment** `homolog`:
   - Secrets: `SUPABASE_ACCESS_TOKEN` (Supabase › Account › Access Tokens) e `SUPABASE_DB_PASSWORD`
   - Variables: `SUPABASE_PROJECT_ID`
   Com isso, cada merge em `homolog` aplica as migrações no banco automaticamente.
2. **Settings › Branches**: proteja `homolog` e `main` (exigir pull request e as verificações "Site", "App" e "Banco").

## 4. Vercel: publicar a homologação

1. No GitHub, em **Settings › Integrations › GitHub Apps › Vercel › Configure**, libere o repositório `orizon`
   (feito: desde 26/11 cada pull request ganha uma prévia e a branch `homolog` é publicada sozinha).
2. No projeto `orizon` da Vercel, **Settings › Build and Deployment**:
   - Framework Preset: **Next.js**
   - Root Directory: `apps/web`
   O site que está hoje em produção continua no ar: a produção só é publicada de novo quando a `main` mudar.
3. **Settings › Environment Variables**, ambiente **Preview**, branch `homolog`:
   - `NEXT_PUBLIC_APP_ENV` = `homolog`
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = chave Publishable
   - `SUPABASE_SERVICE_ROLE_KEY` = chave Secret (usada para enviar convites a novos usuários)
4. **Settings › Domains**: adicione `homolog.orizonsportss.com.br` ligado à branch `homolog` e crie o CNAME
   indicado pela Vercel no provedor do domínio.

## 5. Criar o Admin

O Admin recebe um convite por e-mail e cria a própria senha (nenhuma senha é enviada por chat).

Pelo painel do Supabase, sem terminal:

1. **Authentication › Users › Add user › Send invitation**, com o e-mail do Admin.
2. **SQL Editor**, rode (trocando o e-mail):

   ```sql
   insert into public.usuario_perfil (usuario_id, perfil)
   select id, 'admin' from auth.users where email = 'email-do-admin@exemplo.com'
   on conflict do nothing;
   ```

3. O Admin abre o e-mail, toca em **Criar minha senha** (ou usa o código em `/criar-senha`) e entra.

Ou pelo terminal, em `apps/web` com o `.env.local` preenchido: `npm run criar-admin -- email@exemplo.com "Nome"`.

## 6. App de celular (Android)

```bash
cd apps/mobile
cp env/homolog.example.json env/homolog.json   # preencha URL e chave Publishable
flutter build apk --flavor homolog --dart-define-from-file=env/homolog.json
```

O APK pode ser instalado direto no celular para os testes. iPhone (TestFlight) fica para quando houver a conta Apple Developer.
