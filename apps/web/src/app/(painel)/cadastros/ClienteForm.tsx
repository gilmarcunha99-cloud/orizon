"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatarCelular } from "@/lib/validation";
import { Aviso } from "../plataforma/Gaveta";
import { UFS, formatarCpf } from "../plataforma/usuarioRegras";
import { salvarCliente } from "./acoesCliente";
import { formatarCep, formatarCnpj, formatarTelefone, type DadosCliente, type EventoCliente } from "./clienteRegras";

/** Nomes sempre em caixa alta e e-mails em minúsculo (regras de 27/11/2026). */
const maiusc = (s: string) => s.toLocaleUpperCase("pt-BR");
const minusc = (s: string) => s.toLowerCase().trim();
const dataBR = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "—");

function Campo({ rotulo, req, cls, children }: { rotulo: string; req?: boolean; cls?: string; children: React.ReactNode }) {
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

/** 2.2 Clientes: ficha de cadastro e edição, conforme a prévia aprovada. */
export function ClienteForm({ inicial, eventos }: { inicial: DadosCliente; eventos: EventoCliente[] }) {
  const router = useRouter();
  const novo = !inicial.id;
  const fmtDoc = (tipo: string, v: string) => (tipo === "pj" ? formatarCnpj(v) : formatarCpf(v));
  const [d, setD] = useState<DadosCliente>({
    ...inicial,
    documento: fmtDoc(inicial.tipo_pessoa, inicial.documento),
    celular: formatarCelular(inicial.celular),
    telefone: formatarTelefone(inicial.telefone),
    cep: formatarCep(inicial.cep),
  });
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [pendente, iniciar] = useTransition();
  const pj = d.tipo_pessoa === "pj";
  const set = (p: Partial<DadosCliente>) => setD((atual) => ({ ...atual, ...p }));

  /** Ao completar o CEP, preenche rua, bairro, cidade e UF pelo serviço público ViaCEP. */
  async function mudarCep(valor: string) {
    const cep = formatarCep(valor);
    set({ cep });
    const so = cep.replace(/\D/g, "");
    if (so.length !== 8) return;
    setBuscandoCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${so}/json/`);
      const j = (await r.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
      if (j.erro) {
        setMsg({ ok: false, texto: "CEP não encontrado. Preencha o endereço manualmente." });
        return;
      }
      setMsg(null);
      setD((atual) => ({
        ...atual,
        logradouro: maiusc(j.logradouro || atual.logradouro),
        bairro: maiusc(j.bairro || atual.bairro),
        cidade: maiusc(j.localidade || atual.cidade),
        uf: j.uf || atual.uf,
      }));
    } catch {
      // Sem conexão com o serviço de CEP: segue com preenchimento manual.
    } finally {
      setBuscandoCep(false);
    }
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

      <section className="pl-sec">
        <h3>Identificação</h3>
        <div className="pl-grid">
          <Campo rotulo="Tipo de pessoa" req>
            <select
              className="pl-sel"
              value={d.tipo_pessoa}
              onChange={(e) => {
                const t = e.target.value as DadosCliente["tipo_pessoa"];
                set({ tipo_pessoa: t, documento: fmtDoc(t, d.documento) });
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
              onChange={(e) => set({ documento: fmtDoc(d.tipo_pessoa, e.target.value) })}
            />
          </Campo>
          <Campo rotulo="Situação" req>
            <select className="pl-sel" value={d.ativo ? "1" : "0"} onChange={(e) => set({ ativo: e.target.value === "1" })}>
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
              onChange={(e) => set({ razao_social: maiusc(e.target.value) })}
            />
          </Campo>
          {pj && (
            <Campo rotulo="Inscrição estadual">
              <input
                className="pl-inp"
                maxLength={20}
                placeholder="Opcional"
                value={d.inscricao_estadual}
                onChange={(e) => set({ inscricao_estadual: maiusc(e.target.value) })}
              />
            </Campo>
          )}
          <Campo rotulo="Nome fantasia" req cls="pl-c2">
            <input className="pl-inp" required maxLength={120} value={d.nome} onChange={(e) => set({ nome: maiusc(e.target.value) })} />
          </Campo>
        </div>
        <span className="pl-hint">
          Pessoa física: troca CNPJ por CPF e Razão social por Nome completo. Nomes ficam sempre em CAIXA ALTA.
        </span>
      </section>

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

      <section className="pl-sec">
        <h3>Endereço</h3>
        <div className="pl-grid">
          <Campo rotulo={buscandoCep ? "CEP (buscando…)" : "CEP"}>
            <input
              className="pl-inp"
              inputMode="numeric"
              placeholder="00000-000"
              value={d.cep}
              onChange={(e) => mudarCep(e.target.value)}
            />
          </Campo>
          <Campo rotulo="Rua / Avenida" cls="pl-c2">
            <input className="pl-inp" maxLength={150} value={d.logradouro} onChange={(e) => set({ logradouro: maiusc(e.target.value) })} />
          </Campo>
          <Campo rotulo="Número">
            <input className="pl-inp" maxLength={10} value={d.numero} onChange={(e) => set({ numero: maiusc(e.target.value) })} />
          </Campo>
          <Campo rotulo="Complemento">
            <input className="pl-inp" maxLength={60} value={d.complemento} onChange={(e) => set({ complemento: maiusc(e.target.value) })} />
          </Campo>
          <Campo rotulo="Bairro">
            <input className="pl-inp" maxLength={80} value={d.bairro} onChange={(e) => set({ bairro: maiusc(e.target.value) })} />
          </Campo>
          <Campo rotulo="Cidade">
            <input className="pl-inp" maxLength={80} value={d.cidade} onChange={(e) => set({ cidade: maiusc(e.target.value) })} />
          </Campo>
          <Campo rotulo="UF">
            <select className="pl-sel" value={d.uf} onChange={(e) => set({ uf: e.target.value })}>
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
