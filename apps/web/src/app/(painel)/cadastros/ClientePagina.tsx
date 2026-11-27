import Link from "next/link";
import { notFound } from "next/navigation";
import { carregarPainel } from "@/lib/painel";
import { createClient } from "@/lib/supabase/server";
import { ClienteForm } from "./ClienteForm";
import { CLIENTE_VAZIO } from "./clienteRegras";
import { carregarCliente } from "./dadosClientes";

const CODIGO = "cadastros.clientes";

/** 2.2 Clientes: cadastro (id = "novo") e edição de um cliente. */
export async function ClientePagina({ id, salvo }: { id: string; salvo?: string }) {
  const painel = await carregarPainel();
  const item = painel?.modulos.flatMap((m) => m.itens).find((i) => i.codigo === CODIGO);
  if (!item) notFound();

  const supabase = await createClient();
  const [{ data: pode }, cliente] = await Promise.all([
    supabase.rpc("pode", { f: CODIGO, a: id === "novo" ? "criar" : "editar" }),
    id === "novo" ? Promise.resolve(null) : carregarCliente(id),
  ]);
  if (id !== "novo" && !cliente) notFound();
  const titulo = cliente ? cliente.dados.nome : "Novo cliente";

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
        {salvo === "1" && <p className="pl-ok">Cliente cadastrado.</p>}
        {pode ? (
          <ClienteForm key={id} inicial={cliente?.dados ?? CLIENTE_VAZIO} eventos={cliente?.eventos ?? []} />
        ) : (
          <p className="pl-erro">Você não tem permissão para {id === "novo" ? "cadastrar" : "editar"} clientes.</p>
        )}
      </div>
    </>
  );
}
