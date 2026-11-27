"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Modulo } from "@/lib/painel";
import { sair } from "./actions";

type Props = { modulos: Modulo[]; nome: string; perfis: string[] };

/** Barra do topo: logo, um combo por módulo e o menu do usuário. No celular vira menu lateral. */
export function TopNav({ modulos, nome, perfis }: Props) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState<string | null>(null);
  const [gaveta, setGaveta] = useState(false);
  const barra = useRef<HTMLElement>(null);

  // Fecha os combos ao trocar de página, clicar fora ou apertar Esc.
  useEffect(() => {
    setAberto(null);
    setGaveta(false);
  }, [pathname]);
  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (barra.current && !barra.current.contains(e.target as Node)) setAberto(null);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAberto(null);
        setGaveta(false);
      }
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  const ativo = (m: Modulo) => m.itens.some((i) => pathname === `/m/${i.codigo}`);
  const iniciais = nome
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <header className="topbar" ref={barra}>
      <div className="topbar-in">
        <button
          type="button"
          className="menu-btn"
          aria-label="Abrir menu"
          aria-expanded={gaveta}
          onClick={() => setGaveta((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
        <Link href="/inicio" className="topbar-brand" aria-label="Orizon Pass: início">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-orizon-sports.svg" alt="" width={120} height={30} />
          <span>Pass</span>
        </Link>

        <nav className={`modnav ${gaveta ? "open" : ""}`} aria-label="Módulos">
          {modulos.length === 0 && <span className="modnav-vazio">Nenhum módulo liberado para o seu perfil.</span>}
          {modulos.map((m) => {
            const open = aberto === m.nome;
            return (
              <div key={m.nome} className={`combo ${open ? "open" : ""} ${ativo(m) ? "ativo" : ""}`}>
                <button
                  type="button"
                  className="combo-btn"
                  aria-haspopup="true"
                  aria-expanded={open}
                  onClick={() => setAberto(open ? null : m.nome)}
                >
                  {m.nome}
                  <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </button>
                <ul className="combo-list" role="menu" aria-label={m.nome}>
                  {m.itens.map((i) => (
                    <li key={i.codigo} role="none">
                      <Link
                        role="menuitem"
                        href={`/m/${i.codigo}`}
                        aria-current={pathname === `/m/${i.codigo}` ? "page" : undefined}
                      >
                        {i.nome}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className={`combo user ${aberto === "__user" ? "open" : ""}`}>
          <button
            type="button"
            className="avatar"
            aria-label="Menu do usuário"
            aria-haspopup="true"
            aria-expanded={aberto === "__user"}
            onClick={() => setAberto(aberto === "__user" ? null : "__user")}
          >
            {iniciais || "?"}
          </button>
          <div className="combo-list user-list">
            <p className="user-nome">{nome}</p>
            <p className="user-perfis">{perfis.join(", ") || "Visitante"}</p>
            <form action={sair}>
              <button type="submit" className="btn btn-secondary">
                Sair
              </button>
            </form>
          </div>
        </div>
      </div>
      {gaveta && <div className="scrim" onClick={() => setGaveta(false)} aria-hidden="true" />}
    </header>
  );
}
