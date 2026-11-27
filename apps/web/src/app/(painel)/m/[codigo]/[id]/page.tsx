import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { carregarPainel } from "@/lib/painel";
import { createClient } from "@/lib/supabase/server";
import { carregarPerfis, carregarSubtipos, carregarUsuario } from "../../../plataforma/dados";
import { UsuarioForm } from "../../../plataforma/UsuarioForm";
import { situacaoAcesso } from "../../../plataforma/acesso";
import type { DadosUsuario } from "../../../plataforma/usuarioRegras";

type Params = Promise<{ codigo: string; id: string }>;
type Busca = Promise<{ salvo?: string }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata: Metadata = { title: "Orizon Pass — Usuário" };

/** 2.1 Usuários: cadastro (id = "novo") e edição de uma pessoa. */
export default async function UsuarioPage({ params, searchParams }: { params: Params; searchParams: Busca }) {
  const { codigo, id } = await params;
  const { salvo } = await searchParams;
  if (codigo !== "cadastros.usuarios" || (id !== "novo" && !UUID.test(id))) notFound();

  const painel = await carregarPainel();
  const item = painel?.modulos.flatMap((m) => m.itens).find((i) => i.codigo === codigo);
  if (!item) notFound();

  const supabase = await createClient();
  const [{ data: auth }, { data: podeCriar }, { data: podeEditar }, { data: souAdmin }, perfis, subtipos, usuario] =
    await Promise.all([
      supabase.auth.getUser(),
      supabase.rpc("pode", { f: codigo, a: "criar" }),
      supabase.rpc("pode", { f: codigo, a: "editar" }),
      supabase.rpc("eh_admin"),
      carregarPerfis(),
      carregarSubtipos(),
      id === "novo" ? Promise.resolve(null) : carregarUsuario(id),
    ]);
  const pode0 = id === "novo" ? podeCriar : podeEditar;
  const acesso = id !== "novo" && pode0 ? await situacaoAcesso(id) : undefined;
  if (id !== "novo" && !usuario) notFound();
  const pode = id === "novo" ? podeCriar : podeEditar;

  const vazio: DadosUsuario = {
    nome: "",
    email: "",
    cpf: "",
    celular: "",
    data_nascimento: "",
    genero: "",
    ativo: true,
    perfil: "",
    subtipo_id: "",
    ficha: null,
  };
  const titulo = usuario ? usuario.dados.nome || usuario.dados.email : "Novo usuário";

  return (
    <>
      <header className="crumb-bar">
        <div className="crumb">
          Cadastros <span aria-hidden="true">/</span> <Link href="/m/cadastros.usuarios">Usuários</Link>{" "}
          <span aria-hidden="true">/</span> <strong>{titulo}</strong>
        </div>
      </header>
      <div className="content">
        <div className="title-row">
          <span className="num-badge">{item.num}</span>
          <h1>{titulo}</h1>
        </div>
        {salvo === "1" && <p className="pl-ok">Usuário cadastrado. O convite para criar a senha foi enviado por e-mail.</p>}
        {salvo === "sem-convite" && (
          <p className="pl-erro">
            Usuário cadastrado, mas o e-mail de convite não saiu agora (limite de envios do ambiente de teste). Use{" "}
            <b>Enviar convite</b> no fim da ficha mais tarde.
          </p>
        )}
        {pode ? (
          <UsuarioForm
            key={id}
            inicial={usuario?.dados ?? vazio}
            inscricoes={usuario?.inscricoes ?? []}
            perfis={perfis}
            subtipos={subtipos}
            souEu={auth.user?.id === id}
            souAdmin={Boolean(souAdmin)}
            acesso={acesso}
          />
        ) : (
          <p className="pl-erro">Você não tem permissão para {id === "novo" ? "cadastrar" : "editar"} usuários.</p>
        )}
      </div>
    </>
  );
}
