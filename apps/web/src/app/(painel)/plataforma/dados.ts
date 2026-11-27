import { createClient } from "@/lib/supabase/server";

export type Perfil = {
  codigo: string;
  nome: string;
  descricao: string;
  participacao: "permanente" | "eventual" | "nao_se_aplica";
  sistema: boolean;
  ativo: boolean;
  usuarios: number;
  subtipos: number;
};

export type Subtipo = { id: string; perfil: string; nome: string; ativo: boolean; usuarios: number };
export type Func = { codigo: string; modulo: string; nome: string; num: string };

/** Erro de leitura não pode virar tela vazia: mostra a falha. */
function checar(error: { message: string } | null) {
  if (error) throw new Error(`Falha ao carregar os dados: ${error.message}`);
}

export async function carregarPerfis(): Promise<Perfil[]> {
  const supabase = await createClient();
  const [p, up, st] = await Promise.all([
    supabase.from("perfil").select("codigo, nome, descricao, participacao, sistema, ativo, ordem").order("ordem").order("nome"),
    supabase.from("usuario_perfil").select("perfil"),
    supabase.from("subtipo").select("perfil"),
  ]);
  checar(p.error);
  checar(up.error);
  checar(st.error);
  const conta = (lista: { perfil: string }[] | null, c: string) => (lista ?? []).filter((x) => x.perfil === c).length;
  return (p.data ?? []).map((r) => ({
    codigo: r.codigo,
    nome: r.nome,
    descricao: r.descricao,
    participacao: r.participacao,
    sistema: r.sistema,
    ativo: r.ativo,
    usuarios: conta(up.data, r.codigo),
    subtipos: conta(st.data, r.codigo),
  }));
}

export async function carregarSubtipos(): Promise<Subtipo[]> {
  const supabase = await createClient();
  const [s, up] = await Promise.all([
    supabase.from("subtipo").select("id, perfil, nome, ativo").order("nome"),
    supabase.from("usuario_perfil").select("subtipo_id").not("subtipo_id", "is", null),
  ]);
  checar(s.error);
  checar(up.error);
  return (s.data ?? []).map((r) => ({
    ...r,
    usuarios: (up.data ?? []).filter((u) => u.subtipo_id === r.id).length,
  }));
}

/** Funcionalidades da matriz de permissões (sem Plataforma, que é só do Admin), com a numeração do menu. */
export async function carregarMatriz(): Promise<{ funcs: Func[]; permissoes: Record<string, string[]> }> {
  const supabase = await createClient();
  const [f, pe] = await Promise.all([
    supabase.from("funcionalidade").select("codigo, modulo, nome, ordem").order("ordem"),
    supabase.from("permissao").select("perfil, funcionalidade, acao"),
  ]);
  checar(f.error);
  checar(pe.error);
  const ordemModulos = ["Plataforma", "Cadastros", "Eventos", "Financeiro"];
  const funcs: Func[] = [];
  ordemModulos.forEach((m, mi) => {
    (f.data ?? [])
      .filter((x) => x.modulo === m)
      .forEach((x, xi) => {
        if (m !== "Plataforma") funcs.push({ codigo: x.codigo, modulo: m, nome: x.nome, num: `${mi + 1}.${xi + 1}` });
      });
  });
  const permissoes: Record<string, string[]> = {};
  for (const r of pe.data ?? []) (permissoes[r.perfil] ??= []).push(`${r.funcionalidade}:${r.acao}`);
  return { funcs, permissoes };
}
