"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarSubtipo, type DadosSubtipo } from "./acoes";
import type { Perfil, Subtipo } from "./dados";
import { Aviso, Gaveta, Opcoes, PillSituacao } from "./Gaveta";

type Msg = { ok: boolean; texto: string } | null;

export function SubtiposTela({ subtipos, perfis }: { subtipos: Subtipo[]; perfis: Pick<Perfil, "codigo" | "nome" | "ativo">[] }) {
  const router = useRouter();
  const [perfil, setPerfil] = useState("");
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState<"todos" | "ativos" | "inativos">("todos");
  const [editando, setEditando] = useState<Subtipo | "novo" | null>(null);
  const [msg, setMsg] = useState<Msg>(null);

  const nomePerfil = (c: string) => perfis.find((p) => p.codigo === c)?.nome ?? c;
  const ordemPerfil = (c: string) => perfis.findIndex((p) => p.codigo === c);

  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return subtipos
      .filter((s) => !perfil || s.perfil === perfil)
      .filter((s) => situacao === "todos" || (situacao === "ativos" ? s.ativo : !s.ativo))
      .filter((s) => !b || s.nome.toLowerCase().includes(b))
      .sort((a, z) => ordemPerfil(a.perfil) - ordemPerfil(z.perfil) || a.nome.localeCompare(z.nome, "pt-BR"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtipos, perfil, busca, situacao]);

  return (
    <>
      <p className="pl-sub">
        Detalha um perfil, por exemplo Coordenador de Marketing. O sub-tipo aparece no cadastro do usuário e na equipe do evento.
        Todo sub-tipo pertence a um perfil. Um sub-tipo em uso não é apagado: fica inativo.
      </p>
      <div className="pl-bar">
        <select className="pl-sel" aria-label="Filtrar por perfil" value={perfil} onChange={(e) => setPerfil(e.target.value)}>
          <option value="">Todos os perfis</option>
          {perfis.map((p) => (
            <option key={p.codigo} value={p.codigo}>
              {p.nome}
            </option>
          ))}
        </select>
        <input
          className="pl-inp"
          type="search"
          placeholder="Buscar sub-tipo"
          aria-label="Buscar sub-tipo"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          className="pl-sel"
          aria-label="Filtrar por situação"
          value={situacao}
          onChange={(e) => setSituacao(e.target.value as typeof situacao)}
        >
          <option value="todos">Ativos e inativos</option>
          <option value="ativos">Só ativos</option>
          <option value="inativos">Só inativos</option>
        </select>
        <span className="pl-grow" />
        <button type="button" className="pl-b pl-b-p" onClick={() => setEditando("novo")}>
          + Novo sub-tipo
        </button>
      </div>
      <Aviso msg={msg} />
      <div className="pl-tcard">
        <table className="pl-table">
          <thead>
            <tr>
              <th>Sub-tipo</th>
              <th>Perfil</th>
              <th className="c">Usuários</th>
              <th>Situação</th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lista.map((s) => (
              <tr key={s.id}>
                <td className="pn">{s.nome}</td>
                <td>{nomePerfil(s.perfil)}</td>
                <td className="c">{s.usuarios}</td>
                <td>
                  <PillSituacao ativo={s.ativo} />
                </td>
                <td>
                  <button type="button" className="pl-lnk" onClick={() => setEditando(s)}>
                    Editar<span className="sr-only"> {s.nome}</span>
                  </button>
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr>
                <td colSpan={5} className="pl-vazio">
                  {subtipos.length ? "Nenhum sub-tipo encontrado com esses filtros." : "Nenhum sub-tipo cadastrado ainda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editando && (
        <SubtipoGaveta
          subtipo={editando === "novo" ? null : editando}
          perfis={perfis}
          perfilInicial={perfil}
          onFechar={() => setEditando(null)}
          onSalvo={(texto) => {
            setEditando(null);
            setMsg({ ok: true, texto });
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function SubtipoGaveta({
  subtipo,
  perfis,
  perfilInicial,
  onFechar,
  onSalvo,
}: {
  subtipo: Subtipo | null;
  perfis: Pick<Perfil, "codigo" | "nome" | "ativo">[];
  perfilInicial: string;
  onFechar: () => void;
  onSalvo: (texto: string) => void;
}) {
  const [d, setD] = useState<DadosSubtipo>({
    id: subtipo?.id,
    perfil: subtipo?.perfil ?? perfilInicial,
    nome: subtipo?.nome ?? "",
    ativo: subtipo?.ativo ?? true,
  });
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const emUso = (subtipo?.usuarios ?? 0) > 0;

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    iniciar(async () => {
      const r = await salvarSubtipo(d);
      if (r.ok) onSalvo(r.mensagem ?? "Salvo.");
      else setErro(r.erro);
    });
  }

  return (
    <Gaveta
      rotulo={`1.4 Sub-Tipo · ${subtipo ? "Editar" : "Novo"}`}
      titulo={subtipo ? subtipo.nome : "Novo sub-tipo"}
      onFechar={onFechar}
    >
      <form onSubmit={salvar} style={{ display: "contents" }}>
        <label className="pl-fld">
          Perfil
          <select
            className="pl-sel"
            required
            disabled={emUso}
            value={d.perfil}
            onChange={(e) => setD({ ...d, perfil: e.target.value })}
          >
            <option value="" disabled>
              Escolha o perfil
            </option>
            {perfis
              .filter((p) => p.codigo !== "admin" && (p.ativo || p.codigo === d.perfil))
              .map((p) => (
                <option key={p.codigo} value={p.codigo}>
                  {p.nome}
                </option>
              ))}
          </select>
          {emUso && <span className="pl-hint">Em uso por usuários: não pode mudar de perfil.</span>}
        </label>
        <label className="pl-fld">
          Nome do sub-tipo
          <input className="pl-inp" required maxLength={60} value={d.nome} onChange={(e) => setD({ ...d, nome: e.target.value })} />
          <span className="pl-hint">Não pode repetir o nome dentro do mesmo perfil.</span>
        </label>
        <div className="pl-fld">
          Situação
          <Opcoes
            valor={d.ativo}
            onMudar={(v) => setD({ ...d, ativo: v })}
            opcoes={[
              { v: true, titulo: "Ativo", texto: "Aparece para escolha." },
              { v: false, titulo: "Inativo", texto: "Guardado, sem aparecer." },
            ]}
          />
        </div>
        {erro && (
          <p className="pl-erro" role="alert">
            {erro}
          </p>
        )}
        <div className="pl-drawer-acts">
          <button type="button" className="pl-b" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className="pl-b pl-b-p" disabled={pendente}>
            {pendente ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </Gaveta>
  );
}
