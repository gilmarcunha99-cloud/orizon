import Link from "next/link";
import { notFound } from "next/navigation";
import { carregarPainel } from "@/lib/painel";
import { createClient } from "@/lib/supabase/server";
import { FornecedorForm } from "./FornecedorForm";
import { FORNECEDOR_VAZIO } from "./fornecedorRegras";
import { carregarFornecedor } from "./dadosFornecedores";

const CODIGO = "cadastros.fornecedores";

/** 2.3 Fornecedores: cadastro (id = "novo") e edição de um fornecedor. */
export async function FornecedorPagina({ id, salvo }: { id: string; salvo?: string }) {
  const painel = await carregarPainel();
  const item = painel?.modulos.flatMap((m) => m.itens).find((i) => i.codigo === CODIGO);
  if (!item) notFound();

  const supabase = await createClient();
  const [{ data: pode }, fornecedor] = await Promise.all([
    supabase.rpc("pode", { f: CODIGO, a: id === "novo" ? "criar" : "editar" }),
    id === "novo" ? Promise.resolve(null) : carregarFornecedor(id),
  ]);
  if (id !== "novo" && !fornecedor) notFound();
  const titulo = fornecedor ? fornecedor.dados.nome : "Novo fornecedor";

  return (
    <>
      <header className="crumb-bar">
        <div className="crumb">
          Cadastros <span aria-hidden="true">/</span> <Link href={`/m/${CODIGO}`}>{item.nome}</Link> <span aria-hidden="true">/</span>{" "}
          <strong>{titulo}</strong>
        </div>
      </header>
      <div className="content">
        <div className="title-row">
          <span className="num-badge">{item.num}</span>
          <h1>{titulo}</h1>
        </div>
        {salvo === "1" && <p className="pl-ok">Fornecedor cadastrado.</p>}
        {pode ? (
          <FornecedorForm key={id} inicial={fornecedor?.dados ?? FORNECEDOR_VAZIO} tambemCliente={fornecedor?.tambemCliente ?? false} />
        ) : (
          <p className="pl-erro">Você não tem permissão para {id === "novo" ? "cadastrar" : "editar"} fornecedores.</p>
        )}
      </div>
    </>
  );
}
