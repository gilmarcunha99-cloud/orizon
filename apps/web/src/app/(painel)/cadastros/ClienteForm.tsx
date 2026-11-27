"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatarCelular } from "@/lib/validation";
import { Aviso } from "../plataforma/Gaveta";
import { salvarCliente } from "./acoesCliente";
import { Campo, SecaoEndereco, SecaoIdentificacao, fmtDoc, maiusc, minusc } from "./CamposEmpresa";
import { CLIENTE_VAZIO, formatarCep, formatarTelefone, type DadosCliente, type EventoCliente } from "./clienteRegras";
import { deLinha } from "./fornecedorRegras";

const dataBR = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "—");

/** 2.2 Clientes: ficha de cadastro e edição, conforme a prévia aprovada. */
export function ClienteForm({ inicial, eventos }: { inicial: DadosCliente; eventos: EventoCliente[] }) {
  const router = useRouter();
  const novo = !inicial.id;
  const [d, setD] = useState<DadosCliente>({
    ...inicial,
    documento: fmtDoc(inicial.tipo_pessoa, inicial.documento),
    celular: formatarCelular(inicial.celular),
    telefone: formatarTelefone(inicial.telefone),
    cep: formatarCep(inicial.cep),
  });
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const set = (p: Partial<DadosCliente>) => setD((atual) => ({ ...atual, ...p }));

  /** Cadastro único: o CNPJ/CPF já é de um fornecedor; carrega os dados em comum. */
  function aproveitar(linha: Record<string, unknown>) {
    const x = deLinha(CLIENTE_VAZIO, linha);
    setD((atual) => ({
      ...x,
      tipo_pessoa: atual.tipo_pessoa,
      documento: atual.documento,
      ativo: true,
      celular: formatarCelular(x.celular),
      telefone: formatarTelefone(x.telefone),
      cep: formatarCep(x.cep),
    }));
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    iniciar(async () => {
      const r = await salvarCliente(d);
      if (!r.ok) {
        setMsg({ ok: false, texto: r.erro });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (novo && r.id) {
        router.replace(`/m/cadastros.clientes/${r.id}?salvo=1`);
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
        Um cadastro por CNPJ ou CPF: o sistema avisa se o documento já existe. Campos com <span className="pl-req">*</span> são
        obrigatórios.
      </p>
      <Aviso msg={msg} />

      <SecaoIdentificacao
        d={d}
        set={set}
        papel="cliente"
        onAproveitar={aproveitar}
        dica="Pessoa física: troca CNPJ por CPF e Razão social por Nome completo. Nomes ficam sempre em CAIXA ALTA."
      />

      <section className="pl-sec">
        <h3>Contato principal</h3>
        <div className="pl-grid">
          <Campo rotulo="Nome do contato" req>
            <input
              className="pl-inp"
              required
              maxLength={120}
              value={d.contato_nome}
              onChange={(e) => set({ contato_nome: maiusc(e.target.value) })}
            />
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
          <Campo rotulo="E-mail financeiro (cobranças e notas)">
            <input
              className="pl-inp"
              type="email"
              placeholder="Opcional"
              value={d.email_financeiro}
              onChange={(e) => set({ email_financeiro: minusc(e.target.value) })}
            />
          </Campo>
        </div>
      </section>

      <SecaoEndereco d={d} set={set} aoErro={(t) => setMsg(t ? { ok: false, texto: t } : null)} />

      <section className="pl-sec">
        <h3>Observações</h3>
        <textarea
          className="pl-txt"
          aria-label="Observações"
          maxLength={2000}
          placeholder="Anotações internas sobre o cliente (opcional)"
          value={d.observacoes}
          onChange={(e) => set({ observacoes: e.target.value })}
        />
      </section>

      {!novo && (
        <section className="pl-sec">
          <h3>
            Eventos deste cliente <span className="pl-tag">vínculos</span>
          </h3>
          <div className="pl-tcard">
            <table className="pl-table">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Data</th>
                  <th>Local</th>
                </tr>
              </thead>
              <tbody>
                {eventos.map((e) => (
                  <tr key={e.evento_id}>
                    <td className="pn">{e.nome}</td>
                    <td>{dataBR(e.data_inicio)}</td>
                    <td className="pl-muted">{e.local || "—"}</td>
                  </tr>
                ))}
                {eventos.length === 0 && (
                  <tr>
                    <td colSpan={3} className="pl-vazio">
                      Nenhum evento ligado a este cliente ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <span className="pl-hint">
            Os eventos são ligados ao cliente na tela 3.1 Criação. Para deixar de usar um cliente, mude a situação para Inativo.
          </span>
        </section>
      )}

      <div className="pl-acts">
        <Link className="pl-b pl-b-link" href="/m/cadastros.clientes">
          {novo ? "Cancelar" : "Voltar"}
        </Link>
        <button type="submit" className="pl-b pl-b-p" disabled={pendente}>
          {pendente ? "Salvando…" : novo ? "Cadastrar cliente" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
