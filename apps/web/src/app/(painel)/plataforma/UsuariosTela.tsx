"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Perfil, UsuarioLinha } from "./dados";
import { PillSituacao } from "./Gaveta";

const digitos = (s: string | null) => (s ?? "").replace(/\D/g, "");

function formatarCelular(c: string | null) {
  const d = digitos(c);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return c || "—";
}

export function UsuariosTela({
  usuarios,
  perfis,
  podeCriar,
  podeEditar,
}: {
  usuarios: UsuarioLinha[];
  perfis: Pick<Perfil, "codigo" | "nome">[];
  podeCriar: boolean;
  podeEditar: boolean;
}) {
  const [perfil, setPerfil] = useState("");
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState<"todos" | "ativos" | "inativos">("todos");
  const [crescente, setCrescente] = useState(true);

  const nomePerfil = (c: string | null) => (c ? (perfis.find((p) => p.codigo === c)?.nome ?? c) : "—");

  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase();
    const bd = digitos(b);
    return usuarios
      .filter((u) => !perfil || u.perfil === perfil)
      .filter((u) => situacao === "todos" || (situacao === "ativos" ? u.ativo : !u.ativo))
      .filter(
        (u) =>
          !b ||
          u.nome.toLowerCase().includes(b) ||
          u.email.toLowerCase().includes(b) ||
          (bd.length >= 3 && (digitos(u.cpf).includes(bd) || digitos(u.celular).includes(bd))),
      )
      .sort((a, z) => (crescente ? 1 : -1) * a.nome.localeCompare(z.nome, "pt-BR"));
  }, [usuarios, perfil, busca, situacao, crescente]);

  return (
    <>
      <p className="pl-sub">
        Todas as pessoas com acesso ao Orizon Pass. Os usuários de gestão são cadastrados pelos perfis de gestão; o Atleta
        entra pela planilha do evento (3.3 Inscrições) ou se inscreve pelo celular.
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
          style={{ width: 320 }}
          type="search"
          placeholder="Buscar por nome, e-mail, CPF ou celular"
          aria-label="Buscar por nome, e-mail, CPF ou celular"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          className="pl-sel"
          aria-label="Filtrar por situação"
          value={situacao}
          onChange={(e) => setSituacao(e.target.value as typeof situacao)}
        >
          <option value="todos">Todas as situações</option>
          <option value="ativos">Só ativos</option>
          <option value="inativos">Só inativos</option>
        </select>
        <span className="pl-grow" />
        {podeCriar && (
          <Link className="pl-b pl-b-p pl-b-link" href="/m/cadastros.usuarios/novo">
            + Novo usuário
          </Link>
        )}
      </div>
      <div className="pl-tcard">
        <table className="pl-table">
          <thead>
            <tr>
              <th aria-sort={crescente ? "ascending" : "descending"}>
                <button
                  type="button"
                  className="pl-ord"
                  onClick={() => setCrescente(!crescente)}
                  title="Alternar entre A a Z e Z a A"
                >
                  Nome
                  <span className="pl-ord-ic" aria-hidden="true">
                    <span className={crescente ? "on" : ""}>▲</span>
                    <span className={crescente ? "" : "on"}>▼</span>
                  </span>
                  <span className="pl-ord-txt">{crescente ? "A a Z" : "Z a A"}</span>
                </button>
              </th>
              <th>E-mail</th>
              <th>Celular</th>
              <th>Perfil</th>
              <th>Sub-tipo</th>
              <th>Situação</th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lista.map((u) => (
              <tr key={u.id}>
                <td className="pn">{u.nome || "(sem nome)"}</td>
                <td className="pl-muted">{u.email}</td>
                <td style={{ whiteSpace: "nowrap" }}>{formatarCelular(u.celular)}</td>
                <td>{u.perfil ? <span className="pl-pill pl-lock">{nomePerfil(u.perfil)}</span> : "—"}</td>
                <td className="pl-muted">{u.subtipo ?? "—"}</td>
                <td>
                  <PillSituacao ativo={u.ativo} />
                </td>
                <td>
                  {podeEditar && (
                    <Link className="pl-lnk" href={`/m/cadastros.usuarios/${u.id}`}>
                      Editar<span className="sr-only"> {u.nome}</span>
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr>
                <td colSpan={7} className="pl-vazio">
                  {usuarios.length ? "Nenhum usuário encontrado com esses filtros." : "Nenhum usuário cadastrado ainda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="pl-note">
        Clique em <b>Nome</b> para alternar entre A a Z e Z a A. Ao cadastrar, a pessoa recebe um convite por e-mail para
        criar a própria senha.
      </p>
    </>
  );
}
