-- Regra de 27/11/2026 (Gilmar): nomes próprios sempre em CAIXA ALTA e e-mail sempre em caixa baixa.
-- Vale para qualquer gravação (tela, importação ou cadastro pelo celular) e ajusta os registros que já existem.

create or replace function public.padronizar_usuario()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.nome  := upper(btrim(regexp_replace(coalesce(new.nome, ''), '\s+', ' ', 'g')));
  new.email := lower(btrim(new.email));
  return new;
end $$;

create trigger usuario_padronizar before insert or update of nome, email on public.usuario
  for each row execute function public.padronizar_usuario();

create or replace function public.padronizar_ficha_atleta()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.cidade           := upper(btrim(new.cidade));
  new.grupo            := upper(btrim(new.grupo));
  new.emergencia_nome  := upper(btrim(new.emergencia_nome));
  new.responsavel_nome := upper(btrim(new.responsavel_nome));
  return new;
end $$;

create trigger ficha_atleta_padronizar before insert or update on public.ficha_atleta
  for each row execute function public.padronizar_ficha_atleta();

-- Registros que já existem.
update public.usuario set nome = nome, email = email
where nome is distinct from upper(nome) or email is distinct from lower(email);
update public.ficha_atleta set cidade = cidade
where cidade is distinct from upper(cidade) or grupo is distinct from upper(grupo)
   or emergencia_nome is distinct from upper(emergencia_nome) or responsavel_nome is distinct from upper(responsavel_nome);
