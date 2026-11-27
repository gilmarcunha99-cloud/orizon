/** Regras do cadastro de cliente (2.2) usadas na tela e no servidor. */

export type DadosCliente = {
  id?: string;
  tipo_pessoa: "pj" | "pf";
  documento: string;
  razao_social: string;
  nome: string;
  inscricao_estadual: string;
  ativo: boolean;
  contato_nome: string;
  contato_cargo: string;
  email: string;
  celular: string;
  telefone: string;
  email_financeiro: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  observacoes: string;
};

export type EventoCliente = { cliente_id: string; evento_id: string; nome: string; data_inicio: string; local: string | null };

export const CLIENTE_VAZIO: DadosCliente = {
  tipo_pessoa: "pj",
  documento: "",
  razao_social: "",
  nome: "",
  inscricao_estadual: "",
  ativo: true,
  contato_nome: "",
  contato_cargo: "",
  email: "",
  celular: "",
  telefone: "",
  email_financeiro: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  observacoes: "",
};

const so = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

/** CNPJ com 14 dígitos e dígitos verificadores corretos. */
export function cnpjOk(s: string): boolean {
  const d = so(s);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const dv = (n: number) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((t, p, i) => t + p * Number(d[i]), 0);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
}

export function formatarCnpj(s: string): string {
  const d = so(s).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function formatarCep(s: string): string {
  const d = so(s).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** Telefone fixo ou celular com DDD: (31) 3672-7600 ou (31) 99812-4410. */
export function formatarTelefone(s: string | null): string {
  const d = so(s).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Fixo com DDD: 10 dígitos, começando de 2 a 5 depois do DDD. */
export const fixoOk = (s: string) => /^\d{2}[2-5]\d{7}$/.test(so(s));
