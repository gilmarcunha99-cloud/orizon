-- Tela 2.2 Clientes (prévia aprovada por Gilmar em 27/11/2026).
-- Cliente = empresa ou pessoa que contrata a Orizon. É só um cadastro ligado aos eventos: não entra no Orizon Pass.
-- Usa a tabela empresa (tipos contém 'cliente'). Nomes em CAIXA ALTA, e-mails em minúsculo, CNPJ/CPF não repete,
-- toda gravação vai para a auditoria. Cliente não é excluído: é inativado.

-- ---------------------------------------------------------------- campos da ficha
alter table public.empresa
  add column if not exists tipo_pessoa         text not null default 'pj' check (tipo_pessoa in ('pj','pf')),
  add column if not exists razao_social        text,
  add column if not exists inscricao_estadual  text,
  add column if not exists contato_nome        text,
  add column if not exists contato_cargo       text,
  add column if not exists celular             text,
  add column if not exists email_financeiro    text,
  add column if not exists cep                 text,
  add column if not exists logradouro          text,
  add column if not exists numero              text,
  add column if not exists complemento         text,
  add column if not exists bairro              text,
  add column if not exists cidade              text,
  add column if not exists uf                  char(2),
  add column if not exists observacoes         text;

comment on column public.empresa.nome is 'Nome fantasia (na pessoa física, o nome da pessoa).';
comment on column public.empresa.razao_social is 'Razão social (na pessoa física, o nome completo).';
comment on column public.empresa.documento is 'CNPJ (14 dígitos) ou CPF (11 dígitos), só números. Não repete.';
comment on column public.empresa.email is 'E-mail do contato principal.';
comment on column public.empresa.telefone is 'Telefone fixo (opcional).';

-- ---------------------------------------------------------------- padronização (vale para qualquer gravação)
create or replace function public.padronizar_empresa()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.nome               := upper(btrim(regexp_replace(coalesce(new.nome, ''), '\s+', ' ', 'g')));
  new.razao_social       := nullif(upper(btrim(regexp_replace(coalesce(new.razao_social, ''), '\s+', ' ', 'g'))), '');
  new.contato_nome       := nullif(upper(btrim(regexp_replace(coalesce(new.contato_nome, ''), '\s+', ' ', 'g'))), '');
  new.contato_cargo      := nullif(upper(btrim(new.contato_cargo)), '');
  new.logradouro         := nullif(upper(btrim(new.logradouro)), '');
  new.numero             := nullif(upper(btrim(new.numero)), '');
  new.complemento        := nullif(upper(btrim(new.complemento)), '');
  new.bairro             := nullif(upper(btrim(new.bairro)), '');
  new.cidade             := nullif(upper(btrim(new.cidade)), '');
  new.uf                 := nullif(upper(btrim(new.uf)), '');
  new.inscricao_estadual := nullif(upper(btrim(new.inscricao_estadual)), '');
  new.email              := nullif(lower(btrim(new.email)), '');
  new.email_financeiro   := nullif(lower(btrim(new.email_financeiro)), '');
  new.documento          := nullif(regexp_replace(coalesce(new.documento, ''), '\D', '', 'g'), '');
  new.celular            := nullif(regexp_replace(coalesce(new.celular, ''), '\D', '', 'g'), '');
  new.telefone           := nullif(regexp_replace(coalesce(new.telefone, ''), '\D', '', 'g'), '');
  new.cep                := nullif(regexp_replace(coalesce(new.cep, ''), '\D', '', 'g'), '');
  return new;
end $$;

drop trigger if exists empresa_padronizar on public.empresa;
create trigger empresa_padronizar before insert or update on public.empresa
  for each row execute function public.padronizar_empresa();

update public.empresa set nome = nome;

-- CNPJ/CPF não repete entre os cadastros ativos (não excluídos).
create unique index if not exists empresa_documento_unico on public.empresa (documento)
  where documento is not null and excluido_em is null;

-- ---------------------------------------------------------------- salvar cliente
-- Cria (p_id nulo) ou edita um cliente numa transação só e registra na auditoria. Retorna o id.
create or replace function public.salvar_cliente(p_id uuid, p_dados jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id    uuid := p_id;
  v_doc   text := nullif(regexp_replace(coalesce(p_dados ->> 'documento', ''), '\D', '', 'g'), '');
  v_tipo  text := coalesce(nullif(p_dados ->> 'tipo_pessoa', ''), 'pj');
  v_outro text;
  v_rotulo text;
  v_tam   int;
begin
  if not public.pode('cadastros.clientes', case when p_id is null then 'criar' else 'editar' end::public.acao_tipo) then
    raise exception 'Sem permissão para salvar clientes.';
  end if;
  if v_tipo not in ('pj','pf') then raise exception 'Escolha o tipo de pessoa.'; end if;
  v_rotulo := case v_tipo when 'pj' then 'CNPJ' else 'CPF' end;
  v_tam    := case v_tipo when 'pj' then 14 else 11 end;
  if v_doc is null or length(v_doc) <> v_tam then
    raise exception 'Informe o % completo.', v_rotulo;
  end if;
  if coalesce(btrim(p_dados ->> 'nome'), '') = '' then raise exception 'Informe o nome fantasia.'; end if;

  select nome into v_outro from public.empresa
  where documento = v_doc and excluido_em is null and id is distinct from p_id limit 1;
  if found then
    raise exception 'Esse % já está no cadastro de %.', v_rotulo, v_outro;
  end if;

  if p_id is null then
    insert into public.empresa (tipos, tipo_pessoa, documento, razao_social, nome, inscricao_estadual, ativo,
      contato_nome, contato_cargo, email, celular, telefone, email_financeiro,
      cep, logradouro, numero, complemento, bairro, cidade, uf, observacoes)
    values (array['cliente'], v_tipo, v_doc, p_dados ->> 'razao_social', p_dados ->> 'nome',
      case when v_tipo = 'pj' then p_dados ->> 'inscricao_estadual' end, coalesce((p_dados ->> 'ativo')::boolean, true),
      p_dados ->> 'contato_nome', p_dados ->> 'contato_cargo', p_dados ->> 'email', p_dados ->> 'celular',
      p_dados ->> 'telefone', p_dados ->> 'email_financeiro',
      p_dados ->> 'cep', p_dados ->> 'logradouro', p_dados ->> 'numero', p_dados ->> 'complemento',
      p_dados ->> 'bairro', p_dados ->> 'cidade', p_dados ->> 'uf', nullif(btrim(p_dados ->> 'observacoes'), ''))
    returning id into v_id;
  else
    update public.empresa set
      tipos              = case when 'cliente' = any (tipos) then tipos else array_append(tipos, 'cliente') end,
      tipo_pessoa        = v_tipo,
      documento          = v_doc,
      razao_social       = p_dados ->> 'razao_social',
      nome               = p_dados ->> 'nome',
      inscricao_estadual = case when v_tipo = 'pj' then p_dados ->> 'inscricao_estadual' end,
      ativo              = coalesce((p_dados ->> 'ativo')::boolean, ativo),
      contato_nome       = p_dados ->> 'contato_nome',
      contato_cargo      = p_dados ->> 'contato_cargo',
      email              = p_dados ->> 'email',
      celular            = p_dados ->> 'celular',
      telefone           = p_dados ->> 'telefone',
      email_financeiro   = p_dados ->> 'email_financeiro',
      cep                = p_dados ->> 'cep',
      logradouro         = p_dados ->> 'logradouro',
      numero             = p_dados ->> 'numero',
      complemento        = p_dados ->> 'complemento',
      bairro             = p_dados ->> 'bairro',
      cidade             = p_dados ->> 'cidade',
      uf                 = p_dados ->> 'uf',
      observacoes        = nullif(btrim(p_dados ->> 'observacoes'), '')
    where id = p_id and excluido_em is null;
    if not found then raise exception 'Cliente não encontrado.'; end if;
  end if;

  perform public.registrar_log(case when p_id is null then 'cliente.criar' else 'cliente.editar' end, 'empresa', v_id::text,
    jsonb_build_object('nome', p_dados ->> 'nome', 'documento', v_doc, 'ativo', p_dados -> 'ativo'));
  return v_id;
end $$;
grant execute on function public.salvar_cliente(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------- eventos de cada cliente
-- Quem pode ver Clientes enxerga os eventos ligados, mesmo sem acesso ao módulo Eventos.
create or replace function public.eventos_do_cliente(p_cliente uuid default null)
returns table (cliente_id uuid, evento_id uuid, nome text, data_inicio date, local text)
language sql stable security definer set search_path = '' as $$
  select e.cliente_id, e.id, e.nome, e.data_inicio, e.local
  from public.evento e
  where public.pode('cadastros.clientes', 'ver')
    and e.cliente_id is not null and e.excluido_em is null
    and (p_cliente is null or e.cliente_id = p_cliente)
  order by e.data_inicio desc, e.nome;
$$;
grant execute on function public.eventos_do_cliente(uuid) to authenticated;
