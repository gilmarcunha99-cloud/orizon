import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const NOME_PERFIL: Record<string, string> = {
  admin: "Admin",
  diretor: "Diretor(a)",
  organizador: "Organizador(a)",
  coordenador: "Coordenador(a)",
  terceiros: "Auxiliares",
  staff: "Staff",
  atleta: "Atleta",
  visitante: "Visitante",
  patrocinador: "Patrocinador",
  arbitro: "Árbitro",
};

/** Ordem e descrição curta dos módulos (modelagem revisada de 26/11/2026). */
export const MODULOS = [
  { nome: "Plataforma", descricao: "Configurações do App (exclusivo do Admin)" },
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

  const [{ data: usuario, error: erroUsuario }, { data: funcs, error: erroFuncs }] = await Promise.all([
    supabase.from("usuario").select("nome, usuario_perfil(perfil)").eq("id", user.id).maybeSingle(),
    supabase.from("funcionalidade").select("codigo, modulo, nome, ordem").order("ordem"),
  ]);
  // Erro do banco não pode virar "usuário sem perfil": mostra a falha em vez de um menu errado.
  if (erroUsuario || erroFuncs) throw new Error(`Falha ao carregar o painel: ${(erroUsuario ?? erroFuncs)?.message}`);
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

  // Numeração da lista de módulos do Gilmar (27/11): 1.1, 1.2… 2.10, 2.11.
  // Plataforma (configurações do App) é exclusiva do Admin, mesmo que a matriz libere algo.
  const ehAdmin = perfis.includes("admin");
  const modulos: Modulo[] = MODULOS.filter((m) => ehAdmin || m.nome !== "Plataforma").map((m) => ({
    ...m,
    num: String(MODULOS.indexOf(m) + 1),
    itens: (funcs ?? [])
      .filter((f) => f.modulo === m.nome)
      .map((f, fi) => ({ codigo: f.codigo, nome: f.nome, num: `${MODULOS.indexOf(m) + 1}.${fi + 1}` }))
      .filter((f) => liberadas.has(f.codigo)),
  })).filter((m) => m.itens.length);

  return { userId: user.id, email: user.email ?? "", nome: usuario?.nome ?? "", perfis, modulos };
});
