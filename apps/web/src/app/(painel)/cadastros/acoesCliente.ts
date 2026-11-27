"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { EMAIL_RE, celularOk } from "@/lib/validation";
import type { Resultado } from "../plataforma/acoes";
import { cpfOk } from "../plataforma/usuarioRegras";
import { cnpjOk, fixoOk, type DadosCliente } from "./clienteRegras";

/** Nomes em caixa alta, sem espaços repetidos. */
const maiusc = (s: string) => s.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
const so = (s: string) => s.replace(/\D/g, "");

function falha(erro: string): Resultado {
  return { ok: false, erro };
}

function erroBanco(msg: string | undefined): Resultado {
  const m = msg ?? "";
  if (m.includes("empresa_documento_unico")) return falha("Esse CNPJ/CPF já está cadastrado.");
  if (m.includes("row-level security") || m.includes("permission denied") || m.startsWith("Sem permissão"))
    return falha("Você não tem permissão para salvar clientes.");
  if (/^(Escolha|Informe|Esse CNPJ|Esse CPF|Cliente não)/.test(m)) return falha(m);
  return falha("Não foi possível salvar. Tente de novo em instantes.");
}

function validar(d: DadosCliente): string | null {
  const pj = d.tipo_pessoa === "pj";
  if (pj ? !cnpjOk(d.documento) : !cpfOk(d.documento)) return pj ? "CNPJ inválido." : "CPF inválido.";
  if (d.razao_social.trim().length < 3) return pj ? "Informe a razão social." : "Informe o nome completo.";
  if (d.nome.trim().length < 2) return "Informe o nome fantasia.";
  if (d.contato_nome.trim().length < 3) return "Informe o nome do contato.";
  if (!EMAIL_RE.test(d.email.trim())) return "Informe um e-mail válido para o contato.";
  if (!celularOk(d.celular)) return "Celular inválido. Use DDD + 9 dígitos.";
  if (d.telefone && !fixoOk(d.telefone)) return "Telefone fixo inválido. Use DDD + 8 dígitos.";
  if (d.email_financeiro.trim() && !EMAIL_RE.test(d.email_financeiro.trim())) return "E-mail financeiro inválido.";
  if (d.cep && so(d.cep).length !== 8) return "CEP inválido. Use 8 dígitos.";
  return null;
}

/** Cria ou edita um cliente (2.2). A gravação e a auditoria ficam numa transação só, no banco. */
export async function salvarCliente(d: DadosCliente): Promise<Resultado & { id?: string }> {
  const erro = validar(d);
  if (erro) return falha(erro);
  const pj = d.tipo_pessoa === "pj";
  const dados = {
    tipo_pessoa: d.tipo_pessoa,
    documento: so(d.documento),
    razao_social: maiusc(d.razao_social),
    nome: maiusc(d.nome),
    inscricao_estadual: pj ? maiusc(d.inscricao_estadual) : "",
    ativo: d.ativo,
    contato_nome: maiusc(d.contato_nome),
    contato_cargo: maiusc(d.contato_cargo),
    email: d.email.trim().toLowerCase(),
    celular: so(d.celular),
    telefone: so(d.telefone),
    email_financeiro: d.email_financeiro.trim().toLowerCase(),
    cep: so(d.cep),
    logradouro: maiusc(d.logradouro),
    numero: maiusc(d.numero),
    complemento: maiusc(d.complemento),
    bairro: maiusc(d.bairro),
    cidade: maiusc(d.cidade),
    uf: d.uf,
    observacoes: d.observacoes.trim(),
  };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("salvar_cliente", { p_id: d.id ?? null, p_dados: dados });
  if (error) return erroBanco(error.message);
  revalidatePath("/m/cadastros.clientes");
  return { ok: true, mensagem: "Cliente salvo.", id: data as string };
}
