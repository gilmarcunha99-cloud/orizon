-- Regra de 27/11/2026 (Gilmar): duas pessoas não podem ter o mesmo celular.
-- Feito por trigger (e não por índice único) para não travar em repetições que já existam na homologação:
-- a checagem vale para todo cadastro novo e para toda troca de celular.

create or replace function public.checar_celular_unico()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_outro text;
begin
  new.celular := nullif(regexp_replace(coalesce(new.celular, ''), '\D', '', 'g'), '');
  if new.celular is not null and (tg_op = 'INSERT' or new.celular is distinct from old.celular) then
    select coalesce(nullif(nome, ''), email) into v_outro
    from public.usuario where celular = new.celular and id <> new.id and excluido_em is null limit 1;
    if found then
      raise exception 'Esse celular já está no cadastro de %.', v_outro;
    end if;
  end if;
  return new;
end $$;

create trigger usuario_celular_unico before insert or update of celular on public.usuario
  for each row execute function public.checar_celular_unico();
create index if not exists usuario_celular_idx on public.usuario (celular);
