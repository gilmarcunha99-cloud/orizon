-- Reorganização aprovada pelo Gilmar em 27/11/2026:
-- Perfis e Sub-Tipo vão para a Plataforma (exclusiva do Admin), junto de Permissões;
-- entram Locais/Arenas em Cadastros e Credenciamento/Check-in em Eventos.
-- Os códigos não mudam (as regras de acesso já os usam).
update public.funcionalidade set modulo = 'Plataforma', ordem = 13 where codigo = 'cadastros.perfis';
update public.funcionalidade set modulo = 'Plataforma', ordem = 14 where codigo = 'cadastros.subtipos';
update public.funcionalidade set ordem = 15 where codigo = 'plataforma.permissoes';
update public.funcionalidade set ordem = 16 where codigo = 'plataforma.whatsapp';

insert into public.funcionalidade (codigo, modulo, nome, ordem) values
  ('cadastros.locais',        'Cadastros', 'Locais/Arenas', 32),
  ('eventos.credenciamento',  'Eventos',   'Credenciamento/Check-in', 48)
on conflict (codigo) do nothing;

-- Plataforma é só do Admin: tira o que a carga inicial dava a outros perfis em Perfis e Sub-Tipo.
delete from public.permissao where funcionalidade in ('cadastros.perfis', 'cadastros.subtipos');

-- Ponto de partida para os itens novos, no mesmo padrão da carga inicial.
insert into public.permissao (perfil, funcionalidade, acao)
select p.perfil::public.perfil_tipo, f.codigo, a.acao::public.acao_tipo
from (values ('diretor'), ('organizador')) p(perfil)
cross join (values ('cadastros.locais'), ('eventos.credenciamento')) f(codigo)
cross join (values ('ver'), ('criar'), ('editar'), ('aprovar')) a(acao)
on conflict do nothing;

insert into public.permissao (perfil, funcionalidade, acao)
select 'coordenador', f.codigo, a.acao::public.acao_tipo
from (values ('cadastros.locais'), ('eventos.credenciamento')) f(codigo)
cross join (values ('ver'), ('criar'), ('editar')) a(acao)
on conflict do nothing;

-- Quem faz o check-in na entrada do evento.
insert into public.permissao (perfil, funcionalidade, acao) values
  ('staff', 'eventos.credenciamento', 'ver'),
  ('staff', 'eventos.credenciamento', 'criar')
on conflict do nothing;
