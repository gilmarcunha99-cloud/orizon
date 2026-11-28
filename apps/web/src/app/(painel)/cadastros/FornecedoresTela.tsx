"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PillSituacao } from "../plataforma/Gaveta";
import { formatarCpf } from "../plataforma/usuarioRegras";
import { formatarCnpj, formatarTelefone } from "./clienteRegras";
import type { FornecedorLinha } from "./dadosFornecedores";
import { CATEGORIAS } from "./fornecedorRegras";

const digitos = (s: string | null) => (s ?? "").replace(/\D/g, "");
const documento = (c: FornecedorLinha) => (c.tipo_pessoa === "pj" ? formatarCnpj(c.documento ?? "") : formatarCpf(c.documento ?? "")) || "—";

/** 2.3 Fornecedores: lista com busca, filtro de várias categorias, situação e ordenação A a Z / Z a A. */
export function FornecedoresTela({
  fornecedores,
  podeCriar,
  podeEditar,
}: {
  fornecedores: FornecedorLinha[];
  podeCriar: boolean;
  podeEditar: boolean;
}) {
  const [busca, setBusca] = useState("");
  const [cats, setCats] = useState<string[]>([]);
  const [situacao, setSituacao] = useState<"todos" | "ativos" | "inativos">("todos");
  const [crescente, setCrescente] = useState(true);

  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase();
    const bd = digitos(b);
    return fornecedores
      .filter((f) => !cats.length || f.categorias.some((c) => cats.includes(c)))
      .filter((f) => situacao === "todos" || (situacao === "ativos" ? f.ativo : !f.ativo))
      .filter(
        (f) =>
          !b ||
          f.nome.toLowerCase().includes(b) ||
          (f.razao_social ?? "").toLowerCase().includes(b) ||
          (f.contato_nome ?? "").toLowerCase().includes(b) ||
          (f.email ?? "").toLowerCase().includes(b) ||
          (bd.length >= 3 && digitos(f.documento).includes(bd)),
      )
      .sort((a, z) => (crescente ? 1 : -1) * a.nome.localeCompare(z.nome, "pt-BR"));
  }, [fornecedores, cats, busca, situacao, crescente]);

  const textoCats = !cats.length
    ? "Todas as categorias"
    : cats.length === 1
      ? (CATEGORIAS.find((c) => c.v === cats[0])?.nome ?? "1 categoria")
      : `Categorias: ${cats.length} selecionadas`;

  return (
    <>
      <p className="pl-sub">
        Empresas ou pessoas que prestam serviços ou vendem produtos para os eventos da Orizon. O fornecedor é só um cadastro:
        ele não entra no Orizon Pass.
      </p>
      <div className="pl-bar">
        <input
          className="pl-inp"
          style={{ width: 300 }}
          type="search"
          placeholder="Buscar por nome, razão social, CNPJ/CPF, contato ou e-mail"
          aria-label="Buscar por nome, razão social, CNPJ/CPF, contato ou e-mail"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <details className={`pl-multi ${cats.length ? "ativo" : ""}`}>
          <summary className="pl-sel" aria-label="Filtrar por categorias">
            {textoCats} ▾
          </summary>
          <div className="pl-multi-box">
            {CATEGORIAS.map((c) => (
              <label key={c.v}>
                <input
                  type="checkbox"
                  checked={cats.includes(c.v)}
                  onChange={(e) => setCats(e.target.checked ? [...cats, c.v] : cats.filter((x) => x !== c.v))}
                />
                {c.nome}
              </label>
            ))}
            <div className="pl-multi-pe">
              <button type="button" className="pl-lnk" style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }} onClick={() => setCats([])}>
                Limpar
              </button>
              <span className="pl-muted">qualquer uma das marcadas</span>
            </div>
          </div>
        </details>
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
          <Link className="pl-b pl-b-p pl-b-link" href="/m/cadastros.fornecedores/novo">
            + Novo fornecedor
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
              <th>Situação</th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lista.map((f) => (
              <tr key={f.id}>
                <td className="pn">
                  {f.nome}
                  {f.razao_social && f.razao_social !== f.nome && (
                    <div className="pl-muted" style={{ fontWeight: 400, fontSize: 12 }}>
                      {f.razao_social}
                    </div>
                  )}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>{documento(f)}</td>
                <td>{f.contato_nome || "—"}</td>
                <td style={{ whiteSpace: "nowrap" }}>{formatarTelefone(f.celular || f.telefone) || "—"}</td>
                <td className="pl-muted">{f.cidade ? `${f.cidade}${f.uf ? `/${f.uf}` : ""}` : "—"}</td>
                <td>
                  <PillSituacao ativo={f.ativo} />
                </td>
                <td>
                  {podeEditar && (
                    <Link className="pl-lnk" href={`/m/cadastros.fornecedores/${f.id}`}>
                      Editar<span className="sr-only"> {f.nome}</span>
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr>
                <td colSpan={7} className="pl-vazio">
                  {fornecedores.length ? "Nenhum fornecedor encontrado com esses filtros." : "Nenhum fornecedor cadastrado ainda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="pl-note">
        Clique em <b>Nome fantasia</b> para alternar entre A a Z e Z a A. No filtro <b>Categorias</b> dá para marcar várias:
        aparecem os fornecedores que oferecem pelo menos uma delas.
      </p>
    </>
  );
}
