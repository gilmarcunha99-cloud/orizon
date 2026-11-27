import { createAdminClient } from "@/lib/supabase/admin";

export type Acesso = "acessou" | "convite_enviado" | "sem_convite" | "desconhecido";

/** Situação de acesso da pessoa (para a ficha): já acessou, convite enviado ou ainda sem convite. */
export async function situacaoAcesso(id: string): Promise<{ acesso: Acesso; quando: string | null }> {
  const admin = createAdminClient();
  if (!admin) return { acesso: "desconhecido", quando: null };
  const { data } = await admin.auth.admin.getUserById(id);
  const u = data?.user;
  if (!u) return { acesso: "desconhecido", quando: null };
  if (u.last_sign_in_at) return { acesso: "acessou", quando: u.last_sign_in_at };
  if (u.invited_at) return { acesso: "convite_enviado", quando: u.invited_at };
  return { acesso: "sem_convite", quando: null };
}
