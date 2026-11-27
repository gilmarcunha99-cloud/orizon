import { redirect } from "next/navigation";

/**
 * Primeiro acesso PAUSADO na web (Gilmar, 27/11/2026): pelo protótipo aprovado, na web os perfis
 * já vêm cadastrados e o primeiro acesso do Visitante será só no celular.
 * O fluxo continua em PrimeiroAcessoFlow.tsx para ser reaproveitado depois.
 */
export default function PrimeiroAcessoPage() {
  redirect("/entrar");
}
