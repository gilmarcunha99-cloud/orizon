/** Regras do catálogo de itens (2.6 Serviços, 2.7 Mercadorias, 2.8 Equipamentos) usadas na tela e no servidor. */

export type TipoItem = "servico" | "mercadoria" | "equipamento";

export const TIPOS_ITEM: Record<
  TipoItem,
  { codigo: string; num: string; tela: string; nome: string; novo: string; plural: string; texto: string }
> = {
  servico: {
    codigo: "cadastros.servicos",
    num: "2.6",
    tela: "Serviços",
    nome: "Serviço",
    novo: "Novo serviço",
    plural: "serviços",
    texto:
      "Catálogo dos serviços contratados para os eventos. Cada item pertence a uma categoria; os fornecedores marcam na ficha quais itens oferecem. Preço, quantidade e prazo ficam no orçamento do evento.",
  },
  mercadoria: {
    codigo: "cadastros.mercadorias",
    num: "2.7",
    tela: "Mercadorias",
    nome: "Mercadoria",
    novo: "Nova mercadoria",
    plural: "mercadorias",
    texto:
      "Catálogo das mercadorias compradas para os eventos (água, frutas, medalhas, camisetas…). Cada item pertence a uma categoria; os fornecedores marcam na ficha quais itens oferecem. Preço e quantidade ficam no orçamento do evento.",
  },
  equipamento: {
    codigo: "cadastros.equipamentos",
    num: "2.8",
    tela: "Equipamentos",
    nome: "Equipamento",
    novo: "Novo equipamento",
    plural: "equipamentos",
    texto:
      "Equipamentos usados nos eventos: os próprios da Orizon (patrimônio) e os alugados de fornecedores. Um equipamento pode ser os dois (ex.: a Orizon tem 120 gradis e aluga mais quando precisa).",
  },
};

/** Tipo do item a partir do código da funcionalidade (cadastros.servicos → servico). */
export function tipoDoCodigo(codigo: string): TipoItem | null {
  const t = (Object.keys(TIPOS_ITEM) as TipoItem[]).find((k) => TIPOS_ITEM[k].codigo === codigo);
  return t ?? null;
}

export const UNIDADES: { v: string; nome: string }[] = [
  { v: "unidade", nome: "Unidade" },
  { v: "peca", nome: "Peça" },
  { v: "litro", nome: "Litro" },
  { v: "quilo", nome: "Quilo" },
  { v: "diaria", nome: "Diária" },
  { v: "hora", nome: "Hora" },
  { v: "por_atleta", nome: "Por atleta" },
  { v: "por_evento", nome: "Por evento" },
  { v: "metro_quadrado", nome: "Metro quadrado" },
  { v: "quilometro", nome: "Quilômetro" },
  { v: "pacote", nome: "Pacote" },
];

export const ESTADOS: { v: string; nome: string }[] = [
  { v: "novo", nome: "Novo" },
  { v: "bom", nome: "Bom" },
  { v: "regular", nome: "Regular" },
  { v: "reparo", nome: "Precisa de reparo" },
];

export type DadosItem = {
  id?: string;
  tipo: TipoItem;
  nome: string;
  categoria: string;
  unidade: string;
  descricao: string;
  ativo: boolean;
  proprio: boolean;
  alugado: boolean;
  qtd_propria: string;
  estado: string;
  patrimonio: string;
  local_guarda: string;
};

/** Linha da lista do catálogo. */
export type ItemCatalogo = Omit<DadosItem, "tipo" | "qtd_propria"> & { id: string; qtd_propria: number | null; fornecedores: number };

/** Item como aparece na ficha do fornecedor. */
export type ItemOferta = { id: string; tipo: TipoItem; nome: string; categoria: string; ativo: boolean };

export function itemVazio(tipo: TipoItem, categoria = ""): DadosItem {
  return {
    tipo,
    nome: "",
    categoria,
    unidade: "",
    descricao: "",
    ativo: true,
    proprio: false,
    alugado: false,
    qtd_propria: "",
    estado: "",
    patrimonio: "",
    local_guarda: "",
  };
}

export const nomeDe = (lista: { v: string; nome: string }[], v: string | null) => lista.find((x) => x.v === v)?.nome ?? v ?? "";

export function origemTexto(i: { proprio: boolean; alugado: boolean }): string {
  if (i.proprio && i.alugado) return "Próprio e alugado";
  if (i.proprio) return "Próprio";
  if (i.alugado) return "Alugado";
  return "—";
}
