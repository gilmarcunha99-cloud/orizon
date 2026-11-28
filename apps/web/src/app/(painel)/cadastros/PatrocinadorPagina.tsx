import Link from "next/link";
import { notFound } from "next/navigation";
import { carregarPainel } from "@/lib/painel";
import { createClient } from "@/lib/supabase/server";
import { PatrocinadorForm } from "./PatrocinadorForm";
import { PATROCINADOR_VAZIO } from "./patrocinadorRegras";
import { carregarPatrocinador } from "./dadosPatrocinadores";

const CODIGO = "cadastros.patrocinadores";

/** 2.4 Patrocinadores: cadastro (id = "novo") e edição de um patrocinador. */
export async function PatrocinadorPagina({ id, salvo }: { id: string; salvo?: string }) {
  const painel = await carregarPainel();
  const item = painel?.modulos.flatMap((m) => m.itens).find((i) => i.codigo === CODIGO);
  if (!item) notFound();

  const supabase = await createClient();
  const [{ data: pode }, patrocinador] = await Promise.all([
    supabase.rpc("pode", { f: CODIGO, a: id === "novo" ? "criar" : "editar" }),
    id === "novo" ? Promise.resolve(null) : carregarPatrocinador(id),
  ]);
  if (id !== "novo" && !patrocinador) notFound();
  const titulo = patrocinador ? patrocinador.dados.nome : "Novo patrocinador";

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
        {salvo === "1" && <p className="pl-ok">Patrocinador cadastrado.</p>}
        {pode ? (
          <PatrocinadorForm key={id} inicial={patrocinador?.dados ?? PATROCINADOR_VAZIO} outrosPapeis={patrocinador?.outrosPapeis ?? []} />
        ) : (
          <p className="pl-erro">Você não tem permissão para {id === "novo" ? "cadastrar" : "editar"} patrocinadores.</p>
        )}
      </div>
    </>
  );
}
