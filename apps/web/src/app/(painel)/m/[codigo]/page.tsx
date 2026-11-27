import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { carregarPainel } from "@/lib/painel";

type Params = Promise<{ codigo: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { codigo } = await params;
  const painel = await carregarPainel();
  const item = painel?.modulos.flatMap((m) => m.itens).find((i) => i.codigo === codigo);
  return { title: `Orizon Pass — ${item?.nome ?? "Página"}` };
}

/** Página provisória de cada funcionalidade, até a tela ser aprovada e construída. */
export default async function FuncionalidadePage({ params }: { params: Params }) {
  const { codigo } = await params;
  const painel = await carregarPainel();
  const modulo = painel?.modulos.find((m) => m.itens.some((i) => i.codigo === codigo));
  const item = modulo?.itens.find((i) => i.codigo === codigo);
  if (!modulo || !item) notFound();

  return (
    <>
      <nav className="crumbs" aria-label="Você está em">
        <Link href="/inicio">Início</Link> <span aria-hidden="true">›</span> {modulo.nome}{" "}
        <span aria-hidden="true">›</span> <strong>{item.nome}</strong>
      </nav>
      <div className="page-head">
        <h1>{item.nome}</h1>
      </div>
      <section className="placeholder">
        <p>
          <strong>Em construção.</strong> Esta tela entra depois que você aprovar o desenho dela.
        </p>
      </section>
    </>
  );
}
