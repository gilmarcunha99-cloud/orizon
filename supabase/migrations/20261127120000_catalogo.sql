-- Telas 2.6 Serviços, 2.7 Mercadorias e 2.8 Equipamentos (prévias aprovadas por Gilmar em 27/11/2026)
-- e a seção "Itens oferecidos" na ficha do Fornecedor.
-- Catálogo único (tabela item) com o tipo de cada item. Cada item pertence a uma categoria de fornecedor.
-- O fornecedor marca quais itens oferece (tabela fornecedor_item), sem preço: preço, quantidade e prazo ficam no orçamento.
-- Equipamento pode ser próprio da Orizon (patrimônio), alugado de fornecedor ou os dois.
-- Nomes em CAIXA ALTA; o nome não repete dentro do mesmo tipo. Item não é excluído: é inativado. Tudo vai para a auditoria.

-- ---------------------------------------------------------------- tabelas
create table if not exists public.item (
  id            uuid primary key default gen_random_uuid(),
  tipo          text not null check (tipo in ('servico','mercadoria','equipamento')),
  nome          text not null check (btrim(nome) <> ''),
  categoria     text not null check (categoria in ('som_iluminacao','estrutura_tendas','cronometragem','hidratacao_alimentacao',
                  'saude_ambulancia','seguranca','limpeza','foto_video','grafica_brindes','medalhas_trofeus','camisetas_kits','transporte','outros')),
  unidade       text not null check (unidade in ('unidade','peca','litro','quilo','diaria','hora','por_atleta','por_evento',
                  'metro_quadrado','quilometro','pacote')),
  descricao     text,
  ativo         boolean not null default true,
  -- só equipamentos
  proprio       boolean not null default false,
  alugado       boolean not null default false,
  qtd_propria   integer check (qtd_propria is null or qtd_propria >= 0),
  estado        text check (estado in ('novo','bom','regular','reparo')),
  patrimonio    text,
  local_guarda  text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em   timestamptz
);
comment on table public.item is 'Catálogo de serviços (2.6), mercadorias (2.7) e equipamentos (2.8).';
comment on column public.item.proprio is 'Equipamento: a Orizon tem (patrimônio).';
comment on column public.item.alugado is 'Equipamento: é alugado de fornecedor.';

create unique index if not exists item_nome_unico on public.item (tipo, nome) where excluido_em is null;

create table if not exists public.fornecedor_item (
  empresa_id uuid not null references public.empresa (id) on delete cascade,
  item_id    uuid not null references public.item (id) on delete cascade,
  criado_em  timestamptz not null default now(),
  primary key (empresa_id, item_id)
);
create index if not exists fornecedor_item_item on public.fornecedor_item (item_id);
comment on table public.fornecedor_item is 'Itens do catálogo que cada fornecedor oferece (sem preço).';

-- ---------------------------------------------------------------- padronização
create or replace function public.padronizar_item()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.nome         := upper(btrim(regexp_replace(coalesce(new.nome, ''), '\s+', ' ', 'g')));
  new.descricao    := nullif(upper(btrim(new.descricao)), '');
  new.patrimonio   := nullif(upper(btrim(new.patrimonio)), '');
  new.local_guarda := nullif(upper(btrim(new.local_guarda)), '');
  if new.tipo <> 'equipamento' then
    new.proprio := false; new.alugado := false;
  end if;
  if not new.proprio then
    new.qtd_propria := null; new.estado := null; new.patrimonio := null; new.local_guarda := null;
  end if;
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists item_padronizar on public.item;
create trigger item_padronizar before insert or update on public.item
  for each row execute function public.padronizar_item();

-- ---------------------------------------------------------------- permissão por tipo
create or replace function public.funcionalidade_item(p_tipo text)
returns text language sql immutable set search_path = '' as $$
  select case p_tipo when 'servico' then 'cadastros.servicos' when 'mercadoria' then 'cadastros.mercadorias'
                     when 'equipamento' then 'cadastros.equipamentos' end;
$$;
grant execute on function public.funcionalidade_item(text) to authenticated;

-- ---------------------------------------------------------------- leitura (gravação só pelas funções abaixo)
alter table public.item enable row level security;
alter table public.fornecedor_item enable row level security;

drop policy if exists item_ler on public.item;
create policy item_ler on public.item for select to authenticated using (
  public.pode(public.funcionalidade_item(tipo), 'ver') or public.pode('cadastros.fornecedores', 'ver')
);
drop policy if exists fornecedor_item_ler on public.fornecedor_item;
create policy fornecedor_item_ler on public.fornecedor_item for select to authenticated using (
  public.pode('cadastros.fornecedores', 'ver')
);

grant select on public.item to authenticated;
grant select on public.fornecedor_item to authenticated;

-- ---------------------------------------------------------------- lista do catálogo (com quantos fornecedores oferecem)
create or replace function public.catalogo_itens(p_tipo text)
returns table (id uuid, nome text, categoria text, unidade text, descricao text, ativo boolean,
  proprio boolean, alugado boolean, qtd_propria integer, estado text, patrimonio text, local_guarda text, fornecedores integer)
language sql stable security definer set search_path = '' as $$
  select i.id, i.nome, i.categoria, i.unidade, i.descricao, i.ativo, i.proprio, i.alugado, i.qtd_propria, i.estado,
    i.patrimonio, i.local_guarda,
    (select count(*)::int from public.fornecedor_item fi join public.empresa e on e.id = fi.empresa_id
      where fi.item_id = i.id and e.excluido_em is null and 'fornecedor' = any (e.tipos))
  from public.item i
  where i.tipo = p_tipo and i.excluido_em is null
    and public.pode(public.funcionalidade_item(p_tipo), 'ver')
  order by i.nome;
$$;
grant execute on function public.catalogo_itens(text) to authenticated;

-- ---------------------------------------------------------------- salvar item
-- Cria (p_id nulo) ou edita um item. p_dados traz tipo, nome, categoria, unidade, descricao, ativo e, no equipamento,
-- proprio, alugado, qtd_propria, estado, patrimonio, local_guarda. Quem edita fornecedores também pode criar um item
-- novo direto da ficha do fornecedor ("Item que não está no catálogo"). Retorna o id.
create or replace function public.salvar_item(p_id uuid, p_dados jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id      uuid := p_id;
  v_tipo    text := p_dados ->> 'tipo';
  v_nome    text := upper(btrim(regexp_replace(coalesce(p_dados ->> 'nome', ''), '\s+', ' ', 'g')));
  v_rotulo  text;
  v_func    text;
  v_acao    public.acao_tipo := case when p_id is null then 'criar' else 'editar' end;
  v_ok      boolean;
  v_proprio boolean := coalesce((p_dados ->> 'proprio')::boolean, false);
  v_alugado boolean := coalesce((p_dados ->> 'alugado')::boolean, false);
  v_qtd     integer;
begin
  if p_id is not null then
    select tipo into v_tipo from public.item where id = p_id and excluido_em is null;
    if not found then raise exception 'Item não encontrado.'; end if;
  end if;
  v_func := public.funcionalidade_item(v_tipo);
  if v_func is null then raise exception 'Escolha o tipo do item.'; end if;
  v_rotulo := case v_tipo when 'servico' then 'serviço' else v_tipo end;

  v_ok := public.pode(v_func, v_acao);
  if not v_ok and p_id is null then
    v_ok := public.pode('cadastros.fornecedores', 'editar') or public.pode('cadastros.fornecedores', 'criar');
  end if;
  if not v_ok then raise exception 'Sem permissão para salvar este item.'; end if;

  if v_nome = '' then raise exception 'Informe o nome do %.', v_rotulo; end if;
  if coalesce(p_dados ->> 'categoria', '') = '' then raise exception 'Escolha a categoria.'; end if;
  if coalesce(p_dados ->> 'unidade', '') = '' then raise exception 'Escolha a unidade de cobrança.'; end if;

  if v_tipo = 'equipamento' then
    if not v_proprio and not v_alugado then
      raise exception 'Marque a origem: próprio, alugado ou os dois.';
    end if;
    v_qtd := nullif(regexp_replace(coalesce(p_dados ->> 'qtd_propria', ''), '\D', '', 'g'), '')::integer;
    if v_proprio and v_qtd is null then raise exception 'Informe a quantidade própria.'; end if;
  end if;

  if exists (select 1 from public.item where tipo = v_tipo and nome = v_nome and excluido_em is null
             and id is distinct from p_id) then
    raise exception 'Esse % já está no catálogo.', v_rotulo;
  end if;

  if p_id is null then
    insert into public.item (tipo, nome, categoria, unidade, descricao, ativo, proprio, alugado, qtd_propria, estado, patrimonio, local_guarda)
    values (v_tipo, v_nome, p_dados ->> 'categoria', p_dados ->> 'unidade', p_dados ->> 'descricao',
      coalesce((p_dados ->> 'ativo')::boolean, true), v_proprio, v_alugado, v_qtd,
      nullif(p_dados ->> 'estado', ''), p_dados ->> 'patrimonio', p_dados ->> 'local_guarda')
    returning id into v_id;
  else
    update public.item set
      nome = v_nome, categoria = p_dados ->> 'categoria', unidade = p_dados ->> 'unidade',
      descricao = p_dados ->> 'descricao', ativo = coalesce((p_dados ->> 'ativo')::boolean, ativo),
      proprio = v_proprio, alugado = v_alugado, qtd_propria = v_qtd, estado = nullif(p_dados ->> 'estado', ''),
      patrimonio = p_dados ->> 'patrimonio', local_guarda = p_dados ->> 'local_guarda'
    where id = p_id;
  end if;

  perform public.registrar_log(v_tipo || case when p_id is null then '.criar' else '.editar' end, 'item', v_id::text,
    jsonb_build_object('nome', v_nome, 'categoria', p_dados ->> 'categoria', 'ativo', p_dados -> 'ativo'));
  return v_id;
end $$;
grant execute on function public.salvar_item(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------- salvar fornecedor com os itens oferecidos
-- Grava a ficha (salvar_empresa) e, se p_dados traz "itens" (lista de ids), troca os itens marcados, tudo numa
-- transação. Só ficam itens das categorias marcadas em "O que fornece". Registra na auditoria o que mudou.
create or replace function public.salvar_fornecedor(p_id uuid, p_dados jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id     uuid;
  v_novos  uuid[];
  v_antes  uuid[];
  v_depois uuid[];
begin
  v_id := public.salvar_empresa('fornecedor', p_id, p_dados - 'itens');
  if not (p_dados ? 'itens') then return v_id; end if;

  select coalesce(array_agg(i.id), '{}') into v_novos
  from public.item i join public.empresa e on e.id = v_id
  where i.id in (select (jsonb_array_elements_text(p_dados -> 'itens'))::uuid)
    and i.excluido_em is null and i.categoria = any (e.categorias);

  select coalesce(array_agg(item_id), '{}') into v_antes from public.fornecedor_item where empresa_id = v_id;
  delete from public.fornecedor_item where empresa_id = v_id and item_id <> all (v_novos);
  insert into public.fornecedor_item (empresa_id, item_id)
    select v_id, x from unnest(v_novos) x on conflict do nothing;
  select coalesce(array_agg(item_id), '{}') into v_depois from public.fornecedor_item where empresa_id = v_id;

  if not (v_antes @> v_depois and v_depois @> v_antes) then
    perform public.registrar_log('fornecedor.itens', 'empresa', v_id::text,
      jsonb_build_object('nome', p_dados ->> 'nome', 'itens', to_jsonb(v_depois),
        'incluidos', (select count(*) from unnest(v_depois) x where x <> all (v_antes)),
        'retirados', (select count(*) from unnest(v_antes) x where x <> all (v_depois))));
  end if;
  return v_id;
end $$;
grant execute on function public.salvar_fornecedor(uuid, jsonb) to authenticated;
