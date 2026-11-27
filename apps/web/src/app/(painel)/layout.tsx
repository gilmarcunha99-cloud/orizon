import { redirect } from "next/navigation";
import { carregarPainel, NOME_PERFIL } from "@/lib/painel";
import { Sidebar } from "./Sidebar";

export const dynamic = "force-dynamic";

/** Moldura das telas internas, conforme o protótipo aprovado: menu lateral + área de conteúdo. */
export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const painel = await carregarPainel();
  if (!painel) redirect("/entrar");
  return (
    <div className="app">
      <Sidebar
        modulos={painel.modulos}
        nome={painel.nome || painel.email}
        perfis={painel.perfis.map((p) => NOME_PERFIL[p] ?? p)}
      />
      <div className="app-main">{children}</div>
    </div>
  );
}
