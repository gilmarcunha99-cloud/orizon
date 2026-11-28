-- Tela 2.4 Patrocinadores (prévia aprovada por Gilmar em 28/11/2026).
-- Patrocinador = empresa ou pessoa que patrocina eventos (cota e marca) e/ou expõe com estande (Expositores saiu do menu).
-- Mesma tabela empresa e mesmo cadastro único por CNPJ/CPF (papel 'patrocinador').
-- Campos próprios: participação (patrocinador e/ou expositor), ramo de atividade (texto livre), descrição comercial.
-- Cota, valor e contrapartidas de cada evento ficam no evento (módulo Eventos). Sem logo (decisão de 28/11).
-- O convite por e-mail ao contato principal (perfil Patrocinador) e a equipe dele (perfil Staff por evento)
-- dependem do envio de e-mails e do módulo Eventos; a ficha já mostra o lugar deles.

-- ---------------------------------------------------------------- campos novos
alter table public.empresa
  add column if not exists participacao        text[] not null default '{}'
    check (participacao <@ array['patrocinador','expositor']::text[]),
  add column if not exists ramo                text,
  add column if not exists descricao_comercial text;

comment on column public.empresa.participacao is 'Patrocinador: como participa dos eventos (patrocinador = cota e marca; expositor = estande).';
comment on column public.empresa.ramo is 'Patrocinador: ramo de atividade (texto livre, CAIXA ALTA).';

-- Quem era só 'expositor' passa a ser patrocinador com participação expositor.
update public.empresa set
  tipos = array_append(array_remove(tipos, 'expositor'), 'patrocinador'),
  participacao = case when 'expositor' = any (participacao) then participacao else array_append(participacao, 'expositor') end
where 'expositor' = any (tipos) and not ('patrocinador' = any (tipos));

-- ---------------------------------------------------------------- padronização (inclui os campos novos)
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
  new.descricao_servicos := nullif(upper(btrim(new.descricao_servicos)), '');
  new.banco              := nullif(upper(btrim(new.banco)), '');
  new.titular_nome       := nullif(upper(btrim(regexp_replace(coalesce(new.titular_nome, ''), '\s+', ' ', 'g'))), '');
  new.agencia            := nullif(upper(btrim(new.agencia)), '');
  new.conta              := nullif(upper(btrim(new.conta)), '');
  new.site               := nullif(btrim(new.site), '');
  new.ramo               := nullif(upper(btrim(regexp_replace(coalesce(new.ramo, ''), '\s+', ' ', 'g'))), '');
  new.descricao_comercial := nullif(upper(btrim(new.descricao_comercial)), '');
  new.email              := nullif(lower(btrim(new.email)), '');
  new.email_financeiro   := nullif(lower(btrim(new.email_financeiro)), '');
  new.documento          := nullif(regexp_replace(coalesce(new.documento, ''), '\D', '', 'g'), '');
  new.celular            := nullif(regexp_replace(coalesce(new.celular, ''), '\D', '', 'g'), '');
  new.telefone           := nullif(regexp_replace(coalesce(new.telefone, ''), '\D', '', 'g'), '');
  new.cep                := nullif(regexp_replace(coalesce(new.cep, ''), '\D', '', 'g'), '');
  new.pix_chave          := case
                              when new.pix_tipo in ('cnpj','cpf','celular') then nullif(regexp_replace(coalesce(new.pix_chave, ''), '\D', '', 'g'), '')
                              when new.pix_tipo = 'email' then nullif(lower(btrim(new.pix_chave)), '')
                              else nullif(btrim(new.pix_chave), '') end;
  return new;
end $$;

-- ---------------------------------------------------------------- leitura por papel (Patrocinadores com permissão própria)
drop policy if exists empresa_ler on public.empresa;
create policy empresa_ler on public.empresa for select to authenticated using (
  ('cliente' = any (tipos) and public.pode('cadastros.clientes', 'ver'))
  or ('fornecedor' = any (tipos) and public.pode('cadastros.fornecedores', 'ver'))
  or (tipos && array['patrocinador','expositor']::text[] and public.pode('cadastros.patrocinadores', 'ver'))
  or ('grupo' = any (tipos) and public.pode('cadastros.clientes', 'ver'))
);

-- ---------------------------------------------------------------- salvar empresa (agora também patrocinador)
create or replace function public.salvar_empresa(p_tipo text, p_id uuid, p_dados jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_func   text := case p_tipo when 'cliente' then 'cadastros.clientes' when 'fornecedor' then 'cadastros.fornecedores' when 'patrocinador' then 'cadastros.patrocinadores' end;
  v_id     uuid := p_id;
  v_doc    text := nullif(regexp_replace(coalesce(p_dados ->> 'documento', ''), '\D', '', 'g'), '');
  v_tipo   text := coalesce(nullif(p_dados ->> 'tipo_pessoa', ''), 'pj');
  v_ativo  boolean := coalesce((p_dados ->> 'ativo')::boolean, true);
  v_rotulo text;
  v_tam    int;
  v_outro  record;
  v_novo   boolean := p_id is null;
  v_unico  boolean := false;
begin
  if v_func is null then raise exception 'Papel de empresa inválido.'; end if;
  if not public.pode(v_func, case when p_id is null then 'criar' else 'editar' end::public.acao_tipo) then
    raise exception 'Sem permissão para salvar %.', case p_tipo when 'cliente' then 'clientes' when 'fornecedor' then 'fornecedores' else 'patrocinadores' end;
  end if;
  if v_tipo not in ('pj','pf') then raise exception 'Escolha o tipo de pessoa.'; end if;
  v_rotulo := case v_tipo when 'pj' then 'CNPJ' else 'CPF' end;
  v_tam    := case v_tipo when 'pj' then 14 else 11 end;
  if v_doc is null or length(v_doc) <> v_tam then
    raise exception 'Informe o % completo.', v_rotulo;
  end if;
  if coalesce(btrim(p_dados ->> 'nome'), '') = '' then raise exception 'Informe o nome fantasia.'; end if;

  select id, nome, tipos into v_outro from public.empresa
  where documento = v_doc and excluido_em is null and id is distinct from p_id limit 1;
  if found then
    if p_tipo = any (v_outro.tipos) or p_id is not null then
      raise exception 'Esse % já está no cadastro de %.', v_rotulo, v_outro.nome;
    end if;
    v_id := v_outro.id;
    v_unico := true;  -- cadastro único: a empresa já existe em outro papel
  end if;

  if v_id is null then
    insert into public.empresa (tipos, tipo_pessoa, documento, inscricao_estadual, tipos_inativos,
      razao_social, nome, contato_nome, contato_cargo, email, celular, telefone, email_financeiro, cep, logradouro, numero, complemento, bairro, cidade, uf, observacoes, descricao_servicos, site, pix_tipo, pix_chave, banco, agencia, conta, conta_tipo, titular_nome, categorias, meios_pagamento, participacao, ramo, descricao_comercial)
    values (array[p_tipo], v_tipo, v_doc, case when v_tipo = 'pj' then nullif(btrim(p_dados ->> 'inscricao_estadual'), '') end,
      case when v_ativo then '{}'::text[] else array[p_tipo] end,
      nullif(btrim(p_dados ->> 'razao_social'), ''),
      nullif(btrim(p_dados ->> 'nome'), ''),
      nullif(btrim(p_dados ->> 'contato_nome'), ''),
      nullif(btrim(p_dados ->> 'contato_cargo'), ''),
      nullif(btrim(p_dados ->> 'email'), ''),
      nullif(btrim(p_dados ->> 'celular'), ''),
      nullif(btrim(p_dados ->> 'telefone'), ''),
      nullif(btrim(p_dados ->> 'email_financeiro'), ''),
      nullif(btrim(p_dados ->> 'cep'), ''),
      nullif(btrim(p_dados ->> 'logradouro'), ''),
      nullif(btrim(p_dados ->> 'numero'), ''),
      nullif(btrim(p_dados ->> 'complemento'), ''),
      nullif(btrim(p_dados ->> 'bairro'), ''),
      nullif(btrim(p_dados ->> 'cidade'), ''),
      nullif(btrim(p_dados ->> 'uf'), ''),
      nullif(btrim(p_dados ->> 'observacoes'), ''),
      nullif(btrim(p_dados ->> 'descricao_servicos'), ''),
      nullif(btrim(p_dados ->> 'site'), ''),
      nullif(btrim(p_dados ->> 'pix_tipo'), ''),
      nullif(btrim(p_dados ->> 'pix_chave'), ''),
      nullif(btrim(p_dados ->> 'banco'), ''),
      nullif(btrim(p_dados ->> 'agencia'), ''),
      nullif(btrim(p_dados ->> 'conta'), ''),
      nullif(btrim(p_dados ->> 'conta_tipo'), ''),
      nullif(btrim(p_dados ->> 'titular_nome'), ''),
      coalesce(array(select jsonb_array_elements_text(p_dados -> 'categorias')), '{}'),
      coalesce(array(select jsonb_array_elements_text(p_dados -> 'meios_pagamento')), '{}'),
      coalesce(array(select jsonb_array_elements_text(p_dados -> 'participacao')), '{}'),
      nullif(btrim(p_dados ->> 'ramo'), ''),
      nullif(btrim(p_dados ->> 'descricao_comercial'), ''))
    returning id into v_id;
  else
    update public.empresa set
      tipos               = case when p_tipo = any (tipos) then tipos else array_append(tipos, p_tipo) end,
      tipos_inativos      = case when v_ativo then array_remove(tipos_inativos, p_tipo)
                                 when p_tipo = any (tipos_inativos) then tipos_inativos
                                 else array_append(tipos_inativos, p_tipo) end,
      tipo_pessoa         = v_tipo,
      documento           = v_doc,
      inscricao_estadual  = case when v_tipo <> 'pj' then null
                                 when p_dados ? 'inscricao_estadual' then nullif(btrim(p_dados ->> 'inscricao_estadual'), '')
                                 else inscricao_estadual end,
      razao_social        = case when p_dados ? 'razao_social' then nullif(btrim(p_dados ->> 'razao_social'), '') else razao_social end,
      nome                = case when p_dados ? 'nome' then nullif(btrim(p_dados ->> 'nome'), '') else nome end,
      contato_nome        = case when p_dados ? 'contato_nome' then nullif(btrim(p_dados ->> 'contato_nome'), '') else contato_nome end,
      contato_cargo       = case when p_dados ? 'contato_cargo' then nullif(btrim(p_dados ->> 'contato_cargo'), '') else contato_cargo end,
      email               = case when p_dados ? 'email' then nullif(btrim(p_dados ->> 'email'), '') else email end,
      celular             = case when p_dados ? 'celular' then nullif(btrim(p_dados ->> 'celular'), '') else celular end,
      telefone            = case when p_dados ? 'telefone' then nullif(btrim(p_dados ->> 'telefone'), '') else telefone end,
      email_financeiro    = case when p_dados ? 'email_financeiro' then nullif(btrim(p_dados ->> 'email_financeiro'), '') else email_financeiro end,
      cep                 = case when p_dados ? 'cep' then nullif(btrim(p_dados ->> 'cep'), '') else cep end,
      logradouro          = case when p_dados ? 'logradouro' then nullif(btrim(p_dados ->> 'logradouro'), '') else logradouro end,
      numero              = case when p_dados ? 'numero' then nullif(btrim(p_dados ->> 'numero'), '') else numero end,
      complemento         = case when p_dados ? 'complemento' then nullif(btrim(p_dados ->> 'complemento'), '') else complemento end,
      bairro              = case when p_dados ? 'bairro' then nullif(btrim(p_dados ->> 'bairro'), '') else bairro end,
      cidade              = case when p_dados ? 'cidade' then nullif(btrim(p_dados ->> 'cidade'), '') else cidade end,
      uf                  = case when p_dados ? 'uf' then nullif(btrim(p_dados ->> 'uf'), '') else uf end,
      observacoes         = case when p_dados ? 'observacoes' then nullif(btrim(p_dados ->> 'observacoes'), '') else observacoes end,
      descricao_servicos  = case when p_dados ? 'descricao_servicos' then nullif(btrim(p_dados ->> 'descricao_servicos'), '') else descricao_servicos end,
      site                = case when p_dados ? 'site' then nullif(btrim(p_dados ->> 'site'), '') else site end,
      pix_tipo            = case when p_dados ? 'pix_tipo' then nullif(btrim(p_dados ->> 'pix_tipo'), '') else pix_tipo end,
      pix_chave           = case when p_dados ? 'pix_chave' then nullif(btrim(p_dados ->> 'pix_chave'), '') else pix_chave end,
      banco               = case when p_dados ? 'banco' then nullif(btrim(p_dados ->> 'banco'), '') else banco end,
      agencia             = case when p_dados ? 'agencia' then nullif(btrim(p_dados ->> 'agencia'), '') else agencia end,
      conta               = case when p_dados ? 'conta' then nullif(btrim(p_dados ->> 'conta'), '') else conta end,
      conta_tipo          = case when p_dados ? 'conta_tipo' then nullif(btrim(p_dados ->> 'conta_tipo'), '') else conta_tipo end,
      titular_nome        = case when p_dados ? 'titular_nome' then nullif(btrim(p_dados ->> 'titular_nome'), '') else titular_nome end,
      categorias          = case when p_dados ? 'categorias' then array(select jsonb_array_elements_text(p_dados -> 'categorias')) else categorias end,
      meios_pagamento     = case when p_dados ? 'meios_pagamento' then array(select jsonb_array_elements_text(p_dados -> 'meios_pagamento')) else meios_pagamento end,
      participacao        = case when p_dados ? 'participacao' then array(select jsonb_array_elements_text(p_dados -> 'participacao')) else participacao end,
      ramo                = case when p_dados ? 'ramo' then nullif(btrim(p_dados ->> 'ramo'), '') else ramo end,
      descricao_comercial = case when p_dados ? 'descricao_comercial' then nullif(btrim(p_dados ->> 'descricao_comercial'), '') else descricao_comercial end
    where id = v_id and excluido_em is null;
    if not found then raise exception 'Cadastro não encontrado.'; end if;
  end if;

  perform public.registrar_log(p_tipo || case when v_novo then '.criar' else '.editar' end, 'empresa', v_id::text,
    jsonb_build_object('nome', p_dados ->> 'nome', 'documento', v_doc, 'ativo', v_ativo,
      'cadastro_unico', v_unico));
  return v_id;
end $$;
grant execute on function public.salvar_empresa(text, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------- salvar patrocinador
-- Confere os campos do papel e grava pela regra comum (cadastro único, situação por papel, auditoria).
create or replace function public.salvar_patrocinador(p_id uuid, p_dados jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if jsonb_array_length(coalesce(p_dados -> 'participacao', '[]'::jsonb)) = 0 then
    raise exception 'Marque como participa dos eventos: patrocinador, expositor ou os dois.';
  end if;
  if coalesce(btrim(p_dados ->> 'ramo'), '') = '' then raise exception 'Informe o ramo de atividade.'; end if;
  return public.salvar_empresa('patrocinador', p_id, p_dados);
end $$;
grant execute on function public.salvar_patrocinador(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------- achar empresa pelo CNPJ/CPF (inclui patrocinador)
create or replace function public.empresa_por_documento(p_tipo text, p_doc text)
returns setof public.empresa language sql stable security definer set search_path = '' as $$
  select e.* from public.empresa e
  where e.documento = nullif(regexp_replace(coalesce(p_doc, ''), '\D', '', 'g'), '')
    and e.excluido_em is null
    and public.pode(case p_tipo when 'cliente' then 'cadastros.clientes' when 'fornecedor' then 'cadastros.fornecedores' when 'patrocinador' then 'cadastros.patrocinadores' end, 'criar')
  limit 1;
$$;
grant execute on function public.empresa_por_documento(text, text) to authenticated;
