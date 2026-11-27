"use server";

import { createClient } from "@/lib/supabase/server";

export type Papel = "cliente" | "fornecedor";
export type BuscaEmpresa =
  | { situacao: "novo" }
  | { situacao: "mesmo"; id: string; nome: string }
  | { situacao: "outro"; nome: string; papeis: string[]; linha: Record<string, unknown> };

/**
 * Cadastro único de empresas: ao digitar o CNPJ/CPF num cadastro novo, procura se ele já existe.
 * "mesmo" = já está cadastrado neste papel; "outro" = existe em outro papel (a tela aproveita os dados).
 */
export async function buscarEmpresa(papel: Papel, documento: string): Promise<BuscaEmpresa> {
  const doc = documento.replace(/\D/g, "");
  if (doc.length !== 11 && doc.length !== 14) return { situacao: "novo" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("empresa_por_documento", { p_tipo: papel, p_doc: doc });
  const linha = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
  if (error || !linha) return { situacao: "novo" };
  const tipos = (linha.tipos as string[]) ?? [];
  if (tipos.includes(papel)) return { situacao: "mesmo", id: String(linha.id), nome: String(linha.nome) };
  return { situacao: "outro", nome: String(linha.nome), papeis: tipos, linha };
}
