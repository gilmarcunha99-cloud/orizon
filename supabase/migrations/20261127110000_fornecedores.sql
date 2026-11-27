-- Tela 2.3 Fornecedores (prévia aprovada por Gilmar em 27/11/2026) + cadastro único de empresas.
-- Regras: uma empresa por CNPJ/CPF; a mesma empresa pode ser Cliente e Fornecedor (aparece nas duas telas).
-- A situação (ativo/inativo) é por papel: inativar como fornecedor não inativa como cliente.
-- Fornecedor: categorias (várias), descrição, site/Instagram, meios de pagamento aceitos (lista fixa, sem "Outros")
-- e dados para pagamento (PIX e conta), todos opcionais. O meio de cada pagamento é escolhido em Contas a Pagar.

-- ---------------------------------------------------------------- campos novos
alter table public.empresa
  add column if not exists categorias          text[] not null default '{}'
    check (categorias <@ array['som_iluminacao','estrutura_tendas','cronometragem','hidratacao_alimentacao','saude_ambulancia','seguranca','limpeza','foto_video','grafica_brindes','medalhas_trofeus','camisetas_kits','transporte','outros']::text[]),
  add column if not exists descricao_servicos  text,
  add column if not exists site                text,
  add column if not exists meios_pagamento     text[] not null default '{}'
    check (meios_pagamento <@ array['pix','boleto','transferencia','dinheiro','cartao_credito','cartao_debito','cheque','permuta']::text[]),
  add column if not exists pix_tipo            text check (pix_tipo in ('cnpj','cpf','email','celular','aleatoria')),
  add column if not exists pix_chave           text,
  add column if not exists banco               text,
  add column if not exists agencia             text,
  add column if not exists conta               text,
  add column if not exists conta_tipo          text check (conta_tipo in ('corrente','poupanca','pagamento')),
  add column if not exists titular_nome        text,
  add column if not exists tipos_inativos      text[] not null default '{}';

comment on column public.empresa.tipos_inativos is 'Papéis em que a empresa está inativa (ex.: inativa como fornecedor, ativa como cliente).';
comment on column public.empresa.ativo is 'Não usado pelas telas 2.2/2.3: a situação é por papel (tipos_inativos).';

-- A situação dos clientes que já existem passa para o papel Cliente.
update public.empresa set tipos_inativos = array['cliente'], ativo = true where not ativo and 'cliente' = any (tipos);

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

-- ---------------------------------------------------------------- leitura por papel
-- Cada tela enxerga as empresas do seu papel (antes tudo dependia da permissão de Clientes).
drop policy if exists empresa_ler on public.empresa;
create policy empresa_ler on public.empresa for select to authenticated using (
  ('cliente' = any (tipos) and public.pode('cadastros.clientes', 'ver'))
  or ('fornecedor' = any (tipos) and public.pode('cadastros.fornecedores', 'ver'))
  or (tipos && array['patrocinador','grupo','expositor']::text[] and public.pode('cadastros.clientes', 'ver'))
);

-- ---------------------------------------------------------------- salvar empresa (qualquer papel)
-- p_tipo = 'cliente' ou 'fornecedor'. Só grava os campos enviados: salvar pela tela de Clientes não apaga
-- os dados de fornecedor, e vice-versa. Se o CNPJ/CPF já existe em outro papel, a empresa ganha o novo papel
-- (cadastro único). Se já existe no mesmo papel, avisa. Registra na auditoria. Retorna o id.
create or replace function public.salvar_empresa(p_tipo text, p_id uuid, p_dados jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_func   text := case p_tipo when 'cliente' then 'cadastros.clientes' when 'fornecedor' then 'cadastros.fornecedores' end;
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
    raise exception 'Sem permissão para salvar %.', case p_tipo when 'cliente' then 'clientes' else 'fornecedores' end;
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
      razao_social, nome, contato_nome, contato_cargo, email, celular, telefone, email_financeiro, cep, logradouro, numero, complemento, bairro, cidade, uf, observacoes, descricao_servicos, site, pix_tipo, pix_chave, banco, agencia, conta, conta_tipo, titular_nome, categorias, meios_pagamento)
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
      coalesce(array(select jsonb_array_elements_text(p_dados -> 'meios_pagamento')), '{}'))
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
      meios_pagamento     = case when p_dados ? 'meios_pagamento' then array(select jsonb_array_elements_text(p_dados -> 'meios_pagamento')) else meios_pagamento end
    where id = v_id and excluido_em is null;
    if not found then raise exception 'Cadastro não encontrado.'; end if;
  end if;

  perform public.registrar_log(p_tipo || case when v_novo then '.criar' else '.editar' end, 'empresa', v_id::text,
    jsonb_build_object('nome', p_dados ->> 'nome', 'documento', v_doc, 'ativo', v_ativo,
      'cadastro_unico', v_unico));
  return v_id;
end $$;
grant execute on function public.salvar_empresa(text, uuid, jsonb) to authenticated;

-- A tela de Clientes continua chamando salvar_cliente, que agora usa a mesma regra.
create or replace function public.salvar_cliente(p_id uuid, p_dados jsonb)
returns uuid language sql security definer set search_path = '' as $$
  select public.salvar_empresa('cliente', p_id, p_dados);
$$;

-- ---------------------------------------------------------------- achar empresa pelo CNPJ/CPF
-- Usada na tela de cadastro: se o documento já existe em outro papel, a tela carrega os dados para aproveitar.
-- Só responde para quem pode criar no papel pedido.
create or replace function public.empresa_por_documento(p_tipo text, p_doc text)
returns setof public.empresa language sql stable security definer set search_path = '' as $$
  select e.* from public.empresa e
  where e.documento = nullif(regexp_replace(coalesce(p_doc, ''), '\D', '', 'g'), '')
    and e.excluido_em is null
    and public.pode(case p_tipo when 'cliente' then 'cadastros.clientes' when 'fornecedor' then 'cadastros.fornecedores' end, 'criar')
  limit 1;
$$;
grant execute on function public.empresa_por_documento(text, text) to authenticated;
