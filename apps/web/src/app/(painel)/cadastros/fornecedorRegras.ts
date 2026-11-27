/** Regras do cadastro de fornecedor (2.3) usadas na tela e no servidor. */

export const CATEGORIAS: { v: string; nome: string }[] = [
  { v: "som_iluminacao", nome: "Som e iluminação" },
  { v: "estrutura_tendas", nome: "Estrutura e tendas" },
  { v: "cronometragem", nome: "Cronometragem" },
  { v: "hidratacao_alimentacao", nome: "Hidratação e alimentação" },
  { v: "saude_ambulancia", nome: "Saúde e ambulância" },
  { v: "seguranca", nome: "Segurança" },
  { v: "limpeza", nome: "Limpeza" },
  { v: "foto_video", nome: "Foto e vídeo" },
  { v: "grafica_brindes", nome: "Gráfica e brindes" },
  { v: "medalhas_trofeus", nome: "Medalhas e troféus" },
  { v: "camisetas_kits", nome: "Camisetas e kits" },
  { v: "transporte", nome: "Transporte" },
  { v: "outros", nome: "Outros" },
];

/** Lista fixa, sem "Outros" (decisão de 27/11/2026): novos meios entram na lista quando surgirem. */
export const MEIOS_PAGAMENTO: { v: string; nome: string }[] = [
  { v: "pix", nome: "PIX" },
  { v: "boleto", nome: "Boleto" },
  { v: "transferencia", nome: "Transferência" },
  { v: "dinheiro", nome: "Dinheiro" },
  { v: "cartao_credito", nome: "Cartão de crédito" },
  { v: "cartao_debito", nome: "Cartão de débito" },
  { v: "cheque", nome: "Cheque" },
  { v: "permuta", nome: "Permuta" },
];

export const PIX_TIPOS: { v: string; nome: string }[] = [
  { v: "cnpj", nome: "CNPJ" },
  { v: "cpf", nome: "CPF" },
  { v: "email", nome: "E-mail" },
  { v: "celular", nome: "Celular" },
  { v: "aleatoria", nome: "Chave aleatória" },
];

export const CONTA_TIPOS: { v: string; nome: string }[] = [
  { v: "corrente", nome: "Corrente" },
  { v: "poupanca", nome: "Poupança" },
  { v: "pagamento", nome: "Pagamento" },
];

/** Bancos mais usados, para sugestão ao digitar (o campo aceita qualquer banco). */
export const BANCOS = [
  "001 - BANCO DO BRASIL",
  "033 - SANTANDER",
  "104 - CAIXA ECONÔMICA FEDERAL",
  "237 - BRADESCO",
  "341 - ITAÚ",
  "077 - INTER",
  "260 - NUBANK",
  "336 - C6 BANK",
  "748 - SICREDI",
  "756 - SICOOB",
  "290 - PAGBANK",
  "323 - MERCADO PAGO",
  "212 - BANCO ORIGINAL",
  "041 - BANRISUL",
];

export type DadosFornecedor = {
  id?: string;
  tipo_pessoa: "pj" | "pf";
  documento: string;
  razao_social: string;
  nome: string;
  inscricao_estadual: string;
  ativo: boolean;
  categorias: string[];
  descricao_servicos: string;
  contato_nome: string;
  contato_cargo: string;
  email: string;
  celular: string;
  telefone: string;
  site: string;
  meios_pagamento: string[];
  pix_tipo: string;
  pix_chave: string;
  banco: string;
  agencia: string;
  conta: string;
  conta_tipo: string;
  titular_nome: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  observacoes: string;
};

export const FORNECEDOR_VAZIO: DadosFornecedor = {
  tipo_pessoa: "pj",
  documento: "",
  razao_social: "",
  nome: "",
  inscricao_estadual: "",
  ativo: true,
  categorias: [],
  descricao_servicos: "",
  contato_nome: "",
  contato_cargo: "",
  email: "",
  celular: "",
  telefone: "",
  site: "",
  meios_pagamento: [],
  pix_tipo: "",
  pix_chave: "",
  banco: "",
  agencia: "",
  conta: "",
  conta_tipo: "",
  titular_nome: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  observacoes: "",
};

/** Copia de uma linha da tabela empresa só os campos conhecidos (vazio quando nulo). */
export function deLinha<T extends Record<string, unknown>>(modelo: T, linha: Record<string, unknown>): T {
  const d = { ...modelo };
  for (const k of Object.keys(modelo) as (keyof T)[]) {
    const v = linha[k as string];
    if (v !== null && v !== undefined) d[k] = v as T[keyof T];
  }
  return d;
}
