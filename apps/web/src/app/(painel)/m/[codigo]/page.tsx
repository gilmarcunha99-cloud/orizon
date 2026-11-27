import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { carregarPainel } from "@/lib/painel";

type Params = Promise<{ codigo: string }>;

async function localizar(codigo: string) {
  const painel = await carregarPainel();
  const modulo = painel?.modulos.find((m) => m.itens.some((i) => i.codigo === codigo));
  const item = modulo?.itens.find((i) => i.codigo === codigo);
  return { modulo, item };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { item } = await localizar((await params).codigo);
  return { title: `Orizon Pass — ${item?.nome ?? "Página"}` };
}

/** Área de conteúdo do protótipo: trilha, número + título e o espaço reservado da funcionalidade. */
export default async function FuncionalidadePage({ params }: { params: Params }) {
  const { modulo, item } = await localizar((await params).codigo);
  if (!modulo || !item) notFound();

  return (
    <>
      <header className="crumb-bar">
        <div className="crumb">
          {modulo.nome} <span aria-hidden="true">/</span> <strong>{item.nome}</strong>
        </div>
      </header>
      <div className="content">
        <div className="title-row">
          <span className="num-badge">{item.num}</span>
          <h1>{item.nome}</h1>
        </div>
        <section className="placeholder">
          <div className="ph-num">{item.num}</div>
          <div className="ph-title">{item.nome}</div>
          <div className="ph-text">A tela desta funcionalidade será exibida nesta área, ao lado do menu.</div>
        </section>
      </div>
    </>
  );
}
