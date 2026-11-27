import { redirect } from "next/navigation";
import { carregarPainel, NOME_PERFIL } from "@/lib/painel";
import { TopNav } from "./TopNav";

export const dynamic = "force-dynamic";

/** Moldura das telas internas: barra do topo com um combo por módulo. */
export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const painel = await carregarPainel();
  if (!painel) redirect("/entrar");
  return (
    <div className="shell">
      <TopNav
        modulos={painel.modulos}
        nome={painel.nome || painel.email}
        perfis={painel.perfis.map((p) => NOME_PERFIL[p] ?? p)}
      />
      <main className="shell-main">{children}</main>
    </div>
  );
}
