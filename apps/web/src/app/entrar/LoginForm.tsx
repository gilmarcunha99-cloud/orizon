"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowIcon, MailIcon } from "@/components/Icons";
import { PasswordField } from "@/components/PasswordField";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage, EMAIL_RE } from "@/lib/validation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState({ email: false, senha: false });
  const [enviando, setEnviando] = useState(false);

  // Links de convite/recuperação no formato padrão do Supabase (#access_token=... ou #error=...)
  // caem aqui pelo Site URL: encaminha para a criação de senha mantendo o fragmento.
  useEffect(() => {
    const h = window.location.hash;
    if (/[#&](access_token|error_code)=/.test(h)) window.location.replace(`/criar-senha${h}`);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const emailOk = EMAIL_RE.test(email.trim());
    const senhaOk = senha.length > 0;
    setCampos({ email: !emailOk, senha: !senhaOk });
    if (!emailOk || !senhaOk) {
      setErro("Preencha e-mail e senha.");
      return;
    }
    setErro(null);
    setEnviando(true);
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password: senha });
    setEnviando(false);
    if (error) {
      setCampos({ email: true, senha: true });
      setErro(authErrorMessage(error.message));
      return;
    }
    router.replace("/inicio");
    router.refresh();
  }

  return (
    <form className="card-form" noValidate style={{ display: "contents" }} onSubmit={onSubmit}>
      <div className="group">
        <label htmlFor="email">E-mail</label>
        <div className={`field ${campos.email ? "error" : ""}`}>
          <MailIcon />
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="voce@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="group">
        <PasswordField
          id="senha"
          label="Senha"
          value={senha}
          onChange={setSenha}
          autoComplete="current-password"
          placeholder="Sua senha"
          state={campos.senha ? "error" : undefined}
        />
        {erro && (
          <p className="msg-error" role="alert">
            {erro}
          </p>
        )}
      </div>

      <div className="row">
        <label className="check">
          <input type="checkbox" name="manter" defaultChecked /> Manter conectado
        </label>
        <Link href="/esqueci-senha" className="link-strong">
          Esqueci minha senha
        </Link>
      </div>

      <button type="submit" className="btn btn-primary" disabled={enviando}>
        {enviando ? "Entrando..." : "Entrar"}
        <ArrowIcon />
      </button>

      <Link href="/primeiro-acesso" className="link-strong center-link">
        Primeiro acesso? Cadastre-se como Visitante
      </Link>
    </form>
  );
}
