"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Resultado das ações das telas da Plataforma: mensagem de erro em português ou sucesso. */
export type Resultado = { ok: true; mensagem?: string } | { ok: false; erro: string };

const PARTICIPACOES = ["permanente", "eventual", "nao_se_aplica"] as const;
type Participacao = (typeof PARTICIPACOES)[number];

function falha(erro: string): Resultado {
  return { ok: false, erro };
}

/** Traduz os erros do banco mais comuns para o Admin. */
function erroBanco(msg: string | undefined): Resultado {
  const m = msg ?? "";
  if (m.includes("perfil_nome_idx")) return falha("Já existe um perfil com esse nome.");
  if (m.includes("subtipo_perfil_nome_idx")) return falha("Já existe um sub-tipo com esse nome nesse perfil.");
  if (m.includes("row-level security") || m.includes("permission denied")) return falha("Somente o Admin pode fazer essa alteração.");
  if (m.startsWith("Perfil do sistema") || m.startsWith("O perfil Admin")) return falha(m);
  return falha("Não foi possível salvar. Tente de novo em instantes.");
}

/** Código interno de um perfil criado pelo Admin, a partir do nome (sem acento, minúsculo, com _). */
function codigoDoNome(nome: string): string {
  const base = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
  return base.length >= 2 ? base : `perfil_${base}`;
}

async function log(acao: string, entidade: string, id: string, dados: Record<string, unknown>) {
  const supabase = await createClient();
  await supabase.rpc("registrar_log", { p_acao: acao, p_entidade: entidade, p_entidade_id: id, p_dados: dados });
}

async function usuariosNoPerfil(codigo: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from("usuario_perfil").select("id", { count: "exact", head: true }).eq("perfil", codigo);
  return count ?? 0;
}

// ---------------------------------------------------------------- 1.3 Perfis

export type DadosPerfil = {
  codigo?: string;
  nome: string;
  descricao: string;
  participacao: Participacao;
  ativo: boolean;
  copiarDe?: string;
};

export async function salvarPerfil(d: DadosPerfil): Promise<Resultado> {
  const nome = d.nome.trim().replace(/\s+/g, " ");
  const descricao = d.descricao.trim();
  if (nome.length < 2 || nome.length > 60) return falha("Informe um nome com 2 a 60 letras.");
  if (descricao.length > 300) return falha("A descrição pode ter até 300 letras.");
  if (!PARTICIPACOES.includes(d.participacao)) return falha("Escolha Permanente, Eventual ou Não se aplica.");

  const supabase = await createClient();

  if (d.codigo) {
    if (!d.ativo && (await usuariosNoPerfil(d.codigo)) > 0) {
      return falha("Não dá para inativar um perfil que ainda tem usuários. Tire o perfil desses usuários antes.");
    }
    const { error } = await supabase
      .from("perfil")
      .update({ nome, descricao, participacao: d.participacao, ativo: d.ativo })
      .eq("codigo", d.codigo);
    if (error) return erroBanco(error.message);
    await log("perfil.editar", "perfil", d.codigo, { nome, descricao, participacao: d.participacao, ativo: d.ativo });
    revalidatePath("/", "layout");
    return { ok: true, mensagem: `Perfil ${nome} salvo.` };
  }

  // Perfil novo: escolhe um código livre (fotografo, fotografo_2…).
  const base = codigoDoNome(nome);
  const { data: usados } = await supabase.from("perfil").select("codigo").like("codigo", `${base}%`);
  const ocupados = new Set((usados ?? []).map((u) => u.codigo));
  let codigo = base;
  for (let i = 2; ocupados.has(codigo); i++) codigo = `${base}_${i}`;

  const { error } = await supabase.from("perfil").insert({
    codigo,
    nome,
    descricao,
    participacao: d.participacao,
    ativo: d.ativo,
    sistema: false,
    ordem: 100,
  });
  if (error) return erroBanco(error.message);

  if (d.copiarDe && d.copiarDe !== "admin") {
    const { data: origem } = await supabase.from("permissao").select("funcionalidade, acao").eq("perfil", d.copiarDe);
    const itens = (origem ?? []).map((p) => `${p.funcionalidade}:${p.acao}`);
    if (itens.length) {
      const { error: e2 } = await supabase.rpc("salvar_permissoes", { p_perfil: codigo, p_itens: itens });
      if (e2) return falha(`Perfil criado, mas as permissões não foram copiadas. Ajuste em 1.5 Permissões.`);
    }
  }
  await log("perfil.criar", "perfil", codigo, { nome, descricao, participacao: d.participacao, copiarDe: d.copiarDe ?? null });
  revalidatePath("/", "layout");
  return { ok: true, mensagem: `Perfil ${nome} criado.` };
}

export async function excluirPerfil(codigo: string): Promise<Resultado> {
  const supabase = await createClient();
  const { data: p } = await supabase.from("perfil").select("nome, sistema").eq("codigo", codigo).maybeSingle();
  if (!p) return falha("Perfil não encontrado.");
  if (p.sistema) return falha("Perfil do sistema não pode ser excluído.");
  if ((await usuariosNoPerfil(codigo)) > 0) return falha("Esse perfil ainda tem usuários. Tire o perfil deles antes de excluir.");
  const { count: subs } = await supabase.from("subtipo").select("id", { count: "exact", head: true }).eq("perfil", codigo);
  if ((subs ?? 0) > 0) return falha("Esse perfil tem sub-tipos. Exclua ou mude os sub-tipos em 1.4 antes.");
  const { count: papeis } = await supabase.from("papel_evento").select("id", { count: "exact", head: true }).eq("perfil", codigo);
  if ((papeis ?? 0) > 0) return falha("Esse perfil já foi usado em eventos e não pode ser excluído. Você pode inativá-lo.");

  const { error } = await supabase.from("perfil").delete().eq("codigo", codigo);
  if (error) return erroBanco(error.message);
  await log("perfil.excluir", "perfil", codigo, { nome: p.nome });
  revalidatePath("/", "layout");
  return { ok: true, mensagem: `Perfil ${p.nome} excluído.` };
}

// ---------------------------------------------------------------- 1.4 Sub-Tipo

export type DadosSubtipo = { id?: string; perfil: string; nome: string; ativo: boolean };

export async function salvarSubtipo(d: DadosSubtipo): Promise<Resultado> {
  const nome = d.nome.trim().replace(/\s+/g, " ");
  if (!d.perfil) return falha("Escolha o perfil. Não existe sub-tipo sem perfil.");
  if (nome.length < 2 || nome.length > 60) return falha("Informe um nome com 2 a 60 letras.");

  const supabase = await createClient();
  const { data: perfil } = await supabase.from("perfil").select("codigo").eq("codigo", d.perfil).maybeSingle();
  if (!perfil) return falha("Perfil não encontrado.");

  if (d.id) {
    const { data: atual } = await supabase.from("subtipo").select("perfil").eq("id", d.id).maybeSingle();
    if (!atual) return falha("Sub-tipo não encontrado.");
    if (atual.perfil !== d.perfil) {
      const { count } = await supabase.from("usuario_perfil").select("id", { count: "exact", head: true }).eq("subtipo_id", d.id);
      if ((count ?? 0) > 0) return falha("Esse sub-tipo já está em uso e não pode mudar de perfil.");
    }
    const { error } = await supabase.from("subtipo").update({ perfil: d.perfil, nome, ativo: d.ativo }).eq("id", d.id);
    if (error) return erroBanco(error.message);
    await log("subtipo.editar", "subtipo", d.id, { perfil: d.perfil, nome, ativo: d.ativo });
    revalidatePath("/m/cadastros.subtipos");
    return { ok: true, mensagem: `Sub-tipo ${nome} salvo.` };
  }

  const { data: novo, error } = await supabase.from("subtipo").insert({ perfil: d.perfil, nome, ativo: d.ativo }).select("id").single();
  if (error) return erroBanco(error.message);
  await log("subtipo.criar", "subtipo", novo.id, { perfil: d.perfil, nome, ativo: d.ativo });
  revalidatePath("/m/cadastros.subtipos");
  return { ok: true, mensagem: `Sub-tipo ${nome} criado.` };
}

// ---------------------------------------------------------------- 1.5 Permissões

export async function salvarPermissoes(perfil: string, itens: string[]): Promise<Resultado> {
  if (!perfil || perfil === "admin") return falha("Escolha um perfil.");
  const validos = itens.filter((i) => /^[a-z_.]+:(ver|criar|editar|aprovar)$/.test(i));
  const supabase = await createClient();
  const { error } = await supabase.rpc("salvar_permissoes", { p_perfil: perfil, p_itens: validos });
  if (error) return erroBanco(error.message);
  revalidatePath("/", "layout");
  return { ok: true, mensagem: "Permissões salvas. Valem no próximo acesso de quem tem esse perfil." };
}
