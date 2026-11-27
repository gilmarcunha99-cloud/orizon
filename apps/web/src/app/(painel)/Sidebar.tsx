"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Modulo } from "@/lib/painel";
import { sair } from "./actions";

type Props = { modulos: Modulo[]; nome: string; perfis: string[] };

/**
 * Menu lateral do protótipo aprovado (Tela principal — ORIZON Pass Web):
 * logo, combo único de MÓDULO, lista de FUNCIONALIDADES do módulo e o usuário logado com Sair.
 */
export function Sidebar({ modulos, nome, perfis }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const atual = pathname.startsWith("/m/") ? decodeURIComponent(pathname.slice(3).split("/")[0]) : "";
  const doAtual = modulos.find((m) => m.itens.some((i) => i.codigo === atual));
  const [modNome, setModNome] = useState(doAtual?.nome ?? modulos[0]?.nome ?? "");
  const [aberto, setAberto] = useState(false);

  // Acompanha o módulo da página aberta e fecha o menu no celular ao navegar.
  useEffect(() => {
    if (doAtual) setModNome(doAtual.nome);
    setAberto(false);
  }, [doAtual]);

  const mod = modulos.find((m) => m.nome === modNome) ?? modulos[0];

  function trocarModulo(nomeModulo: string) {
    setModNome(nomeModulo);
    const primeiro = modulos.find((m) => m.nome === nomeModulo)?.itens[0];
    if (primeiro) router.push(`/m/${primeiro.codigo}`);
  }

  return (
    <aside className="side">
      <div className="side-top">
        <Link href="/inicio" className="side-brand" aria-label="Orizon Pass: início">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-orizon-sports.svg" alt="Orizon Sports" width={150} height={38} />
          <span>Pass</span>
        </Link>
        <button
          type="button"
          className="side-toggle"
          aria-expanded={aberto}
          aria-controls="side-menu"
          onClick={() => setAberto((v) => !v)}
        >
          {aberto ? "Fechar" : "Menu"}
        </button>
      </div>

      <div id="side-menu" className={`side-scroll ${aberto ? "open" : ""}`}>
        {modulos.length === 0 ? (
          <p className="side-vazio">Nenhum módulo liberado para o seu perfil.</p>
        ) : (
          <>
            <label htmlFor="modsel" className="side-label">
              MÓDULO
            </label>
            <select id="modsel" className="msel" value={mod?.nome} onChange={(e) => trocarModulo(e.target.value)}>
              {modulos.map((m) => (
                <option key={m.nome} value={m.nome}>
                  {m.nome}
                </option>
              ))}
            </select>

            <div className="side-label side-label-gap">FUNCIONALIDADES</div>
            <nav aria-label="Funcionalidades do módulo" className="side-nav">
              {mod?.itens.map((i) => (
                <Link
                  key={i.codigo}
                  href={`/m/${i.codigo}`}
                  className={`nav ${atual === i.codigo ? "nav-on" : ""}`}
                  aria-current={atual === i.codigo ? "page" : undefined}
                >
                  <span className="n">{i.num}</span>
                  <span>{i.nome}</span>
                </Link>
              ))}
            </nav>
          </>
        )}
      </div>

      <div className={`side-user ${aberto ? "open" : ""}`}>
        <div className="side-user-nome">{nome.toUpperCase()}</div>
        <div className="side-badges">
          {(perfis.length ? perfis : ["Visitante"]).map((p) => (
            <span key={p} className="side-badge">
              {p.toUpperCase()}
            </span>
          ))}
        </div>
        <form action={sair}>
          <button type="submit" className="side-sair">
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
