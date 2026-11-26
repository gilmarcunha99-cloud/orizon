import type { Metadata } from "next";
import { Brand } from "@/components/Brand";
import { ConfigPending } from "@/components/ConfigPending";
import { ForgotPasswordFlow } from "@/app/esqueci-senha/ForgotPasswordFlow";
import { supabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Orizon Pass — Criar senha" };

type SearchParams = Promise<{ token_hash?: string; email?: string }>;

/** Destino do link do e-mail de convite (Admin, usuários internos e Atletas importados). */
export default async function CriarSenhaPage({ searchParams }: { searchParams: SearchParams }) {
  const { token_hash, email } = await searchParams;
  return (
    <div className="page">
      <main className="card">
        <Brand />
        {supabaseConfigured ? (
          <ForgotPasswordFlow modo="convite" tokenHash={token_hash} emailInicial={email ?? ""} />
        ) : (
          <ConfigPending />
        )}
      </main>
    </div>
  );
}
