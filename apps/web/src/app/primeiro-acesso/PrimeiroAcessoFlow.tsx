"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowIcon, CheckIcon, MailIcon } from "@/components/Icons";
import { PasswordField } from "@/components/PasswordField";
import { createClient } from "@/lib/supabase/client";
import {
  authErrorMessage,
  celularOk,
  EMAIL_RE,
  formatarCelular,
  nascimentoOk,
  PASSWORD_RULES,
  passwordOk,
} from "@/lib/validation";

type Etapa = "email" | "codigo" | "senha" | "cadastro" | "pronto";
const ORDEM: Etapa[] = ["email", "codigo", "senha", "cadastro"];
const REENVIO_SEGUNDOS = 60;

export function PrimeiroAcessoFlow({ etapaInicial = "email" }: { etapaInicial?: Etapa }) {
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa>(etapaInicial);
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [repetir, setRepetir] = useState("");
  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(0);

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
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setEnviando(false);
    if (error) {
      setErro(authErrorMessage(error.message));
      return;
    }
    setEspera(REENVIO_SEGUNDOS);
    setEtapa("codigo");
  }

  async function confirmarCodigo(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(codigo)) {
      setErro("Digite os 6 números do código.");
      return;
    }
    setErro(null);
    setEnviando(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: codigo, type: "email" });
    if (error || !data.user) {
      setEnviando(false);
      setErro(authErrorMessage(error?.message));
      return;
    }
    // Quem já tem cadastro completo não refaz o primeiro acesso.
    const { data: u } = await supabase.from("usuario").select("nome").eq("id", data.user.id).maybeSingle();
    setEnviando(false);
    if (u?.nome) {
      router.replace("/inicio");
      router.refresh();
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
    setEtapa("cadastro");
  }

  async function salvarCadastro(e: FormEvent) {
    e.preventDefault();
    if (nome.trim().split(/\s+/).length < 2) return setErro("Informe nome e sobrenome.");
    if (!celularOk(celular)) return setErro("Informe um celular válido com DDD.");
    if (!nascimentoOk(nascimento)) return setErro("Informe uma data de nascimento válida.");
    if (!aceite) return setErro("Para continuar, aceite os Termos de uso e a Política de privacidade.");
    setErro(null);
    setEnviando(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setEnviando(false);
      setErro("Sua sessão expirou. Comece de novo pelo e-mail.");
      setEtapa("email");
      return;
    }
    const { error: errUsuario } = await supabase
      .from("usuario")
      .update({ nome: nome.trim(), celular: celular.replace(/\D/g, ""), data_nascimento: nascimento })
      .eq("id", user.id);
    if (errUsuario) {
      setEnviando(false);
      setErro("Não foi possível salvar o cadastro. Tente de novo.");
      return;
    }
    // Aceite da versão vigente dos Termos de uso e da Política de privacidade.
    const { data: termos } = await supabase
      .from("termo_versao")
      .select("id, tipo, publicado_em")
      .order("publicado_em", { ascending: false });
    const vigentes = new Map<string, string>();
    for (const t of termos ?? []) if (!vigentes.has(t.tipo)) vigentes.set(t.tipo, t.id);
    if (vigentes.size) {
      await supabase
        .from("consentimento")
        .upsert(
          [...vigentes.values()].map((id) => ({ usuario_id: user.id, termo_versao_id: id, origem: "web" })),
          { onConflict: "usuario_id,termo_versao_id", ignoreDuplicates: true },
        );
    }
    setEnviando(false);
    setEtapa("pronto");
  }

  const erroMsg = erro && (
    <p className="msg-error" role="alert">
      {erro}
    </p>
  );
  const passo = ORDEM.indexOf(etapa) + 1;

  return (
    <>
      <div className="head">
        <h1>{etapa === "pronto" ? "Cadastro concluído" : "Primeiro acesso"}</h1>
        {etapa !== "pronto" && <span className="badge">Etapa {passo} de 4</span>}
      </div>

      {etapa === "email" && (
        <form onSubmit={enviarCodigo} noValidate style={{ display: "contents" }}>
          <p className="hint">
            Ainda não tem cadastro? Entre como <strong>Visitante</strong>. Enviaremos um código de 6 dígitos para o seu
            e-mail.
          </p>
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
          <p className="hint">
            Enviamos um código de 6 dígitos para <strong>{email.trim()}</strong>.
          </p>
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
            {espera > 0 ? (
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
          <PasswordField id="nova" label="Crie sua senha" value={senha} onChange={setSenha} autoComplete="new-password" />
          <ul className="rules">
            {PASSWORD_RULES.map((r) => (
              <li key={r.id} className={r.test(senha) ? "ok" : ""}>
                {r.label}
              </li>
            ))}
          </ul>
          <PasswordField
            id="repetir"
            label="Confirme a senha"
            value={repetir}
            onChange={setRepetir}
            autoComplete="new-password"
            state={repetir ? (repetir === senha ? "ok" : "error") : undefined}
          />
          {erroMsg}
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? "Salvando..." : "Salvar senha"}
            <ArrowIcon />
          </button>
        </form>
      )}

      {etapa === "cadastro" && (
        <form onSubmit={salvarCadastro} noValidate style={{ display: "contents" }}>
          <p className="hint">
            Perfil: <strong>Visitante</strong>
          </p>
          <div className="group">
            <label htmlFor="nome">Nome completo</label>
            <div className="field">
              <input id="nome" autoComplete="name" placeholder="Seu nome e sobrenome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
          </div>
          <div className="group">
            <label htmlFor="celular">Celular</label>
            <div className="field">
              <input
                id="celular"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="(00) 00000-0000"
                value={celular}
                onChange={(e) => setCelular(formatarCelular(e.target.value))}
              />
            </div>
          </div>
          <div className="group">
            <label htmlFor="nascimento">Data de nascimento</label>
            <div className="field">
              <input id="nascimento" type="date" autoComplete="bday" value={nascimento} onChange={(e) => setNascimento(e.target.value)} />
            </div>
          </div>
          <label className="check">
            <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
            <span>
              Li e aceito os <a href="/termos" target="_blank">Termos de uso</a> e a{" "}
              <a href="/privacidade" target="_blank">Política de privacidade</a>.
            </span>
          </label>
          {erroMsg}
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? "Salvando..." : "Concluir cadastro"}
            <ArrowIcon />
          </button>
        </form>
      )}

      {etapa === "pronto" && (
        <>
          <div className="status-ok" role="status">
            <CheckIcon /> Seu cadastro de Visitante está pronto.
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              router.replace("/inicio");
              router.refresh();
            }}
          >
            Continuar
            <ArrowIcon />
          </button>
        </>
      )}

      {(etapa === "email" || etapa === "codigo") && (
        <Link href="/entrar" className="link-strong center-link">
          Já tenho cadastro
        </Link>
      )}
    </>
  );
}
