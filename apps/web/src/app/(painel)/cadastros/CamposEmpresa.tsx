"use client";

import Link from "next/link";
import { useState } from "react";
import { UFS, formatarCpf } from "../plataforma/usuarioRegras";
import { buscarEmpresa, type Papel } from "./acoesEmpresa";
import { formatarCep, formatarCnpj } from "./clienteRegras";

/** Partes comuns das fichas de empresa (2.2 Clientes, 2.3 Fornecedores e 2.4 Patrocinadores). */

export const maiusc = (s: string) => s.toLocaleUpperCase("pt-BR");
export const minusc = (s: string) => s.toLowerCase().trim();
export const fmtDoc = (tipo: string, v: string) => (tipo === "pj" ? formatarCnpj(v) : formatarCpf(v));

export function Campo({ rotulo, req, cls, children }: { rotulo: string; req?: boolean; cls?: string; children: React.ReactNode }) {
  return (
    <label className={`pl-fld ${cls ?? ""}`}>
      <span>
        {rotulo}
        {req && <span className="pl-req"> *</span>}
      </span>
      {children}
    </label>
  );
}

type Identidade = {
  id?: string;
  tipo_pessoa: "pj" | "pf";
  documento: string;
  razao_social: string;
  nome: string;
  inscricao_estadual: string;
  ativo: boolean;
};

const PAPEL_NOME: Record<string, string> = { cliente: "Cliente", fornecedor: "Fornecedor", patrocinador: "Patrocinador" };
const PAPEL_TELA: Record<Papel, string> = { cliente: "clientes", fornecedor: "fornecedores", patrocinador: "patrocinadores" };

/**
 * Identificação (tipo de pessoa, CNPJ/CPF, situação, razão social, IE, nome fantasia).
 * Num cadastro novo, ao completar o CNPJ/CPF, procura a empresa: se já existe em outro papel,
 * chama onAproveitar com os dados (cadastro único); se já existe neste papel, avisa com o link.
 */
export function SecaoIdentificacao<T extends Identidade>({
  d,
  set,
  papel,
  onAproveitar,
  dica,
}: {
  d: T;
  set: (p: Partial<T>) => void;
  papel: Papel;
  onAproveitar: (linha: Record<string, unknown>) => void;
  dica: string;
}) {
  const [aviso, setAviso] = useState<React.ReactNode>(null);
  const pj = d.tipo_pessoa === "pj";

  async function mudarDocumento(valor: string) {
    const doc = fmtDoc(d.tipo_pessoa, valor);
    set({ documento: doc } as Partial<T>);
    setAviso(null);
    const so = doc.replace(/\D/g, "");
    if (d.id || so.length !== (pj ? 14 : 11)) return;
    const r = await buscarEmpresa(papel, so);
    if (r.situacao === "mesmo") {
      setAviso(
        <p className="pl-erro">
          Esse {pj ? "CNPJ" : "CPF"} já está cadastrado como {PAPEL_NOME[papel]}: <b>{r.nome}</b>.{" "}
          <Link href={`/m/cadastros.${PAPEL_TELA[papel]}/${r.id}`}>Abrir o cadastro</Link>
        </p>,
      );
    } else if (r.situacao === "outro") {
      onAproveitar(r.linha);
      const papeis = r.papeis.map((p) => PAPEL_NOME[p] ?? p).join(" e ");
      setAviso(
        <p className="pl-ok">
          <b>{r.nome}</b> já está cadastrado como {papeis}. Os dados foram carregados: confira, complete e salve. A empresa
          passa a aparecer também como {PAPEL_NOME[papel]}.
        </p>,
      );
    }
  }

  return (
    <section className="pl-sec">
      <h3>Identificação</h3>
      {aviso}
      <div className="pl-grid">
        <Campo rotulo="Tipo de pessoa" req>
          <select
            className="pl-sel"
            value={d.tipo_pessoa}
            onChange={(e) => {
              const t = e.target.value as Identidade["tipo_pessoa"];
              set({ tipo_pessoa: t, documento: fmtDoc(t, d.documento) } as Partial<T>);
            }}
          >
            <option value="pj">Jurídica (CNPJ)</option>
            <option value="pf">Física (CPF)</option>
          </select>
        </Campo>
        <Campo rotulo={pj ? "CNPJ" : "CPF"} req>
          <input
            className="pl-inp"
            required
            inputMode="numeric"
            placeholder={pj ? "00.000.000/0000-00" : "000.000.000-00"}
            value={d.documento}
            onChange={(e) => mudarDocumento(e.target.value)}
          />
        </Campo>
        <Campo rotulo="Situação" req>
          <select className="pl-sel" value={d.ativo ? "1" : "0"} onChange={(e) => set({ ativo: e.target.value === "1" } as Partial<T>)}>
            <option value="1">Ativo</option>
            <option value="0">Inativo</option>
          </select>
        </Campo>
        <Campo rotulo={pj ? "Razão social" : "Nome completo"} req cls="pl-c2">
          <input
            className="pl-inp"
            required
            maxLength={150}
            value={d.razao_social}
            onChange={(e) => set({ razao_social: maiusc(e.target.value) } as Partial<T>)}
          />
        </Campo>
        {pj && (
          <Campo rotulo="Inscrição estadual">
            <input
              className="pl-inp"
              maxLength={20}
              placeholder="Opcional"
              value={d.inscricao_estadual}
              onChange={(e) => set({ inscricao_estadual: maiusc(e.target.value) } as Partial<T>)}
            />
          </Campo>
        )}
        <Campo rotulo="Nome fantasia" req cls="pl-c2">
          <input
            className="pl-inp"
            required
            maxLength={120}
            value={d.nome}
            onChange={(e) => set({ nome: maiusc(e.target.value) } as Partial<T>)}
          />
        </Campo>
      </div>
      <span className="pl-hint">{dica}</span>
    </section>
  );
}

type Endereco = { cep: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string };

/** Endereço com preenchimento pelo CEP (serviço público ViaCEP). */
export function SecaoEndereco<T extends Endereco>({
  d,
  set,
  aoErro,
}: {
  d: T;
  set: (p: Partial<T>) => void;
  aoErro: (texto: string | null) => void;
}) {
  const [buscando, setBuscando] = useState(false);

  async function mudarCep(valor: string) {
    const cep = formatarCep(valor);
    set({ cep } as Partial<T>);
    const so = cep.replace(/\D/g, "");
    if (so.length !== 8) return;
    setBuscando(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${so}/json/`);
      const j = (await r.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
      if (j.erro) {
        aoErro("CEP não encontrado. Preencha o endereço manualmente.");
        return;
      }
      aoErro(null);
      set({
        logradouro: maiusc(j.logradouro || d.logradouro),
        bairro: maiusc(j.bairro || d.bairro),
        cidade: maiusc(j.localidade || d.cidade),
        uf: j.uf || d.uf,
      } as Partial<T>);
    } catch {
      // Sem conexão com o serviço de CEP: segue com preenchimento manual.
    } finally {
      setBuscando(false);
    }
  }

  const txt = (k: keyof Endereco, max: number) => (
    <input className="pl-inp" maxLength={max} value={d[k]} onChange={(e) => set({ [k]: maiusc(e.target.value) } as Partial<T>)} />
  );

  return (
    <section className="pl-sec">
      <h3>Endereço</h3>
      <div className="pl-grid">
        <Campo rotulo={buscando ? "CEP (buscando…)" : "CEP"}>
          <input className="pl-inp" inputMode="numeric" placeholder="00000-000" value={d.cep} onChange={(e) => mudarCep(e.target.value)} />
        </Campo>
        <Campo rotulo="Rua / Avenida" cls="pl-c2">
          {txt("logradouro", 150)}
        </Campo>
        <Campo rotulo="Número">{txt("numero", 10)}</Campo>
        <Campo rotulo="Complemento">{txt("complemento", 60)}</Campo>
        <Campo rotulo="Bairro">{txt("bairro", 80)}</Campo>
        <Campo rotulo="Cidade">{txt("cidade", 80)}</Campo>
        <Campo rotulo="UF">
          <select className="pl-sel" value={d.uf} onChange={(e) => set({ uf: e.target.value } as Partial<T>)}>
            <option value="">—</option>
            {UFS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <span className="pl-hint">Ao digitar o CEP, rua, bairro, cidade e UF são preenchidos sozinhos.</span>
    </section>
  );
}
