-- O projeto não expõe tabelas novas automaticamente pela API: sem estes GRANTs o usuário logado
-- recebia "permission denied" ao ler o próprio cadastro e o painel o tratava como Visitante sem cadastro.
-- O acesso continua controlado pelas políticas de RLS de cada tabela.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
alter default privileges in schema public grant execute on functions to authenticated;
