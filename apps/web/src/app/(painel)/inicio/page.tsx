import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { carregarPainel } from "@/lib/painel";

export const metadata: Metadata = { title: "Orizon Pass — Início" };

/** Abre na primeira funcionalidade liberada ao perfil, como no protótipo aprovado. */
export default async function InicioPage() {
  const painel = await carregarPainel();
  if (!painel) redirect("/entrar");

  // Visitante que criou a conta mas não terminou o cadastro volta para a última etapa.
  if (!painel.nome && painel.perfis.every((p) => p === "visitante")) redirect("/primeiro-acesso?etapa=cadastro");

  const primeiro = painel.modulos[0]?.itens[0];
  if (primeiro) redirect(`/m/${primeiro.codigo}`);

  return (
    <>
      <header className="crumb-bar">
        <div className="crumb">Início</div>
      </header>
      <div className="content">
        <section className="placeholder">
          <div className="ph-title">Nenhum módulo liberado</div>
          <div className="ph-text">Os acessos do seu perfil são definidos pelo administrador.</div>
        </section>
      </div>
    </>
  );
}
