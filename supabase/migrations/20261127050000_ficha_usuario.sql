-- Tela 2.1 Usuários: cadastro e edição (prévia A aprovada em 27/11/2026).
-- Regras: um cadastro por pessoa (CPF), UM perfil por pessoa, ficha do atleta preenchida uma vez.
-- Ser atleta num evento é ter uma inscrição (papel_evento); a importação fica em 3.3 Inscrições.

-- ---------------------------------------------------------------- um perfil por pessoa
-- Se alguém tiver mais de um, fica o de maior hierarquia (menor "ordem" na tabela perfil).
delete from public.usuario_perfil up
using public.usuario_perfil outro, public.perfil p1, public.perfil p2
where up.usuario_id = outro.usuario_id
  and up.id <> outro.id
  and p1.codigo = up.perfil and p2.codigo = outro.perfil
  and (p1.ordem, up.perfil) > (p2.ordem, outro.perfil);

create unique index if not exists usuario_perfil_um_por_pessoa on public.usuario_perfil (usuario_id);
comment on table public.usuario_perfil is 'Perfil da pessoa na Orizon: um só por pessoa (regra de 27/11/2026).';

-- ---------------------------------------------------------------- ficha do atleta
create table public.ficha_atleta (
  usuario_id           uuid primary key references public.usuario (id) on delete cascade,
  cidade               text,
  uf                   char(2),
  camiseta             text check (camiseta in ('PP','P','M','G','GG','XG')),
  grupo                text,
  emergencia_nome      text,
  emergencia_celular   text,
  tipo_sanguineo       text check (tipo_sanguineo in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  saude_obs            text,
  responsavel_nome     text,
  responsavel_cpf      text check (responsavel_cpf is null or responsavel_cpf ~ '^\d{11}$'),
  responsavel_celular  text,
  atualizado_em        timestamptz not null default now()
);
comment on table public.ficha_atleta is 'Dados de atleta, preenchidos uma vez e usados em todas as inscrições (tela 2.1).';
create trigger ficha_atleta_atualizado_em before update on public.ficha_atleta
  for each row execute function public.tocar_atualizado_em();

alter table public.ficha_atleta enable row level security;
create policy ficha_atleta_ler on public.ficha_atleta for select to authenticated
  using (usuario_id = auth.uid() or public.pode('cadastros.usuarios', 'ver'));
create policy ficha_atleta_proprio on public.ficha_atleta for all to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
grant select, insert, update, delete on public.ficha_atleta to authenticated;

-- A gestão do perfil da pessoa passa a ser da tela de Usuários (antes dependia de Perfis).
drop policy if exists usuario_perfil_gerir on public.usuario_perfil;

-- ---------------------------------------------------------------- salvar usuário
-- Grava dados pessoais, perfil + sub-tipo e ficha do atleta numa transação só.
-- Quem não é Admin não dá nem tira o perfil Admin.
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
grant execute on function public.salvar_usuario(uuid, jsonb, boolean) to authenticated;
