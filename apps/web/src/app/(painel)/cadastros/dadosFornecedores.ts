import { createClient } from "@/lib/supabase/server";
import { FORNECEDOR_VAZIO, deLinha, type DadosFornecedor } from "./fornecedorRegras";

export type FornecedorLinha = {
  id: string;
  tipo_pessoa: "pj" | "pf";
  nome: string;
  razao_social: string | null;
  documento: string | null;
  contato_nome: string | null;
  email: string | null;
  celular: string | null;
  telefone: string | null;
  cidade: string | null;
  uf: string | null;
  categorias: string[];
  ativo: boolean;
  tambemCliente: boolean;
};

function checar(error: { message: string } | null) {
  if (error) throw new Error(`Falha ao carregar os dados: ${error.message}`);
}

/** Lista 2.3: fornecedores não excluídos. */
export async function carregarFornecedores(): Promise<FornecedorLinha[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empresa")
    .select("id, tipo_pessoa, nome, razao_social, documento, contato_nome, email, celular, telefone, cidade, uf, categorias, tipos, tipos_inativos")
    .contains("tipos", ["fornecedor"])
    .is("excluido_em", null);
  checar(error);
  return (data ?? []).map(({ tipos, tipos_inativos, ...r }) => ({
    ...r,
    categorias: r.categorias ?? [],
    ativo: !(tipos_inativos ?? []).includes("fornecedor"),
    tambemCliente: (tipos ?? []).includes("cliente"),
  }));
}

/** Ficha de um fornecedor. Retorna null se não existir. */
export async function carregarFornecedor(id: string): Promise<{ dados: DadosFornecedor; tambemCliente: boolean } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empresa")
    .select("*")
    .eq("id", id)
    .contains("tipos", ["fornecedor"])
    .is("excluido_em", null)
    .maybeSingle();
  checar(error);
  if (!data) return null;
  const r = data as Record<string, unknown>;
  const dados = { ...deLinha(FORNECEDOR_VAZIO, r), id };
  dados.ativo = !((r.tipos_inativos as string[] | null) ?? []).includes("fornecedor");
  return { dados, tambemCliente: ((r.tipos as string[] | null) ?? []).includes("cliente") };
}
