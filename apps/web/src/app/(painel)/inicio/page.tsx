import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { carregarPainel, NOME_PERFIL } from "@/lib/painel";

export const metadata: Metadata = { title: "Orizon Pass — Início" };

/** Tela principal: atalhos para os módulos e funcionalidades liberados ao perfil. */
export default async function InicioPage() {
  const painel = await carregarPainel();
  if (!painel) redirect("/entrar");

  // Visitante que criou a conta mas não terminou o cadastro volta para a última etapa.
  if (!painel.nome && painel.perfis.every((p) => p === "visitante")) redirect("/primeiro-acesso?etapa=cadastro");

  const primeiroNome = painel.nome.split(" ")[0] || painel.email;
  return (
    <>
      <div className="page-head">
        <h1>Olá, {primeiroNome}</h1>
        <p className="hint">
          Perfil: {painel.perfis.map((p) => NOME_PERFIL[p] ?? p).join(", ") || "Visitante"}
        </p>
      </div>
      {painel.modulos.length === 0 ? (
        <p className="notice">Ainda não há módulos liberados para o seu perfil. Os acessos são definidos pelo Admin.</p>
      ) : (
        <div className="mod-grid">
          {painel.modulos.map((m) => (
            <section key={m.nome} className="mod-card" aria-labelledby={`mod-${m.nome}`}>
              <h2 id={`mod-${m.nome}`}>{m.nome}</h2>
              <p className="hint">{m.descricao}</p>
              <ul>
                {m.itens.map((i) => (
                  <li key={i.codigo}>
                    <Link href={`/m/${i.codigo}`}>{i.nome}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
