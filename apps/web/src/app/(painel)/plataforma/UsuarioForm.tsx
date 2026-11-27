"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatarCelular } from "@/lib/validation";
import { salvarUsuario } from "./acoesUsuario";
import type { Inscricao, Perfil, Subtipo } from "./dados";
import { Aviso } from "./Gaveta";
import {
  CAMISETAS,
  FICHA_VAZIA,
  SEXOS,
  TIPOS_SANGUINEOS,
  UFS,
  formatarCpf,
  idade,
  type DadosUsuario,
  type FichaAtleta,
} from "./usuarioRegras";

const ORIGEM: Record<string, string> = { importacao: "Planilha", inscricao: "Celular", manual: "Manual" };
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

export function UsuarioForm({
  inicial,
  perfis,
  subtipos,
  inscricoes,
  souEu,
  souAdmin,
}: {
  inicial: DadosUsuario;
  perfis: Pick<Perfil, "codigo" | "nome" | "ativo">[];
  subtipos: Subtipo[];
  inscricoes: Inscricao[];
  souEu: boolean;
  souAdmin: boolean;
}) {
  const router = useRouter();
  const novo = !inicial.id;
  const [d, setD] = useState<DadosUsuario>({
    ...inicial,
    cpf: formatarCpf(inicial.cpf),
    celular: formatarCelular(inicial.celular),
    ficha: inicial.ficha
      ? {
          ...inicial.ficha,
          emergencia_celular: formatarCelular(inicial.ficha.emergencia_celular),
          responsavel_cpf: formatarCpf(inicial.ficha.responsavel_cpf),
          responsavel_celular: formatarCelular(inicial.ficha.responsavel_celular),
        }
      : null,
  });
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  const temFicha = d.perfil === "atleta" || d.ficha !== null || inscricoes.length > 0;
  const ficha = d.ficha ?? FICHA_VAZIA;
  const menor = idade(d.data_nascimento) < 18;
  const setF = (p: Partial<FichaAtleta>) => setD({ ...d, ficha: { ...ficha, ...p } });
  const subs = subtipos.filter((s) => s.perfil === d.perfil && (s.ativo || s.id === d.subtipo_id));
  const opcoesPerfil = perfis.filter(
    (p) => (p.ativo || p.codigo === inicial.perfil) && (souAdmin || p.codigo !== "admin" || inicial.perfil === "admin"),
  );
  const travaPerfil = (inicial.perfil === "admin" && !souAdmin) || (souEu && inicial.perfil === "admin");

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    iniciar(async () => {
      const r = await salvarUsuario({ ...d, ficha: temFicha ? ficha : null });
      if (!r.ok) {
        setMsg({ ok: false, texto: r.erro });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (novo && r.id) {
        router.replace(`/m/cadastros.usuarios/${r.id}?salvo=1`);
      } else {
        setMsg({ ok: true, texto: r.mensagem ?? "Salvo." });
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={salvar} className="pl-form">
      <p className="pl-sub">
        Um cadastro por pessoa, identificado pelo CPF. A ficha do atleta é preenchida uma vez e vale para todos os eventos.
        Campos com <span className="pl-req">*</span> são obrigatórios.
      </p>
      <Aviso msg={msg} />

      <section className="pl-sec">
        <h3>
          Dados pessoais <span className="pl-tag">todos os perfis</span>
        </h3>
        <div className="pl-grid">
          <Campo rotulo="Nome completo" req cls="pl-c2">
            <input className="pl-inp" required maxLength={120} value={d.nome} onChange={(e) => setD({ ...d, nome: e.target.value })} />
          </Campo>
          <Campo rotulo="CPF" req>
            <input
              className="pl-inp"
              required
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={d.cpf}
              onChange={(e) => setD({ ...d, cpf: formatarCpf(e.target.value) })}
            />
          </Campo>
          <Campo rotulo="E-mail (login)" req cls="pl-c2">
            {novo ? (
              <input className="pl-inp" type="email" required value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} />
            ) : (
              <div className="pl-ro">{d.email}</div>
            )}
          </Campo>
          <Campo rotulo="Celular" req>
            <input
              className="pl-inp"
              required
              inputMode="tel"
              placeholder="(00) 00000-0000"
              value={d.celular}
              onChange={(e) => setD({ ...d, celular: formatarCelular(e.target.value) })}
            />
          </Campo>
          <Campo rotulo="Data de nascimento" req>
            <input
              className="pl-inp"
              type="date"
              required
              value={d.data_nascimento}
              onChange={(e) => setD({ ...d, data_nascimento: e.target.value })}
            />
          </Campo>
          <Campo rotulo="Sexo" req>
            <select className="pl-sel" required value={d.genero} onChange={(e) => setD({ ...d, genero: e.target.value })}>
              <option value="" disabled>
                Escolha
              </option>
              {SEXOS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Situação">
            <select
              className="pl-sel"
              value={d.ativo ? "1" : "0"}
              disabled={souEu}
              onChange={(e) => setD({ ...d, ativo: e.target.value === "1" })}
            >
              <option value="1">Ativo</option>
              <option value="0">Inativo</option>
            </select>
          </Campo>
        </div>
        {novo && (
          <span className="pl-hint">
            Ao salvar, a pessoa recebe um e-mail com o link para criar a própria senha. Ninguém da Orizon vê ou define a senha.
          </span>
        )}
      </section>

      <section className="pl-sec">
        <h3>Perfil</h3>
        <div className="pl-grid">
          <Campo rotulo="Perfil" req>
            <select
              className="pl-sel"
              required
              disabled={travaPerfil}
              value={d.perfil}
              onChange={(e) => setD({ ...d, perfil: e.target.value, subtipo_id: "" })}
            >
              <option value="" disabled>
                Escolha o perfil
              </option>
              {opcoesPerfil.map((p) => (
                <option key={p.codigo} value={p.codigo}>
                  {p.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Sub-tipo">
            <select
              className="pl-sel"
              disabled={!subs.length}
              value={d.subtipo_id}
              onChange={(e) => setD({ ...d, subtipo_id: e.target.value })}
            >
              <option value="">{subs.length ? "Sem sub-tipo" : d.perfil ? "Este perfil não tem sub-tipos" : "Escolha o perfil primeiro"}</option>
              {subs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <span className="pl-hint">
          Cada pessoa tem <b>um perfil só</b>. Se um Staff correr uma prova, ele continua Staff e ganha apenas uma inscrição de
          atleta naquele evento.
        </span>
      </section>

      {temFicha && (
        <section className="pl-sec">
          <h3>
            Ficha do atleta <span className="pl-tag">preenchida uma vez</span>
          </h3>
          <div className="pl-grid">
            <Campo rotulo="Cidade" req cls="pl-c2">
              <input className="pl-inp" required maxLength={80} value={ficha.cidade} onChange={(e) => setF({ cidade: e.target.value })} />
            </Campo>
            <Campo rotulo="UF" req>
              <select className="pl-sel" required value={ficha.uf} onChange={(e) => setF({ uf: e.target.value })}>
                <option value="" disabled>
                  UF
                </option>
                {UFS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Tamanho da camiseta" req>
              <select className="pl-sel" required value={ficha.camiseta} onChange={(e) => setF({ camiseta: e.target.value })}>
                <option value="" disabled>
                  Escolha
                </option>
                {CAMISETAS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Grupo / Assessoria" cls="pl-c2">
              <input
                className="pl-inp"
                maxLength={80}
                placeholder="Opcional"
                value={ficha.grupo}
                onChange={(e) => setF({ grupo: e.target.value })}
              />
            </Campo>
            <Campo rotulo="Contato de emergência: nome" req cls="pl-c2">
              <input
                className="pl-inp"
                required
                maxLength={120}
                value={ficha.emergencia_nome}
                onChange={(e) => setF({ emergencia_nome: e.target.value })}
              />
            </Campo>
            <Campo rotulo="Contato de emergência: celular" req>
              <input
                className="pl-inp"
                required
                inputMode="tel"
                value={ficha.emergencia_celular}
                onChange={(e) => setF({ emergencia_celular: formatarCelular(e.target.value) })}
              />
            </Campo>
            <Campo rotulo="Tipo sanguíneo">
              <select className="pl-sel" value={ficha.tipo_sanguineo} onChange={(e) => setF({ tipo_sanguineo: e.target.value })}>
                <option value="">Não informado</option>
                {TIPOS_SANGUINEOS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Alergias ou observações de saúde" cls="pl-c2">
              <input
                className="pl-inp"
                maxLength={300}
                placeholder="Opcional"
                value={ficha.saude_obs}
                onChange={(e) => setF({ saude_obs: e.target.value })}
              />
            </Campo>
            {menor && (
              <>
                <Campo rotulo="Responsável legal: nome" req cls="pl-c2">
                  <input
                    className="pl-inp"
                    required
                    maxLength={120}
                    value={ficha.responsavel_nome}
                    onChange={(e) => setF({ responsavel_nome: e.target.value })}
                  />
                </Campo>
                <Campo rotulo="Responsável legal: CPF" req>
                  <input
                    className="pl-inp"
                    required
                    inputMode="numeric"
                    value={ficha.responsavel_cpf}
                    onChange={(e) => setF({ responsavel_cpf: formatarCpf(e.target.value) })}
                  />
                </Campo>
                <Campo rotulo="Responsável legal: celular" req>
                  <input
                    className="pl-inp"
                    required
                    inputMode="tel"
                    value={ficha.responsavel_celular}
                    onChange={(e) => setF({ responsavel_celular: formatarCelular(e.target.value) })}
                  />
                </Campo>
              </>
            )}
          </div>
          {!menor && (
            <div className="pl-callout">
              <b>Menor de 18 anos</b>: aparecem também nome, CPF e celular do <b>responsável legal</b>, que passa a ser obrigatório.
            </div>
          )}
        </section>
      )}

      {!novo && temFicha && (
        <section className="pl-sec">
          <h3>
            Inscrições em eventos <span className="pl-tag">vínculos</span>
          </h3>
          <div className="pl-tcard">
            <table className="pl-table">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Data</th>
                  <th>Origem</th>
                </tr>
              </thead>
              <tbody>
                {inscricoes.map((i, n) => (
                  <tr key={n}>
                    <td className="pn">{i.evento}</td>
                    <td>{dataBR(i.data)}</td>
                    <td className="pl-muted">{ORIGEM[i.origem] ?? i.origem}</td>
                  </tr>
                ))}
                {inscricoes.length === 0 && (
                  <tr>
                    <td colSpan={3} className="pl-vazio">
                      Nenhuma inscrição ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <span className="pl-hint">
            As inscrições são criadas em 3.3 Inscrições (pela planilha) ou pelo próprio atleta no celular. Aqui é só consulta.
          </span>
        </section>
      )}

      <div className="pl-acts">
        <Link className="pl-b pl-b-link" href="/m/cadastros.usuarios">
          {novo ? "Cancelar" : "Voltar"}
        </Link>
        <button type="submit" className="pl-b pl-b-p" disabled={pendente}>
          {pendente ? "Salvando…" : novo ? "Cadastrar e enviar convite" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
