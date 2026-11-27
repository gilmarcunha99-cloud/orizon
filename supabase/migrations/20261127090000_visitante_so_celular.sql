-- Regra de 27/11/2026 (Gilmar): o Visitante só entra pelo cadastro no celular (autocadastro).
-- Não é cadastrado pela web (2.1) nem pela importação de planilha (3.3, quando for construída: ela cria só Atleta).
-- Quem já é Visitante continua podendo ter a ficha corrigida.

create or replace function public.salvar_usuario(p_id uuid, p_dados jsonb, p_novo boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_perfil   text := nullif(p_dados ->> 'perfil', '');
  v_subtipo  uuid := nullif(p_dados ->> 'subtipo_id', '')::uuid;
  v_atual    text;
  v_ficha    jsonb := p_dados -> 'ficha';
begin
  if not public.pode('cadastros.usuarios', case when p_novo then 'criar' else 'editar' end::public.acao_tipo) then
    raise exception 'Sem permissão para salvar usuários.';
  end if;
  if v_perfil is null then raise exception 'Escolha o perfil.'; end if;
  select perfil into v_atual from public.usuario_perfil where usuario_id = p_id;
  if v_perfil = 'atleta' and (p_novo or v_atual is distinct from 'atleta') then
    raise exception 'O perfil Atleta só entra pelo cadastro no celular ou pela planilha em 3.3 Inscrições.';
  end if;
  if v_perfil = 'visitante' and (p_novo or v_atual is distinct from 'visitante') then
    raise exception 'O perfil Visitante só entra pelo cadastro no celular.';
  end if;
  if (v_perfil = 'admin' or v_atual = 'admin') and v_perfil is distinct from v_atual and not public.eh_admin() then
    raise exception 'Somente o Admin pode dar ou tirar o perfil Admin.';
  end if;
  if p_id = auth.uid() and v_atual = 'admin' and v_perfil <> 'admin' then
    raise exception 'Você não pode tirar o seu próprio perfil Admin.';
  end if;
  if p_id = auth.uid() and coalesce((p_dados ->> 'ativo')::boolean, true) = false then
    raise exception 'Você não pode inativar o seu próprio usuário.';
  end if;
  if v_subtipo is not null and not exists (select 1 from public.subtipo where id = v_subtipo and perfil = v_perfil) then
    raise exception 'O sub-tipo não pertence a esse perfil.';
  end if;

  update public.usuario set
    nome            = coalesce(p_dados ->> 'nome', nome),
    cpf             = nullif(p_dados ->> 'cpf', ''),
    celular         = nullif(p_dados ->> 'celular', ''),
    data_nascimento = nullif(p_dados ->> 'data_nascimento', '')::date,
    genero          = nullif(p_dados ->> 'genero', ''),
    ativo           = coalesce((p_dados ->> 'ativo')::boolean, ativo)
  where id = p_id;
  if not found then raise exception 'Usuário não encontrado.'; end if;

  delete from public.usuario_perfil where usuario_id = p_id and perfil <> v_perfil;
  insert into public.usuario_perfil (usuario_id, perfil, subtipo_id) values (p_id, v_perfil, v_subtipo)
  on conflict (usuario_id) do update set perfil = excluded.perfil, subtipo_id = excluded.subtipo_id;

  if v_ficha is not null and jsonb_typeof(v_ficha) = 'object' then
    insert into public.ficha_atleta as f (usuario_id, cidade, uf, camiseta, grupo, emergencia_nome, emergencia_celular,
      tipo_sanguineo, saude_obs, responsavel_nome, responsavel_cpf, responsavel_celular)
    values (p_id, nullif(v_ficha ->> 'cidade', ''), nullif(v_ficha ->> 'uf', ''), nullif(v_ficha ->> 'camiseta', ''),
      nullif(v_ficha ->> 'grupo', ''), nullif(v_ficha ->> 'emergencia_nome', ''), nullif(v_ficha ->> 'emergencia_celular', ''),
      nullif(v_ficha ->> 'tipo_sanguineo', ''), nullif(v_ficha ->> 'saude_obs', ''), nullif(v_ficha ->> 'responsavel_nome', ''),
      nullif(v_ficha ->> 'responsavel_cpf', ''), nullif(v_ficha ->> 'responsavel_celular', ''))
    on conflict (usuario_id) do update set
      cidade = excluded.cidade, uf = excluded.uf, camiseta = excluded.camiseta, grupo = excluded.grupo,
      emergencia_nome = excluded.emergencia_nome, emergencia_celular = excluded.emergencia_celular,
      tipo_sanguineo = excluded.tipo_sanguineo, saude_obs = excluded.saude_obs,
      responsavel_nome = excluded.responsavel_nome, responsavel_cpf = excluded.responsavel_cpf,
      responsavel_celular = excluded.responsavel_celular;
  end if;

  perform public.registrar_log(case when p_novo then 'usuario.criar' else 'usuario.editar' end, 'usuario', p_id::text,
    jsonb_build_object('nome', p_dados ->> 'nome', 'perfil', v_perfil, 'subtipo_id', v_subtipo,
      'ativo', p_dados -> 'ativo', 'ficha_atleta', v_ficha is not null));
end $$;
