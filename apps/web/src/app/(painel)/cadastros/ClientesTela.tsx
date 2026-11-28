"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PillSituacao } from "../plataforma/Gaveta";
import { formatarCpf } from "../plataforma/usuarioRegras";
import { formatarCnpj, formatarTelefone } from "./clienteRegras";
import type { ClienteLinha } from "./dadosClientes";

const digitos = (s: string | null) => (s ?? "").replace(/\D/g, "");
const documento = (c: ClienteLinha) => (c.tipo_pessoa === "pj" ? formatarCnpj(c.documento ?? "") : formatarCpf(c.documento ?? "")) || "—";

/** 2.2 Clientes: lista com busca, filtros e ordenação A a Z / Z a A (mesmo padrão da 2.1 Usuários). */
export function ClientesTela({ clientes, podeCriar, podeEditar }: { clientes: ClienteLinha[]; podeCriar: boolean; podeEditar: boolean }) {
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<"" | "pj" | "pf">("");
  const [situacao, setSituacao] = useState<"todos" | "ativos" | "inativos">("todos");
  const [crescente, setCrescente] = useState(true);

  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase();
    const bd = digitos(b);
    return clientes
      .filter((c) => !tipo || c.tipo_pessoa === tipo)
      .filter((c) => situacao === "todos" || (situacao === "ativos" ? c.ativo : !c.ativo))
      .filter(
        (c) =>
          !b ||
          c.nome.toLowerCase().includes(b) ||
          (c.razao_social ?? "").toLowerCase().includes(b) ||
          (c.contato_nome ?? "").toLowerCase().includes(b) ||
          (c.email ?? "").toLowerCase().includes(b) ||
          (bd.length >= 3 && digitos(c.documento).includes(bd)),
      )
      .sort((a, z) => (crescente ? 1 : -1) * a.nome.localeCompare(z.nome, "pt-BR"));
  }, [clientes, tipo, busca, situacao, crescente]);

  return (
    <>
      <p className="pl-sub">
        Empresas ou pessoas que contratam a Orizon para realizar eventos. O cliente é só um cadastro ligado aos eventos: ele
        não entra no Orizon Pass.
      </p>
      <div className="pl-bar">
        <input
          className="pl-inp"
          style={{ width: 380 }}
          type="search"
          placeholder="Buscar por nome, razão social, CNPJ/CPF, contato ou e-mail"
          aria-label="Buscar por nome, razão social, CNPJ/CPF, contato ou e-mail"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select className="pl-sel" aria-label="Filtrar por tipo de pessoa" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
          <option value="">Pessoa jurídica e física</option>
          <option value="pj">Só pessoa jurídica</option>
          <option value="pf">Só pessoa física</option>
        </select>
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
          <Link className="pl-b pl-b-p pl-b-link" href="/m/cadastros.clientes/novo">
            + Novo cliente
          </Link>
        )}
      </div>
      <div className="pl-tcard">
        <table className="pl-table">
          <thead>
            <tr>
              <th aria-sort={crescente ? "ascending" : "descending"}>
                <button type="button" className="pl-ord" onClick={() => setCrescente(!crescente)} title="Alternar entre A a Z e Z a A">
                  Nome fantasia
                  <span className="pl-ord-ic" aria-hidden="true">
                    <span className={crescente ? "on" : ""}>▲</span>
                    <span className={crescente ? "" : "on"}>▼</span>
                  </span>
                  <span className="pl-ord-txt">{crescente ? "A a Z" : "Z a A"}</span>
                </button>
              </th>
              <th>CNPJ / CPF</th>
              <th>Contato</th>
              <th>Telefone</th>
              <th>Cidade/UF</th>
              <th style={{ textAlign: "center" }}>Eventos</th>
              <th>Situação</th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lista.map((c) => (
              <tr key={c.id}>
                <td className="pn">
                  {c.nome}
                  {c.razao_social && c.razao_social !== c.nome && (
                    <div className="pl-muted" style={{ fontWeight: 400, fontSize: 12 }}>
                      {c.razao_social}
                    </div>
                  )}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>{documento(c)}</td>
                <td>{c.contato_nome || "—"}</td>
                <td style={{ whiteSpace: "nowrap" }}>{formatarTelefone(c.celular || c.telefone) || "—"}</td>
                <td className="pl-muted">{c.cidade ? `${c.cidade}${c.uf ? `/${c.uf}` : ""}` : "—"}</td>
                <td style={{ textAlign: "center" }}>{c.eventos}</td>
                <td>
                  <PillSituacao ativo={c.ativo} />
                </td>
                <td>
                  {podeEditar && (
                    <Link className="pl-lnk" href={`/m/cadastros.clientes/${c.id}`}>
                      Editar<span className="sr-only"> {c.nome}</span>
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr>
                <td colSpan={8} className="pl-vazio">
                  {clientes.length ? "Nenhum cliente encontrado com esses filtros." : "Nenhum cliente cadastrado ainda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="pl-note">
        Clique em <b>Nome fantasia</b> para alternar entre A a Z e Z a A. A coluna <b>Eventos</b> mostra quantos eventos estão
        ligados ao cliente.
      </p>
    </>
  );
}
