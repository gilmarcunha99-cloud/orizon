import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/Brand";
import { createClient } from "@/lib/supabase/server";
import { sair } from "./actions";

export const metadata: Metadata = { title: "Orizon Pass — Início" };
export const dynamic = "force-dynamic";

const NOME_PERFIL: Record<string, string> = {
  admin: "Admin",
  diretor: "Diretor(a)",
  organizador: "Organizador(a)",
  coordenador: "Coordenador(a)",
  terceiros: "Terceiros",
  staff: "Staff",
  atleta: "Atleta",
  visitante: "Visitante",
  patrocinador: "Patrocinador",
  arbitro: "Árbitro",
};

/** Moldura da tela inicial por perfil. Os módulos entram nas próximas entregas. */
export default async function InicioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: perfil } = await supabase
    .from("usuario")
    .select("nome, usuario_perfil(perfil, subtipo(nome))")
    .eq("id", user.id)
    .maybeSingle();

  const perfis = (perfil?.usuario_perfil ?? []) as unknown as { perfil: string; subtipo: { nome: string } | null }[];

  // Visitante que criou a conta mas não terminou o cadastro volta para a última etapa.
  if (!perfil?.nome && perfis.every((p) => p.perfil === "visitante")) redirect("/primeiro-acesso?etapa=cadastro");

  return (
    <div className="page">
      <main className="card">
        <Brand />
        <div className="head">
          <h1>Olá, {perfil?.nome || user.email}</h1>
        </div>
        <ul className="home-list">
          <li>
            <strong>E-mail:</strong> {user.email}
          </li>
          <li>
            <strong>Perfil:</strong>{" "}
            {perfis.length
              ? perfis.map((p) => NOME_PERFIL[p.perfil] + (p.subtipo ? ` (${p.subtipo.nome})` : "")).join(", ")
              : "Visitante"}
          </li>
        </ul>
        <p className="hint">Os módulos do painel aparecem aqui conforme forem liberados.</p>
        <form action={sair}>
          <button type="submit" className="btn btn-secondary">
            Sair
          </button>
        </form>
      </main>
    </div>
  );
}
