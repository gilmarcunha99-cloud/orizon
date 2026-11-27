import { createClient } from "@/lib/supabase/server";
import type { ItemCatalogo, ItemOferta, TipoItem } from "./catalogoRegras";

function checar(error: { message: string } | null) {
  if (error) throw new Error(`Falha ao carregar os dados: ${error.message}`);
}

/** Lista 2.6 / 2.7 / 2.8: itens do tipo, com quantos fornecedores oferecem cada um. */
export async function carregarCatalogo(tipo: TipoItem): Promise<ItemCatalogo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("catalogo_itens", { p_tipo: tipo });
  checar(error);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    nome: r.nome as string,
    categoria: r.categoria as string,
    unidade: r.unidade as string,
    descricao: (r.descricao as string | null) ?? "",
    ativo: Boolean(r.ativo),
    proprio: Boolean(r.proprio),
    alugado: Boolean(r.alugado),
    qtd_propria: (r.qtd_propria as number | null) ?? null,
    estado: (r.estado as string | null) ?? "",
    patrimonio: (r.patrimonio as string | null) ?? "",
    local_guarda: (r.local_guarda as string | null) ?? "",
    fornecedores: Number(r.fornecedores ?? 0),
  }));
}

/** Ficha do fornecedor: todos os itens do catálogo e os que este fornecedor já marcou. */
export async function carregarItensFornecedor(empresaId: string | null): Promise<{ itens: ItemOferta[]; marcados: string[] }> {
  const supabase = await createClient();
  const [itens, marcados] = await Promise.all([
    supabase.from("item").select("id, tipo, nome, categoria, ativo").is("excluido_em", null).order("nome"),
    empresaId
      ? supabase.from("fornecedor_item").select("item_id").eq("empresa_id", empresaId)
      : Promise.resolve({ data: [] as { item_id: string }[], error: null }),
  ]);
  checar(itens.error);
  checar(marcados.error);
  return {
    itens: (itens.data ?? []) as ItemOferta[],
    marcados: (marcados.data ?? []).map((m) => m.item_id),
  };
}
