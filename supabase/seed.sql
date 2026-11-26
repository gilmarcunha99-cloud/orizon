-- Dados de teste SOMENTE para o ambiente local (supabase start).
-- Na homologação, os usuários são criados por convite (apps/web/scripts/criar-admin.mjs).
insert into public.empresa (tipos, nome, documento) values
  ('{cliente}', 'Cliente de Teste', '00000000000191');
insert into public.evento (nome, data_inicio, local, cliente_id)
select 'Corrida de Teste 10 km', current_date + 30, 'Belo Horizonte', id from public.empresa where nome = 'Cliente de Teste';
