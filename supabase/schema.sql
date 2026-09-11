-- CLT — o banco inteiro. Rode este arquivo no SQL Editor do projeto.
--
-- Ele é feito para ser rodado QUANTAS VEZES FOR PRECISO: toda tabela é
-- `create if not exists`, toda coluna nova entra por `alter table ... add
-- column if not exists`, toda política é derrubada antes de ser criada e
-- todas as funções caem num bloco só antes de serem recriadas. Rodar de novo
-- num banco que já tem dados não apaga nada.
--
-- Para apagar tudo e recomeçar do zero, veja `reset.sql` (esse sim apaga).
--
-- Quem identifica o jogador agora é o Supabase Auth: e-mail e senha ou
-- Google. O convidado é a exceção — ele joga sem conta, com um id local, e
-- fica marcado como convidado em tudo que grava.

-- O search_path desta sessão do SQL Editor. `extensions` junto porque é onde
-- o Supabase costuma guardar as extensões, e o índice de trigrama lá embaixo
-- precisa enxergar a classe de operadores `gin_trgm_ops` para ser criado.
set search_path = public, extensions;

-- pg_trgm dá o operador de semelhança usado para achar feedback parecido
-- antes de o jogador abrir um repetido. O Supabase costuma instalar extensão
-- no schema `extensions`, e não em `public` — por isso a função que usa
-- `similarity()` leva os dois no search_path.
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------- tabelas

-- O perfil do jogador. Para quem tem conta, `id` é o MESMO id do
-- auth.users — é o que deixa `auth.uid() = player_id` funcionar direto nas
-- políticas, sem tabela de ligação no meio. Para o convidado, é um uuid
-- sorteado no navegador. Não há foreign key para auth.users justamente por
-- causa do convidado, que não tem conta lá.
create table if not exists public.players (
  id         uuid primary key default gen_random_uuid(),
  nick       text,
  created_at timestamptz not null default now(),
  constraint nick_tamanho check (nick is null or char_length(nick) between 2 and 16),
  -- só letras, números, hífen e underscore: nada de espaço ou emoji
  constraint nick_formato check (nick is null or nick ~ '^[a-z0-9_-]+$')
);

-- migração para o banco que existia antes das contas
alter table public.players alter column nick drop not null;
alter table public.players add column if not exists nome      text;
alter table public.players add column if not exists email     text;
alter table public.players add column if not exists convidado boolean not null default false;
alter table public.players add column if not exists admin     boolean not null default false;
alter table public.players add column if not exists termos_em timestamptz;
-- moeda dos feedbacks bem escritos. Ninguém gasta ainda; existe desde já
-- para a recompensa futura não precisar de migração no meio do caminho.
alter table public.players add column if not exists pontos    integer not null default 0;
-- o avatar é uma RECEITA, não uma imagem: quatro escolhas que o site
-- desenha em SVG na hora. Nulo quer dizer "ainda não escolheu" e o site
-- mostra o padrão. Não existe imagem para moderar porque ninguém sobe uma.
alter table public.players add column if not exists avatar    jsonb;

-- o nick é guardado já normalizado, então o unique simples basta. Nulo não
-- colide com nulo: quem entra pelo Google fica sem nick até completar o
-- cadastro, e isso não trava ninguém.
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
-- partida jogada sem conta. Dá para deduzir pelo players.convidado, mas o
-- jogador convidado é apagável e a run não: guardar a marca na própria linha
-- mantém o dado depois de o perfil sumir.
alter table public.runs add column if not exists convidado boolean not null default false;

-- 'abandono' é o quinto desfecho: a run que o jogador reiniciou no meio. Não é
-- derrota (ninguém foi demitido), mas é o dado que diz o que faz desistir.
alter table public.runs drop constraint if exists runs_outcome_check;
alter table public.runs add constraint runs_outcome_check
  check (outcome in ('vitoria', 'burnout', 'demissao', 'despejo', 'abandono'));

-- nulo nunca colide com nulo num índice único do Postgres, então linhas
-- antigas (sem run_id) convivem em paz com as novas
create unique index if not exists runs_run_id_idx on public.runs (run_id);

-- ------------------------------------------------------------- feedbacks
--
-- O motivo de existir login. Todo bug e toda sugestão viram uma linha aqui,
-- pública para ler e dona para editar. O fluxo é o mesmo dos dois lados: o
-- jogador escreve e acompanha; o admin triava, comenta, muda status,
-- urgência e dá uma nota.
create table if not exists public.feedbacks (
  id       bigint generated always as identity primary key,
  autor_id uuid references public.players (id) on delete set null,
  tipo     text not null check (tipo in ('bug', 'sugestao', 'duvida', 'outro')),
  titulo   text not null check (char_length(titulo) between 5 and 120),
  corpo    text not null check (char_length(corpo) between 10 and 4000),
  -- onde aconteceu, quando é bug: preenchido sozinho pela página
  pagina   text,
  status   text not null default 'novo'
           check (status in ('novo', 'triado', 'em_andamento', 'feito', 'recusado', 'duplicado')),
  urgencia text not null default 'media'
           check (urgencia in ('baixa', 'media', 'alta', 'critica')),
  -- a nota do admin para a qualidade do relato: é ela que vira ponto
  nota     smallint check (nota between 0 and 5),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists feedbacks_autor_idx  on public.feedbacks (autor_id);
create index if not exists feedbacks_status_idx on public.feedbacks (status);
-- índice de trigrama: é ele que faz a busca por feedback parecido não varrer
-- a tabela inteira quando ela crescer
create index if not exists feedbacks_titulo_trgm on public.feedbacks using gin (titulo gin_trgm_ops);

create table if not exists public.feedback_comentarios (
  id          bigint generated always as identity primary key,
  feedback_id bigint not null references public.feedbacks (id) on delete cascade,
  autor_id    uuid references public.players (id) on delete set null,
  corpo       text not null check (char_length(corpo) between 1 and 2000),
  -- guardado na linha, e não deduzido do autor na hora de ler: se alguém
  -- deixar de ser admin, o que ele respondeu como admin continua sendo
  de_admin    boolean not null default false,
  criado_em   timestamptz not null default now()
);

create index if not exists comentarios_feedback_idx on public.feedback_comentarios (feedback_id);

-- Ainda não há tela de notificação em lugar nenhum além do sininho da barra
-- lateral, mas toda mudança de status e todo comentário já geram uma linha
-- aqui. É a "mudancinha de hoje" que evita ter que reconstruir o histórico
-- quando as notificações de verdade chegarem.
create table if not exists public.notificacoes (
  id              bigint generated always as identity primary key,
  destinatario_id uuid not null references public.players (id) on delete cascade,
  tipo            text not null,
  titulo          text not null,
  corpo           text,
  feedback_id     bigint references public.feedbacks (id) on delete cascade,
  lida_em         timestamptz,
  criado_em       timestamptz not null default now()
);

create index if not exists notificacoes_dono_idx on public.notificacoes (destinatario_id, lida_em);

-- ------------------------------------------------------------ quem é quem
--
-- Estas duas nascem ANTES das políticas porque as políticas as chamam: criar
-- a política primeiro falharia com "function does not exist". Pelo mesmo
-- motivo elas são `create or replace` e ficam fora do bloco de drop lá
-- embaixo — derrubar uma função de que uma política depende é erro.

-- Usada dentro das POLÍTICAS de saves/runs. Precisa ser `security definer`
-- porque a expressão de uma política roda com os privilégios de quem está
-- consultando, e o anon não tem select em players — sem isso a política
-- falharia com "permission denied for table players".
create or replace function public.eh_convidado(p_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.players where id = p_id and convidado);
$$;

grant execute on function public.eh_convidado(uuid) to anon, authenticated;

create or replace function public.sou_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select coalesce((select admin from public.players where id = auth.uid()), false);
$$;

grant execute on function public.sou_admin() to anon, authenticated;

-- --------------------------------------------------------------------- RLS

alter table public.players              enable row level security;
alter table public.saves                enable row level security;
alter table public.runs                 enable row level security;
alter table public.feedbacks            enable row level security;
alter table public.feedback_comentarios enable row level security;
alter table public.notificacoes         enable row level security;

-- players, feedbacks, feedback_comentarios e notificacoes NÃO recebem
-- política nenhuma, de propósito: com o RLS ligado e nenhuma política, o
-- site não enxerga a tabela de jeito nenhum. Todo acesso passa pelas funções
-- `security definer` lá embaixo, que devolvem só as colunas que a página
-- precisa — nunca o e-mail de ninguém, nunca a lista de contas.

-- `saves` e `runs` são a exceção: são escritos a cada carta jogada e passar
-- isso por função só somaria latência. A conta mexe no próprio save
-- (auth.uid() = player_id) e o convidado mexe no save de convidado.

drop policy if exists "save é lido pelo site"        on public.saves;
drop policy if exists "save é criado pelo site"      on public.saves;
drop policy if exists "save é atualizado pelo site"  on public.saves;
drop policy if exists "dono lê o save"               on public.saves;
drop policy if exists "dono cria o save"             on public.saves;
drop policy if exists "dono atualiza o save"         on public.saves;
drop policy if exists "convidado lê o save"          on public.saves;
drop policy if exists "convidado cria o save"        on public.saves;
drop policy if exists "convidado atualiza o save"    on public.saves;

create policy "dono lê o save"       on public.saves for select to authenticated
  using (player_id = auth.uid());
create policy "dono cria o save"     on public.saves for insert to authenticated
  with check (player_id = auth.uid());
create policy "dono atualiza o save" on public.saves for update to authenticated
  using (player_id = auth.uid()) with check (player_id = auth.uid());

-- o convidado não tem auth.uid(): a garantia possível é que a linha seja
-- mesmo de um convidado, e o id dele é um uuid sorteado que ninguém adivinha
create policy "convidado lê o save"       on public.saves for select to anon
  using (public.eh_convidado(player_id));
create policy "convidado cria o save"     on public.saves for insert to anon
  with check (public.eh_convidado(player_id));
create policy "convidado atualiza o save" on public.saves for update to anon
  using (public.eh_convidado(player_id)) with check (public.eh_convidado(player_id));

-- telemetria é só de escrita: ninguém baixa nem altera a base pelo site
drop policy if exists "site registra runs"      on public.runs;
drop policy if exists "dono registra run"       on public.runs;
drop policy if exists "convidado registra run"  on public.runs;
create policy "dono registra run"      on public.runs for insert to authenticated
  with check (player_id = auth.uid());
create policy "convidado registra run" on public.runs for insert to anon
  with check (public.eh_convidado(player_id));

-- ----------------------------------------------------------------- grants
-- "Automatically expose new tables" está desligado, então o acesso é aqui.

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.saves to anon, authenticated;
grant insert on public.runs to anon, authenticated;
-- players, feedbacks, feedback_comentarios e notificacoes continuam sem
-- grant nenhum: o acesso é só pelas funções

-- --------------------------------------------------------------- funções
-- security definer: rodam com os privilégios do dono, então enxergam as
-- tabelas mesmo sem grant para anon. search_path fixo evita sequestro por
-- schema no caminho. Toda função que muda alguma coisa confere `auth.uid()`
-- por dentro — é ela, e não o cliente, quem decide quem pode o quê.

-- `create or replace function` não consegue mudar o tipo de retorno de uma
-- função que já existe ("cannot change return type of existing function"):
-- toda vez que uma destas ganha coluna nova, rodar o arquivo de novo falha.
-- Derrubar antes resolve, e os grants vêm logo depois de cada create.
drop trigger  if exists ao_criar_usuario on auth.users;
drop function if exists public.ao_criar_usuario();
drop function if exists public.meu_perfil();
drop function if exists public.nick_livre(text);
drop function if exists public.completar_perfil(text, text, boolean);
drop function if exists public.salvar_avatar(jsonb);
drop function if exists public.criar_convidado(text);
-- entrada por nick, sem senha: não existe mais
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
drop function if exists public.listar_feedbacks(text, text);
drop function if exists public.comentarios_do_feedback(bigint);
drop function if exists public.feedbacks_parecidos(text, text);
drop function if exists public.criar_feedback(text, text, text, text);
drop function if exists public.editar_feedback(bigint, text, text, text);
drop function if exists public.excluir_feedback(bigint);
drop function if exists public.comentar_feedback(bigint, text);
drop function if exists public.admin_atualizar_feedback(bigint, text, text, smallint);
drop function if exists public.minhas_notificacoes();
drop function if exists public.marcar_notificacoes_lidas();

-- O perfil nasce junto com a conta. Fazer isso por gatilho, e não pelo
-- site, garante que nunca exista conta sem perfil — nem se o navegador
-- fechar no meio do cadastro, nem quando a conta vier do Google.
create function public.ao_criar_usuario()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nick text := lower(trim(coalesce(new.raw_user_meta_data ->> 'nick', '')));
  v_nome text := coalesce(
    new.raw_user_meta_data ->> 'nome',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name'
  );
begin
  -- quem entra pelo Google não passa nick nenhum; e o nick pode ter sido
  -- tomado entre a checagem na tela e o cadastro. Nos dois casos o perfil
  -- nasce sem nick e o site pede para completar antes de deixar jogar.
  if v_nick !~ '^[a-z0-9_-]{2,16}$'
     or exists (select 1 from public.players where nick = v_nick) then
    v_nick := null;
  end if;

  insert into public.players (id, nick, nome, email, termos_em)
  values (
    new.id, v_nick, nullif(trim(coalesce(v_nome, '')), ''), new.email,
    case when (new.raw_user_meta_data ->> 'termos') = 'true' then now() end
  )
  on conflict (id) do nothing;

  insert into public.saves (player_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger ao_criar_usuario
after insert on auth.users
for each row execute function public.ao_criar_usuario();

-- O que a sessão do site precisa saber sobre quem está logado. Devolve o
-- e-mail porque é o e-mail do próprio dono — nunca o de outra pessoa.
create function public.meu_perfil()
returns table (
  id        uuid,
  nick      text,
  nome      text,
  email     text,
  convidado boolean,
  admin     boolean,
  termos_em timestamptz,
  pontos    integer,
  avatar    jsonb
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select p.id, p.nick, p.nome, p.email, p.convidado, p.admin, p.termos_em, p.pontos, p.avatar
  from public.players p
  where p.id = auth.uid();
$$;

grant execute on function public.meu_perfil() to authenticated;

-- Checagem de nick antes de mandar o cadastro. Devolve só sim ou não: não dá
-- para varrer a lista de nicks com isto, só confirmar um palpite — e o nick
-- já é público no ranking.
create function public.nick_livre(p_nick text)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select not exists (select 1 from public.players where nick = lower(trim(p_nick)));
$$;

grant execute on function public.nick_livre(text) to anon, authenticated;

-- Completar o cadastro: quem veio do Google chega sem nick, e quem tropeçou
-- num nick tomado no meio do cadastro também.
create function public.completar_perfil(p_nick text, p_nome text, p_termos boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nick text := lower(trim(coalesce(p_nick, '')));
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta antes.' using errcode = '42501';
  end if;
  if v_nick !~ '^[a-z0-9_-]{2,16}$' then
    raise exception 'Nick inválido: use de 2 a 16 letras, números, hífen ou underscore.'
      using errcode = '22023';
  end if;
  if not p_termos then
    raise exception 'É preciso aceitar os termos de uso.' using errcode = '22023';
  end if;
  if exists (select 1 from public.players where nick = v_nick and id <> auth.uid()) then
    raise exception 'Esse nick já é de outra pessoa.' using errcode = '23505';
  end if;

  update public.players
  set nick      = v_nick,
      nome      = coalesce(nullif(trim(coalesce(p_nome, '')), ''), nome),
      termos_em = coalesce(termos_em, now())
  where id = auth.uid();
end;
$$;

grant execute on function public.completar_perfil(text, text, boolean) to authenticated;

-- Guarda o avatar de quem está logado. O conteúdo não é validado aqui de
-- propósito: quem valida é `lerAvatar()` no site, na LEITURA, e peça
-- desconhecida cai no padrão. Assim acrescentar um cabelo novo não exige
-- mexer no banco, e um avatar gravado por uma versão antiga nunca derruba
-- a página de ninguém.
create function public.salvar_avatar(p_avatar jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta antes.' using errcode = '42501';
  end if;
  update public.players set avatar = p_avatar where id = auth.uid();
end;
$$;

grant execute on function public.salvar_avatar(jsonb) to authenticated;

-- O convidado. Sem conta, sem e-mail, sem senha: só um id sorteado no
-- navegador e um nick descartável. Ele joga e as partidas dele contam para a
-- análise — marcadas como de convidado — mas nada disso o segue para outro
-- aparelho, e é isso que a tela avisa antes de entrar.
create function public.criar_convidado(p_nick text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nick text := lower(trim(coalesce(p_nick, '')));
  v_id   uuid;
begin
  if v_nick !~ '^[a-z0-9_-]{2,16}$' then
    raise exception 'Nick de convidado inválido.' using errcode = '22023';
  end if;
  insert into public.players (nick, convidado) values (v_nick, true) returning id into v_id;
  insert into public.saves (player_id) values (v_id);
  return v_id;
exception
  when unique_violation then
    -- sorteio repetido: quem chamou tenta de novo com outro sufixo
    raise exception 'Nick de convidado já em uso.' using errcode = '23505';
end;
$$;

grant execute on function public.criar_convidado(text) to anon, authenticated;

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

grant execute on function public.estatisticas_gerais() to anon, authenticated;

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

grant execute on function public.cartas_jogadas() to anon, authenticated;

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

grant execute on function public.cartas_fatais() to anon, authenticated;

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

grant execute on function public.escolhas_de_evento() to anon, authenticated;

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

grant execute on function public.estresse_por_dia() to anon, authenticated;

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

grant execute on function public.cartas_encalhadas() to anon, authenticated;

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

grant execute on function public.estatisticas_nerds() to anon, authenticated;

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
  -- quem entrou pelo Google e ainda não escolheu nick não tem o que mostrar
  where r.visivel and r.outcome <> 'abandono' and p.nick is not null
  group by p.nick
  order by vitorias desc, total_runs desc;
$$;

grant execute on function public.ranking() to anon, authenticated;

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

grant execute on function public.meus_jogos(uuid) to anon, authenticated;

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

grant execute on function public.jogo_detalhe(bigint, uuid) to anon, authenticated;


-- ------------------------------------------------------------- feedbacks
--
-- Nenhuma destas tabelas tem grant nem política: tudo passa por aqui. Cada
-- função devolve só o que a tela mostra (nick do autor, nunca e-mail) e
-- confere por dentro quem está pedindo. O resumo das regras:
--
--   ler        · qualquer um, convidado incluído
--   criar      · só com conta (é o motivo de existir login)
--   editar     · o autor, ou o admin
--   excluir    · o autor, ou o admin
--   comentar   · qualquer um com conta; a resposta do admin sai marcada
--   status, urgência, nota · só o admin
--
-- Toda ação do admin gera notificação para o autor, e todo comentário do
-- autor gera notificação para os admins.

-- a lista, com filtro opcional por status e por tipo
create function public.listar_feedbacks(p_status text default null, p_tipo text default null)
returns table (
  id            bigint,
  tipo          text,
  titulo        text,
  corpo         text,
  status        text,
  urgencia      text,
  nota          smallint,
  pagina        text,
  criado_em     timestamptz,
  atualizado_em timestamptz,
  autor_nick    text,
  comentarios   bigint,
  meu           boolean
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    f.id, f.tipo, f.titulo, f.corpo, f.status, f.urgencia, f.nota, f.pagina,
    f.criado_em, f.atualizado_em,
    coalesce(p.nick, 'anônimo')                       as autor_nick,
    (select count(*) from public.feedback_comentarios c where c.feedback_id = f.id) as comentarios,
    f.autor_id is not distinct from auth.uid()        as meu
  from public.feedbacks f
  left join public.players p on p.id = f.autor_id
  where (p_status is null or f.status = p_status)
    and (p_tipo   is null or f.tipo   = p_tipo)
  -- o que está em andamento no topo, depois o mais novo
  order by
    case f.status
      when 'em_andamento' then 0 when 'triado' then 1 when 'novo' then 2
      when 'feito' then 3 else 4 end,
    case f.urgencia
      when 'critica' then 0 when 'alta' then 1 when 'media' then 2 else 3 end,
    f.criado_em desc;
$$;

grant execute on function public.listar_feedbacks(text, text) to anon, authenticated;

create function public.comentarios_do_feedback(p_id bigint)
returns table (
  id         bigint,
  corpo      text,
  de_admin   boolean,
  criado_em  timestamptz,
  autor_nick text,
  meu        boolean
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    c.id, c.corpo, c.de_admin, c.criado_em,
    coalesce(p.nick, 'anônimo') as autor_nick,
    c.autor_id is not distinct from auth.uid() as meu
  from public.feedback_comentarios c
  left join public.players p on p.id = c.autor_id
  where c.feedback_id = p_id
  order by c.criado_em;
$$;

grant execute on function public.comentarios_do_feedback(bigint) to anon, authenticated;

-- O que evita a enxurrada de relatos repetidos: antes de gravar, a tela
-- pergunta ao banco se já existe coisa parecida e mostra o que achou. A
-- semelhança é de trigrama (pg_trgm) sobre título e corpo — erro de digitação
-- e sinônimo parcial ainda casam, que é o ponto.
create function public.feedbacks_parecidos(p_titulo text, p_corpo text)
returns table (
  id         bigint,
  tipo       text,
  titulo     text,
  status     text,
  criado_em  timestamptz,
  autor_nick text,
  semelhanca real
)
language sql
security definer
stable
-- `extensions` junto: é onde o Supabase põe o pg_trgm, e sem ele a função
-- falharia com "function similarity(text, text) does not exist"
set search_path = public, extensions, pg_temp
as $$
  select
    f.id, f.tipo, f.titulo, f.status, f.criado_em,
    coalesce(p.nick, 'anônimo') as autor_nick,
    greatest(
      similarity(f.titulo, coalesce(p_titulo, '')),
      similarity(f.titulo || ' ' || f.corpo, coalesce(p_titulo, '') || ' ' || coalesce(p_corpo, ''))
    ) as semelhanca
  from public.feedbacks f
  left join public.players p on p.id = f.autor_id
  where greatest(
      similarity(f.titulo, coalesce(p_titulo, '')),
      similarity(f.titulo || ' ' || f.corpo, coalesce(p_titulo, '') || ' ' || coalesce(p_corpo, ''))
    ) >= 0.22
  order by semelhanca desc
  limit 5;
$$;

grant execute on function public.feedbacks_parecidos(text, text) to anon, authenticated;

create function public.criar_feedback(p_tipo text, p_titulo text, p_corpo text, p_pagina text)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id bigint;
begin
  -- o convidado não tem auth.uid(): relatar é o que só a conta dá
  if auth.uid() is null then
    raise exception 'Crie uma conta para relatar — é preciso saber com quem falar sobre o relato.'
      using errcode = '42501';
  end if;

  insert into public.feedbacks (autor_id, tipo, titulo, corpo, pagina)
  values (auth.uid(), p_tipo, trim(p_titulo), trim(p_corpo), nullif(trim(coalesce(p_pagina, '')), ''))
  returning id into v_id;

  -- o admin fica sabendo sem precisar ficar atualizando a página
  insert into public.notificacoes (destinatario_id, tipo, titulo, corpo, feedback_id)
  select a.id, 'feedback_novo', 'Relato novo: ' || trim(p_titulo), null, v_id
  from public.players a
  where a.admin and a.id <> auth.uid();

  return v_id;
end;
$$;

grant execute on function public.criar_feedback(text, text, text, text) to authenticated;

create function public.editar_feedback(p_id bigint, p_tipo text, p_titulo text, p_corpo text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.feedbacks
    where id = p_id and (autor_id = auth.uid() or public.sou_admin())
  ) then
    raise exception 'Só o autor (ou o admin) edita este relato.' using errcode = '42501';
  end if;

  update public.feedbacks
  set tipo = p_tipo, titulo = trim(p_titulo), corpo = trim(p_corpo), atualizado_em = now()
  where id = p_id;
end;
$$;

grant execute on function public.editar_feedback(bigint, text, text, text) to authenticated;

create function public.excluir_feedback(p_id bigint)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.feedbacks
    where id = p_id and (autor_id = auth.uid() or public.sou_admin())
  ) then
    raise exception 'Só o autor (ou o admin) exclui este relato.' using errcode = '42501';
  end if;
  delete from public.feedbacks where id = p_id;
end;
$$;

grant execute on function public.excluir_feedback(bigint) to authenticated;

create function public.comentar_feedback(p_id bigint, p_corpo text)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin  boolean := public.sou_admin();
  v_autor  uuid;
  v_titulo text;
  v_id     bigint;
begin
  if auth.uid() is null then
    raise exception 'Crie uma conta para comentar.' using errcode = '42501';
  end if;
  select autor_id, titulo into v_autor, v_titulo from public.feedbacks where id = p_id;
  if v_titulo is null then
    raise exception 'Este relato não existe mais.' using errcode = '02000';
  end if;

  insert into public.feedback_comentarios (feedback_id, autor_id, corpo, de_admin)
  values (p_id, auth.uid(), trim(p_corpo), v_admin)
  returning id into v_id;

  -- responder JÁ É a triagem: um relato que o admin comentou não pode
  -- continuar dizendo "chegou e ainda não foi lido com calma"
  update public.feedbacks
  set atualizado_em = now(),
      status = case when v_admin and status = 'novo' then 'triado' else status end
  where id = p_id;

  if v_admin then
    -- resposta do admin: avisa o autor
    insert into public.notificacoes (destinatario_id, tipo, titulo, corpo, feedback_id)
    select v_autor, 'comentario_admin', 'Responderam seu relato: ' || v_titulo, trim(p_corpo), p_id
    where v_autor is not null and v_autor <> auth.uid();
  else
    -- resposta do jogador: avisa os admins
    insert into public.notificacoes (destinatario_id, tipo, titulo, corpo, feedback_id)
    select a.id, 'comentario_autor', 'Comentário novo em: ' || v_titulo, trim(p_corpo), p_id
    from public.players a
    where a.admin and a.id <> auth.uid();
  end if;

  return v_id;
end;
$$;

grant execute on function public.comentar_feedback(bigint, text) to authenticated;

-- Status, urgência e nota são do admin e de mais ninguém. Passar nulo em
-- qualquer um deles quer dizer "não mexa neste campo".
create function public.admin_atualizar_feedback(
  p_id bigint, p_status text, p_urgencia text, p_nota smallint
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_autor  uuid;
  v_titulo text;
  v_antes  text;
begin
  if not public.sou_admin() then
    raise exception 'Só o admin muda status, urgência e nota.' using errcode = '42501';
  end if;

  select autor_id, titulo, status into v_autor, v_titulo, v_antes
  from public.feedbacks where id = p_id;
  if v_titulo is null then
    raise exception 'Este relato não existe mais.' using errcode = '02000';
  end if;

  update public.feedbacks
  set status        = coalesce(p_status, status),
      urgencia      = coalesce(p_urgencia, urgencia),
      nota          = coalesce(p_nota, nota),
      atualizado_em = now()
  where id = p_id;

  -- A nota vira ponto. Ninguém gasta ponto ainda; recalcular a soma toda vez
  -- (em vez de somar a diferença) deixa a conta certa mesmo quando o admin
  -- muda uma nota antiga.
  if v_autor is not null then
    update public.players p
    set pontos = coalesce((
      select sum(f.nota) * 10 from public.feedbacks f
      where f.autor_id = p.id and f.nota is not null
    ), 0)
    where p.id = v_autor;

    insert into public.notificacoes (destinatario_id, tipo, titulo, corpo, feedback_id)
    select
      v_autor, 'feedback_atualizado',
      'Seu relato mudou de estado: ' || v_titulo,
      coalesce('Agora está como "' || p_status || '".', 'O admin atualizou o relato.'),
      p_id
    where v_autor <> auth.uid()
      and (p_status is distinct from null or p_nota is distinct from null);
  end if;
end;
$$;

grant execute on function public.admin_atualizar_feedback(bigint, text, text, smallint) to authenticated;

-- --------------------------------------------------------- notificações

create function public.minhas_notificacoes()
returns table (
  id          bigint,
  tipo        text,
  titulo      text,
  corpo       text,
  feedback_id bigint,
  lida_em     timestamptz,
  criado_em   timestamptz
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select n.id, n.tipo, n.titulo, n.corpo, n.feedback_id, n.lida_em, n.criado_em
  from public.notificacoes n
  where n.destinatario_id = auth.uid()
  order by n.criado_em desc
  limit 50;
$$;

grant execute on function public.minhas_notificacoes() to authenticated;

create function public.marcar_notificacoes_lidas()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.notificacoes
  set lida_em = now()
  where destinatario_id = auth.uid() and lida_em is null;
$$;

grant execute on function public.marcar_notificacoes_lidas() to authenticated;

-- ------------------------------------------------------------------ admin
-- Não existe tela para promover ninguém, e é de propósito: admin se dá aqui,
-- no SQL Editor, com o e-mail na mão. Troque pelo seu e rode esta linha uma
-- vez, DEPOIS de criar a conta pelo site.
--
--   update public.players set admin = true where email = 'voce@exemplo.com';

-- ------------------------------------------------------------ cache da API
-- O PostgREST (a API que a supabase-js chama) guarda o formato das tabelas em
-- cache. Coluna recém-criada que ele ainda não enxergou faz o insert falhar
-- com "column ... does not exist" mesmo estando lá no banco. Normalmente o
-- Supabase recarrega sozinho; este aviso garante.
notify pgrst, 'reload schema';
