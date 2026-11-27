import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { carregarPainel } from "@/lib/painel";
import { carregarMatriz, carregarPerfis, carregarSubtipos } from "../../plataforma/dados";
import { PerfisTela } from "../../plataforma/PerfisTela";
import { PermissoesTela } from "../../plataforma/PermissoesTela";
import { SubtiposTela } from "../../plataforma/SubtiposTela";

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
        <Tela codigo={item.codigo} num={item.num} nome={item.nome} />
      </div>
    </>
  );
}

/** Telas já construídas; as demais mostram o espaço reservado do protótipo. */
async function Tela({ codigo, num, nome }: { codigo: string; num: string; nome: string }) {
  if (codigo === "cadastros.perfis") return <PerfisTela perfis={await carregarPerfis()} />;
  if (codigo === "cadastros.subtipos") {
    const [subtipos, perfis] = await Promise.all([carregarSubtipos(), carregarPerfis()]);
    return <SubtiposTela subtipos={subtipos} perfis={perfis} />;
  }
  if (codigo === "plataforma.permissoes") {
    const [{ funcs, permissoes }, perfis] = await Promise.all([carregarMatriz(), carregarPerfis()]);
    return <PermissoesTela funcs={funcs} permissoes={permissoes} perfis={perfis} />;
  }
  return (
    <section className="placeholder">
      <div className="ph-num">{num}</div>
      <div className="ph-title">{nome}</div>
      <div className="ph-text">A tela desta funcionalidade será exibida nesta área, ao lado do menu.</div>
    </section>
  );
}
