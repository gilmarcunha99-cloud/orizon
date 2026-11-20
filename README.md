# Orizon

Plataforma Orizon Sports para gestão de eventos esportivos (corridas de rua e beach tennis). App de trabalho: **Orizon Pass**.

## Estrutura atual

```
web/                    site estático publicado no Vercel
  index.html            tela Entrar (e-mail + senha)
  primeiro-acesso.html  primeiro acesso: e-mail → código de 6 dígitos → criar senha (perfil Público)
  404.html
  assets/               estilos, script, logo e favicon da marca
vercel.json             configuração do deploy (pasta publicada, URLs limpas, cabeçalhos de segurança)
```

As telas seguem o protótipo de login aprovado em 16/11/2026. **É um protótipo visual:** nenhum dado é enviado a servidor e não há autenticação real. O backend (envio do código por e-mail, criação de conta, login) entra numa fase seguinte.

## Rodar localmente

Não há etapa de build. Basta servir a pasta `web/`, por exemplo:

```bash
npx serve web
```

## Deploy (Vercel)

O deploy é feito pela integração do Vercel com o GitHub:

- cada push na branch `main` publica em produção;
- cada pull request ganha uma URL de pré-visualização própria.

Configuração no Vercel (feita uma única vez): importar este repositório em **Add New › Project**, manter *Framework Preset* = **Other** e *Root Directory* = `./`. O `vercel.json` já define a pasta publicada (`web`).

Quando o site público (Next.js) ou o painel administrativo (Flutter Web) existirem, a pasta `web/` será substituída pelo build correspondente e o `vercel.json` será ajustado.
