"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Resultado } from "../plataforma/acoes";
import { CATEGORIAS } from "./fornecedorRegras";
import { ESTADOS, TIPOS_ITEM, UNIDADES, type DadosItem } from "./catalogoRegras";

const maiusc = (s: string) => s.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");

function falha(erro: string): Resultado {
  return { ok: false, erro };
}

function erroBanco(msg: string | undefined): Resultado {
  const m = msg ?? "";
  if (m.includes("item_nome_unico")) return falha("Esse nome já está no catálogo.");
  if (m.includes("row-level security") || m.includes("permission denied") || m.startsWith("Sem permissão"))
    return falha("Você não tem permissão para salvar este item.");
  if (/^(Escolha|Informe|Esse |Marque|Item não)/.test(m)) return falha(m);
  return falha("Não foi possível salvar. Tente de novo em instantes.");
}

function validar(d: DadosItem): string | null {
  const t = TIPOS_ITEM[d.tipo];
  if (!t) return "Escolha o tipo do item.";
  if (maiusc(d.nome).length < 2) return `Informe o nome do ${t.nome.toLowerCase()}.`;
  if (!CATEGORIAS.some((c) => c.v === d.categoria)) return "Escolha a categoria.";
  if (!UNIDADES.some((u) => u.v === d.unidade)) return "Escolha a unidade de cobrança.";
  if (d.tipo === "equipamento") {
    if (!d.proprio && !d.alugado) return "Marque a origem: próprio, alugado ou os dois.";
    if (d.proprio && !/^\d{1,6}$/.test(d.qtd_propria.trim())) return "Informe a quantidade própria.";
    if (d.proprio && d.estado && !ESTADOS.some((e) => e.v === d.estado)) return "Estado de conservação inválido.";
  }
  return null;
}

/** Cria ou edita um item do catálogo (2.6, 2.7, 2.8). Também usado na ficha do fornecedor para um item novo. */
export async function salvarItem(d: DadosItem): Promise<Resultado & { id?: string }> {
  const erro = validar(d);
  if (erro) return falha(erro);
  const equip = d.tipo === "equipamento";
  const dados = {
    tipo: d.tipo,
    nome: maiusc(d.nome),
    categoria: d.categoria,
    unidade: d.unidade,
    descricao: d.descricao.trim(),
    ativo: d.ativo,
    proprio: equip && d.proprio,
    alugado: equip && d.alugado,
    qtd_propria: equip && d.proprio ? d.qtd_propria.trim() : "",
    estado: equip && d.proprio ? d.estado : "",
    patrimonio: equip && d.proprio ? maiusc(d.patrimonio) : "",
    local_guarda: equip && d.proprio ? maiusc(d.local_guarda) : "",
  };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("salvar_item", { p_id: d.id ?? null, p_dados: dados });
  if (error) return erroBanco(error.message);
  revalidatePath(`/m/${TIPOS_ITEM[d.tipo].codigo}`);
  const nome = TIPOS_ITEM[d.tipo].nome;
  return { ok: true, mensagem: `${nome} ${dados.nome} salv${d.tipo === "servico" || d.tipo === "equipamento" ? "o" : "a"}.`, id: data as string };
}
