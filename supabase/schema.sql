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

-- registro append-only de runs terminadas, para balanceamento e para as
-- páginas de ranking/análise/meus-jogos
create table if not exists public.runs (
  id           bigint generated always as identity primary key,
  player_id    uuid references public.players (id) on delete set null,
  ended_at     timestamptz not null default now(),
  outcome      text not null check (outcome in ('vitoria', 'burnout', 'demissao', 'despejo')),
  day          smallint not null check (day between 1 and 20),
  money        integer not null,
  week_reached smallint not null check (week_reached between 1 and 4)
);

-- migração para bancos que já tinham a tabela antes destas duas colunas:
-- run_id evita registrar a mesma run duas vezes (duas abas, uma retentativa
-- de rede); details guarda o dia-a-dia da run, para "meus jogos" reabrir a
-- partida jogada por jogada.
alter table public.runs add column if not exists run_id uuid;
alter table public.runs add column if not exists details jsonb;

-- estatísticas que o histórico não deduz sozinho, e a marca de visibilidade
alter table public.runs add column if not exists started_at   timestamptz;
alter table public.runs add column if not exists max_combo    smallint;
alter table public.runs add column if not exists cards_played smallint;
alter table public.runs add column if not exists warnings     smallint;
alter table public.runs add column if not exists max_dias_sem_descanso smallint;
-- falso na run largada no meio sem permissão: conta para a análise, mas não
-- aparece em "meus jogos" nem no ranking
alter table public.runs add column if not exists visivel boolean not null default true;

-- 'abandono' é o quinto desfecho: a run que o jogador reiniciou no meio. Não é
-- derrota (ninguém foi demitido), mas é o dado que diz o que faz desistir.
alter table public.runs drop constraint if exists runs_outcome_check;
alter table public.runs add constraint runs_outcome_check
  check (outcome in ('vitoria', 'burnout', 'demissao', 'despejo', 'abandono'));

-- nulo nunca colide com nulo num índice único do Postgres, então linhas
-- antigas (sem run_id) convivem em paz com as novas
create unique index if not exists runs_run_id_idx on public.runs (run_id);

-- --------------------------------------------------------------------- RLS

alter table public.players enable row level security;
alter table public.saves   enable row level security;
alter table public.runs    enable row level security;

-- players não recebe política nenhuma de propósito: o site nunca fala com a
-- tabela direto, só pelas funções abaixo. Assim ninguém baixa a lista de
-- nicks de todo mundo.

-- o save é lido e escrito pelo site; sem login não há como restringir a dono
-- (drop antes do create: "create policy" não tem "if not exists", e este
-- arquivo precisa poder ser rodado de novo num banco que já o rodou)
drop policy if exists "save é lido pelo site"       on public.saves;
drop policy if exists "save é criado pelo site"     on public.saves;
drop policy if exists "save é atualizado pelo site" on public.saves;
create policy "save é lido pelo site"     on public.saves for select to anon using (true);
create policy "save é criado pelo site"   on public.saves for insert to anon with check (true);
create policy "save é atualizado pelo site" on public.saves for update to anon using (true) with check (true);

-- telemetria é só de escrita: ninguém baixa nem altera a base pelo site
drop policy if exists "site registra runs" on public.runs;
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

-- `create or replace function` não consegue mudar o tipo de retorno de uma
-- função que já existe ("cannot change return type of existing function"):
-- toda vez que uma destas ganha coluna nova, rodar o arquivo de novo falha.
-- Derrubar antes resolve, e os grants vêm logo depois de cada create.
drop function if exists public.find_player(text);
drop function if exists public.create_player(text);
drop function if exists public.estatisticas_gerais();
drop function if exists public.cartas_jogadas();
drop function if exists public.cartas_fatais();
drop function if exists public.escolhas_de_evento();
drop function if exists public.estresse_por_dia();
drop function if exists public.cartas_encalhadas();
drop function if exists public.estatisticas_nerds();
drop function if exists public.ranking();
drop function if exists public.meus_jogos(uuid);
drop function if exists public.jogo_detalhe(bigint, uuid);

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

-- ------------------------------------------------------- leitura agregada
--
-- players e runs continuam sem select para anon (veja acima). As quatro
-- funções abaixo são a única porta de entrada para dados agregados ou
-- alheios: cada uma devolve só o que a página correspondente precisa, nunca
-- a tabela crua. /ranking é a exceção deliberada de "nick vira público": ele
-- já não protegia nada (não é senha), e agora vira uma lista intencional.

-- contagens gerais, para a página de análise. A run abandonada não entra em
-- total_runs nem no dia médio: ela não terminou, entraria como derrota falsa.
create or replace function public.estatisticas_gerais()
returns table (
  jogadores             bigint,
  jogadores_que_jogaram bigint,
  total_runs            bigint,
  vitorias              bigint,
  burnouts              bigint,
  demissoes             bigint,
  despejos              bigint,
  abandonos             bigint,
  dia_medio             numeric
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    (select count(*) from public.players)                        as jogadores,
    (select count(distinct player_id) from public.runs)          as jogadores_que_jogaram,
    (select count(*) from public.runs where outcome <> 'abandono') as total_runs,
    (select count(*) from public.runs where outcome = 'vitoria')  as vitorias,
    (select count(*) from public.runs where outcome = 'burnout')  as burnouts,
    (select count(*) from public.runs where outcome = 'demissao') as demissoes,
    (select count(*) from public.runs where outcome = 'despejo')  as despejos,
    (select count(*) from public.runs where outcome = 'abandono') as abandonos,
    (select round(avg(day), 1) from public.runs where outcome <> 'abandono') as dia_medio;
$$;

grant execute on function public.estatisticas_gerais() to anon;

-- ------------------------------------------------------ estatísticas nerds
--
-- Tudo abaixo sai do que já é gravado. `details` guarda o dia-a-dia com as
-- cartas jogadas em ordem, então "quantos cafés" e "a carta que mais mata"
-- não precisam de contador novo no jogo — é só somar aqui.

-- quantas vezes cada carta foi jogada, somando todo mundo
create or replace function public.cartas_jogadas()
returns table (card_id text, vezes bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  select carta.valor as card_id, count(*) as vezes
  from public.runs r
  cross join lateral jsonb_array_elements(coalesce(r.details -> 'history', '[]'::jsonb)) as dia(valor)
  cross join lateral jsonb_array_elements_text(coalesce(dia.valor -> 'cardsPlayed', '[]'::jsonb)) as carta(valor)
  group by carta.valor
  order by vezes desc;
$$;

grant execute on function public.cartas_jogadas() to anon;

-- a última carta jogada antes de cada derrota: "a carta que mais mata"
create or replace function public.cartas_fatais()
returns table (outcome text, card_id text, vezes bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  -- o índice -1 do jsonb é o último item do array: a carta que o jogador
  -- jogou logo antes de a run acabar
  with ultima_carta as (
    select
      r.outcome,
      (
        select dia.valor
        from jsonb_array_elements(coalesce(r.details -> 'history', '[]'::jsonb)) as dia(valor)
        order by (dia.valor ->> 'day')::int desc
        limit 1
      ) -> 'cardsPlayed' ->> -1 as card_id
    from public.runs r
    where r.outcome in ('burnout', 'demissao', 'despejo')
  )
  select u.outcome, u.card_id, count(*) as vezes
  from ultima_carta u
  where u.card_id is not null
  group by 1, 2
  order by vezes desc;
$$;

grant execute on function public.cartas_fatais() to anon;

-- nos eventos ambíguos, qual lado o pessoal escolhe
create or replace function public.escolhas_de_evento()
returns table (event_id text, escolha smallint, vezes bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    dia.valor ->> 'eventId'                as event_id,
    (dia.valor ->> 'eventChoice')::smallint as escolha,
    count(*)                                as vezes
  from public.runs r
  cross join lateral jsonb_array_elements(coalesce(r.details -> 'history', '[]'::jsonb)) as dia(valor)
  where dia.valor ->> 'eventChoice' is not null
    and dia.valor ->> 'eventId' is not null
  group by 1, 2
  order by event_id, escolha;
$$;

grant execute on function public.escolhas_de_evento() to anon;

-- o estresse médio em cada dia do mês: o desenho da curva de desgaste
create or replace function public.estresse_por_dia()
returns table (day smallint, estresse_medio numeric, amostras bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    (dia.valor ->> 'day')::smallint         as day,
    round(avg((dia.valor ->> 'stress')::numeric), 2) as estresse_medio,
    count(*)                                as amostras
  from public.runs r
  cross join lateral jsonb_array_elements(coalesce(r.details -> 'history', '[]'::jsonb)) as dia(valor)
  where dia.valor ->> 'day' is not null
  group by 1
  order by 1;
$$;

grant execute on function public.estresse_por_dia() to anon;

-- as cartas que mais ficam na mão sem serem jogadas: candidata a mudança é a
-- carta que ninguém quer
create or replace function public.cartas_encalhadas()
returns table (card_id text, vezes bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  select carta.valor as card_id, count(*) as vezes
  from public.runs r
  cross join lateral jsonb_array_elements(coalesce(r.details -> 'history', '[]'::jsonb)) as dia(valor)
  cross join lateral jsonb_array_elements_text(coalesce(dia.valor -> 'notPlayed', '[]'::jsonb)) as carta(valor)
  group by carta.valor
  order by vezes desc;
$$;

grant execute on function public.cartas_encalhadas() to anon;

-- os números soltos que ficam bem numa fileira de placas
create or replace function public.estatisticas_nerds()
returns table (
  total_cartas_jogadas bigint,
  total_dias_vividos   bigint,
  maior_embalo         smallint,
  total_advertencias   bigint,
  dinheiro_total       bigint,
  runs_abandonadas     bigint,
  duracao_media_min    numeric,
  run_mais_rapida_min  numeric,
  energia_desperdicada bigint,
  energia_media_sobra  numeric,
  recorde_sem_descanso smallint
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    (
      select count(*)
      from public.runs r
      cross join lateral jsonb_array_elements(coalesce(r.details -> 'history', '[]'::jsonb)) as dia(valor)
      cross join lateral jsonb_array_elements_text(coalesce(dia.valor -> 'cardsPlayed', '[]'::jsonb)) as carta(valor)
    ) as total_cartas_jogadas,
    (
      select count(*)
      from public.runs r
      cross join lateral jsonb_array_elements(coalesce(r.details -> 'history', '[]'::jsonb)) as dia(valor)
    ) as total_dias_vividos,
    (select max(max_combo) from public.runs)                     as maior_embalo,
    (select coalesce(sum(warnings), 0) from public.runs)         as total_advertencias,
    (select coalesce(sum(money), 0) from public.runs where outcome <> 'abandono') as dinheiro_total,
    (select count(*) from public.runs where outcome = 'abandono') as runs_abandonadas,
    (
      select round(avg(extract(epoch from (ended_at - started_at)) / 60)::numeric, 1)
      from public.runs
      where started_at is not null and ended_at > started_at and outcome <> 'abandono'
    ) as duracao_media_min,
    (
      select round(min(extract(epoch from (ended_at - started_at)) / 60)::numeric, 1)
      from public.runs
      where started_at is not null and ended_at > started_at and outcome = 'vitoria'
    ) as run_mais_rapida_min,
    (
      select coalesce(sum((dia.valor ->> 'energyLeft')::int), 0)
      from public.runs r
      cross join lateral jsonb_array_elements(coalesce(r.details -> 'history', '[]'::jsonb)) as dia(valor)
      where dia.valor ->> 'energyLeft' is not null
    ) as energia_desperdicada,
    (
      select round(avg((dia.valor ->> 'energyLeft')::numeric), 2)
      from public.runs r
      cross join lateral jsonb_array_elements(coalesce(r.details -> 'history', '[]'::jsonb)) as dia(valor)
      where dia.valor ->> 'energyLeft' is not null
    ) as energia_media_sobra,
    (select max(max_dias_sem_descanso) from public.runs) as recorde_sem_descanso;
$$;

grant execute on function public.estatisticas_nerds() to anon;

-- placar público: só quem já terminou pelo menos uma run aparece
create or replace function public.ranking()
returns table (
  nick            text,
  vitorias        bigint,
  derrotas        bigint,
  total_runs      bigint,
  melhor_dinheiro integer,
  ultima_partida  timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    p.nick,
    count(*) filter (where r.outcome = 'vitoria')  as vitorias,
    count(*) filter (where r.outcome <> 'vitoria') as derrotas,
    count(*)                                       as total_runs,
    max(r.money)                                   as melhor_dinheiro,
    max(r.ended_at)                                as ultima_partida
  from public.players p
  join public.runs r on r.player_id = p.id
  -- o placar é de partida terminada e guardada: abandono não conta como
  -- derrota, e a run que o jogador pediu para não guardar não aparece
  where r.visivel and r.outcome <> 'abandono'
  group by p.nick
  order by vitorias desc, total_runs desc;
$$;

grant execute on function public.ranking() to anon;

-- as runs de UM jogador — não devolve nada de outro player_id
create or replace function public.meus_jogos(p_player_id uuid)
returns table (
  id           bigint,
  ended_at     timestamptz,
  outcome      text,
  day          smallint,
  money        integer,
  week_reached smallint
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select r.id, r.ended_at, r.outcome, r.day, r.money, r.week_reached
  from public.runs r
  where r.player_id = p_player_id and r.visivel
  order by r.ended_at desc;
$$;

grant execute on function public.meus_jogos(uuid) to anon;

-- o replay de uma run específica, incluindo o dia-a-dia (details). Confere
-- o dono: pedir o run_id de outra pessoa devolve zero linhas
create or replace function public.jogo_detalhe(p_run_id bigint, p_player_id uuid)
returns table (
  id           bigint,
  ended_at     timestamptz,
  outcome      text,
  day          smallint,
  money        integer,
  week_reached smallint,
  details      jsonb
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select r.id, r.ended_at, r.outcome, r.day, r.money, r.week_reached, r.details
  from public.runs r
  where r.id = p_run_id and r.player_id = p_player_id and r.visivel;
$$;

grant execute on function public.jogo_detalhe(bigint, uuid) to anon;

-- ------------------------------------------------------------ cache da API
-- O PostgREST (a API que a supabase-js chama) guarda o formato das tabelas em
-- cache. Coluna recém-criada que ele ainda não enxergou faz o insert falhar
-- com "column ... does not exist" mesmo estando lá no banco. Normalmente o
-- Supabase recarrega sozinho; este aviso garante.
notify pgrst, 'reload schema';
