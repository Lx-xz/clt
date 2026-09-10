-- CLT — esquema mínimo para testar com várias pessoas.
--
-- ATENÇÃO, e isto é uma decisão consciente: entrar só com um nick identifica
-- o jogador, não o autentica. Quem digitar o nick de outra pessoa joga como
-- ela e sobrescreve o save dela. Serve para teste porque nada aqui é
-- sensível. Para valer, troque por supabase auth (magic link ou anônimo).
--
-- Rode este arquivo no SQL Editor do projeto.

-- ---------------------------------------------------------------- tabelas

create table if not exists public.players (
  id         uuid primary key default gen_random_uuid(),
  nick       text not null,
  created_at timestamptz not null default now(),
  constraint nick_tamanho check (char_length(nick) between 2 and 16),
  -- só letras, números, hífen e underscore: nada de espaço ou emoji
  constraint nick_formato check (nick ~ '^[a-z0-9_-]+$')
);

-- o nick é guardado já normalizado, então o unique simples basta
create unique index if not exists players_nick_idx on public.players (nick);

create table if not exists public.saves (
  player_id  uuid primary key references public.players (id) on delete cascade,
  run        jsonb,
  collection jsonb,
  updated_at timestamptz not null default now()
);

-- registro append-only de runs terminadas, para balanceamento
create table if not exists public.runs (
  id           bigint generated always as identity primary key,
  player_id    uuid references public.players (id) on delete set null,
  ended_at     timestamptz not null default now(),
  outcome      text not null check (outcome in ('vitoria', 'burnout', 'demissao', 'despejo')),
  day          smallint not null check (day between 1 and 20),
  money        integer not null,
  week_reached smallint not null check (week_reached between 1 and 4)
);

-- --------------------------------------------------------------------- RLS

alter table public.players enable row level security;
alter table public.saves   enable row level security;
alter table public.runs    enable row level security;

-- players não recebe política nenhuma de propósito: o site nunca fala com a
-- tabela direto, só pelas funções abaixo. Assim ninguém baixa a lista de
-- nicks de todo mundo.

-- o save é lido e escrito pelo site; sem login não há como restringir a dono
create policy "save é lido pelo site"     on public.saves for select to anon using (true);
create policy "save é criado pelo site"   on public.saves for insert to anon with check (true);
create policy "save é atualizado pelo site" on public.saves for update to anon using (true) with check (true);

-- telemetria é só de escrita: ninguém baixa nem altera a base pelo site
create policy "site registra runs" on public.runs for insert to anon with check (true);

-- ----------------------------------------------------------------- grants
-- "Automatically expose new tables" está desligado, então o acesso é aqui.

grant usage on schema public to anon;
grant select, insert, update on public.saves to anon;
grant insert on public.runs to anon;
-- players continua sem grant: o acesso é só pelas funções

-- --------------------------------------------------------------- funções
-- security definer: rodam com os privilégios do dono, então enxergam
-- players mesmo sem grant para anon. search_path fixo evita sequestro por
-- schema no caminho.

create or replace function public.find_player(p_nick text)
returns uuid
language sql
security definer
set search_path = public, pg_temp
as $$
  select id from public.players where nick = lower(trim(p_nick));
$$;

create or replace function public.create_player(p_nick text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nick text := lower(trim(p_nick));
  v_id   uuid;
begin
  insert into public.players (nick) values (v_nick) returning id into v_id;
  insert into public.saves (player_id) values (v_id);
  return v_id;
exception
  when unique_violation then
    -- duas pessoas criando o mesmo nick ao mesmo tempo: devolve o existente
    return (select id from public.players where nick = v_nick);
end;
$$;

grant execute on function public.find_player(text)   to anon;
grant execute on function public.create_player(text) to anon;
