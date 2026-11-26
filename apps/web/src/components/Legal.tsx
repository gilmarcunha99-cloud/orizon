import { appVersion } from "@/lib/env";

export function Legal() {
  return (
    <>
      <p className="legal">
        Ao entrar, você concorda com os <a href="/termos">Termos de uso</a> e a{" "}
        <a href="/privacidade">Política de privacidade</a>.
      </p>
      <p className="version">Versão {appVersion}</p>
    </>
  );
}
