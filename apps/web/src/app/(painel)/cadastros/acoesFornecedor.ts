"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { EMAIL_RE, celularOk } from "@/lib/validation";
import type { Resultado } from "../plataforma/acoes";
import { cpfOk } from "../plataforma/usuarioRegras";
import { cnpjOk, fixoOk } from "./clienteRegras";
import { CATEGORIAS, CONTA_TIPOS, MEIOS_PAGAMENTO, PIX_TIPOS, type DadosFornecedor } from "./fornecedorRegras";

const maiusc = (s: string) => s.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
const so = (s: string) => s.replace(/\D/g, "");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function falha(erro: string): Resultado {
  return { ok: false, erro };
}

function erroBanco(msg: string | undefined): Resultado {
  const m = msg ?? "";
  if (m.includes("empresa_documento_unico")) return falha("Esse CNPJ/CPF já está cadastrado.");
  if (m.includes("row-level security") || m.includes("permission denied") || m.startsWith("Sem permissão"))
    return falha("Você não tem permissão para salvar fornecedores.");
  if (/^(Escolha|Informe|Esse CNPJ|Esse CPF|Cadastro não)/.test(m)) return falha(m);
  return falha("Não foi possível salvar. Tente de novo em instantes.");
}

function validar(d: DadosFornecedor): string | null {
  const pj = d.tipo_pessoa === "pj";
  if (pj ? !cnpjOk(d.documento) : !cpfOk(d.documento)) return pj ? "CNPJ inválido." : "CPF inválido.";
  if (d.razao_social.trim().length < 3) return pj ? "Informe a razão social." : "Informe o nome completo.";
  if (d.nome.trim().length < 2) return "Informe o nome fantasia.";
  if (!d.categorias.length) return "Marque pelo menos uma categoria em O que fornece.";
  if (d.categorias.some((c) => !CATEGORIAS.some((x) => x.v === c))) return "Categoria inválida.";
  if (d.contato_nome.trim().length < 3) return "Informe o nome do contato.";
  if (!EMAIL_RE.test(d.email.trim())) return "Informe um e-mail válido para o contato.";
  if (!celularOk(d.celular)) return "Celular inválido. Use DDD + 9 dígitos.";
  if (d.telefone && !fixoOk(d.telefone)) return "Telefone fixo inválido. Use DDD + 8 dígitos.";
  if (d.meios_pagamento.some((m) => !MEIOS_PAGAMENTO.some((x) => x.v === m))) return "Meio de pagamento inválido.";
  if (d.pix_tipo && !PIX_TIPOS.some((x) => x.v === d.pix_tipo)) return "Tipo de chave PIX inválido.";
  if (d.pix_chave.trim() && !d.pix_tipo) return "Escolha o tipo da chave PIX.";
  if (d.pix_tipo && d.pix_chave.trim()) {
    const k = d.pix_chave.trim();
    if (d.pix_tipo === "cnpj" && !cnpjOk(k)) return "Chave PIX: CNPJ inválido.";
    if (d.pix_tipo === "cpf" && !cpfOk(k)) return "Chave PIX: CPF inválido.";
    if (d.pix_tipo === "email" && !EMAIL_RE.test(k)) return "Chave PIX: e-mail inválido.";
    if (d.pix_tipo === "celular" && !celularOk(k)) return "Chave PIX: celular inválido.";
  }
  if (d.conta_tipo && !CONTA_TIPOS.some((x) => x.v === d.conta_tipo)) return "Tipo de conta inválido.";
  if (d.cep && so(d.cep).length !== 8) return "CEP inválido. Use 8 dígitos.";
  return null;
}

/** Cria ou edita um fornecedor (2.3). Se o CNPJ/CPF já for de um cliente, o banco junta os cadastros. */
export async function salvarFornecedor(d: DadosFornecedor, itens: string[]): Promise<Resultado & { id?: string }> {
  const erro = validar(d);
  if (erro) return falha(erro);
  if (!Array.isArray(itens) || itens.some((i) => !UUID.test(i))) return falha("Lista de itens inválida.");
  const pj = d.tipo_pessoa === "pj";
  const pixNumerico = ["cnpj", "cpf", "celular"].includes(d.pix_tipo);
  const dados = {
    tipo_pessoa: d.tipo_pessoa,
    documento: so(d.documento),
    razao_social: maiusc(d.razao_social),
    nome: maiusc(d.nome),
    inscricao_estadual: pj ? maiusc(d.inscricao_estadual) : "",
    ativo: d.ativo,
    categorias: d.categorias,
    descricao_servicos: d.descricao_servicos.trim(),
    contato_nome: maiusc(d.contato_nome),
    contato_cargo: maiusc(d.contato_cargo),
    email: d.email.trim().toLowerCase(),
    celular: so(d.celular),
    telefone: so(d.telefone),
    site: d.site.trim(),
    meios_pagamento: d.meios_pagamento,
    pix_tipo: d.pix_chave.trim() ? d.pix_tipo : "",
    pix_chave: pixNumerico ? so(d.pix_chave) : d.pix_tipo === "email" ? d.pix_chave.trim().toLowerCase() : d.pix_chave.trim(),
    banco: maiusc(d.banco),
    agencia: d.agencia.trim(),
    conta: d.conta.trim(),
    conta_tipo: d.conta_tipo,
    titular_nome: maiusc(d.titular_nome),
    cep: so(d.cep),
    logradouro: maiusc(d.logradouro),
    numero: maiusc(d.numero),
    complemento: maiusc(d.complemento),
    bairro: maiusc(d.bairro),
    cidade: maiusc(d.cidade),
    uf: d.uf,
    observacoes: d.observacoes.trim(),
    itens,
  };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("salvar_fornecedor", { p_id: d.id ?? null, p_dados: dados });
  if (error) return erroBanco(error.message);
  revalidatePath("/m/cadastros.fornecedores");
  revalidatePath("/m/cadastros.clientes");
  revalidatePath("/m/cadastros.servicos");
  revalidatePath("/m/cadastros.mercadorias");
  revalidatePath("/m/cadastros.equipamentos");
  return { ok: true, mensagem: "Fornecedor salvo.", id: data as string };
}
