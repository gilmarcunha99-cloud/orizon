"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatarCelular } from "@/lib/validation";
import { Aviso } from "../plataforma/Gaveta";
import { salvarPatrocinador } from "./acoesPatrocinador";
import { Campo, SecaoEndereco, SecaoIdentificacao, fmtDoc, maiusc, minusc } from "./CamposEmpresa";
import { formatarCep, formatarTelefone } from "./clienteRegras";
import { deLinha } from "./fornecedorRegras";
import { Marcadores } from "./Marcadores";
import { PARTICIPACOES, PATROCINADOR_VAZIO, RAMOS_SUGERIDOS, type DadosPatrocinador } from "./patrocinadorRegras";

const NOME_PAPEL: Record<string, string> = { cliente: "Cliente", fornecedor: "Fornecedor" };

/** 2.4 Patrocinadores: ficha de cadastro e edição, conforme a prévia aprovada em 28/11/2026. */
export function PatrocinadorForm({ inicial, outrosPapeis }: { inicial: DadosPatrocinador; outrosPapeis: string[] }) {
  const router = useRouter();
  const novo = !inicial.id;
  const preparar = (x: DadosPatrocinador): DadosPatrocinador => ({
    ...x,
    documento: fmtDoc(x.tipo_pessoa, x.documento),
    celular: formatarCelular(x.celular),
    telefone: formatarTelefone(x.telefone),
    cep: formatarCep(x.cep),
  });
  const [d, setD] = useState<DadosPatrocinador>(preparar(inicial));
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const set = (p: Partial<DadosPatrocinador>) => setD((atual) => ({ ...atual, ...p }));

  /** Cadastro único: o CNPJ/CPF já é de um cliente ou fornecedor; carrega os dados em comum. */
  function aproveitar(linha: Record<string, unknown>) {
    setD((atual) => ({
      ...preparar(deLinha(PATROCINADOR_VAZIO, linha)),
      tipo_pessoa: atual.tipo_pessoa,
      documento: atual.documento,
      ativo: true,
    }));
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    iniciar(async () => {
      const r = await salvarPatrocinador(d);
      if (!r.ok) {
        setMsg({ ok: false, texto: r.erro });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (novo && r.id) {
        router.replace(`/m/cadastros.patrocinadores/${r.id}?salvo=1`);
      } else {
        setMsg({ ok: true, texto: r.mensagem ?? "Salvo." });
        window.scrollTo({ top: 0, behavior: "smooth" });
        router.refresh();
      }
    });
  }

  const papeis = outrosPapeis.map((p) => NOME_PAPEL[p] ?? p);

  return (
    <form onSubmit={salvar} className="pl-form">
      <p className="pl-sub">
        Um cadastro por CNPJ ou CPF. Se o documento já for de um Cliente ou Fornecedor, o sistema aproveita os dados e a
        empresa passa a aparecer nas telas dos dois papéis. Campos com <span className="pl-req">*</span> são obrigatórios.
      </p>
      <Aviso msg={msg} />
      {papeis.length > 0 && (
        <p className="pl-callout">
          Esta empresa também é <b>{papeis.join(" e ")}</b>. Identificação, contato e endereço são os mesmos nas telas; a
          situação (ativo/inativo) é separada.
        </p>
      )}

      <SecaoIdentificacao
        d={d}
        set={set}
        papel="patrocinador"
        onAproveitar={aproveitar}
        dica="Pessoa física (ex.: atleta patrocinador de si mesmo, influenciador): troca CNPJ por CPF e Razão social por Nome completo. Nomes ficam sempre em CAIXA ALTA."
      />

      <section className="pl-sec">
        <h3>Patrocínio</h3>
        <div className="pl-fld">
          <span>
            Como participa dos eventos <span className="pl-req">*</span>
          </span>
          <Marcadores
            rotulo="Como participa dos eventos"
            opcoes={PARTICIPACOES}
            valor={d.participacao}
            onMudar={(v) => set({ participacao: v })}
          />
        </div>
        <div className="pl-grid">
          <Campo rotulo="Ramo de atividade" req cls="pl-c2">
            <input
              className="pl-inp"
              required
              list="lista-ramos"
              maxLength={80}
              placeholder="Ex.: ARTIGOS ESPORTIVOS"
              value={d.ramo}
              onChange={(e) => set({ ramo: maiusc(e.target.value) })}
            />
            <datalist id="lista-ramos">
              {RAMOS_SUGERIDOS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </Campo>
        </div>
        <Campo rotulo="Descrição / observações comerciais">
          <textarea
            className="pl-txt"
            maxLength={1000}
            value={d.descricao_comercial}
            onChange={(e) => set({ descricao_comercial: maiusc(e.target.value) })}
          />
        </Campo>
        <span className="pl-hint">
          Pode marcar as duas opções. Cota, valor e contrapartidas de cada evento são combinados no próprio evento (módulo Eventos).
        </span>
      </section>

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
          <Campo rotulo="E-mail do financeiro">
            <input
              className="pl-inp"
              type="email"
              placeholder="Para cobrança das cotas"
              value={d.email_financeiro}
              onChange={(e) => set({ email_financeiro: minusc(e.target.value) })}
            />
          </Campo>
        </div>
      </section>

      <section className="pl-sec">
        <h3>Acesso ao Orizon Pass</h3>
        <p className="pl-hint" style={{ margin: 0 }}>
          O contato principal recebe um convite por e-mail, cria a senha e entra com o perfil <b>Patrocinador</b>. Lá ele cadastra a
          equipe da empresa (perfil <b>Staff</b>) em cada evento que a empresa patrocina.
        </p>
        <div className="pl-convite">
          <div style={{ flex: 1 }}>
            <b>{d.contato_nome || "Contato principal"}</b>
            {d.email && <span className="pl-muted"> · {d.email}</span>}
          </div>
          <span className="pl-pill pl-off">Convite não enviado</span>
          <button type="button" className="pl-b" disabled title="Disponível quando o envio de e-mails estiver ligado">
            Enviar convite
          </button>
        </div>
        <span className="pl-hint">O botão fica disponível quando o envio de e-mails estiver ligado.</span>
        <div className="pl-fld">
          <span>Equipe cadastrada pela empresa</span>
          <p className="pl-vazio-caixa">
            Nenhuma pessoa ainda. A equipe é cadastrada pelo patrocinador em cada evento, quando o módulo Eventos estiver pronto. A
            Orizon verá toda a equipe e poderá inativar qualquer pessoa.
          </p>
        </div>
      </section>

      <section className="pl-sec">
        <h3>Eventos patrocinados</h3>
        <p className="pl-vazio-caixa">
          Nenhum evento ainda. A lista vem dos eventos (módulo Eventos), onde ficam cota, valor e contrapartidas.
        </p>
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
        <Link className="pl-b pl-b-link" href="/m/cadastros.patrocinadores">
          {novo ? "Cancelar" : "Voltar"}
        </Link>
        <button type="submit" className="pl-b pl-b-p" disabled={pendente}>
          {pendente ? "Salvando…" : novo ? "Cadastrar patrocinador" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
