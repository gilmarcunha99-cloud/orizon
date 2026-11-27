export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Regras de senha forte exibidas ao criar ou redefinir a senha. */
export const PASSWORD_RULES = [
  { id: "len", label: "8 caracteres", test: (s: string) => s.length >= 8 },
  { id: "lower", label: "1 minúscula", test: (s: string) => /[a-z]/.test(s) },
  { id: "upper", label: "1 maiúscula", test: (s: string) => /[A-Z]/.test(s) },
  { id: "num", label: "1 número", test: (s: string) => /\d/.test(s) },
  { id: "sym", label: "1 símbolo", test: (s: string) => /[^A-Za-z0-9]/.test(s) },
] as const;

export const passwordOk = (s: string) => PASSWORD_RULES.every((r) => r.test(s));

/** Traduz as mensagens de erro do Supabase Auth para o usuário. */
export function authErrorMessage(message?: string): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (m.includes("expired") || (m.includes("invalid") && m.includes("otp"))) return "Código inválido ou expirado. Peça um novo.";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Aguarde alguns minutos.";
  if (m.includes("same") && m.includes("password")) return "A nova senha precisa ser diferente da anterior.";
  if (m.includes("weak") || m.includes("password should")) return "A senha não atende às regras de segurança.";
  return "Não foi possível concluir agora. Tente de novo.";
}

/** Celular brasileiro com DDD: 11 dígitos, começando com 9 depois do DDD. */
export const celularOk = (s: string) => /^\d{2}9\d{8}$/.test(s.replace(/\D/g, ""));

/** Máscara (00) 00000-0000 enquanto digita. */
export function formatarCelular(s: string): string {
  const d = s.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Data de nascimento no passado e com até 120 anos. */
export function nascimentoOk(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00`);
  const hoje = new Date();
  return !Number.isNaN(d.getTime()) && d < hoje && hoje.getFullYear() - d.getFullYear() <= 120;
}
