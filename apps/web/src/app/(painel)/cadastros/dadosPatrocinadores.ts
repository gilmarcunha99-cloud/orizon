import { createClient } from "@/lib/supabase/server";
import { deLinha } from "./fornecedorRegras";
import { PATROCINADOR_VAZIO, type DadosPatrocinador } from "./patrocinadorRegras";

export type PatrocinadorLinha = {
  id: string;
  tipo_pessoa: "pj" | "pf";
  nome: string;
  razao_social: string | null;
  documento: string | null;
  contato_nome: string | null;
  email: string | null;
  ramo: string | null;
  participacao: string[];
  ativo: boolean;
  equipe: number;
};

function checar(error: { message: string } | null) {
  if (error) throw new Error(`Falha ao carregar os dados: ${error.message}`);
}

/** Lista 2.4: patrocinadores não excluídos. A equipe (staff por evento) chega com o módulo Eventos. */
export async function carregarPatrocinadores(): Promise<PatrocinadorLinha[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empresa")
    .select("id, tipo_pessoa, nome, razao_social, documento, contato_nome, email, ramo, participacao, tipos_inativos")
    .contains("tipos", ["patrocinador"])
    .is("excluido_em", null);
  checar(error);
  return (data ?? []).map(({ tipos_inativos, ...r }) => ({
    ...r,
    participacao: r.participacao ?? [],
    ativo: !(tipos_inativos ?? []).includes("patrocinador"),
    equipe: 0,
  }));
}

/** Ficha de um patrocinador. Retorna null se não existir. */
export async function carregarPatrocinador(
  id: string,
): Promise<{ dados: DadosPatrocinador; outrosPapeis: string[] } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empresa")
    .select("*")
    .eq("id", id)
    .contains("tipos", ["patrocinador"])
    .is("excluido_em", null)
    .maybeSingle();
  checar(error);
  if (!data) return null;
  const r = data as Record<string, unknown>;
  const dados = { ...deLinha(PATROCINADOR_VAZIO, r), id };
  dados.ativo = !((r.tipos_inativos as string[] | null) ?? []).includes("patrocinador");
  const outrosPapeis = ((r.tipos as string[] | null) ?? []).filter((t) => t === "cliente" || t === "fornecedor");
  return { dados, outrosPapeis };
}
