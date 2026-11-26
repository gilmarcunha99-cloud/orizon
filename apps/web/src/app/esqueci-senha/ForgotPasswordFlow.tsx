"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowIcon, CheckIcon, MailIcon } from "@/components/Icons";
import { PasswordField } from "@/components/PasswordField";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage, EMAIL_RE, PASSWORD_RULES, passwordOk } from "@/lib/validation";

type Etapa = "email" | "codigo" | "senha" | "pronto";
type Modo = "recuperar" | "convite";

type Props = {
  /** "recuperar" = Esqueci minha senha; "convite" = primeira senha de quem foi convidado (Admin, Atleta). */
  modo?: Modo;
  emailInicial?: string;
  /** Vem do link do e-mail de convite. */
  tokenHash?: string;
};
const REENVIO_SEGUNDOS = 60;

/**
 * Esqueci minha senha: e-mail → código de 6 dígitos → nova senha → senha redefinida.
 * O mesmo fluxo vale para o convite do Atleta e do Admin (primeira senha).
 */
export function ForgotPasswordFlow({ modo = "recuperar", emailInicial = "", tokenHash }: Props) {
  const router = useRouter();
  const convite = modo === "convite";
  const [etapa, setEtapa] = useState<Etapa>(convite ? "codigo" : "email");
  const [email, setEmail] = useState(emailInicial);
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [repetir, setRepetir] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(0);

  // Link do convite: valida o token e vai direto para a criação da senha.
  useEffect(() => {
    if (!convite || !tokenHash) return;
    let ativo = true;
    setEnviando(true);
    createClient()
      .auth.verifyOtp({ token_hash: tokenHash, type: "invite" })
      .then(({ error }) => {
        if (!ativo) return;
        setEnviando(false);
        if (error) setErro("Este link expirou ou já foi usado. Digite o código do e-mail ou peça um novo convite.");
        else setEtapa("senha");
      });
    return () => {
      ativo = false;
    };
  }, [convite, tokenHash]);

  // Link padrão do Supabase (fluxo com #access_token): abre a sessão e vai para a criação da senha.
  useEffect(() => {
    if (!convite) return;
    const params = new URLSearchParams(window.location.hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (params.get("error_code")) {
      history.replaceState(null, "", window.location.pathname);
      setErro("Este link expirou ou já foi usado. Digite o código do e-mail ou peça um novo convite.");
      return;
    }
    if (!access_token || !refresh_token) return;
    history.replaceState(null, "", window.location.pathname);
    setEnviando(true);
    createClient()
      .auth.setSession({ access_token, refresh_token })
      .then(({ error }) => {
        setEnviando(false);
        if (error) setErro("Este link expirou ou já foi usado. Digite o código do e-mail ou peça um novo convite.");
        else setEtapa("senha");
      });
  }, [convite]);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  async function enviarCodigo(e?: FormEvent) {
    e?.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setErro("Informe um e-mail válido.");
      return;
    }
    setErro(null);
    setEnviando(true);
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim());
    setEnviando(false);
    // Por segurança, não revelamos se o e-mail existe: seguimos para o código em qualquer caso.
    if (error && error.status === 429) {
      setErro(authErrorMessage("rate limit"));
      return;
    }
    setEspera(REENVIO_SEGUNDOS);
    setEtapa("codigo");
  }

  async function confirmarCodigo(e: FormEvent) {
    e.preventDefault();
    if (convite && !EMAIL_RE.test(email.trim())) {
      setErro("Informe o e-mail que recebeu o convite.");
      return;
    }
    if (!/^\d{6}$/.test(codigo)) {
      setErro("Digite os 6 números do código.");
      return;
    }
    setErro(null);
    setEnviando(true);
    const { error } = await createClient().auth.verifyOtp({ email: email.trim(), token: codigo, type: convite ? "invite" : "recovery" });
    setEnviando(false);
    if (error) {
      setErro(authErrorMessage(error.message));
      return;
    }
    setEtapa("senha");
  }

  async function salvarSenha(e: FormEvent) {
    e.preventDefault();
    if (!passwordOk(senha)) {
      setErro("A senha não atende às regras abaixo.");
      return;
    }
    if (senha !== repetir) {
      setErro("As senhas não conferem.");
      return;
    }
    setErro(null);
    setEnviando(true);
    const { error } = await createClient().auth.updateUser({ password: senha });
    setEnviando(false);
    if (error) {
      setErro(authErrorMessage(error.message));
      return;
    }
    setEtapa("pronto");
  }

  const erroMsg = erro && (
    <p className="msg-error" role="alert">
      {erro}
    </p>
  );

  return (
    <>
      <div className="head">
        <h1>
          {etapa === "pronto"
            ? convite
              ? "Senha criada"
              : "Senha redefinida"
            : convite
              ? "Criar senha"
              : "Esqueci minha senha"}
        </h1>
        {etapa !== "pronto" && (
          <span className="badge">
            Etapa {convite ? (etapa === "codigo" ? 1 : 2) : etapa === "email" ? 1 : etapa === "codigo" ? 2 : 3} de{" "}
            {convite ? 2 : 3}
          </span>
        )}
      </div>

      {etapa === "email" && (
        <form onSubmit={enviarCodigo} noValidate style={{ display: "contents" }}>
          <p className="hint">Enviaremos um código de 6 dígitos para o seu e-mail.</p>
          <div className="group">
            <label htmlFor="email">E-mail</label>
            <div className={`field ${erro ? "error" : ""}`}>
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
            {erroMsg}
          </div>
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar código"}
            <ArrowIcon />
          </button>
        </form>
      )}

      {etapa === "codigo" && (
        <form onSubmit={confirmarCodigo} noValidate style={{ display: "contents" }}>
          {convite ? (
            <>
              <p className="hint">Digite o e-mail que recebeu o convite e o código de 6 dígitos.</p>
              <div className="group">
                <label htmlFor="email">E-mail</label>
                <div className="field">
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
            </>
          ) : (
            <p className="hint">
              Se <strong>{email.trim()}</strong> estiver cadastrado, você recebeu um código de 6 dígitos.
            </p>
          )}
          <div className="group">
            <label htmlFor="codigo">Código</label>
            <div className={`field ${erro ? "error" : ""}`}>
              <input
                id="codigo"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                style={{ letterSpacing: "0.4em", fontFamily: "var(--oz-font-section)", fontSize: 22 }}
              />
            </div>
            {erroMsg}
          </div>
          <div className="otp-actions">
            <button type="submit" className="btn btn-primary" disabled={enviando}>
              {enviando ? "Confirmando..." : "Confirmar"}
              <ArrowIcon />
            </button>
            {convite ? null : espera > 0 ? (
              <span className="resend">Reenviar em {espera}s</span>
            ) : (
              <button type="button" className="text-btn" onClick={() => enviarCodigo()}>
                Reenviar código
              </button>
            )}
          </div>
        </form>
      )}

      {etapa === "senha" && (
        <form onSubmit={salvarSenha} noValidate style={{ display: "contents" }}>
          <PasswordField id="nova" label="Nova senha" value={senha} onChange={setSenha} autoComplete="new-password" />
          <ul className="rules">
            {PASSWORD_RULES.map((r) => (
              <li key={r.id} className={r.test(senha) ? "ok" : ""}>
                {r.label}
              </li>
            ))}
          </ul>
          <PasswordField
            id="repetir"
            label="Repita a nova senha"
            value={repetir}
            onChange={setRepetir}
            autoComplete="new-password"
            state={repetir ? (repetir === senha ? "ok" : "error") : undefined}
          />
          {erroMsg}
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? "Salvando..." : "Salvar nova senha"}
            <ArrowIcon />
          </button>
        </form>
      )}

      {etapa === "pronto" && (
        <>
          <div className="status-ok" role="status">
            <CheckIcon /> {convite ? "Sua senha foi criada." : "Sua senha foi redefinida."}
          </div>
          <button type="button" className="btn btn-primary" onClick={() => router.replace("/inicio")}>
            Continuar
            <ArrowIcon />
          </button>
        </>
      )}

      {etapa !== "pronto" && (
        <Link href="/entrar" className="link-strong center-link">
          Voltar para Entrar
        </Link>
      )}
    </>
  );
}
