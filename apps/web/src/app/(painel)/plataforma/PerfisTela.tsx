"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { excluirPerfil, salvarPerfil, type DadosPerfil } from "./acoes";
import type { Perfil } from "./dados";
import { Aviso, Gaveta, Opcoes, PillSituacao } from "./Gaveta";

type Msg = { ok: boolean; texto: string } | null;

function PillParticipacao({ p }: { p: Perfil["participacao"] }) {
  if (p === "permanente") return <span className="pl-pill pl-perm">Permanente</span>;
  if (p === "eventual") return <span className="pl-pill pl-ev">Eventual</span>;
  return <span className="pl-muted">Não se aplica</span>;
}

export function PerfisTela({ perfis }: { perfis: Perfil[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Perfil | "novo" | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [pendente, iniciar] = useTransition();

  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return b ? perfis.filter((p) => `${p.nome} ${p.descricao}`.toLowerCase().includes(b)) : perfis;
  }, [busca, perfis]);

  function excluir(p: Perfil) {
    if (!window.confirm(`Excluir o perfil ${p.nome}? Essa ação não pode ser desfeita.`)) return;
    iniciar(async () => {
      const r = await excluirPerfil(p.codigo);
      setMsg(r.ok ? { ok: true, texto: r.mensagem ?? "Excluído." } : { ok: false, texto: r.erro });
      router.refresh();
    });
  }

  return (
    <>
      <p className="pl-sub">
        Os 10 perfis <b>do sistema</b> têm regras próprias (login, menus, eventos) e não podem ser apagados; neles você ajusta
        o nome exibido, a descrição, Permanente/Eventual e a situação. Os perfis <b>criados pelo Admin</b> funcionam só pelas
        permissões marcadas em 1.5 e podem ser excluídos enquanto não tiverem usuários.
      </p>
      <div className="pl-bar">
        <input
          className="pl-inp"
          type="search"
          placeholder="Buscar perfil"
          aria-label="Buscar perfil"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <span className="pl-grow" />
        <span className="pl-muted">{perfis.length} perfis</span>
        <button type="button" className="pl-b pl-b-p" onClick={() => setEditando("novo")}>
          + Novo perfil
        </button>
      </div>
      <Aviso msg={msg} />
      <div className="pl-tcard">
        <table className="pl-table">
          <thead>
            <tr>
              <th>Perfil</th>
              <th>Origem</th>
              <th>Descrição</th>
              <th>Participação nos eventos</th>
              <th className="c">Usuários</th>
              <th className="c">Sub-tipos</th>
              <th>Situação</th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.codigo}>
                <td className="pn">{p.nome}</td>
                <td>
                  {p.sistema ? (
                    <span className="pl-pill pl-lock">Do sistema</span>
                  ) : (
                    <span className="pl-pill pl-ev">Criado pelo Admin</span>
                  )}
                </td>
                <td className="pl-muted">{p.descricao}</td>
                <td>
                  <PillParticipacao p={p.participacao} />
                </td>
                <td className="c">{p.usuarios.toLocaleString("pt-BR")}</td>
                <td className="c">{p.subtipos}</td>
                <td>
                  <PillSituacao ativo={p.ativo} />
                </td>
                <td>
                  {p.codigo === "admin" ? (
                    <span className="pl-pill pl-lock">Fixo</span>
                  ) : (
                    <span className="pl-acoes">
                      <button type="button" className="pl-lnk" onClick={() => setEditando(p)}>
                        Editar<span className="sr-only"> {p.nome}</span>
                      </button>
                      {!p.sistema && p.usuarios === 0 && (
                        <button type="button" className="pl-lnk pl-lnk-x" disabled={pendente} onClick={() => excluir(p)}>
                          Excluir<span className="sr-only"> {p.nome}</span>
                        </button>
                      )}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr>
                <td colSpan={8} className="pl-vazio">
                  Nenhum perfil encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="pl-note">
        <b>Permanente</b>: participa de todos os eventos automaticamente. <b>Eventual</b>: precisa ser escalado em cada evento
        (Equipe do evento e Credenciamento usam essa informação).
      </p>

      {editando && (
        <PerfilGaveta
          perfil={editando === "novo" ? null : editando}
          perfis={perfis}
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

function PerfilGaveta({
  perfil,
  perfis,
  onFechar,
  onSalvo,
}: {
  perfil: Perfil | null;
  perfis: Perfil[];
  onFechar: () => void;
  onSalvo: (texto: string) => void;
}) {
  const [d, setD] = useState<DadosPerfil>({
    codigo: perfil?.codigo,
    nome: perfil?.nome ?? "",
    descricao: perfil?.descricao ?? "",
    participacao: perfil?.participacao ?? "eventual",
    ativo: perfil?.ativo ?? true,
    copiarDe: "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const novo = !perfil;
  const comUsuarios = (perfil?.usuarios ?? 0) > 0;

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    iniciar(async () => {
      const r = await salvarPerfil({ ...d, copiarDe: d.copiarDe || undefined });
      if (r.ok) onSalvo(r.mensagem ?? "Salvo.");
      else setErro(r.erro);
    });
  }

  return (
    <Gaveta rotulo={`1.3 Perfis · ${novo ? "Novo" : "Editar"}`} titulo={novo ? "Novo perfil" : perfil.nome} onFechar={onFechar}>
      <form onSubmit={salvar} style={{ display: "contents" }}>
        {perfil?.sistema && (
          <div className="pl-fld">
            Perfil no sistema<div className="pl-ro">{perfil.codigo} (não muda)</div>
          </div>
        )}
        <label className="pl-fld">
          {novo ? "Nome do perfil" : "Nome exibido"}
          <input
            className="pl-inp"
            required
            maxLength={60}
            value={d.nome}
            onChange={(e) => setD({ ...d, nome: e.target.value })}
          />
          {novo && <span className="pl-hint">Não pode repetir o nome de outro perfil.</span>}
        </label>
        <label className="pl-fld">
          Descrição
          <textarea
            className="pl-txt"
            maxLength={300}
            value={d.descricao}
            onChange={(e) => setD({ ...d, descricao: e.target.value })}
          />
        </label>
        <div className="pl-fld">
          Participação nos eventos
          <Opcoes
            valor={d.participacao}
            onMudar={(v) => setD({ ...d, participacao: v })}
            opcoes={[
              { v: "permanente", titulo: "Permanente", texto: "Está em todos os eventos, sem escala." },
              { v: "eventual", titulo: "Eventual", texto: "Precisa ser escalado em cada evento." },
              { v: "nao_se_aplica", titulo: "Não se aplica", texto: "Não faz parte da equipe do evento." },
            ]}
          />
        </div>
        {novo ? (
          <label className="pl-fld">
            Copiar permissões de
            <select className="pl-sel" value={d.copiarDe} onChange={(e) => setD({ ...d, copiarDe: e.target.value })}>
              <option value="">Não copiar (começa sem acesso)</option>
              {perfis
                .filter((p) => p.codigo !== "admin")
                .map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.nome}
                  </option>
                ))}
            </select>
            <span className="pl-hint">Opcional. Depois é só ajustar em 1.5 Permissões.</span>
          </label>
        ) : (
          <div className="pl-fld">
            Situação
            <Opcoes
              valor={d.ativo}
              onMudar={(v) => setD({ ...d, ativo: v })}
              opcoes={[
                { v: true, titulo: "Ativo", texto: "Pode ser dado a usuários." },
                { v: false, titulo: "Inativo", texto: "Some das listas de escolha.", desabilitada: comUsuarios },
              ]}
            />
            {comUsuarios && <span className="pl-hint">Não dá para inativar um perfil que ainda tem usuários.</span>}
          </div>
        )}
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
            {pendente ? "Salvando…" : novo ? "Criar perfil" : "Salvar"}
          </button>
        </div>
      </form>
    </Gaveta>
  );
}
