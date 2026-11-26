import type { Metadata } from "next";
import { Brand } from "@/components/Brand";
import { ConfigPending } from "@/components/ConfigPending";
import { Legal } from "@/components/Legal";
import { supabaseConfigured } from "@/lib/env";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Orizon Pass — Entrar" };

export default function EntrarPage() {
  return (
    <div className="page">
      <main className="card">
        <Brand />
        {supabaseConfigured ? <LoginForm /> : <ConfigPending />}
        <Legal />
      </main>
    </div>
  );
}
