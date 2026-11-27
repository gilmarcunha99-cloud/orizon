"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ItemGaveta } from "./CatalogoTela";
import { TIPOS_ITEM, itemVazio, type ItemOferta, type TipoItem } from "./catalogoRegras";
import { CATEGORIAS } from "./fornecedorRegras";

/**
 * 2.3 Fornecedores, seção "Itens oferecidos": o fornecedor marca quais itens do catálogo oferece (sem preço).
 * Aparecem só os itens ativos das categorias marcadas em "O que fornece" (e os já marcados, mesmo se inativos).
 */
export function ItensOferecidos({
  itens,
  categorias,
  marcados,
  onMudar,
  onItemNovo,
}: {
  itens: ItemOferta[];
  categorias: string[];
  marcados: string[];
  onMudar: (v: string[]) => void;
  onItemNovo: (i: ItemOferta) => void;
}) {
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<"" | TipoItem>("");
  const [novo, setNovo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const visiveis = useMemo(
    () => itens.filter((i) => categorias.includes(i.categoria) && (i.ativo || marcados.includes(i.id))),
    [itens, categorias, marcados],
  );
  const qtdMarcados = visiveis.filter((i) => marcados.includes(i.id)).length;

  const grupos = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return CATEGORIAS.filter((c) => categorias.includes(c.v)).map((c) => {
      const todos = visiveis.filter((i) => i.categoria === c.v);
      const lista = todos
        .filter((i) => (!tipo || i.tipo === tipo) && (!b || i.nome.toLowerCase().includes(b)))
        .sort((a, z) => a.nome.localeCompare(z.nome, "pt-BR"));
      return { cat: c, todos, lista };
    });
  }, [visiveis, categorias, busca, tipo]);

  const alternar = (id: string) => onMudar(marcados.includes(id) ? marcados.filter((x) => x !== id) : [...marcados, id]);

  return (
    <section className="pl-sec">
      <h3>
        Itens oferecidos{" "}
        <span className="pl-tag">
          {qtdMarcados} {qtdMarcados === 1 ? "item marcado" : "itens marcados"}
        </span>
      </h3>
      {!categorias.length ? (
        <p className="pl-hint" style={{ margin: 0 }}>
          Marque as categorias em “O que fornece” para ver os itens do catálogo.
        </p>
      ) : (
        <>
          <div className="pl-bar" style={{ margin: 0 }}>
            <input
              className="pl-inp"
              type="search"
              placeholder="Buscar item"
              aria-label="Buscar item"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <select className="pl-sel" aria-label="Filtrar por tipo" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
              <option value="">Serviços, mercadorias e equipamentos</option>
              <option value="servico">Só serviços</option>
              <option value="mercadoria">Só mercadorias</option>
              <option value="equipamento">Só equipamentos</option>
            </select>
            <span className="pl-grow" />
            <button type="button" className="pl-lnk pl-lnk-b" onClick={() => setNovo(true)}>
              + Item que não está no catálogo
            </button>
          </div>
          {aviso && (
            <p className="pl-ok" role="status" style={{ margin: 0 }}>
              {aviso}
            </p>
          )}
          {grupos.map(({ cat, todos, lista }) => {
            const marc = todos.filter((i) => marcados.includes(i.id)).length;
            const todosMarcados = lista.length > 0 && lista.every((i) => marcados.includes(i.id));
            return (
              <div key={cat.v} className="pl-igrupo">
                <div className="pl-igrupo-cab">
                  <b>{cat.nome}</b>
                  <span className="pl-muted">
                    {marc} de {todos.length} marcados
                  </span>
                  <span className="pl-grow" />
                  {lista.length > 0 && (
                    <button
                      type="button"
                      className="pl-lnk pl-lnk-b"
                      onClick={() => {
                        const ids = lista.map((i) => i.id);
                        onMudar(todosMarcados ? marcados.filter((x) => !ids.includes(x)) : [...new Set([...marcados, ...ids])]);
                      }}
                    >
                      {todosMarcados ? "Desmarcar todos" : "Marcar todos"}
                    </button>
                  )}
                </div>
                {lista.length ? (
                  <div className="pl-itens">
                    {lista.map((i) => {
                      const on = marcados.includes(i.id);
                      return (
                        <label key={i.id} className={`pl-item ${on ? "on" : ""}`}>
                          <input type="checkbox" checked={on} onChange={() => alternar(i.id)} />
                          <span className="pl-item-nome">
                            {i.nome}
                            {!i.ativo && <span className="pl-muted"> (inativo)</span>}
                          </span>
                          <span className="pl-pill pl-cat">{TIPOS_ITEM[i.tipo].nome}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="pl-hint" style={{ margin: 0 }}>
                    {todos.length ? "Nenhum item com esses filtros." : "Ainda não há itens desta categoria no catálogo."}
                  </p>
                )}
              </div>
            );
          })}
        </>
      )}
      <span className="pl-hint">
        Aparecem só os itens das categorias marcadas em “O que fornece”. Sem preço: o valor de cada item é informado no
        orçamento do evento.
      </span>
      {novo &&
        createPortal(
        <ItemGaveta
          inicial={itemVazio(tipo || "servico", categorias.length === 1 ? categorias[0] : "")}
          tipos={["servico", "mercadoria", "equipamento"]}
          categorias={categorias}
          onFechar={() => setNovo(false)}
          onSalvo={(texto, id, d) => {
            setNovo(false);
            onItemNovo({ id, tipo: d.tipo, nome: d.nome, categoria: d.categoria, ativo: d.ativo });
            if (d.ativo) onMudar([...marcados, id]);
            setAviso(d.ativo ? `${texto} Já ficou marcado para este fornecedor: clique em Salvar para gravar a ficha.` : texto);
          }}
        />,
        document.body,
        )}
    </section>
  );
}
