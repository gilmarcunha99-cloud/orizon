import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { carregarPainel } from "@/lib/painel";
import { createClient } from "@/lib/supabase/server";
import { carregarMatriz, carregarPerfis, carregarSubtipos, carregarUsuarios } from "../../plataforma/dados";
import { PerfisTela } from "../../plataforma/PerfisTela";
import { PermissoesTela } from "../../plataforma/PermissoesTela";
import { SubtiposTela } from "../../plataforma/SubtiposTela";
import { UsuariosTela } from "../../plataforma/UsuariosTela";
import { ClientesTela } from "../../cadastros/ClientesTela";
import { carregarClientes } from "../../cadastros/dadosClientes";

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
  if (codigo === "cadastros.usuarios") {
    const supabase = await createClient();
    const [usuarios, perfis, criar, editar] = await Promise.all([
      carregarUsuarios(),
      carregarPerfis(),
      supabase.rpc("pode", { f: codigo, a: "criar" }),
      supabase.rpc("pode", { f: codigo, a: "editar" }),
    ]);
    return <UsuariosTela usuarios={usuarios} perfis={perfis} podeCriar={Boolean(criar.data)} podeEditar={Boolean(editar.data)} />;
  }
  if (codigo === "cadastros.clientes") {
    const supabase = await createClient();
    const [clientes, criar, editar] = await Promise.all([
      carregarClientes(),
      supabase.rpc("pode", { f: codigo, a: "criar" }),
      supabase.rpc("pode", { f: codigo, a: "editar" }),
    ]);
    return <ClientesTela clientes={clientes} podeCriar={Boolean(criar.data)} podeEditar={Boolean(editar.data)} />;
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
