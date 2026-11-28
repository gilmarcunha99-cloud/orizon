/** Regras do cadastro de patrocinador (2.4) usadas na tela e no servidor. */

export const PARTICIPACOES: { v: string; nome: string }[] = [
  { v: "patrocinador", nome: "Patrocinador (cota e marca no evento)" },
  { v: "expositor", nome: "Expositor (estande no evento)" },
];

/** Sugestões do campo Ramo de atividade (texto livre, decisão de 28/11/2026). */
export const RAMOS_SUGERIDOS = [
  "ARTIGOS ESPORTIVOS",
  "BEBIDAS E ALIMENTAÇÃO",
  "SAÚDE E BEM-ESTAR",
  "ACADEMIA",
  "FINANCEIRO",
  "AUTOMOTIVO",
  "VAREJO E SHOPPING",
  "TECNOLOGIA",
  "EDUCAÇÃO",
  "PODER PÚBLICO",
  "INFLUENCIADOR",
];

export function participacaoTexto(p: string[]): string {
  const pat = p.includes("patrocinador");
  const exp = p.includes("expositor");
  if (pat && exp) return "Patrocinador e expositor";
  if (pat) return "Patrocinador";
  if (exp) return "Expositor";
  return "—";
}

export type DadosPatrocinador = {
  id?: string;
  tipo_pessoa: "pj" | "pf";
  documento: string;
  razao_social: string;
  nome: string;
  inscricao_estadual: string;
  ativo: boolean;
  participacao: string[];
  ramo: string;
  descricao_comercial: string;
  contato_nome: string;
  contato_cargo: string;
  email: string;
  celular: string;
  telefone: string;
  site: string;
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

export const PATROCINADOR_VAZIO: DadosPatrocinador = {
  tipo_pessoa: "pj",
  documento: "",
  razao_social: "",
  nome: "",
  inscricao_estadual: "",
  ativo: true,
  participacao: [],
  ramo: "",
  descricao_comercial: "",
  contato_nome: "",
  contato_cargo: "",
  email: "",
  celular: "",
  telefone: "",
  site: "",
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
