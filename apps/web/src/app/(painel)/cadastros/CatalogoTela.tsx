"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Aviso, Gaveta, Opcoes, PillSituacao } from "../plataforma/Gaveta";
import { salvarItem } from "./acoesItem";
import {
  ESTADOS,
  TIPOS_ITEM,
  UNIDADES,
  itemVazio,
  nomeDe,
  origemTexto,
  type DadosItem,
  type ItemCatalogo,
  type TipoItem,
} from "./catalogoRegras";
import { CATEGORIAS } from "./fornecedorRegras";
import { Marcadores } from "./Marcadores";

type Msg = { ok: boolean; texto: string } | null;

function PillOrigem({ i }: { i: { proprio: boolean; alugado: boolean } }) {
  const cls = i.proprio && i.alugado ? "pl-cat" : i.proprio ? "pl-on" : "pl-alug";
  return <span className={`pl-pill ${cls}`}>{origemTexto(i)}</span>;
}

/** 2.6 Serviços, 2.7 Mercadorias e 2.8 Equipamentos: lista do catálogo com painel lateral de cadastro. */
export function CatalogoTela({
  tipo,
  itens,
  podeCriar,
  podeEditar,
}: {
  tipo: TipoItem;
  itens: ItemCatalogo[];
  podeCriar: boolean;
  podeEditar: boolean;
}) {
  const router = useRouter();
  const t = TIPOS_ITEM[tipo];
  const equip = tipo === "equipamento";
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [origem, setOrigem] = useState<"" | "proprio" | "alugado">("");
  const [situacao, setSituacao] = useState<"todos" | "ativos" | "inativos">("todos");
  const [crescente, setCrescente] = useState(true);
  const [editando, setEditando] = useState<ItemCatalogo | "novo" | null>(null);
  const [msg, setMsg] = useState<Msg>(null);

  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return itens
      .filter((i) => !categoria || i.categoria === categoria)
      .filter((i) => !origem || (origem === "proprio" ? i.proprio : i.alugado))
      .filter((i) => situacao === "todos" || (situacao === "ativos" ? i.ativo : !i.ativo))
      .filter((i) => !b || i.nome.toLowerCase().includes(b) || (equip && i.patrimonio.toLowerCase().includes(b)))
      .sort((a, z) => (crescente ? 1 : -1) * a.nome.localeCompare(z.nome, "pt-BR"));
  }, [itens, categoria, origem, situacao, busca, crescente, equip]);

  const colunas = equip ? 8 : 6;

  return (
    <>
      <p className="pl-sub">{t.texto}</p>
      <div className="pl-bar">
        <input
          className="pl-inp"
          style={{ width: 260 }}
          type="search"
          placeholder={equip ? "Buscar por nome ou patrimônio" : "Buscar por nome"}
          aria-label={equip ? "Buscar por nome ou patrimônio" : "Buscar por nome"}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select className="pl-sel" aria-label="Filtrar por categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="">Todas as categorias</option>
          {CATEGORIAS.map((c) => (
            <option key={c.v} value={c.v}>
              {c.nome}
            </option>
          ))}
        </select>
        {equip && (
          <select className="pl-sel" aria-label="Filtrar por origem" value={origem} onChange={(e) => setOrigem(e.target.value as typeof origem)}>
            <option value="">Próprios e alugados</option>
            <option value="proprio">Só próprios</option>
            <option value="alugado">Só alugados</option>
          </select>
        )}
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
          <button type="button" className="pl-b pl-b-p" onClick={() => setEditando("novo")}>
            + {t.novo}
          </button>
        )}
      </div>
      <Aviso msg={msg} />
      <div className="pl-tcard">
        <table className="pl-table">
          <thead>
            <tr>
              <th aria-sort={crescente ? "ascending" : "descending"}>
                <button type="button" className="pl-ord" onClick={() => setCrescente(!crescente)} title="Alternar entre A a Z e Z a A">
                  Nome
                  <span className="pl-ord-ic" aria-hidden="true">
                    <span className={crescente ? "on" : ""}>▲</span>
                    <span className={crescente ? "" : "on"}>▼</span>
                  </span>
                  <span className="pl-ord-txt">{crescente ? "A a Z" : "Z a A"}</span>
                </button>
              </th>
              <th>Categoria</th>
              {equip && <th>Origem</th>}
              {equip && <th className="c">Qtd. própria</th>}
              <th>Unidade</th>
              <th className="c">Fornecedores</th>
              <th>Situação</th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lista.map((i) => (
              <tr key={i.id}>
                <td className="pn">
                  {i.nome}
                  {equip && i.patrimonio && (
                    <div className="pl-muted" style={{ fontWeight: 400, fontSize: 12 }}>
                      Patrimônio {i.patrimonio}
                    </div>
                  )}
                </td>
                <td>
                  <span className="pl-pill pl-cat">{nomeDe(CATEGORIAS, i.categoria)}</span>
                </td>
                {equip && (
                  <td>
                    <PillOrigem i={i} />
                  </td>
                )}
                {equip && <td className="c">{i.proprio ? i.qtd_propria : "—"}</td>}
                <td>{nomeDe(UNIDADES, i.unidade)}</td>
                <td className="c">{i.fornecedores}</td>
                <td>
                  <PillSituacao ativo={i.ativo} />
                </td>
                <td>
                  {podeEditar && (
                    <button type="button" className="pl-lnk" onClick={() => setEditando(i)}>
                      Editar<span className="sr-only"> {i.nome}</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr>
                <td colSpan={colunas} className="pl-vazio">
                  {itens.length ? `Nenhum item encontrado com esses filtros.` : `Nenhum item cadastrado ainda em ${t.tela}.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="pl-note">
        {equip ? (
          <>
            <b>Qtd. própria</b> é quanto a Orizon tem em estoque. <b>Fornecedores</b> mostra quantos alugam o item.
          </>
        ) : (
          <>
            A coluna <b>Fornecedores</b> mostra quantos fornecedores oferecem o item (marcado na ficha do fornecedor).
          </>
        )}{" "}
        Clique em <b>Nome</b> para alternar entre A a Z e Z a A.
      </p>

      {editando && (
        <ItemGaveta
          inicial={
            editando === "novo"
              ? itemVazio(tipo, categoria)
              : { ...editando, tipo, qtd_propria: editando.qtd_propria === null ? "" : String(editando.qtd_propria) }
          }
          onFechar={() => setEditando(null)}
          onSalvo={(texto) => {
            setEditando(null);
            setMsg({ ok: true, texto });
            router.refresh();
          }}
        />
      )}
    </>
  );
}

/**
 * Painel lateral de cadastro de um item. Na ficha do fornecedor ("Item que não está no catálogo") recebe
 * `tipos` para escolher entre serviço, mercadoria e equipamento e `categorias` para limitar às marcadas.
 */
export function ItemGaveta({
  inicial,
  tipos,
  categorias,
  onFechar,
  onSalvo,
}: {
  inicial: DadosItem;
  tipos?: TipoItem[];
  categorias?: string[];
  onFechar: () => void;
  onSalvo: (texto: string, id: string, d: DadosItem) => void;
}) {
  const [d, setD] = useState<DadosItem>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const set = (p: Partial<DadosItem>) => setD((a) => ({ ...a, ...p }));
  const t = TIPOS_ITEM[d.tipo];
  const equip = d.tipo === "equipamento";
  const opcoesCat = categorias ? CATEGORIAS.filter((c) => categorias.includes(c.v)) : CATEGORIAS;
  const origens = [...(d.proprio ? ["proprio"] : []), ...(d.alugado ? ["alugado"] : [])];

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    // Na ficha do fornecedor o painel fica dentro do formulário dele (via portal): não deixa salvar a ficha junto.
    e.stopPropagation();
    setErro(null);
    iniciar(async () => {
      const r = await salvarItem(d);
      if (r.ok && r.id) onSalvo(r.mensagem ?? "Salvo.", r.id, { ...d, nome: d.nome.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR") });
      else if (!r.ok) setErro(r.erro);
    });
  }

  const maiusc = (v: string) => v.toLocaleUpperCase("pt-BR");

  return (
    <Gaveta rotulo={tipos ? "Novo item no catálogo" : `${t.num} ${t.tela}`} titulo={d.id ? d.nome : tipos ? "Item que não está no catálogo" : t.novo} onFechar={onFechar}>
      <form onSubmit={salvar} style={{ display: "contents" }}>
        {tipos && (
          <label className="pl-fld">
            <span>
              Tipo <span className="pl-req">*</span>
            </span>
            <select className="pl-sel" value={d.tipo} onChange={(e) => set({ tipo: e.target.value as TipoItem, proprio: false, alugado: e.target.value === "equipamento" })}>
              {tipos.map((x) => (
                <option key={x} value={x}>
                  {TIPOS_ITEM[x].nome}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="pl-fld">
          <span>
            Nome do {t.nome.toLowerCase()} <span className="pl-req">*</span>
          </span>
          <input className="pl-inp" required maxLength={120} value={d.nome} onChange={(e) => set({ nome: maiusc(e.target.value) })} />
          <span className="pl-hint">Não pode repetir o nome entre os {t.plural}.</span>
        </label>
        <div className={equip ? "pl-grid2" : undefined} style={equip ? undefined : { display: "contents" }}>
          <label className="pl-fld">
            <span>
              Categoria <span className="pl-req">*</span>
            </span>
            <select className="pl-sel" required value={d.categoria} onChange={(e) => set({ categoria: e.target.value })}>
              <option value="" disabled>
                Escolha
              </option>
              {opcoesCat.map((c) => (
                <option key={c.v} value={c.v}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="pl-fld">
            <span>
              {equip ? "Unidade" : "Unidade de cobrança"} <span className="pl-req">*</span>
            </span>
            <select className="pl-sel" required value={d.unidade} onChange={(e) => set({ unidade: e.target.value })}>
              <option value="" disabled>
                Escolha
              </option>
              {UNIDADES.map((u) => (
                <option key={u.v} value={u.v}>
                  {u.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        {equip && (
          <>
            <div className="pl-fld">
              <span>
                Origem <span className="pl-req">*</span>
              </span>
              <Marcadores
                rotulo="Origem"
                opcoes={[
                  { v: "proprio", nome: "Próprio (Orizon)" },
                  { v: "alugado", nome: "Alugado de fornecedor" },
                ]}
                valor={origens}
                onMudar={(v) => set({ proprio: v.includes("proprio"), alugado: v.includes("alugado") })}
              />
            </div>
            {d.proprio && (
              <fieldset className="pl-box">
                <legend>Patrimônio da Orizon</legend>
                <div className="pl-grid2">
                  <label className="pl-fld">
                    <span>
                      Quantidade própria <span className="pl-req">*</span>
                    </span>
                    <input
                      className="pl-inp"
                      inputMode="numeric"
                      required
                      maxLength={6}
                      value={d.qtd_propria}
                      onChange={(e) => set({ qtd_propria: e.target.value.replace(/\D/g, "") })}
                    />
                  </label>
                  <label className="pl-fld">
                    Estado de conservação
                    <select className="pl-sel" value={d.estado} onChange={(e) => set({ estado: e.target.value })}>
                      <option value="">—</option>
                      {ESTADOS.map((x) => (
                        <option key={x.v} value={x.v}>
                          {x.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="pl-fld">
                    Nº de patrimônio
                    <input className="pl-inp" maxLength={60} value={d.patrimonio} onChange={(e) => set({ patrimonio: maiusc(e.target.value) })} />
                  </label>
                  <label className="pl-fld">
                    Onde fica guardado
                    <input className="pl-inp" maxLength={120} value={d.local_guarda} onChange={(e) => set({ local_guarda: maiusc(e.target.value) })} />
                  </label>
                </div>
                <span className="pl-hint">A reserva para cada evento será feita no módulo Eventos.</span>
              </fieldset>
            )}
          </>
        )}

        <label className="pl-fld">
          Descrição
          <textarea className="pl-txt" maxLength={1000} value={d.descricao} onChange={(e) => set({ descricao: maiusc(e.target.value) })} />
        </label>
        <div className="pl-fld">
          Situação
          <Opcoes
            valor={d.ativo}
            onMudar={(v) => set({ ativo: v })}
            opcoes={[
              { v: true, titulo: "Ativo", texto: equip ? "Disponível para os eventos" : "Aparece para os fornecedores e no orçamento" },
              { v: false, titulo: "Inativo", texto: "Fica guardado, mas não aparece para escolher" },
            ]}
          />
        </div>
        {erro && (
          <p className="pl-erro" role="alert">
            {erro}
          </p>
        )}
        <div className="pl-drawer-acts">
          <button type="button" className="pl-b" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className="pl-b pl-b-p" disabled={pendente}>
            {pendente ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </Gaveta>
  );
}
