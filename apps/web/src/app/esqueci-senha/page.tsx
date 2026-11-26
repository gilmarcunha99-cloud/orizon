import type { Metadata } from "next";
import { Brand } from "@/components/Brand";
import { ConfigPending } from "@/components/ConfigPending";
import { supabaseConfigured } from "@/lib/env";
import { ForgotPasswordFlow } from "./ForgotPasswordFlow";

export const metadata: Metadata = { title: "Orizon Pass — Esqueci minha senha" };

export default function EsqueciSenhaPage() {
  return (
    <div className="page">
      <main className="card">
        <Brand />
        {supabaseConfigured ? <ForgotPasswordFlow /> : <ConfigPending />}
      </main>
    </div>
  );
}
