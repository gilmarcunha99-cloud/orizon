"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PillSituacao } from "../plataforma/Gaveta";
import { formatarCpf } from "../plataforma/usuarioRegras";
import { formatarCnpj } from "./clienteRegras";
import type { PatrocinadorLinha } from "./dadosPatrocinadores";
import { participacaoTexto } from "./patrocinadorRegras";

const digitos = (s: string | null) => (s ?? "").replace(/\D/g, "");
const documento = (c: PatrocinadorLinha) => (c.tipo_pessoa === "pj" ? formatarCnpj(c.documento ?? "") : formatarCpf(c.documento ?? "")) || "—";

function PillParticipacao({ p }: { p: string[] }) {
  const pat = p.includes("patrocinador");
  const exp = p.includes("expositor");
  const cls = pat && exp ? "pl-alug" : pat ? "pl-on" : "pl-cat";
  return <span className={`pl-pill ${cls}`}>{participacaoTexto(p)}</span>;
}

/** 2.4 Patrocinadores: lista com busca, filtro de participação, situação e ordenação A a Z / Z a A. */
export function PatrocinadoresTela({
  patrocinadores,
  podeCriar,
  podeEditar,
}: {
  patrocinadores: PatrocinadorLinha[];
  podeCriar: boolean;
  podeEditar: boolean;
}) {
  const [busca, setBusca] = useState("");
  const [part, setPart] = useState<"" | "patrocinador" | "expositor">("");
  const [situacao, setSituacao] = useState<"todos" | "ativos" | "inativos">("todos");
  const [crescente, setCrescente] = useState(true);

  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase();
    const bd = digitos(b);
    return patrocinadores
      .filter((p) => !part || p.participacao.includes(part))
      .filter((p) => situacao === "todos" || (situacao === "ativos" ? p.ativo : !p.ativo))
      .filter(
        (p) =>
          !b ||
          p.nome.toLowerCase().includes(b) ||
          (p.razao_social ?? "").toLowerCase().includes(b) ||
          (p.contato_nome ?? "").toLowerCase().includes(b) ||
          (p.email ?? "").toLowerCase().includes(b) ||
          (p.ramo ?? "").toLowerCase().includes(b) ||
          (bd.length >= 3 && digitos(p.documento).includes(bd)),
      )
      .sort((a, z) => (crescente ? 1 : -1) * a.nome.localeCompare(z.nome, "pt-BR"));
  }, [patrocinadores, part, busca, situacao, crescente]);

  return (
    <>
      <p className="pl-sub">
        Empresas ou pessoas que patrocinam os eventos da Orizon ou expõem neles com estande. O contato principal pode entrar no
        Orizon Pass com o perfil Patrocinador e cadastrar a equipe da empresa nos eventos que ela patrocina.
      </p>
      <div className="pl-bar">
        <input
          className="pl-inp"
          style={{ width: 300 }}
          type="search"
          placeholder="Buscar por nome, razão social, CNPJ/CPF, contato ou ramo"
          aria-label="Buscar por nome, razão social, CNPJ/CPF, contato ou ramo"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select className="pl-sel" aria-label="Filtrar por participação" value={part} onChange={(e) => setPart(e.target.value as typeof part)}>
          <option value="">Patrocinadores e expositores</option>
          <option value="patrocinador">Só patrocinadores</option>
          <option value="expositor">Só expositores</option>
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
          <Link className="pl-b pl-b-p pl-b-link" href="/m/cadastros.patrocinadores/novo">
            + Novo patrocinador
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
              <th>Ramo</th>
              <th>Participação</th>
              <th>Contato</th>
              <th className="c">Equipe</th>
              <th>Situação</th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id}>
                <td className="pn">
                  {p.nome}
                  {p.razao_social && p.razao_social !== p.nome && (
                    <div className="pl-muted" style={{ fontWeight: 400, fontSize: 12 }}>
                      {p.razao_social}
                    </div>
                  )}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>{documento(p)}</td>
                <td className="pl-muted">{p.ramo || "—"}</td>
                <td>
                  <PillParticipacao p={p.participacao} />
                </td>
                <td>{p.contato_nome || "—"}</td>
                <td className="c">{p.equipe}</td>
                <td>
                  <PillSituacao ativo={p.ativo} />
                </td>
                <td>
                  {podeEditar && (
                    <Link className="pl-lnk" href={`/m/cadastros.patrocinadores/${p.id}`}>
                      Editar<span className="sr-only"> {p.nome}</span>
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr>
                <td colSpan={8} className="pl-vazio">
                  {patrocinadores.length ? "Nenhum patrocinador encontrado com esses filtros." : "Nenhum patrocinador cadastrado ainda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="pl-note">
        <b>Equipe</b> mostra quantas pessoas a empresa cadastrou como staff nos eventos. Clique em <b>Nome fantasia</b> para
        alternar entre A a Z e Z a A.
      </p>
    </>
  );
}
