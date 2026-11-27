-- Gilmar (27/11/2026): telas 1.3 Perfis, 1.4 Sub-Tipo e 1.5 Permissões.
-- Os 10 perfis do sistema continuam com regras próprias e não podem ser apagados.
-- O Admin pode criar perfis livres, que funcionam só pela matriz de permissões.
-- Permanente = está em todos os eventos; Eventual = é escalado por evento.

create table public.perfil (
  codigo         text primary key check (codigo ~ '^[a-z0-9_]{2,40}$'),
  nome           text not null check (length(trim(nome)) between 2 and 60),
  descricao      text not null default '',
  participacao   text not null default 'nao_se_aplica' check (participacao in ('permanente', 'eventual', 'nao_se_aplica')),
  sistema        boolean not null default false,
  ativo          boolean not null default true,
  ordem          int not null default 100,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create unique index perfil_nome_idx on public.perfil (lower(trim(nome)));
comment on table public.perfil is 'Perfis da Orizon (tela 1.3). sistema = um dos 10 perfis com regras no código; os demais são criados pelo Admin.';
create trigger perfil_atualizado_em before update on public.perfil
  for each row execute function public.tocar_atualizado_em();

insert into public.perfil (codigo, nome, descricao, participacao, sistema, ordem) values
  ('admin',        'Admin',          'Acesso total. Configura a plataforma.',            'permanente',    true, 1),
  ('diretor',      'Diretor(a)',     'Visão geral e aprovações de todos os eventos.',    'permanente',    true, 2),
  ('organizador',  'Organizador(a)', 'Monta e conduz os eventos.',                       'permanente',    true, 3),
  ('coordenador',  'Coordenador(a)', 'Coordena uma área do evento.',                     'permanente',    true, 4),
  ('terceiros',    'Auxiliares',     'Apoio fixo da Orizon nos eventos.',                'permanente',    true, 5),
  ('staff',        'Staff',          'Equipe contratada para o dia do evento.',          'eventual',      true, 6),
  ('arbitro',      'Árbitro(a)',     'Arbitragem e resultados da prova.',                'eventual',      true, 7),
  ('atleta',       'Atleta',         'Participa das provas. Entra pela planilha padrão.', 'nao_se_aplica', true, 8),
  ('patrocinador', 'Patrocinador',   'Acompanha as ações do seu patrocínio.',            'nao_se_aplica', true, 9),
  ('visitante',    'Visitante',      'Público. Cadastro pelo celular.',                  'nao_se_aplica', true, 10);

-- Perfil do sistema: não muda de código, não perde a marca de sistema e não é apagado.
create or replace function public.proteger_perfil_sistema()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.sistema then raise exception 'Perfil do sistema não pode ser excluído.'; end if;
    return old;
  end if;
  if old.sistema and (new.codigo <> old.codigo or not new.sistema) then
    raise exception 'Perfil do sistema não pode mudar de código.';
  end if;
  if old.codigo = 'admin' and not new.ativo then
    raise exception 'O perfil Admin não pode ser inativado.';
  end if;
  return new;
end $$;
create trigger perfil_protegido before update or delete on public.perfil
  for each row execute function public.proteger_perfil_sistema();

-- As colunas de perfil passam a apontar para a tabela (antes eram uma lista fixa).
alter table public.usuario_perfil alter column perfil type text using perfil::text;
alter table public.permissao      alter column perfil type text using perfil::text;
alter table public.subtipo        alter column perfil type text using perfil::text;
alter table public.papel_evento   alter column perfil type text using perfil::text;
alter table public.usuario_perfil add constraint usuario_perfil_perfil_fk foreign key (perfil) references public.perfil (codigo);
alter table public.permissao      add constraint permissao_perfil_fk      foreign key (perfil) references public.perfil (codigo) on delete cascade;
alter table public.subtipo        add constraint subtipo_perfil_fk        foreign key (perfil) references public.perfil (codigo);
alter table public.papel_evento   add constraint papel_evento_perfil_fk   foreign key (perfil) references public.perfil (codigo);

drop function public.tem_perfil(public.perfil_tipo);
create or replace function public.tem_perfil(p text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.usuario_perfil up
    join public.usuario u on u.id = up.usuario_id
    where up.usuario_id = auth.uid() and up.perfil = p and u.ativo and u.excluido_em is null
  );
$$;

alter table public.perfil enable row level security;
create policy perfil_ler on public.perfil for select to authenticated using (true);
create policy perfil_gerir on public.perfil for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

-- Sub-tipo: nome único por perfil sem diferença de maiúsculas.
alter table public.subtipo drop constraint if exists subtipo_perfil_nome_key;
create unique index if not exists subtipo_perfil_nome_idx on public.subtipo (perfil, lower(trim(nome)));

grant select, insert, update, delete on public.perfil to authenticated;
grant execute on function public.tem_perfil(text) to authenticated;

-- Tela 1.5: grava a matriz de um perfil de uma vez só (tudo ou nada) e registra na auditoria.
-- O módulo Plataforma é exclusivo do Admin e não entra na matriz.
create or replace function public.salvar_permissoes(p_perfil text, p_itens text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.eh_admin() then raise exception 'Somente o Admin altera permissões.'; end if;
  if p_perfil = 'admin' then raise exception 'O Admin sempre tem acesso total.'; end if;
  if not exists (select 1 from public.perfil where codigo = p_perfil) then raise exception 'Perfil não encontrado.'; end if;

  delete from public.permissao pe
  using public.funcionalidade f
  where pe.perfil = p_perfil and f.codigo = pe.funcionalidade and f.modulo <> 'Plataforma';

  insert into public.permissao (perfil, funcionalidade, acao)
  select p_perfil, f.codigo, split_part(i, ':', 2)::public.acao_tipo
  from unnest(coalesce(p_itens, '{}')) i
  join public.funcionalidade f on f.codigo = split_part(i, ':', 1) and f.modulo <> 'Plataforma'
  where split_part(i, ':', 2) in ('ver', 'criar', 'editar', 'aprovar')
  on conflict do nothing;

  perform public.registrar_log('permissoes.salvar', 'perfil', p_perfil, jsonb_build_object('itens', to_jsonb(coalesce(p_itens, '{}'))));
end $$;
grant execute on function public.salvar_permissoes(text, text[]) to authenticated;
grant execute on function public.registrar_log(text, text, text, jsonb) to authenticated;
