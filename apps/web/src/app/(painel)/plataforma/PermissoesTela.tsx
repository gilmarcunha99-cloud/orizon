"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarPermissoes } from "./acoes";
import type { Func, Perfil } from "./dados";
import { Aviso } from "./Gaveta";

const ACOES = [
  { v: "ver", nome: "Ver" },
  { v: "criar", nome: "Criar" },
  { v: "editar", nome: "Editar" },
  { v: "aprovar", nome: "Aprovar" },
] as const;

type Msg = { ok: boolean; texto: string } | null;

export function PermissoesTela({
  perfis,
  funcs,
  permissoes,
}: {
  perfis: Pick<Perfil, "codigo" | "nome">[];
  funcs: Func[];
  permissoes: Record<string, string[]>;
}) {
  const router = useRouter();
  const opcoes = perfis.filter((p) => p.codigo !== "admin");
  const [perfil, setPerfil] = useState(opcoes[0]?.codigo ?? "");
  const salvo = useMemo(() => new Set(permissoes[perfil] ?? []), [permissoes, perfil]);
  const [marcado, setMarcado] = useState<Set<string>>(() => new Set(permissoes[perfil] ?? []));
  const [copiarDe, setCopiarDe] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [pendente, iniciar] = useTransition();

  const mudancas = useMemo(() => {
    let n = 0;
    for (const k of marcado) if (!salvo.has(k)) n++;
    for (const k of salvo) if (!marcado.has(k)) n++;
    return n;
  }, [marcado, salvo]);

  function trocarPerfil(p: string) {
    if (mudancas && !window.confirm("Há alterações não salvas neste perfil. Trocar de perfil e descartar?")) return;
    setPerfil(p);
    setMarcado(new Set(permissoes[p] ?? []));
    setMsg(null);
  }

  /** Marcar Criar, Editar ou Aprovar liga o Ver; desmarcar o Ver desliga o resto da linha. */
  function alternar(func: string, acao: string) {
    const novo = new Set(marcado);
    const k = `${func}:${acao}`;
    if (novo.has(k)) {
      novo.delete(k);
      if (acao === "ver") ACOES.forEach((a) => novo.delete(`${func}:${a.v}`));
    } else {
      novo.add(k);
      novo.add(`${func}:ver`);
    }
    setMarcado(novo);
  }

  function linhaToda(func: string) {
    const novo = new Set(marcado);
    const tudo = ACOES.every((a) => novo.has(`${func}:${a.v}`));
    ACOES.forEach((a) => (tudo ? novo.delete(`${func}:${a.v}`) : novo.add(`${func}:${a.v}`)));
    setMarcado(novo);
  }

  function copiar() {
    if (!copiarDe) return;
    setMarcado(new Set(permissoes[copiarDe] ?? []));
    const nome = perfis.find((p) => p.codigo === copiarDe)?.nome ?? copiarDe;
    setMsg({ ok: true, texto: `Permissões de ${nome} copiadas. Confira e clique em Salvar alterações.` });
    setCopiarDe("");
  }

  function salvar() {
    iniciar(async () => {
      const r = await salvarPermissoes(perfil, [...marcado]);
      setMsg(r.ok ? { ok: true, texto: r.mensagem ?? "Salvo." } : { ok: false, texto: r.erro });
      if (r.ok) router.refresh();
    });
  }

  const modulos = [...new Set(funcs.map((f) => f.modulo))];

  return (
    <>
      <p className="pl-sub">
        Escolha um perfil e marque o que ele pode fazer em cada funcionalidade. Quem não tem &quot;Ver&quot; não enxerga o item no
        menu. O Admin sempre tem tudo e o módulo Plataforma é só dele, por isso não aparecem aqui.
      </p>
      <div className="pl-bar">
        <label className="pl-fld" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          Perfil
          <select className="pl-sel" style={{ minWidth: 220 }} value={perfil} onChange={(e) => trocarPerfil(e.target.value)}>
            {opcoes.map((p) => (
              <option key={p.codigo} value={p.codigo}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <span className="pl-grow" />
        <select className="pl-sel" aria-label="Copiar permissões de outro perfil" value={copiarDe} onChange={(e) => setCopiarDe(e.target.value)}>
          <option value="">Copiar de outro perfil…</option>
          {opcoes
            .filter((p) => p.codigo !== perfil)
            .map((p) => (
              <option key={p.codigo} value={p.codigo}>
                {p.nome}
              </option>
            ))}
        </select>
        <button type="button" className="pl-b" disabled={!copiarDe} onClick={copiar}>
          Copiar
        </button>
      </div>

      {mudancas > 0 && (
        <div className="pl-save" role="status">
          <span className="pl-grow">
            <b>
              {mudancas} {mudancas === 1 ? "alteração não salva" : "alterações não salvas"}
            </b>{" "}
            (destacadas em laranja)
          </span>
          <button type="button" className="pl-b" disabled={pendente} onClick={() => setMarcado(new Set(salvo))}>
            Descartar
          </button>
          <button type="button" className="pl-b pl-b-o" disabled={pendente} onClick={salvar}>
            {pendente ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      )}
      <Aviso msg={msg} />

      <div className="pl-tcard">
        <table className="pl-table">
          <thead>
            <tr>
              <th>Funcionalidade</th>
              {ACOES.map((a) => (
                <th key={a.v} className="c">
                  {a.nome}
                </th>
              ))}
              <th>
                <span className="sr-only">Linha toda</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {modulos.map((m) => (
              <Grupo key={m} titulo={`${funcs.find((f) => f.modulo === m)?.num.split(".")[0]} · ${m.toUpperCase()}`}>
                {funcs
                  .filter((f) => f.modulo === m)
                  .map((f) => (
                    <tr key={f.codigo}>
                      <td>
                        <span className="pl-num">{f.num}</span>
                        {f.nome}
                      </td>
                      {ACOES.map((a) => {
                        const k = `${f.codigo}:${a.v}`;
                        return (
                          <td key={a.v} className="c">
                            <input
                              type="checkbox"
                              className={`pl-chk ${marcado.has(k) !== salvo.has(k) ? "pl-chk-mudou" : ""}`}
                              aria-label={`${a.nome} em ${f.nome}`}
                              checked={marcado.has(k)}
                              onChange={() => alternar(f.codigo, a.v)}
                            />
                          </td>
                        );
                      })}
                      <td className="c">
                        <button type="button" className="pl-lnk" onClick={() => linhaToda(f.codigo)}>
                          {ACOES.every((a) => marcado.has(`${f.codigo}:${a.v}`)) ? "Desmarcar tudo" : "Marcar tudo"}
                          <span className="sr-only"> em {f.nome}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              </Grupo>
            ))}
          </tbody>
        </table>
      </div>
      <p className="pl-note">
        Cada alteração salva fica registrada na auditoria (quem mudou, o quê e quando). A mudança vale no próximo acesso do usuário.
      </p>
    </>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <>
      <tr className="pl-grp">
        <td colSpan={6}>{titulo}</td>
      </tr>
      {children}
    </>
  );
}
