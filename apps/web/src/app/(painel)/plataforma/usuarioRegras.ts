/** Regras do cadastro de usuário usadas na tela e no servidor. */

export type FichaAtleta = {
  cidade: string;
  uf: string;
  camiseta: string;
  grupo: string;
  emergencia_nome: string;
  emergencia_celular: string;
  tipo_sanguineo: string;
  saude_obs: string;
  responsavel_nome: string;
  responsavel_cpf: string;
  responsavel_celular: string;
};

export type DadosUsuario = {
  id?: string;
  nome: string;
  email: string;
  cpf: string;
  celular: string;
  data_nascimento: string;
  genero: string;
  ativo: boolean;
  perfil: string;
  subtipo_id: string;
  ficha: FichaAtleta | null;
};

export const FICHA_VAZIA: FichaAtleta = {
  cidade: "",
  uf: "",
  camiseta: "",
  grupo: "",
  emergencia_nome: "",
  emergencia_celular: "",
  tipo_sanguineo: "",
  saude_obs: "",
  responsavel_nome: "",
  responsavel_cpf: "",
  responsavel_celular: "",
};

export const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
export const CAMISETAS = ["PP", "P", "M", "G", "GG", "XG"];
export const TIPOS_SANGUINEOS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
export const SEXOS = ["Feminino", "Masculino"];

/** CPF com 11 dígitos e dígitos verificadores corretos. */
export function cpfOk(s: string): boolean {
  const d = (s ?? "").replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

export function formatarCpf(s: string): string {
  const d = (s ?? "").replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

/** Idade completa em anos a partir da data ISO (aaaa-mm-dd); 99 quando não informada. */
export function idade(iso: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return 99;
  const n = new Date(`${iso}T00:00:00`);
  const h = new Date();
  let a = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) a--;
  return a;
}
