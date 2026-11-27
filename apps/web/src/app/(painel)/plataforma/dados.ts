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

export type UsuarioLinha = {
  id: string;
  nome: string;
  email: string;
  cpf: string | null;
  celular: string | null;
  ativo: boolean;
  perfil: string | null;
  subtipo: string | null;
};

/** Lista 2.1: cada pessoa com o seu perfil atual (o vínculo mais recente) e o sub-tipo. */
export async function carregarUsuarios(): Promise<UsuarioLinha[]> {
  const supabase = await createClient();
  const [u, up, st] = await Promise.all([
    supabase.from("usuario").select("id, nome, email, cpf, celular, ativo").is("excluido_em", null),
    supabase.from("usuario_perfil").select("usuario_id, perfil, subtipo_id, criado_em").order("criado_em", { ascending: false }),
    supabase.from("subtipo").select("id, nome"),
  ]);
  checar(u.error);
  checar(up.error);
  checar(st.error);
  const atual = new Map<string, { perfil: string; subtipo_id: string | null }>();
  for (const r of up.data ?? []) if (!atual.has(r.usuario_id)) atual.set(r.usuario_id, r);
  const nomeSub = new Map((st.data ?? []).map((s) => [s.id, s.nome]));
  return (u.data ?? []).map((r) => {
    const p = atual.get(r.id);
    return { ...r, perfil: p?.perfil ?? null, subtipo: p?.subtipo_id ? (nomeSub.get(p.subtipo_id) ?? null) : null };
  });
}

export type Inscricao = { evento: string; data: string; origem: string };
export type UsuarioCompleto = {
  dados: import("./usuarioRegras").DadosUsuario;
  inscricoes: Inscricao[];
};

/** Ficha completa de uma pessoa para a tela de edição (2.1). Retorna null se não existir. */
export async function carregarUsuario(id: string): Promise<UsuarioCompleto | null> {
  const supabase = await createClient();
  const [u, up, fa, pe] = await Promise.all([
    supabase.from("usuario").select("id, nome, email, cpf, celular, data_nascimento, genero, ativo").eq("id", id).is("excluido_em", null).maybeSingle(),
    supabase.from("usuario_perfil").select("perfil, subtipo_id").eq("usuario_id", id).maybeSingle(),
    supabase.from("ficha_atleta").select("*").eq("usuario_id", id).maybeSingle(),
    supabase.from("papel_evento").select("origem, evento(nome, data_inicio)").eq("usuario_id", id).eq("perfil", "atleta"),
  ]);
  checar(u.error);
  checar(up.error);
  checar(fa.error);
  if (!u.data) return null;
  const f = fa.data;
  const t = (v: string | null | undefined) => v ?? "";
  return {
    dados: {
      id: u.data.id,
      nome: u.data.nome,
      email: u.data.email,
      cpf: t(u.data.cpf),
      celular: t(u.data.celular),
      data_nascimento: t(u.data.data_nascimento),
      genero: t(u.data.genero),
      ativo: u.data.ativo,
      perfil: t(up.data?.perfil),
      subtipo_id: t(up.data?.subtipo_id),
      ficha: f
        ? {
            cidade: t(f.cidade),
            uf: t(f.uf),
            camiseta: t(f.camiseta),
            grupo: t(f.grupo),
            emergencia_nome: t(f.emergencia_nome),
            emergencia_celular: t(f.emergencia_celular),
            tipo_sanguineo: t(f.tipo_sanguineo),
            saude_obs: t(f.saude_obs),
            responsavel_nome: t(f.responsavel_nome),
            responsavel_cpf: t(f.responsavel_cpf),
            responsavel_celular: t(f.responsavel_celular),
          }
        : null,
    },
    // Sem permissão de ver eventos, a lista de inscrições fica vazia em vez de travar a tela.
    inscricoes: (pe.data ?? []).map((r) => {
      const ev = (Array.isArray(r.evento) ? r.evento[0] : r.evento) as { nome: string; data_inicio: string } | null;
      return { evento: ev?.nome ?? "—", data: ev?.data_inicio ?? "", origem: r.origem };
    }),
  };
}
