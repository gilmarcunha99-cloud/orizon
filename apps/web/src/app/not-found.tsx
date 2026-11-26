import Link from "next/link";
import { Brand } from "@/components/Brand";

export default function NotFound() {
  return (
    <div className="page">
      <main className="card">
        <Brand />
        <div className="head">
          <h1>Página não encontrada</h1>
        </div>
        <Link className="btn btn-primary" href="/">
          Voltar para o início
        </Link>
      </main>
    </div>
  );
}
