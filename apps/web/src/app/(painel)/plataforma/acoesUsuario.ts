"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EMAIL_RE, celularOk, nascimentoOk } from "@/lib/validation";
import type { Resultado } from "./acoes";
import { cpfOk, idade, type DadosUsuario } from "./usuarioRegras";

const so = (s: string | undefined) => (s ?? "").replace(/\D/g, "");

function falha(erro: string): Resultado {
  return { ok: false, erro };
}

function erroBanco(msg: string | undefined): Resultado {
  const m = msg ?? "";
  if (m.includes("usuario_cpf_key")) return falha("Já existe uma pessoa cadastrada com esse CPF.");
  if (m.includes("row-level security") || m.includes("permission denied") || m.startsWith("Sem permissão"))
    return falha("Você não tem permissão para salvar usuários.");
  if (/^(Escolha|Somente|Você não|O sub-tipo|Usuário não)/.test(m)) return falha(m);
  return falha("Não foi possível salvar. Tente de novo em instantes.");
}

function validar(d: DadosUsuario): string | null {
  if (d.nome.trim().length < 3) return "Informe o nome completo.";
  if (!EMAIL_RE.test(d.email.trim())) return "Informe um e-mail válido.";
  if (!cpfOk(d.cpf)) return "CPF inválido.";
  if (!celularOk(d.celular)) return "Celular inválido. Use DDD + 9 dígitos.";
  if (!nascimentoOk(d.data_nascimento)) return "Data de nascimento inválida.";
  if (!d.genero) return "Escolha o sexo.";
  if (!d.perfil) return "Escolha o perfil.";
  if (d.ficha) {
    const f = d.ficha;
    if (!f.cidade.trim() || !f.uf) return "Na ficha do atleta, informe cidade e UF.";
    if (!f.camiseta) return "Na ficha do atleta, escolha o tamanho da camiseta.";
    if (!f.emergencia_nome.trim() || !celularOk(f.emergencia_celular)) return "Na ficha do atleta, informe o contato de emergência com celular válido.";
    if (idade(d.data_nascimento) < 18) {
      if (!f.responsavel_nome.trim() || !cpfOk(f.responsavel_cpf) || !celularOk(f.responsavel_celular))
        return "Atleta menor de 18 anos: informe nome, CPF e celular do responsável legal.";
    }
  }
  return null;
}

/** Cria (com convite por e-mail para a pessoa criar a senha) ou edita um usuário. */
export async function salvarUsuario(d: DadosUsuario): Promise<Resultado & { id?: string }> {
  const erro = validar(d);
  if (erro) return falha(erro);
  const supabase = await createClient();
  const email = d.email.trim().toLowerCase();
  const menor = idade(d.data_nascimento) < 18;
  const dados = {
    nome: d.nome.trim(),
    cpf: so(d.cpf),
    celular: so(d.celular),
    data_nascimento: d.data_nascimento,
    genero: d.genero,
    ativo: d.ativo,
    perfil: d.perfil,
    subtipo_id: d.subtipo_id || "",
    ficha: d.ficha
      ? {
          ...d.ficha,
          cidade: d.ficha.cidade.trim(),
          emergencia_celular: so(d.ficha.emergencia_celular),
          responsavel_nome: menor ? d.ficha.responsavel_nome.trim() : "",
          responsavel_cpf: menor ? so(d.ficha.responsavel_cpf) : "",
          responsavel_celular: menor ? so(d.ficha.responsavel_celular) : "",
        }
      : null,
  };

  // CPF e e-mail não podem repetir (o e-mail é o login e só é escolhido no cadastro).
  const porCpf = await supabase.from("usuario").select("id").eq("cpf", dados.cpf);
  if (porCpf.error) return erroBanco(porCpf.error.message);
  if ((porCpf.data ?? []).some((u) => u.id !== d.id)) return falha("Já existe uma pessoa cadastrada com esse CPF.");
  if (!d.id) {
    const porEmail = await supabase.from("usuario").select("id").eq("email", email);
    if (porEmail.error) return erroBanco(porEmail.error.message);
    if ((porEmail.data ?? []).length) return falha("Já existe um usuário com esse e-mail.");
  }

  let id = d.id;
  let criado = false;
  if (!id) {
    const { data: pode } = await supabase.rpc("pode", { f: "cadastros.usuarios", a: "criar" });
    if (!pode) return falha("Você não tem permissão para cadastrar usuários.");
    const admin = createAdminClient();
    if (!admin) return falha("O envio de convites ainda não está configurado neste ambiente. Avise o suporte técnico.");
    const h = await headers();
    const origem = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
    const { data: conv, error: eConv } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { nome: dados.nome },
      redirectTo: `${origem}/entrar`,
    });
    if (eConv || !conv.user) {
      const m = (eConv?.message ?? "").toLowerCase();
      if (m.includes("already") || m.includes("registered")) return falha("Já existe uma conta com esse e-mail.");
      if (m.includes("rate limit")) return falha("Limite de e-mails atingido. Aguarde alguns minutos e tente de novo.");
      return falha("Não foi possível enviar o convite agora. Tente de novo em instantes.");
    }
    id = conv.user.id;
    criado = true;
  }

  const { error } = await supabase.rpc("salvar_usuario", { p_id: id, p_dados: dados, p_novo: criado });
  if (error) {
    if (criado) await createAdminClient()?.auth.admin.deleteUser(id);
    return erroBanco(error.message);
  }
  revalidatePath("/m/cadastros.usuarios");
  return {
    ok: true,
    id,
    mensagem: criado ? `${dados.nome} cadastrado(a). O convite para criar a senha foi enviado para ${email}.` : "Alterações salvas.",
  };
}
