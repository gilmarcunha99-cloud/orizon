import type { Metadata } from "next";
import { Brand } from "@/components/Brand";
import { ConfigPending } from "@/components/ConfigPending";
import { supabaseConfigured } from "@/lib/env";
import { PrimeiroAcessoFlow } from "./PrimeiroAcessoFlow";

export const metadata: Metadata = { title: "Orizon Pass — Primeiro acesso" };

type SearchParams = Promise<{ etapa?: string }>;

/**
 * Primeiro acesso do Visitante: quem não tem cadastro entra só como Visitante.
 * E-mail → código de 6 dígitos → criar senha → cadastro (nome, celular, nascimento, Termos).
 * Os demais perfis são cadastrados na web pela Orizon (manual ou Atleta via planilha).
 */
export default async function PrimeiroAcessoPage({ searchParams }: { searchParams: SearchParams }) {
  const { etapa } = await searchParams;
  return (
    <div className="page">
      <main className="card">
        <Brand />
        {supabaseConfigured ? <PrimeiroAcessoFlow etapaInicial={etapa === "cadastro" ? "cadastro" : "email"} /> : <ConfigPending />}
      </main>
    </div>
  );
}
