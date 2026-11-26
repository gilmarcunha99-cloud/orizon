-- Orizon Pass — Fase 1: base de acesso
-- Usuários, perfis, subtipos, permissões, papéis no evento, consentimento (LGPD) e log de auditoria.
-- Regras gerais: chaves UUID, datas em UTC (timestamptz), exclusão lógica (excluido_em).
-- Todos os usuários são da Orizon; Cliente é um cadastro ligado ao evento, sem usuários próprios.

-- ---------------------------------------------------------------- tipos
create type public.perfil_tipo as enum (
  'admin', 'diretor', 'organizador', 'coordenador', 'terceiros',
  'staff', 'atleta', 'visitante', 'patrocinador', 'arbitro'
);

create type public.acao_tipo as enum ('ver', 'criar', 'editar', 'aprovar');

-- ---------------------------------------------------------------- utilitários
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

-- ---------------------------------------------------------------- cadastros de acesso
create table public.subtipo (
  id         uuid primary key default gen_random_uuid(),
  perfil     public.perfil_tipo not null,
  nome       text not null,
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now(),
  unique (perfil, nome)
);
comment on table public.subtipo is 'Detalhe do perfil (ex.: Coordenador de Marketing). Tela 2.2.';

create table public.usuario (
  id              uuid primary key references auth.users (id) on delete cascade,
  nome            text not null default '',
  email           text not null,
  cpf             text unique check (cpf is null or cpf ~ '^\d{11}$'),
  celular         text,
  data_nascimento date,
  genero          text,
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  excluido_em     timestamptz
);
comment on table public.usuario is 'Pessoa com login. Espelha auth.users com os dados de cadastro. Tela 2.3.';
create index usuario_email_idx on public.usuario (lower(email));
create trigger usuario_atualizado_em before update on public.usuario
  for each row execute function public.tocar_atualizado_em();

create table public.usuario_perfil (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.usuario (id) on delete cascade,
  perfil      public.perfil_tipo not null,
  subtipo_id  uuid references public.subtipo (id),
  criado_em   timestamptz not null default now(),
  unique (usuario_id, perfil)
);
comment on table public.usuario_perfil is 'Perfil geral da pessoa na Orizon. Uma pessoa pode ter mais de um.';

-- ---------------------------------------------------------------- permissões (tela 1.3)
create table public.funcionalidade (
  codigo  text primary key,
  modulo  text not null,
  nome    text not null,
  ordem   int  not null default 0
);

create table public.permissao (
  perfil          public.perfil_tipo not null,
  funcionalidade  text not null references public.funcionalidade (codigo) on delete cascade,
  acao            public.acao_tipo not null,
  primary key (perfil, funcionalidade, acao)
);
comment on table public.permissao is 'Matriz perfil × funcionalidade × ação, editada pelo Admin.';

-- ---------------------------------------------------------------- empresas e eventos (mínimo para a Fase 1)
create table public.empresa (
  id             uuid primary key default gen_random_uuid(),
  tipos          text[] not null check (tipos <@ array['cliente','fornecedor','patrocinador','expositor','grupo']::text[] and cardinality(tipos) > 0),
  nome           text not null,
  documento      text,
  email          text,
  telefone       text,
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  excluido_em    timestamptz
);
comment on table public.empresa is 'Clientes, fornecedores, patrocinadores, expositores e grupos/assessorias (telas 2.4 a 2.8).';
create trigger empresa_atualizado_em before update on public.empresa
  for each row execute function public.tocar_atualizado_em();

create table public.evento (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,
  cliente_id     uuid references public.empresa (id),
  data_inicio    date not null,
  data_fim       date,
  local          text,
  status         text not null default 'rascunho' check (status in ('rascunho','inscricoes_abertas','encerrado','cancelado')),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  excluido_em    timestamptz
);
comment on table public.evento is 'Cadastro mínimo de evento. A tela completa de Criação (3.1) vem na Fase 2.';
create trigger evento_atualizado_em before update on public.evento
  for each row execute function public.tocar_atualizado_em();

create table public.papel_evento (
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid not null references public.evento (id) on delete cascade,
  usuario_id  uuid not null references public.usuario (id) on delete cascade,
  perfil      public.perfil_tipo not null,
  subtipo_id  uuid references public.subtipo (id),
  origem      text not null default 'manual' check (origem in ('manual','importacao','inscricao')),
  criado_em   timestamptz not null default now(),
  unique (evento_id, usuario_id, perfil)
);
comment on table public.papel_evento is 'O que a pessoa faz em cada evento (ex.: Staff na Corrida X, Atleta na Corrida Y).';

create table public.importacao (
  id            uuid primary key default gen_random_uuid(),
  evento_id     uuid not null references public.evento (id),
  arquivo_nome  text not null,
  status        text not null default 'processando' check (status in ('processando','concluida','com_erros','falhou')),
  total_linhas  int not null default 0,
  linhas_ok     int not null default 0,
  linhas_erro   int not null default 0,
  erros         jsonb not null default '[]'::jsonb,
  criado_por    uuid references public.usuario (id),
  criado_em     timestamptz not null default now()
);
comment on table public.importacao is 'Histórico das importações da planilha padrão de atletas, com erros por linha.';

-- ---------------------------------------------------------------- LGPD
create table public.termo_versao (
  id            uuid primary key default gen_random_uuid(),
  tipo          text not null check (tipo in ('termos_uso','politica_privacidade')),
  versao        text not null,
  url           text,
  publicado_em  timestamptz not null default now(),
  unique (tipo, versao)
);

create table public.consentimento (
  id               uuid primary key default gen_random_uuid(),
  usuario_id       uuid not null references public.usuario (id) on delete cascade,
  termo_versao_id  uuid not null references public.termo_versao (id),
  aceito_em        timestamptz not null default now(),
  origem           text not null check (origem in ('web','app')),
  unique (usuario_id, termo_versao_id)
);

create table public.log_auditoria (
  id           bigint generated always as identity primary key,
  usuario_id   uuid references public.usuario (id) on delete set null,
  acao         text not null,
  entidade     text not null,
  entidade_id  text,
  dados        jsonb,
  criado_em    timestamptz not null default now()
);
comment on table public.log_auditoria is 'Toda ação sensível: quem fez, o quê e quando. Somente inserção.';

-- ---------------------------------------------------------------- funções de acesso
create or replace function public.tem_perfil(p public.perfil_tipo)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.usuario_perfil up
    join public.usuario u on u.id = up.usuario_id
    where up.usuario_id = auth.uid() and up.perfil = p and u.ativo and u.excluido_em is null
  );
$$;

create or replace function public.eh_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.tem_perfil('admin');
$$;

create or replace function public.pode(f text, a public.acao_tipo)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.eh_admin() or exists (
    select 1 from public.permissao pe
    join public.usuario_perfil up on up.perfil = pe.perfil
    join public.usuario u on u.id = up.usuario_id
    where up.usuario_id = auth.uid() and u.ativo and u.excluido_em is null
      and pe.funcionalidade = f and pe.acao = a
  );
$$;

create or replace function public.registrar_log(p_acao text, p_entidade text, p_entidade_id text, p_dados jsonb default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.log_auditoria (usuario_id, acao, entidade, entidade_id, dados)
  values (auth.uid(), p_acao, p_entidade, p_entidade_id, p_dados);
$$;

-- Ao criar uma conta (cadastro no app ou convite), cria o usuário com perfil Visitante.
-- Perfis internos são atribuídos depois pelo Admin; Atleta é papel no evento.
create or replace function public.ao_criar_conta()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.usuario (id, email, nome)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'nome', ''))
  on conflict (id) do nothing;
  insert into public.usuario_perfil (usuario_id, perfil)
  values (new.id, 'visitante')
  on conflict do nothing;
  return new;
end $$;

create trigger ao_criar_conta after insert on auth.users
  for each row execute function public.ao_criar_conta();

-- ---------------------------------------------------------------- segurança por linha (RLS)
alter table public.subtipo         enable row level security;
alter table public.usuario         enable row level security;
alter table public.usuario_perfil  enable row level security;
alter table public.funcionalidade  enable row level security;
alter table public.permissao       enable row level security;
alter table public.empresa         enable row level security;
alter table public.evento          enable row level security;
alter table public.papel_evento    enable row level security;
alter table public.importacao      enable row level security;
alter table public.termo_versao    enable row level security;
alter table public.consentimento   enable row level security;
alter table public.log_auditoria   enable row level security;

-- Tabelas de referência: qualquer pessoa logada lê; só quem tem permissão altera.
create policy subtipo_ler on public.subtipo for select to authenticated using (true);
create policy subtipo_gerir on public.subtipo for all to authenticated
  using (public.pode('cadastros.subtipos', 'editar')) with check (public.pode('cadastros.subtipos', 'editar'));

create policy funcionalidade_ler on public.funcionalidade for select to authenticated using (true);
create policy permissao_ler on public.permissao for select to authenticated using (true);
create policy permissao_gerir on public.permissao for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

create policy termo_ler on public.termo_versao for select to anon, authenticated using (true);
create policy termo_gerir on public.termo_versao for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

-- Usuário: cada um vê e edita o próprio cadastro; a gestão depende da permissão.
create policy usuario_ler on public.usuario for select to authenticated
  using (id = auth.uid() or public.pode('cadastros.usuarios', 'ver'));
create policy usuario_editar_proprio on public.usuario for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy usuario_gerir on public.usuario for update to authenticated
  using (public.pode('cadastros.usuarios', 'editar')) with check (public.pode('cadastros.usuarios', 'editar'));

create policy usuario_perfil_ler on public.usuario_perfil for select to authenticated
  using (usuario_id = auth.uid() or public.pode('cadastros.usuarios', 'ver'));
create policy usuario_perfil_gerir on public.usuario_perfil for all to authenticated
  using (public.pode('cadastros.perfis', 'editar')) with check (public.pode('cadastros.perfis', 'editar'));

create policy empresa_ler on public.empresa for select to authenticated using (public.pode('cadastros.clientes', 'ver'));
create policy empresa_gerir on public.empresa for all to authenticated
  using (public.pode('cadastros.clientes', 'editar')) with check (public.pode('cadastros.clientes', 'editar'));

create policy evento_ler on public.evento for select to authenticated
  using (public.pode('eventos.criacao', 'ver')
         or exists (select 1 from public.papel_evento pe where pe.evento_id = evento.id and pe.usuario_id = auth.uid()));
create policy evento_gerir on public.evento for all to authenticated
  using (public.pode('eventos.criacao', 'editar')) with check (public.pode('eventos.criacao', 'editar'));

create policy papel_evento_ler on public.papel_evento for select to authenticated
  using (usuario_id = auth.uid() or public.pode('eventos.criacao', 'ver'));
create policy papel_evento_gerir on public.papel_evento for all to authenticated
  using (public.pode('eventos.criacao', 'editar')) with check (public.pode('eventos.criacao', 'editar'));

create policy importacao_ler on public.importacao for select to authenticated using (public.pode('eventos.inscricoes', 'ver'));
create policy importacao_criar on public.importacao for insert to authenticated with check (public.pode('eventos.inscricoes', 'criar'));

create policy consentimento_ler on public.consentimento for select to authenticated
  using (usuario_id = auth.uid() or public.eh_admin());
create policy consentimento_aceitar on public.consentimento for insert to authenticated
  with check (usuario_id = auth.uid());

create policy log_ler on public.log_auditoria for select to authenticated using (public.eh_admin());
-- Sem política de inserção: o log só é gravado pela função registrar_log.

-- ---------------------------------------------------------------- dados de referência
insert into public.subtipo (perfil, nome) values
  ('coordenador', 'Operações'), ('coordenador', 'Marketing'), ('coordenador', 'Infraestrutura'),
  ('terceiros', 'Auxiliar de MKT'), ('terceiros', 'Auxiliar de OPE'), ('terceiros', 'Auxiliar de INFRA');

insert into public.funcionalidade (codigo, modulo, nome, ordem) values
  ('plataforma.asaas',        'Plataforma', 'ASAAS', 11),
  ('plataforma.email',        'Plataforma', 'E-mail', 12),
  ('plataforma.permissoes',   'Plataforma', 'Permissões', 13),
  ('plataforma.whatsapp',     'Plataforma', 'WhatsApp', 14),
  ('cadastros.perfis',        'Cadastros', 'Perfis', 21),
  ('cadastros.subtipos',      'Cadastros', 'Subtipo', 22),
  ('cadastros.usuarios',      'Cadastros', 'Usuários', 23),
  ('cadastros.clientes',      'Cadastros', 'Clientes', 24),
  ('cadastros.fornecedores',  'Cadastros', 'Fornecedores', 25),
  ('cadastros.patrocinadores','Cadastros', 'Patrocinadores', 26),
  ('cadastros.expositores',   'Cadastros', 'Expositores', 27),
  ('cadastros.grupos',        'Cadastros', 'Grupo/Assessoria', 28),
  ('cadastros.servicos',      'Cadastros', 'Serviços', 29),
  ('cadastros.mercadorias',   'Cadastros', 'Mercadorias', 30),
  ('cadastros.equipamentos',  'Cadastros', 'Equipamentos', 31),
  ('eventos.criacao',         'Eventos', 'Criação', 41),
  ('eventos.contratos',       'Eventos', 'Contratos', 42),
  ('eventos.inscricoes',      'Eventos', 'Inscrições', 43),
  ('eventos.mapa_arena',      'Eventos', 'Mapa da Arena', 44),
  ('eventos.resultados',      'Eventos', 'Resultados', 45),
  ('eventos.calendario',      'Eventos', 'Calendário', 46),
  ('eventos.kit',             'Eventos', 'Kit', 47),
  ('financeiro.orcamento',    'Financeiro', 'Orçamento', 51),
  ('financeiro.pagar',        'Financeiro', 'Contas a pagar', 52),
  ('financeiro.receber',      'Financeiro', 'Contas a receber', 53),
  ('financeiro.prestacao',    'Financeiro', 'Prestação de contas', 54);

-- Ponto de partida das permissões (o Admin ajusta na tela 1.3). Admin tem tudo por definição.
insert into public.permissao (perfil, funcionalidade, acao)
select p.perfil::public.perfil_tipo, f.codigo, a.acao::public.acao_tipo
from (values ('diretor'), ('organizador')) p(perfil)
cross join public.funcionalidade f
cross join (values ('ver'), ('criar'), ('editar'), ('aprovar')) a(acao)
where f.modulo in ('Cadastros', 'Eventos', 'Financeiro');

insert into public.permissao (perfil, funcionalidade, acao)
select 'coordenador', f.codigo, a.acao::public.acao_tipo
from public.funcionalidade f
cross join (values ('ver'), ('criar'), ('editar')) a(acao)
where f.modulo = 'Eventos' or f.codigo in ('cadastros.fornecedores','cadastros.patrocinadores','cadastros.expositores',
  'cadastros.servicos','cadastros.mercadorias','cadastros.equipamentos','financeiro.orcamento');

insert into public.permissao (perfil, funcionalidade, acao) values
  ('staff', 'eventos.calendario', 'ver'),
  ('terceiros', 'eventos.calendario', 'ver');

insert into public.termo_versao (tipo, versao) values
  ('termos_uso', '1.0'), ('politica_privacidade', '1.0');

-- Campos de controle (ativo, exclusão, e-mail) só mudam por quem gere usuários.
create or replace function public.proteger_campos_usuario()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.pode('cadastros.usuarios', 'editar')
     and (new.ativo is distinct from old.ativo
          or new.excluido_em is distinct from old.excluido_em
          or new.email is distinct from old.email) then
    raise exception 'Sem permissão para alterar este campo';
  end if;
  return new;
end $$;

create trigger usuario_proteger_campos before update on public.usuario
  for each row execute function public.proteger_campos_usuario();
