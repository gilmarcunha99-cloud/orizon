"use client";

/** Opções de marcar várias (categorias, meios de pagamento), como botões que ligam e desligam. */
export function Marcadores({
  opcoes,
  valor,
  onMudar,
  rotulo,
}: {
  opcoes: { v: string; nome: string }[];
  valor: string[];
  onMudar: (v: string[]) => void;
  rotulo: string;
}) {
  return (
    <div role="group" aria-label={rotulo} className="pl-chips">
      {opcoes.map((o) => {
        const on = valor.includes(o.v);
        return (
          <button
            key={o.v}
            type="button"
            className={`pl-chip ${on ? "on" : ""}`}
            aria-pressed={on}
            onClick={() => onMudar(on ? valor.filter((x) => x !== o.v) : [...valor, o.v])}
          >
            {on && <span aria-hidden="true">✓ </span>}
            {o.nome}
          </button>
        );
      })}
    </div>
  );
}
