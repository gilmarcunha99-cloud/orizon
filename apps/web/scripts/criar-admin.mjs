#!/usr/bin/env node
/**
 * Cria (convida) um usuário Admin no Supabase do ambiente.
 * A pessoa recebe um e-mail com link e código para criar a PRÓPRIA senha: nenhuma senha passa pelo chat.
 *
 * Uso (dentro de apps/web, com as variáveis do ambiente em .env.local):
 *   npm run criar-admin -- email@exemplo.com "Nome da pessoa"
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

if (existsSync(".env.local")) {
  for (const linha of readFileSync(".env.local", "utf8").split("\n")) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const [email, nome = ""] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
const site = process.env.SITE_URL;

if (!email || !url || !chave) {
  console.error("Informe o e-mail e configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, chave, { auth: { persistSession: false } });

const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
  data: { nome },
  redirectTo: site ? `${site}/criar-senha` : undefined,
});
if (error) {
  console.error("Falha ao convidar:", error.message);
  process.exit(1);
}

const id = data.user.id;
const { error: erroPerfil } = await supabase.from("usuario_perfil").upsert({ usuario_id: id, perfil: "admin" }, { onConflict: "usuario_id,perfil" });
if (erroPerfil) {
  console.error("Convite enviado, mas falhou ao dar o perfil Admin:", erroPerfil.message);
  process.exit(1);
}
await supabase.from("log_auditoria").insert({ acao: "convidar_admin", entidade: "usuario", entidade_id: id, dados: { email } });
console.log(`Convite enviado para ${email}. Perfil Admin atribuído.`);
