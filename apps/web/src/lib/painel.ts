import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const NOME_PERFIL: Record<string, string> = {
  admin: "Admin",
  diretor: "Diretor(a)",
  organizador: "Organizador(a)",
  coordenador: "Coordenador(a)",
  terceiros: "Terceiros",
  staff: "Staff",
  atleta: "Atleta",
  visitante: "Visitante",
  patrocinador: "Patrocinador",
  arbitro: "Árbitro",
};

/** Ordem e descrição curta dos módulos (modelagem revisada de 26/11/2026). */
export const MODULOS = [
  { nome: "Plataforma", descricao: "Integrações e regras de acesso" },
  { nome: "Cadastros", descricao: "Pessoas, empresas e itens" },
  { nome: "Eventos", descricao: "Do contrato ao resultado" },
  { nome: "Financeiro", descricao: "Orçamento, contas e prestação" },
] as const;

export type Item = { codigo: string; nome: string; num: string };
export type Modulo = { nome: string; descricao: string; num: string; itens: Item[] };
export type Painel = {
  userId: string;
  email: string;
  nome: string;
  perfis: string[];
  modulos: Modulo[];
};

/**
 * Dados do painel do usuário logado: perfis e os módulos/funcionalidades que ele pode ver.
 * Admin vê tudo; os demais perfis seguem a matriz perfil × funcionalidade × ação (ação "ver").
 */
export const carregarPainel = cache(async (): Promise<Painel | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: usuario }, { data: funcs }] = await Promise.all([
    supabase.from("usuario").select("nome, usuario_perfil(perfil)").eq("id", user.id).maybeSingle(),
    supabase.from("funcionalidade").select("codigo, modulo, nome, ordem").order("ordem"),
  ]);
  const perfis = ((usuario?.usuario_perfil ?? []) as { perfil: string }[]).map((p) => p.perfil);

  let liberadas: Set<string>;
  if (perfis.includes("admin")) {
    liberadas = new Set((funcs ?? []).map((f) => f.codigo));
  } else if (perfis.length) {
    const { data: perms } = await supabase
      .from("permissao")
      .select("funcionalidade")
      .in("perfil", perfis)
      .eq("acao", "ver");
    liberadas = new Set((perms ?? []).map((p) => p.funcionalidade));
  } else {
    liberadas = new Set();
  }

  // Numeração do protótipo aprovado: módulo 01, 02… e funcionalidade 1.01, 1.02…
  const modulos: Modulo[] = MODULOS.map((m, mi) => ({
    ...m,
    num: String(mi + 1).padStart(2, "0"),
    itens: (funcs ?? [])
      .filter((f) => f.modulo === m.nome)
      .map((f, fi) => ({ codigo: f.codigo, nome: f.nome, num: `${mi + 1}.${String(fi + 1).padStart(2, "0")}` }))
      .filter((f) => liberadas.has(f.codigo)),
  })).filter((m) => m.itens.length);

  return { userId: user.id, email: user.email ?? "", nome: usuario?.nome ?? "", perfis, modulos };
});
