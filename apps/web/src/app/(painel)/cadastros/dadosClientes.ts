import { createClient } from "@/lib/supabase/server";
import { CLIENTE_VAZIO, type DadosCliente, type EventoCliente } from "./clienteRegras";

export type ClienteLinha = {
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
  ativo: boolean;
  eventos: number;
};

/** Erro de leitura não pode virar tela vazia: mostra a falha. */
function checar(error: { message: string } | null) {
  if (error) throw new Error(`Falha ao carregar os dados: ${error.message}`);
}

/** Lista 2.2: clientes não excluídos, com a quantidade de eventos ligados. */
export async function carregarClientes(): Promise<ClienteLinha[]> {
  const supabase = await createClient();
  const [c, ev] = await Promise.all([
    supabase
      .from("empresa")
      .select("id, tipo_pessoa, nome, razao_social, documento, contato_nome, email, celular, telefone, cidade, uf, tipos_inativos")
      .contains("tipos", ["cliente"])
      .is("excluido_em", null),
    supabase.rpc("eventos_do_cliente"),
  ]);
  checar(c.error);
  checar(ev.error);
  const conta = new Map<string, number>();
  for (const e of (ev.data ?? []) as EventoCliente[]) conta.set(e.cliente_id, (conta.get(e.cliente_id) ?? 0) + 1);
  return (c.data ?? []).map(({ tipos_inativos, ...r }) => ({
    ...r,
    ativo: !(tipos_inativos ?? []).includes("cliente"),
    eventos: conta.get(r.id) ?? 0,
  }));
}

/** Ficha de um cliente com os eventos ligados. Retorna null se não existir. */
export async function carregarCliente(id: string): Promise<{ dados: DadosCliente; eventos: EventoCliente[] } | null> {
  const supabase = await createClient();
  const [c, ev] = await Promise.all([
    supabase.from("empresa").select("*").eq("id", id).contains("tipos", ["cliente"]).is("excluido_em", null).maybeSingle(),
    supabase.rpc("eventos_do_cliente", { p_cliente: id }),
  ]);
  checar(c.error);
  checar(ev.error);
  if (!c.data) return null;
  const r = c.data as Record<string, unknown>;
  const dados = { ...CLIENTE_VAZIO, id };
  for (const k of Object.keys(CLIENTE_VAZIO) as (keyof DadosCliente)[]) {
    const v = r[k];
    if (v !== null && v !== undefined) (dados as Record<string, unknown>)[k] = v;
  }
  dados.ativo = !((r.tipos_inativos as string[] | null) ?? []).includes("cliente");
  return { dados, eventos: (ev.data ?? []) as EventoCliente[] };
}
