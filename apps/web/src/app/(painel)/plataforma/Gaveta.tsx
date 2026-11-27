"use client";

import { useEffect, useRef } from "react";

/** Painel lateral de edição usado nas telas da Plataforma (fecha com Esc ou clicando fora). */
export function Gaveta({
  rotulo,
  titulo,
  onFechar,
  children,
}: {
  rotulo: string;
  titulo: string;
  onFechar: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fechar = useRef(onFechar);
  useEffect(() => {
    fechar.current = onFechar;
  });
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input, textarea, select, button")?.focus();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && fechar.current();
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("keydown", tecla);
      anterior?.focus();
    };
  }, []);

  return (
    <div className="pl-ovl" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div ref={ref} className="pl-drawer" role="dialog" aria-modal="true" aria-labelledby="pl-gaveta-titulo">
        <div className="pl-muted">{rotulo}</div>
        <h2 id="pl-gaveta-titulo">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

/** Par de opções em cartões (Ativo/Inativo, Permanente/Eventual…). */
export function Opcoes<T extends string | boolean>({
  valor,
  opcoes,
  onMudar,
}: {
  valor: T;
  opcoes: { v: T; titulo: string; texto: string; desabilitada?: boolean }[];
  onMudar: (v: T) => void;
}) {
  return (
    <div className="pl-radios" role="group">
      {opcoes.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          className="pl-radio"
          aria-pressed={valor === o.v}
          disabled={o.desabilitada}
          onClick={() => onMudar(o.v)}
        >
          <b>{o.titulo}</b>
          {o.texto}
        </button>
      ))}
    </div>
  );
}

export function PillSituacao({ ativo }: { ativo: boolean }) {
  return <span className={`pl-pill ${ativo ? "pl-on" : "pl-off"}`}>{ativo ? "Ativo" : "Inativo"}</span>;
}

export function Aviso({ msg }: { msg: { ok: boolean; texto: string } | null }) {
  if (!msg) return null;
  return (
    <p className={msg.ok ? "pl-ok" : "pl-erro"} role={msg.ok ? "status" : "alert"}>
      {msg.texto}
    </p>
  );
}
