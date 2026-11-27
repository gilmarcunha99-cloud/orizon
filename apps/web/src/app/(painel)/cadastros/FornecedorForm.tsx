"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatarCelular } from "@/lib/validation";
import { Aviso } from "../plataforma/Gaveta";
import { formatarCpf } from "../plataforma/usuarioRegras";
import { salvarFornecedor } from "./acoesFornecedor";
import { Campo, SecaoEndereco, SecaoIdentificacao, fmtDoc, maiusc, minusc } from "./CamposEmpresa";
import { formatarCep, formatarCnpj, formatarTelefone } from "./clienteRegras";
import {
  BANCOS,
  CATEGORIAS,
  CONTA_TIPOS,
  FORNECEDOR_VAZIO,
  MEIOS_PAGAMENTO,
  PIX_TIPOS,
  deLinha,
  type DadosFornecedor,
} from "./fornecedorRegras";
import { Marcadores } from "./Marcadores";
import { ItensOferecidos } from "./ItensOferecidos";
import type { ItemOferta } from "./catalogoRegras";

/** Máscara da chave PIX conforme o tipo escolhido. */
function formatarChave(tipo: string, v: string): string {
  if (tipo === "cnpj") return formatarCnpj(v);
  if (tipo === "cpf") return formatarCpf(v);
  if (tipo === "celular") return formatarCelular(v);
  if (tipo === "email") return minusc(v);
  return v;
}

/** 2.3 Fornecedores: ficha de cadastro e edição, conforme a prévia aprovada. */
export function FornecedorForm({
  inicial,
  tambemCliente,
  catalogo,
  marcadosInicial,
}: {
  inicial: DadosFornecedor;
  tambemCliente: boolean;
  catalogo: ItemOferta[];
  marcadosInicial: string[];
}) {
  const router = useRouter();
  const novo = !inicial.id;
  const preparar = (x: DadosFornecedor): DadosFornecedor => ({
    ...x,
    documento: fmtDoc(x.tipo_pessoa, x.documento),
    celular: formatarCelular(x.celular),
    telefone: formatarTelefone(x.telefone),
    cep: formatarCep(x.cep),
    pix_chave: formatarChave(x.pix_tipo, x.pix_chave),
  });
  const [d, setD] = useState<DadosFornecedor>(preparar(inicial));
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const [itens, setItens] = useState<ItemOferta[]>(catalogo);
  const [marcados, setMarcados] = useState<string[]>(marcadosInicial);
  const set = (p: Partial<DadosFornecedor>) => setD((atual) => ({ ...atual, ...p }));

  /** Cadastro único: o CNPJ/CPF já é de um cliente; carrega os dados em comum. */
  function aproveitar(linha: Record<string, unknown>) {
    setD((atual) => ({ ...preparar(deLinha(FORNECEDOR_VAZIO, linha)), tipo_pessoa: atual.tipo_pessoa, documento: atual.documento, ativo: true }));
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    iniciar(async () => {
      const ids = marcados.filter((id) => itens.some((i) => i.id === id && d.categorias.includes(i.categoria)));
      const r = await salvarFornecedor(d, ids);
      if (!r.ok) {
        setMsg({ ok: false, texto: r.erro });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (novo && r.id) {
        router.replace(`/m/cadastros.fornecedores/${r.id}?salvo=1`);
      } else {
        setMsg({ ok: true, texto: r.mensagem ?? "Salvo." });
        window.scrollTo({ top: 0, behavior: "smooth" });
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={salvar} className="pl-form">
      <p className="pl-sub">
        Um cadastro por CNPJ ou CPF. Se o documento já for de um Cliente, o sistema aproveita os dados e a empresa passa a
        aparecer nas duas telas. Campos com <span className="pl-req">*</span> são obrigatórios.
      </p>
      <Aviso msg={msg} />
      {tambemCliente && (
        <p className="pl-callout">
          Esta empresa também é <b>Cliente</b>. Identificação, contato e endereço são os mesmos nas duas telas; a situação
          (ativo/inativo) é separada.
        </p>
      )}

      <SecaoIdentificacao
        d={d}
        set={set}
        papel="fornecedor"
        onAproveitar={aproveitar}
        dica="Pessoa física (ex.: fotógrafo autônomo): troca CNPJ por CPF e Razão social por Nome completo. Nomes ficam sempre em CAIXA ALTA."
      />

      <section className="pl-sec">
        <h3>O que fornece</h3>
        <div className="pl-fld">
          <span>
            Categorias <span className="pl-req">*</span>
          </span>
          <Marcadores rotulo="Categorias" opcoes={CATEGORIAS} valor={d.categorias} onMudar={(v) => set({ categorias: v })} />
        </div>
        <Campo rotulo="Descrição dos produtos e serviços">
          <textarea
            className="pl-txt"
            maxLength={1000}
            value={d.descricao_servicos}
            onChange={(e) => set({ descricao_servicos: maiusc(e.target.value) })}
          />
        </Campo>
        <span className="pl-hint">Marque todas as categorias que o fornecedor oferece.</span>
      </section>

      <ItensOferecidos
        itens={itens}
        categorias={d.categorias}
        marcados={marcados}
        onMudar={setMarcados}
        onItemNovo={(i) => setItens((a) => [...a, i])}
      />

      <section className="pl-sec">
        <h3>Contato principal</h3>
        <div className="pl-grid">
          <Campo rotulo="Nome do contato" req>
            <input className="pl-inp" required maxLength={120} value={d.contato_nome} onChange={(e) => set({ contato_nome: maiusc(e.target.value) })} />
          </Campo>
          <Campo rotulo="Cargo">
            <input className="pl-inp" maxLength={80} value={d.contato_cargo} onChange={(e) => set({ contato_cargo: maiusc(e.target.value) })} />
          </Campo>
          <Campo rotulo="E-mail" req>
            <input className="pl-inp" type="email" required value={d.email} onChange={(e) => set({ email: minusc(e.target.value) })} />
          </Campo>
          <Campo rotulo="Celular / WhatsApp" req>
            <input
              className="pl-inp"
              required
              inputMode="numeric"
              placeholder="(00) 00000-0000"
              value={d.celular}
              onChange={(e) => set({ celular: formatarCelular(e.target.value) })}
            />
          </Campo>
          <Campo rotulo="Telefone fixo">
            <input
              className="pl-inp"
              inputMode="numeric"
              placeholder="Opcional"
              value={d.telefone}
              onChange={(e) => set({ telefone: formatarTelefone(e.target.value) })}
            />
          </Campo>
          <Campo rotulo="Site ou Instagram">
            <input className="pl-inp" maxLength={150} placeholder="Opcional" value={d.site} onChange={(e) => set({ site: e.target.value.trim() })} />
          </Campo>
        </div>
      </section>

      <section className="pl-sec">
        <h3>
          Dados para pagamento <span className="pl-tag">financeiro</span>
        </h3>
        <div className="pl-fld">
          <span>Meios de pagamento aceitos</span>
          <Marcadores
            rotulo="Meios de pagamento aceitos"
            opcoes={MEIOS_PAGAMENTO}
            valor={d.meios_pagamento}
            onMudar={(v) => set({ meios_pagamento: v })}
          />
        </div>
        <div className="pl-grid">
          <Campo rotulo="Tipo de chave PIX">
            <select className="pl-sel" value={d.pix_tipo} onChange={(e) => set({ pix_tipo: e.target.value, pix_chave: formatarChave(e.target.value, d.pix_chave) })}>
              <option value="">—</option>
              {PIX_TIPOS.map((p) => (
                <option key={p.v} value={p.v}>
                  {p.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Chave PIX" cls="pl-c2">
            <input className="pl-inp" maxLength={120} value={d.pix_chave} onChange={(e) => set({ pix_chave: formatarChave(d.pix_tipo, e.target.value) })} />
          </Campo>
          <Campo rotulo="Banco">
            <input className="pl-inp" list="lista-bancos" maxLength={80} placeholder="Ex.: 341 - ITAÚ" value={d.banco} onChange={(e) => set({ banco: maiusc(e.target.value) })} />
            <datalist id="lista-bancos">
              {BANCOS.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </Campo>
          <Campo rotulo="Agência">
            <input className="pl-inp" maxLength={10} value={d.agencia} onChange={(e) => set({ agencia: e.target.value })} />
          </Campo>
          <Campo rotulo="Conta (com dígito)">
            <input className="pl-inp" maxLength={20} value={d.conta} onChange={(e) => set({ conta: e.target.value })} />
          </Campo>
          <Campo rotulo="Tipo de conta">
            <select className="pl-sel" value={d.conta_tipo} onChange={(e) => set({ conta_tipo: e.target.value })}>
              <option value="">—</option>
              {CONTA_TIPOS.map((c) => (
                <option key={c.v} value={c.v}>
                  {c.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Titular da conta" cls="pl-c2">
            <input className="pl-inp" maxLength={150} value={d.titular_nome} onChange={(e) => set({ titular_nome: maiusc(e.target.value) })} />
          </Campo>
        </div>
        <span className="pl-hint">Tudo opcional. O meio usado em cada pagamento é escolhido em Contas a Pagar (Financeiro).</span>
      </section>

      <SecaoEndereco d={d} set={set} aoErro={(t) => setMsg(t ? { ok: false, texto: t } : null)} />

      <section className="pl-sec">
        <h3>Observações</h3>
        <textarea
          className="pl-txt"
          aria-label="Observações"
          maxLength={2000}
          placeholder="Anotações internas (opcional)"
          value={d.observacoes}
          onChange={(e) => set({ observacoes: e.target.value })}
        />
      </section>

      <div className="pl-acts">
        <Link className="pl-b pl-b-link" href="/m/cadastros.fornecedores">
          {novo ? "Cancelar" : "Voltar"}
        </Link>
        <button type="submit" className="pl-b pl-b-p" disabled={pendente}>
          {pendente ? "Salvando…" : novo ? "Cadastrar fornecedor" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
