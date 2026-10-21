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
-- uuid-ossp dá o `uuid_generate_v5`: é com ele que os ids antigos (o nome da
-- carta, o número da run) viram uuid na v0.35, a mesma conta que o site faz
create schema if not exists extensions;
create extension if not exists "uuid-ossp" with schema extensions;
-- o crypt() que confere a senha de quem entra pelo nick (`email_para_entrar`)
create extension if not exists pgcrypto with schema extensions;

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
-- o avatar é uma RECEITA, não uma imagem: um punhado de escolhas que o site
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
  -- o id é sorteado pelo SITE (`crypto.randomUUID()` em `createRun`), e é
  -- ele que impede a mesma run de ser gravada duas vezes (duas abas, uma
  -- retentativa de rede): a segunda esbarra na chave primária. Até a v0.34
  -- era um número do banco, e o uuid do site morava ao lado, em `run_id`
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid references public.players (id) on delete set null,
  ended_at     timestamptz not null default now(),
  outcome      text not null check (outcome in ('vitoria', 'burnout', 'demissao', 'despejo')),
  day          smallint not null check (day between 1 and 20),
  money        integer not null,
  week_reached smallint not null check (week_reached between 1 and 4)
);

-- migração para bancos que já tinham a tabela antes desta coluna: details
-- guarda o dia-a-dia da run, para "meus jogos" reabrir a partida jogada por
-- jogada.
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
-- em que versão do baralho a run foi jogada. Fica em coluna própria, e não só
-- dentro de `details`, porque é por ela que a análise separa "antes e depois
-- do ajuste" — comparar o desfecho de runs de balanceamentos diferentes é
-- comparar dois jogos. Zero é a run gravada antes de isto existir.
-- O retrato das cartas em si (nome, custo e texto como eram naquele dia) vai
-- em `details.baralho`: é o que mantém o replay verdadeiro depois de a carta
-- mudar ou sumir, e é a única parte que NÃO dá para preencher depois.
alter table public.runs add column if not exists versao_baralho smallint not null default 0;
-- em que modo de jogo a run foi jogada. Sem isto, comparar no mesmo gráfico
-- uma run de aluguel 300 com uma de 380 mentiria sobre as duas.
-- (o id do modo é um uuid desde a v0.35: este é o do `normal`)
alter table public.runs add column if not exists modo uuid not null default '2759c081-3c2b-5337-8363-13d0ba85a73e';
alter table public.runs alter column modo set default '2759c081-3c2b-5337-8363-13d0ba85a73e';

-- 'abandono' é o quinto desfecho: a run que o jogador reiniciou no meio. Não é
-- derrota (ninguém foi demitido), mas é o dado que diz o que faz desistir.
alter table public.runs drop constraint if exists runs_outcome_check;
alter table public.runs add constraint runs_outcome_check
  check (outcome in ('vitoria', 'burnout', 'demissao', 'despejo', 'abandono'));


-- ------------------------------------------------------------- feedbacks
--
-- O motivo de existir login. Todo bug e toda sugestão viram uma linha aqui,
-- pública para ler e dona para editar. O fluxo é o mesmo dos dois lados: o
-- jogador escreve e acompanha; o admin triava, comenta, muda status,
-- urgência e dá uma nota.
create table if not exists public.feedbacks (
  id       uuid primary key default gen_random_uuid(),
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
  id          uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedbacks (id) on delete cascade,
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
  id              uuid primary key default gen_random_uuid(),
  destinatario_id uuid not null references public.players (id) on delete cascade,
  tipo            text not null,
  titulo          text not null,
  corpo           text,
  feedback_id     uuid references public.feedbacks (id) on delete cascade,
  lida_em         timestamptz,
  criado_em       timestamptz not null default now()
);

create index if not exists notificacoes_dono_idx on public.notificacoes (destinatario_id, lida_em);

-- ------------------------------------------------------------- amizades
-- Uma linha por pedido: `de` pediu, `para` recebe. Aceitar vira o estado, e
-- recusar ou desfazer APAGA a linha — amizade desfeita não é histórico que
-- alguém precise ler. O par é único nos dois sentidos, mas isso quem garante
-- é `pedir_amizade()`: se o outro lado já tinha pedido, o pedido de volta é
-- um aceite, e não uma segunda linha.
--
-- Convidado não entra: ele não tem conta para receber o aviso, e o perfil
-- dele some quando ele sai.
create table if not exists public.amizades (
  de        uuid not null references public.players (id) on delete cascade,
  para      uuid not null references public.players (id) on delete cascade,
  estado    text not null default 'pendente' check (estado in ('pendente', 'aceita')),
  criada_em timestamptz not null default now(),
  aceita_em timestamptz,
  primary key (de, para),
  check (de <> para)
);

create index if not exists amizades_para_idx on public.amizades (para, estado);

-- ------------------------------------------------------------- conquistas
-- O que existe para ganhar, e quem ganhou o quê. A lista mora aqui (e não no
-- site) porque é o banco quem confere: a checagem sai de `runs.details` e das
-- colunas de `runs`, do mesmo jeito que `cartas_fatais()` — nenhum contador
-- novo no motor. `premio` fica nulo por enquanto: é onde o cosmético que a
-- conquista destrava (um crachá, uma caneca) vai morar, sem migração nova.
create table if not exists public.conquistas (
  id        uuid primary key,
  nome      text not null,
  descricao text not null,
  icone     text not null,
  ordem     smallint not null default 0,
  premio    text
);

create table if not exists public.conquistas_do_jogador (
  player_id   uuid not null references public.players (id) on delete cascade,
  conquista   uuid not null references public.conquistas (id) on delete cascade,
  run_id      uuid references public.runs (id) on delete set null,
  ganha_em    timestamptz not null default now(),
  primary key (player_id, conquista)
);

-- v0.34: conquista OCULTA (o nome e o como-se-ganha só aparecem depois de
-- ganha), conquista em NÍVEIS (o mesmo `grupo`, com `nivel` 1, 2 e 3 —
-- bronze, prata e ouro), e os TOKENS que cada uma dá. Os tokens são pagos
-- no site, na coleção (`conquistasPagas`), porque é lá que o saldo mora
alter table public.conquistas add column if not exists oculta boolean not null default false;
alter table public.conquistas add column if not exists tokens smallint not null default 10;
alter table public.conquistas add column if not exists grupo  text;
alter table public.conquistas add column if not exists nivel  smallint;

-- v0.35: TODO id vira uuid. O que era número (runs, feedbacks, comentários,
-- notificações) ganha um uuid sorteado, e as chaves estrangeiras são
-- refeitas por ele; a run usa o uuid que o site já sorteava (`run_id`). O que
-- era nome (as conquistas) vira o uuid v5 do nome, com o prefixo
-- `conquista:` — a mesma conta de `src/game/ids.ts`, e é por ela que o site
-- traduz o id antigo guardado em `conquistasPagas`.
--
-- Roda quantas vezes for preciso: cada parte confere se ainda há o que
-- fazer (a coluna ainda é bigint, o id ainda não é uuid).
do $$
declare
  ns constant uuid := '3336ec3e-fbe1-4dfb-9b02-794d74311adc';
  re constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  t  text;
begin
  -- a run: o id passa a ser o uuid que o site sorteou
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'runs' and column_name = 'id') = 'bigint' then
    alter table public.runs add column if not exists run_id uuid;
    update public.runs set run_id = gen_random_uuid() where run_id is null;
    alter table public.conquistas_do_jogador add column run_novo uuid;
    update public.conquistas_do_jogador j set run_novo = r.run_id
      from public.runs r where r.id = j.run_id;
    alter table public.conquistas_do_jogador drop column run_id;
    alter table public.conquistas_do_jogador rename column run_novo to run_id;
    drop index if exists public.runs_run_id_idx;
    alter table public.runs drop column id;
    alter table public.runs rename column run_id to id;
    alter table public.runs alter column id set default gen_random_uuid();
    alter table public.runs add primary key (id);
    alter table public.conquistas_do_jogador add constraint conquistas_do_jogador_run_id_fkey
      foreign key (run_id) references public.runs (id) on delete set null;
  end if;

  -- o relato: o uuid novo desce para os comentários e as notificações
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'feedbacks' and column_name = 'id') = 'bigint' then
    alter table public.feedbacks add column id_novo uuid not null default gen_random_uuid();
    alter table public.feedback_comentarios add column feedback_novo uuid;
    update public.feedback_comentarios c set feedback_novo = f.id_novo
      from public.feedbacks f where f.id = c.feedback_id;
    alter table public.notificacoes add column feedback_novo uuid;
    update public.notificacoes n set feedback_novo = f.id_novo
      from public.feedbacks f where f.id = n.feedback_id;
    alter table public.feedback_comentarios drop column feedback_id;
    alter table public.notificacoes drop column feedback_id;
    alter table public.feedback_comentarios rename column feedback_novo to feedback_id;
    alter table public.notificacoes rename column feedback_novo to feedback_id;
    alter table public.feedbacks drop column id;
    alter table public.feedbacks rename column id_novo to id;
    alter table public.feedbacks add primary key (id);
    alter table public.feedback_comentarios alter column feedback_id set not null;
    alter table public.feedback_comentarios add constraint feedback_comentarios_feedback_id_fkey
      foreign key (feedback_id) references public.feedbacks (id) on delete cascade;
    alter table public.notificacoes add constraint notificacoes_feedback_id_fkey
      foreign key (feedback_id) references public.feedbacks (id) on delete cascade;
    create index if not exists comentarios_feedback_idx on public.feedback_comentarios (feedback_id);
  end if;

  -- as que ninguém aponta: só trocar
  foreach t in array array['feedback_comentarios', 'notificacoes'] loop
    if (select data_type from information_schema.columns
        where table_schema = 'public' and table_name = t and column_name = 'id') = 'bigint' then
      execute format('alter table public.%I add column id_novo uuid not null default gen_random_uuid()', t);
      execute format('alter table public.%I drop column id', t);
      execute format('alter table public.%I rename column id_novo to id', t);
      execute format('alter table public.%I add primary key (id)', t);
    end if;
  end loop;

  -- a conquista: o nome vira o uuid do nome. A chave estrangeira sai e volta
  -- porque a tabela de quem ganhou e a lista mudam juntas
  alter table public.conquistas_do_jogador drop constraint if exists conquistas_do_jogador_conquista_fkey;
  update public.conquistas_do_jogador
    set conquista = extensions.uuid_generate_v5(ns, 'conquista:' || conquista)
    where conquista::text !~ re;
  update public.conquistas
    set id = extensions.uuid_generate_v5(ns, 'conquista:' || id)
    where id::text !~ re;
  alter table public.conquistas_do_jogador add constraint conquistas_do_jogador_conquista_fkey
    foreign key (conquista) references public.conquistas (id) on delete cascade;
end;
$$;

-- a lista em si: rodar o arquivo de novo atualiza o texto sem perder quem
-- já ganhou. O id é o uuid do nome antigo (`conquista:<nome>`), que fica no
-- comentário de cada linha. O `colecionador` antigo virou o bronze do grupo: quem já o
-- tinha continua com ele
insert into public.conquistas (id, nome, descricao, icone, ordem, oculta, tokens, grupo, nivel) values
  ('87fda2d8-dd38-5831-8d40-8e3603c10b81', /* primeira-semana */ 'Sobreviveu à primeira semana', 'Chegar à semana 2 de algum mês.', 'calendar', 1, false, 10, null, null),
  ('5c3894eb-657e-55a6-b947-b239cbb45244', /* mes-fechado */ 'Mês fechado',                  'Chegar ao fim das quatro semanas empregado e com as contas pagas.', 'trophy', 2, false, 20, null, null),
  ('6616e645-61d3-535c-8173-3e3a579c2e91', /* ficha-limpa */ 'Ficha limpa',                  'Fechar um mês sem nenhuma advertência.', 'shield', 3, false, 25, null, null),
  ('c3d0035f-1c26-56f8-9290-7d65096d6552', /* zen */ 'Zen',                          'Fechar um mês com o estresse em 3 ou menos.', 'leaf', 4, false, 25, null, null),
  ('c22fd9f3-3e96-5262-b386-ae57a8157a4b', /* embalo */ 'No embalo',                    'Jogar 4 cartas seguidas da mesma classe num dia.', 'flame', 5, false, 15, null, null),
  ('d474304c-310f-5ecd-bb91-ca9542212dc0', /* rico */ 'Pé-de-meia',                   'Terminar uma partida com R$ 1.000 ou mais.', 'piggy', 6, false, 20, null, null),
  ('2736b724-e383-574e-8099-3f2a5600326a', /* colecionador */ 'Colecionador',                 'Ter 12 cartas diferentes na coleção.', 'layers', 10, false, 10, 'colecionador', 1),
  ('871d6dbb-7839-5353-9f39-65db5f5e03b2', /* colecionador-prata */ 'Colecionador',                 'Ter 24 cartas diferentes na coleção.', 'layers', 11, false, 25, 'colecionador', 2),
  ('56b1b525-d1c5-59d5-9a39-0820250457d2', /* colecionador-ouro */ 'Colecionador',                 'Ter 40 cartas diferentes na coleção.', 'layers', 12, false, 50, 'colecionador', 3),
  ('cf8cbc2c-447b-5e1f-8483-e4ba42eec8e1', /* veterano */ 'Veterano',                     'Terminar 10 partidas.', 'calendar', 13, false, 10, 'veterano', 1),
  ('c54ee3e8-d73d-539c-94ec-d1dfd71282e8', /* veterano-prata */ 'Veterano',                     'Terminar 50 partidas.', 'calendar', 14, false, 25, 'veterano', 2),
  ('645ffe11-2bce-59f2-8fbb-9318e409681d', /* veterano-ouro */ 'Veterano',                     'Terminar 150 partidas.', 'calendar', 15, false, 50, 'veterano', 3),
  ('93dcac53-a809-552c-9969-b1c4c96d9c2f', /* funcionario */ 'Funcionário do mês',           'Fechar 3 meses.', 'trophy', 16, false, 10, 'funcionario', 1),
  ('1e465b87-72e7-5457-8ac1-367e774e9755', /* funcionario-prata */ 'Funcionário do mês',           'Fechar 10 meses.', 'trophy', 17, false, 25, 'funcionario', 2),
  ('91e42b9e-8a3d-540c-94e2-e613bfba09ad', /* funcionario-ouro */ 'Funcionário do mês',           'Fechar 25 meses.', 'trophy', 18, false, 50, 'funcionario', 3),
  ('c14565ac-b92b-517c-823a-4c21e67f6325', /* segunda-feira */ 'Nem chegou a terça',           'Ter um burnout logo no primeiro dia.', 'skull', 30, true, 20, null, null),
  ('85672f2a-90fe-5024-bccd-f0700a610028', /* despejado */ 'Despejado',                    'Não conseguir pagar as contas de sexta.', 'piggy', 31, true, 20, null, null),
  ('371c2c6d-4adb-5025-a0b0-6856dd15290b', /* justa-causa */ 'Justa causa',                  'Ser demitido com três advertências.', 'skull', 32, true, 20, null, null),
  ('18877d78-e990-5859-840d-ac0516800243', /* por-um-fio */ 'Por um fio',                   'Fechar um mês com o estresse em 9.', 'flame', 33, true, 30, null, null)
on conflict (id) do update
  set nome = excluded.nome, descricao = excluded.descricao, icone = excluded.icone, ordem = excluded.ordem,
      oculta = excluded.oculta, tokens = excluded.tokens, grupo = excluded.grupo, nivel = excluded.nivel;

-- ------------------------------------------------------------- o catálogo
-- As cartas saíram do código e vieram para cá. O que torna isso seguro é que
-- NADA é apagado de verdade: excluir uma carta é `ativa = false` mais uma
-- linha em `cartas_antigas` com o último formato que ela teve. Assim uma run
-- em andamento que tem a carta na mão continua jogável, e um replay antigo
-- continua com nome e custo para mostrar.
--
-- A outra metade da proteção não está aqui: é o retrato que cada run guarda
-- de si mesma em `runs.details.baralho`. Estas tabelas dizem o que a carta é
-- HOJE; o retrato diz o que ela era naquele dia, e é ele que manda no replay.
create table if not exists public.cartas (
  id            uuid primary key,
  nome          text not null,
  custo         smallint not null default 0,
  -- null é carta NEUTRA, sem classe: não entra em embalo e nenhum evento de
  -- bloqueio de classe a alcança
  classe        text,
  texto         text not null default '',
  efeitos       jsonb not null default '[]'::jsonb,
  restricao     jsonb,
  especial      boolean not null default false,
  inicial       boolean not null default false,
  copias        smallint,
  versao        smallint not null default 1,
  ativa         boolean not null default true,
  criada_em     timestamptz not null default now(),
  atualizada_em timestamptz not null default now(),
  constraint cartas_classe_ok check (
    classe is null or classe in ('tarefa', 'descanso', 'grana', 'social')
  ),
  constraint cartas_custo_ok  check (custo between 0 and 20),
  constraint cartas_copias_ok check (copias is null or copias between 1 and 10)
);

-- v0.15: raridade (quantas cópias cabem na coleção, e quão cedo a carta sai
-- na recompensa de fim de run) e custo em dinheiro (a carta que se PAGA, como
-- a Terapia: sem saldo ela não sai da mão).
--
-- A raridade das cartas que já existiam é dada UMA vez, no bloco que cria a
-- coluna: rodar o arquivo de novo não pode desfazer o que o admin escolheu
-- depois no /lab.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'cartas' and column_name = 'raridade'
  ) then
    alter table public.cartas add column raridade text not null default 'comum';
    update public.cartas set raridade = 'incomum'
      where id::text in ('terapia', 'home-office', 'foco-total', 'freela-grande');
    update public.cartas set raridade = 'rara'
      where id::text in ('cafe-duplo', 'puxar-o-saco', 'automatizar', 'pedir-aumento');
  end if;
end;
$$;
alter table public.cartas add column if not exists custo_dinheiro smallint not null default 0;
alter table public.cartas drop constraint if exists cartas_raridade_ok;
alter table public.cartas add constraint cartas_raridade_ok
  check (raridade in ('comum', 'incomum', 'rara', 'epica', 'lendaria'));
alter table public.cartas drop constraint if exists cartas_custo_dinheiro_ok;
alter table public.cartas add constraint cartas_custo_dinheiro_ok
  check (custo_dinheiro between 0 and 1000);

-- v0.17: o custo além da energia virou LISTA (`[{qual, quanto}]`): dinheiro,
-- estresse, produtividade. Carta que custa estresse não pede coluna nova.
-- `custo_dinheiro` continua, espelhando a parte em R$ da lista — é o que o
-- site antigo (e o banco que não rodou isto) ainda lê. A cópia do custo_dinheiro
-- para a lista roda UMA vez, no bloco que cria a coluna.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'cartas' and column_name = 'custos'
  ) then
    alter table public.cartas add column custos jsonb not null default '[]'::jsonb;
    update public.cartas
      set custos = jsonb_build_array(jsonb_build_object('qual', 'dinheiro', 'quanto', custo_dinheiro))
      where custo_dinheiro > 0;
  end if;
end;
$$;

create table if not exists public.cartas_evento (
  id            uuid primary key,
  nome          text not null,
  tom           text not null,
  texto         text not null default '',
  efeitos       jsonb not null default '[]'::jsonb,
  -- null = evento direto; um array de 2 = evento ambíguo, que pergunta
  escolhas      jsonb,
  versao        smallint not null default 1,
  ativa         boolean not null default true,
  criada_em     timestamptz not null default now(),
  atualizada_em timestamptz not null default now(),
  constraint eventos_tom_ok check (tom in ('negativo', 'positivo', 'ambiguo'))
);

-- Versões antigas E cartas excluídas, na mesma tabela de propósito: as duas
-- respondem a mesma pergunta ("como era antes?"), e separá-las obrigaria a
-- procurar em dois lugares para montar um histórico.
--
-- `o_que` e `porque` são o motivo de esta tabela não ser um `diff`
-- automático. Um diff sabe dizer "custo 4 → 6"; só uma pessoa sabe dizer
-- "porque Freela → Hora Extra fechava a semana 1 sozinha", e é essa metade
-- que vira Novidades e histórico da carta.
create table if not exists public.cartas_antigas (
  id        uuid primary key default gen_random_uuid(),
  carta_id  uuid not null,
  familia   text not null,
  versao    smallint not null,
  -- a carta INTEIRA como ela era, para a excluída ainda ter o que mostrar
  dados     jsonb not null,
  tipo      text not null,
  o_que     text not null default '',
  porque    text not null default '',
  criada_em timestamptz not null default now(),
  constraint antigas_familia_ok check (familia in ('acao', 'evento', 'modo')),
  constraint antigas_tipo_ok    check (tipo in ('criada', 'ajustada', 'removida'))
);


-- v0.35: o id da carta e do evento virou UUID. Era o nome em hífens
-- (`hora-extra`), e renomear a carta deixava o id contando o nome velho.
--
-- O uuid novo é o uuid v5 do id antigo, num espaço de nomes FIXO — a mesma
-- conta que o site faz em `src/game/ids.ts`. Por isso não existe tabela de
-- tradução: o site chega ao mesmo uuid sozinho, e é ele que traduz, NA
-- LEITURA, o id antigo que mora nos saves, nas runs gravadas e no
-- localStorage de cada um. Aqui só se reescreve o catálogo, que é de onde os
-- uuids nascem. `id_antigo` fica para o site reconhecer, nos dados antigos,
-- as cartas que o admin criou no lab antes disto (essas o código não conhece).
--
-- Roda quantas vezes for preciso: só toca no que ainda não é uuid. E NÃO
-- mude o espaço de nomes: com outro, o mesmo id antigo daria outro uuid.
alter table public.cartas        add column if not exists id_antigo text;
alter table public.cartas_evento add column if not exists id_antigo text;

do $$
declare
  ns constant uuid := '3336ec3e-fbe1-4dfb-9b02-794d74311adc';
  re constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  -- o histórico: a chave e a carta guardada inteira (é ela que "Usar esta"
  -- devolve ao editor). O modo não é carta, e fica como está
  update public.cartas_antigas
    set carta_id = extensions.uuid_generate_v5(ns, carta_id::text)
    where familia in ('acao', 'evento') and carta_id::text !~ re;
  update public.cartas_antigas
    set dados = jsonb_set(dados, '{id}', to_jsonb(extensions.uuid_generate_v5(ns, dados ->> 'id')::text))
    where familia in ('acao', 'evento')
      and jsonb_typeof(dados) = 'object'
      and dados ->> 'id' is not null
      and dados ->> 'id' !~ re;

  update public.cartas
    set id_antigo = id, id = extensions.uuid_generate_v5(ns, id::text)
    where id::text !~ re;
  update public.cartas_evento
    set id_antigo = id, id = extensions.uuid_generate_v5(ns, id::text)
    where id::text !~ re;

  -- e o número da linha do histórico também vira uuid. A ordem do histórico
  -- era a desse número; hoje é a data, e a versão dentro do mesmo dia
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'cartas_antigas' and column_name = 'id') = 'bigint' then
    alter table public.cartas_antigas add column id_novo uuid not null default gen_random_uuid();
    alter table public.cartas_antigas drop column id;
    alter table public.cartas_antigas rename column id_novo to id;
    alter table public.cartas_antigas add primary key (id);
  end if;
end;
$$;

create index if not exists antigas_carta_idx on public.cartas_antigas (carta_id, criada_em desc, versao desc);

-- Uma linha só, para sempre. A versão do baralho é global: ela diz em que
-- balanceamento uma run foi jogada, e é isso que a torna comparável entre
-- runs. A `check` na chave primária é o truque que impede a segunda linha.
create table if not exists public.baralho (
  unica  boolean primary key default true,
  versao smallint not null default 1,
  constraint baralho_linha_unica check (unica)
);

insert into public.baralho (unica, versao) values (true, 1)
on conflict (unica) do nothing;

-- Os NÚMEROS do jogo: aluguel, cota, salário, energia base, quantos dias tem
-- o mês. Eles moravam soltos no código, o que queria dizer que mexer no
-- aluguel era publicar o site inteiro. Como modo de jogo, mexer no aluguel é
-- uma linha aqui.
--
-- As regras vão num `jsonb` só, e não em vinte colunas, de propósito:
-- acrescentar um botão de balanceamento novo não pode exigir uma migração —
-- e quem valida a forma é a leitura, no site, como no avatar.
--
-- Hoje existe só o `normal`. A estrutura é a mesma se um dia houver um
-- "difícil" ou um "sem dinheiro"; é por isso que ela nasce como tabela e não
-- como uma segunda linha da `baralho`.
create table if not exists public.modos (
  id            uuid primary key,
  nome          text not null,
  descricao     text not null default '',
  regras        jsonb not null,
  ativo         boolean not null default true,
  -- o modo em que uma run nova começa quando o jogador não escolheu nada
  padrao        boolean not null default false,
  versao        smallint not null default 1,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- v0.35: o id do modo é o uuid v5 de `modo:<nome antigo>` — o `normal` é
-- `2759c081-3c2b-5337-8363-13d0ba85a73e`. A run guarda o id do modo na coluna `modo`, e a linha do
-- histórico, em `carta_id`; o `details.modo` de cada run continua com o
-- nome, e quem traduz é o site, na leitura
do $$
declare
  ns constant uuid := '3336ec3e-fbe1-4dfb-9b02-794d74311adc';
  re constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  update public.cartas_antigas
    set carta_id = extensions.uuid_generate_v5(ns, 'modo:' || carta_id)
    where familia = 'modo' and carta_id::text !~ re;
  update public.cartas_antigas
    set dados = jsonb_set(dados, '{id}', to_jsonb(extensions.uuid_generate_v5(ns, 'modo:' || (dados ->> 'id'))::text))
    where familia = 'modo'
      and jsonb_typeof(dados) = 'object'
      and dados ->> 'id' is not null
      and dados ->> 'id' !~ re;
  update public.modos set id = extensions.uuid_generate_v5(ns, 'modo:' || id) where id::text !~ re;
  update public.runs  set modo = extensions.uuid_generate_v5(ns, 'modo:' || modo) where modo::text !~ re;

  -- e, com todo valor já em uuid, o TIPO da coluna vira uuid também: o que
  -- era nome não precisa mais caber num `text`. A conquista sai e volta da
  -- chave estrangeira porque as duas pontas mudam juntas
  alter table public.modos drop constraint if exists modos_id_ok;
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'cartas' and column_name = 'id') = 'text' then
    alter table public.cartas         alter column id       type uuid using id::uuid;
    alter table public.cartas_evento  alter column id       type uuid using id::uuid;
    alter table public.modos          alter column id       type uuid using id::uuid;
    alter table public.cartas_antigas alter column carta_id type uuid using carta_id::uuid;
    alter table public.runs alter column modo drop default;
    alter table public.runs alter column modo type uuid using modo::uuid;
    alter table public.runs alter column modo set default '2759c081-3c2b-5337-8363-13d0ba85a73e';
    alter table public.conquistas_do_jogador drop constraint if exists conquistas_do_jogador_conquista_fkey;
    alter table public.conquistas            alter column id        type uuid using id::uuid;
    alter table public.conquistas_do_jogador alter column conquista type uuid using conquista::uuid;
    alter table public.conquistas_do_jogador add constraint conquistas_do_jogador_conquista_fkey
      foreign key (conquista) references public.conquistas (id) on delete cascade;
  end if;
end;
$$;

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
alter table public.cartas               enable row level security;
alter table public.cartas_evento        enable row level security;
alter table public.cartas_antigas       enable row level security;
alter table public.baralho              enable row level security;
alter table public.modos                enable row level security;
alter table public.amizades             enable row level security;
alter table public.conquistas           enable row level security;
alter table public.conquistas_do_jogador enable row level security;

-- As quatro tabelas do catálogo entram na mesma regra: nenhuma política.
-- Ler o catálogo é público (todo mundo precisa das cartas para jogar, e
-- carta não é segredo), mas passa por `catalogo()`; escrever passa pelas
-- RPCs de admin, que conferem `sou_admin()` por dentro. Esconder o botão no
-- React não é permissão.

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
drop function if exists public.email_para_entrar(text, text);
drop function if exists public.admin_enviar_presente(text, text, text);
drop function if exists public.meus_presentes();
drop function if exists public.receber_presente(uuid);
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
drop function if exists public.perfil_publico(text);
drop function if exists public.jogos_do_jogador(text);
drop function if exists public.jogo_detalhe(bigint, uuid);
drop function if exists public.jogo_detalhe(uuid, uuid);
drop function if exists public.listar_feedbacks(text, text);
drop function if exists public.comentarios_do_feedback(bigint);
drop function if exists public.comentarios_do_feedback(uuid);
drop function if exists public.feedbacks_parecidos(text, text);
drop function if exists public.criar_feedback(text, text, text, text);
drop function if exists public.editar_feedback(bigint, text, text, text);
drop function if exists public.editar_feedback(uuid, text, text, text);
drop function if exists public.excluir_feedback(bigint);
drop function if exists public.excluir_feedback(uuid);
drop function if exists public.comentar_feedback(bigint, text);
drop function if exists public.comentar_feedback(uuid, text);
drop function if exists public.admin_atualizar_feedback(bigint, text, text, smallint);
drop function if exists public.admin_atualizar_feedback(uuid, text, text, smallint);
drop function if exists public.catalogo();
drop function if exists public.arquivar_carta(text, text, text, text, text);
drop function if exists public.arquivar_carta(uuid, text, text, text, text);
drop function if exists public.admin_salvar_carta(jsonb, text, text);
drop function if exists public.admin_salvar_evento(jsonb, text, text);
drop function if exists public.admin_excluir_carta(text, text, text);
drop function if exists public.admin_excluir_carta(uuid, text, text);
drop function if exists public.admin_semear_catalogo(jsonb, jsonb);
drop function if exists public.admin_semear_catalogo(jsonb, jsonb, jsonb);  -- saiu na v0.39: as cartas só moram no banco
drop function if exists public.admin_salvar_modo(jsonb, text, text);
drop function if exists public.admin_versoes(text);
drop function if exists public.minhas_notificacoes();
drop function if exists public.marcar_notificacoes_lidas();
drop function if exists public.jogo_publico(bigint);
drop function if exists public.jogo_publico(uuid);
drop function if exists public.pedir_amizade(text);
drop function if exists public.responder_amizade(text, boolean);
drop function if exists public.desfazer_amizade(text);
drop function if exists public.amizade_com(text);
drop function if exists public.meus_amigos();
drop function if exists public.pedidos_de_amizade();
drop function if exists public.conferir_conquistas(uuid);
drop function if exists public.minhas_conquistas(uuid);
drop function if exists public.conquistas_publicas(text);
drop function if exists public.conquistas_da_run(bigint);
drop function if exists public.conquistas_da_run(uuid);
drop function if exists public.colecao_de_amigo(text);

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

  -- o avatar vem junto do cadastro (sorteado a partir do gênero que a pessoa
  -- respondeu) e entra por aqui, e não por uma chamada do site depois: com a
  -- confirmação de e-mail ligada não existe sessão logo após o `signUp`, e
  -- uma chamada nesse momento seria recusada. Nulo é o manequim.
  insert into public.players (id, nick, nome, email, termos_em, avatar)
  values (
    new.id, v_nick, nullif(trim(coalesce(v_nome, '')), ''), new.email,
    case when (new.raw_user_meta_data ->> 'termos') = 'true' then now() end,
    new.raw_user_meta_data -> 'avatar'
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

-- Entrar pelo NICK (v0.38). O Auth só entende e-mail, então o site pede o
-- e-mail do nick — e devolver o e-mail de qualquer nick seria entregar o
-- e-mail de todo mundo a quem souber um nick, que é justamente o que a
-- seção de segurança proíbe. Por isso a função CONFERE A SENHA antes
-- (contra o hash do próprio Auth) e só devolve o e-mail a quem já poderia
-- entrar com ele. Errado ou inexistente devolve nulo, e as duas coisas são
-- iguais de fora: ninguém descobre quem tem conta aqui testando nicks.
--
-- Chamar esta função é tentar uma senha FORA do limite de tentativas do
-- Auth: daí o limite próprio, 10 por nick a cada 15 minutos.
create table if not exists public.tentativas_de_entrada (
  nick   text not null,
  quando timestamptz not null default now()
);
create index if not exists tentativas_de_entrada_nick_idx on public.tentativas_de_entrada (nick, quando);
-- sem política nem grant: só a função mexe nela
alter table public.tentativas_de_entrada enable row level security;

create function public.email_para_entrar(p_nick text, p_senha text)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_nick  text := lower(trim(coalesce(p_nick, '')));
  v_email text;
  v_hash  text;
begin
  delete from public.tentativas_de_entrada where quando < now() - interval '15 minutes';
  if (select count(*) from public.tentativas_de_entrada where nick = v_nick) >= 10 then
    raise exception 'Muitas tentativas com esse nick. Espere uns minutos ou entre pelo e-mail.'
      using errcode = '54000';
  end if;
  insert into public.tentativas_de_entrada (nick) values (v_nick);

  select u.email, u.encrypted_password into v_email, v_hash
  from public.players p
  join auth.users u on u.id = p.id
  where p.nick = v_nick and not p.convidado;

  if v_email is null or coalesce(v_hash, '') = '' then
    return null;
  end if;
  if extensions.crypt(coalesce(p_senha, ''), v_hash) <> v_hash then
    return null;
  end if;
  return v_email;
end;
$$;

grant execute on function public.email_para_entrar(text, text) to anon, authenticated;

-- ------------------------------------------------------------ presentes
-- O admin dá uma carta a um jogador (v0.40), e ela aparece na tela dele.
-- A carta não entra na coleção por aqui: a coleção mora em
-- `saves.collection`, e quem a escreve é o site. Esta tabela é o recado:
-- o site do jogador lê os presentes ainda não recebidos, marca como
-- recebido e só então põe a carta na coleção, num envelope que ele abre.
-- Sem política nem grant: só as funções mexem nela.
create table if not exists public.presentes (
  id          uuid primary key default gen_random_uuid(),
  para        uuid not null references public.players(id) on delete cascade,
  carta       uuid not null,
  mensagem    text,
  criado_em   timestamptz not null default now(),
  recebido_em timestamptz
);
create index if not exists presentes_para_idx on public.presentes (para) where recebido_em is null;
alter table public.presentes enable row level security;

-- Só admin, e só para quem tem conta: o convidado não tem como receber
-- (não tem `auth.uid()`), e o nick dele some quando ele sai.
create function public.admin_enviar_presente(p_nick text, p_carta text, p_mensagem text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_para  uuid;
  v_carta uuid;
  v_id    uuid;
begin
  if not public.sou_admin() then
    raise exception 'Só admin dá presente.';
  end if;
  select id into v_para from public.players
  where lower(nick) = lower(trim(coalesce(p_nick, ''))) and not convidado;
  if v_para is null then
    raise exception 'Ninguém com esse nick (convidado não recebe presente).';
  end if;
  if p_carta is null or p_carta !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'O id da carta é um uuid.';
  end if;
  v_carta := p_carta::uuid;
  if not exists (select 1 from public.cartas where id = v_carta and ativa) then
    raise exception 'Essa carta não está no jogo.';
  end if;
  insert into public.presentes (para, carta, mensagem)
  values (v_para, v_carta, nullif(left(trim(coalesce(p_mensagem, '')), 200), ''))
  returning id into v_id;
  return v_id;
end;
$$;

create function public.meus_presentes()
returns table (id uuid, carta uuid, mensagem text, criado_em timestamptz)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select id, carta, mensagem, criado_em from public.presentes
  where para = auth.uid() and recebido_em is null
  order by criado_em;
$$;

-- Devolve verdadeiro UMA vez por presente: é o que impede duas abas de
-- porem a mesma carta duas vezes na coleção.
create function public.receber_presente(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.presentes set recebido_em = now()
  where id = p_id and para = auth.uid() and recebido_em is null;
  return found;
end;
$$;

grant execute on function public.admin_enviar_presente(text, text, text) to authenticated;
grant execute on function public.meus_presentes() to authenticated;
grant execute on function public.receber_presente(uuid) to authenticated;

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
-- O avatar entrou na v0.14, por decisão do autor: ele já era público pelo
-- `perfil_publico()`, e o ranking só passou a desenhá-lo. É a ÚNICA coluna
-- acrescentada a esta exceção — nome, e-mail e pontos continuam fora.
create or replace function public.ranking()
returns table (
  nick            text,
  avatar          jsonb,
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
    p.avatar,
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
  -- convidado também fica de fora: o nick é sorteado (`convidado-a3f2`), o
  -- progresso some quando ele sai, e o placar se enchia de gente que não
  -- existe mais. As duas marcas, porque o perfil do convidado é apagável e a
  -- run guarda a dela na própria linha
  where r.visivel and r.outcome <> 'abandono' and p.nick is not null
    and not p.convidado and not r.convidado
  group by p.nick, p.avatar
  order by vitorias desc, total_runs desc;
$$;

grant execute on function public.ranking() to anon, authenticated;

-- as runs de UM jogador — não devolve nada de outro player_id. Desde a
-- v0.20 a lista é de RECIBOS, e o recibo resumido mostra o estresse final,
-- as cartas jogadas e os envelopes que a partida deu: os três saem do
-- `details` aqui, para a lista não baixar o dia a dia de cada partida
create or replace function public.meus_jogos(p_player_id uuid)
returns table (
  id           uuid,
  ended_at     timestamptz,
  outcome      text,
  day          smallint,
  money        integer,
  week_reached smallint,
  cards_played smallint,
  estresse     integer,
  envelopes    jsonb
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select r.id, r.ended_at, r.outcome, r.day, r.money, r.week_reached, r.cards_played,
         (r.details -> 'history' -> -1 ->> 'stress')::int, r.details -> 'envelopes'
  from public.runs r
  where r.player_id = p_player_id and r.visivel
  order by r.ended_at desc;
$$;

grant execute on function public.meus_jogos(uuid) to anon, authenticated;

-- ------------------------------------------------------- perfil de outro
--
-- Clicar num nick no ranking abre o perfil daquela pessoa. O que ele mostra
-- é o que o ranking já mostrava (nick, vitórias, derrotas) mais o avatar e o
-- histórico de partidas — ou seja, **nada que já não fosse público**. E-mail,
-- nome e pontos ficam de fora de propósito: eles só aparecem para o dono, em
-- `meu_perfil()`.
create function public.perfil_publico(p_nick text)
returns table (
  nick       text,
  avatar     jsonb,
  desde      timestamptz,
  vitorias   bigint,
  derrotas   bigint,
  total_runs bigint,
  melhor_dinheiro integer,
  ultima_partida  timestamptz
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    p.nick,
    p.avatar,
    p.created_at as desde,
    count(r.id) filter (where r.outcome = 'vitoria')  as vitorias,
    count(r.id) filter (where r.outcome <> 'vitoria' and r.outcome <> 'abandono') as derrotas,
    count(r.id) filter (where r.outcome <> 'abandono') as total_runs,
    max(r.money) filter (where r.outcome <> 'abandono') as melhor_dinheiro,
    max(r.ended_at) filter (where r.outcome <> 'abandono') as ultima_partida
  from public.players p
  left join public.runs r on r.player_id = p.id and r.visivel
  where p.nick = lower(trim(p_nick))
  group by p.nick, p.avatar, p.created_at;
$$;

grant execute on function public.perfil_publico(text) to anon, authenticated;

-- as partidas guardadas de um jogador, por nick. Mesma regra de visibilidade
-- de `meus_jogos`: run largada sem permissão não aparece para ninguém. E a
-- partida da qual a pessoa pediu demissão (abandono) fica só no perfil dela:
-- desde a v0.14 a lista abre o replay, e `jogo_publico()` não abre abandono
create function public.jogos_do_jogador(p_nick text)
returns table (
  id           uuid,
  ended_at     timestamptz,
  outcome      text,
  day          smallint,
  money        integer,
  week_reached smallint,
  cards_played smallint,
  estresse     integer,
  envelopes    jsonb
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select r.id, r.ended_at, r.outcome, r.day, r.money, r.week_reached, r.cards_played,
         (r.details -> 'history' -> -1 ->> 'stress')::int, r.details -> 'envelopes'
  from public.runs r
  join public.players p on p.id = r.player_id
  where p.nick = lower(trim(p_nick)) and r.visivel and r.outcome <> 'abandono'
  order by r.ended_at desc
  limit 200;
$$;

grant execute on function public.jogos_do_jogador(text) to anon, authenticated;

-- o replay de uma run específica, incluindo o dia-a-dia (details). Confere
-- o dono: pedir o run_id de outra pessoa devolve zero linhas
create or replace function public.jogo_detalhe(p_run_id uuid, p_player_id uuid)
returns table (
  id           uuid,
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

grant execute on function public.jogo_detalhe(uuid, uuid) to anon, authenticated;


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
  id            uuid,
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
  autor_avatar  jsonb,
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
    p.avatar                                          as autor_avatar,
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

create function public.comentarios_do_feedback(p_id uuid)
returns table (
  id         uuid,
  corpo      text,
  de_admin   boolean,
  criado_em  timestamptz,
  autor_nick text,
  autor_avatar jsonb,
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
    p.avatar as autor_avatar,
    c.autor_id is not distinct from auth.uid() as meu
  from public.feedback_comentarios c
  left join public.players p on p.id = c.autor_id
  where c.feedback_id = p_id
  order by c.criado_em;
$$;

grant execute on function public.comentarios_do_feedback(uuid) to anon, authenticated;

-- O que evita a enxurrada de relatos repetidos: antes de gravar, a tela
-- pergunta ao banco se já existe coisa parecida e mostra o que achou. A
-- semelhança é de trigrama (pg_trgm) sobre título e corpo — erro de digitação
-- e sinônimo parcial ainda casam, que é o ponto.
create function public.feedbacks_parecidos(p_titulo text, p_corpo text)
returns table (
  id         uuid,
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
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
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

create function public.editar_feedback(p_id uuid, p_tipo text, p_titulo text, p_corpo text)
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

grant execute on function public.editar_feedback(uuid, text, text, text) to authenticated;

create function public.excluir_feedback(p_id uuid)
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

grant execute on function public.excluir_feedback(uuid) to authenticated;

create function public.comentar_feedback(p_id uuid, p_corpo text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin  boolean := public.sou_admin();
  v_autor  uuid;
  v_titulo text;
  v_id     uuid;
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

grant execute on function public.comentar_feedback(uuid, text) to authenticated;

-- Status, urgência e nota são do admin e de mais ninguém. Passar nulo em
-- qualquer um deles quer dizer "não mexa neste campo".
create function public.admin_atualizar_feedback(
  p_id uuid, p_status text, p_urgencia text, p_nota smallint
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

grant execute on function public.admin_atualizar_feedback(uuid, text, text, smallint) to authenticated;

-- --------------------------------------------------------- notificações

create function public.minhas_notificacoes()
returns table (
  id          uuid,
  tipo        text,
  titulo      text,
  corpo       text,
  feedback_id uuid,
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

-- ------------------------------------------------------------- o catálogo
-- Uma chamada só devolve o baralho inteiro. É de propósito: o site pede isto
-- uma vez ao abrir e nunca mais, então vale trazer tudo junto em vez de
-- quatro viagens. O retorno é `jsonb` porque assim acrescentar um campo
-- depois não esbarra em "cannot change return type of existing function".
--
-- Uma carta inativa (excluída) VEM junto, marcada. O motor precisa dela: se
-- alguém está no meio de uma run com a carta na mão, o jogo tem que saber o
-- que ela faz para terminar a partida. O que a inativa não faz é entrar em
-- baralho novo nem sair como recompensa.
create function public.catalogo()
returns jsonb
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'versao', (select versao from public.baralho where unica),
    'cartas', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.inicial desc, c.id)
      from public.cartas c
    ), '[]'::jsonb),
    'eventos', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.id)
      from public.cartas_evento e
    ), '[]'::jsonb),
    'modos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'nome', m.nome, 'descricao', m.descricao,
        'versao', m.versao, 'padrao', m.padrao
      ) || m.regras order by m.padrao desc, m.id)
      from public.modos m
      where m.ativo
    ), '[]'::jsonb),
    -- o histórico sem o `dados`, que é grande e só interessa para a removida
    'mudancas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'carta', a.carta_id, 'familia', a.familia, 'versao', a.versao,
        'tipo', a.tipo, 'oQue', a.o_que, 'porque', a.porque,
        'data', to_char(a.criada_em, 'YYYY-MM-DD')
      ) order by a.criada_em desc, a.versao desc)
      from public.cartas_antigas a
    ), '[]'::jsonb),
    -- só o último formato de cada carta removida, que é o que o replay usa
    'removidas', coalesce((
      select jsonb_agg(distinct a.dados)
      from public.cartas_antigas a
      where a.tipo = 'removida'
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.catalogo() to anon, authenticated;

-- Guarda a versão que está saindo de cena antes de escrever a nova. Todo
-- caminho que muda carta passa por aqui — é o que garante que nenhuma versão
-- some sem deixar registro.
create function public.arquivar_carta(
  p_id      uuid,
  p_familia text,
  p_tipo    text,
  p_o_que   text,
  p_porque  text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dados  jsonb;
  v_versao smallint;
begin
  if p_familia = 'acao' then
    select to_jsonb(c), c.versao into v_dados, v_versao from public.cartas c where c.id = p_id;
  elsif p_familia = 'modo' then
    select to_jsonb(m), m.versao into v_dados, v_versao from public.modos m where m.id = p_id;
  else
    select to_jsonb(e), e.versao into v_dados, v_versao from public.cartas_evento e where e.id = p_id;
  end if;

  -- carta que ainda não existe não tem versão anterior para arquivar; o
  -- registro de "criada" é escrito pelo chamador, depois do insert
  if v_dados is null then
    return;
  end if;

  insert into public.cartas_antigas (carta_id, familia, versao, dados, tipo, o_que, porque)
  values (p_id, p_familia, v_versao, v_dados, p_tipo, coalesce(p_o_que, ''), coalesce(p_porque, ''));
end;
$$;

-- Cria ou ajusta uma carta de ação. `p_o_que` e `p_porque` não são enfeite:
-- é o que o jogador lê no histórico da carta e o que vira item de Novidades.
-- Salvar sem motivo é mudar o jogo em silêncio, então a função recusa.
create function public.admin_salvar_carta(
  p_carta  jsonb,
  p_o_que  text,
  p_porque text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id       uuid;
  v_texto   text := p_carta ->> 'id';
  v_existia  boolean;
  v_classe   text := nullif(p_carta ->> 'classe', '');
begin
  if not public.sou_admin() then
    raise exception 'Só admin mexe no catálogo.';
  end if;
  -- v0.35: carta e evento novos nascem com uuid (`crypto.randomUUID()`)
  if v_texto is null or v_texto !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Id inválido: o id da carta é um uuid.';
  end if;
  v_id := v_texto::uuid;
  if coalesce(btrim(p_porque), '') = '' then
    raise exception 'Diga por que está mudando: é isso que o jogador lê no histórico.';
  end if;

  select true into v_existia from public.cartas where id = v_id;

  if v_existia then
    perform public.arquivar_carta(v_id, 'acao', 'ajustada', p_o_que, p_porque);
  end if;

  insert into public.cartas as c
    (id, nome, custo, classe, texto, efeitos, restricao, especial, inicial, copias,
     raridade, custo_dinheiro, custos, versao)
  values (
    v_id,
    coalesce(p_carta ->> 'nome', 'Sem nome'),
    coalesce((p_carta ->> 'custo')::smallint, 0),
    v_classe,
    coalesce(p_carta ->> 'texto', ''),
    coalesce(p_carta -> 'efeitos', '[]'::jsonb),
    case when p_carta -> 'restricao' = 'null'::jsonb then null else p_carta -> 'restricao' end,
    coalesce((p_carta ->> 'especial')::boolean, false),
    coalesce((p_carta ->> 'inicial')::boolean, false),
    nullif(p_carta ->> 'copias', '')::smallint,
    coalesce(nullif(p_carta ->> 'raridade', ''), 'comum'),
    coalesce((p_carta ->> 'custo_dinheiro')::smallint, 0),
    case when jsonb_typeof(p_carta -> 'custos') = 'array' then p_carta -> 'custos' else '[]'::jsonb end,
    1
  )
  on conflict (id) do update set
    nome = excluded.nome, custo = excluded.custo, classe = excluded.classe,
    texto = excluded.texto, efeitos = excluded.efeitos, restricao = excluded.restricao,
    especial = excluded.especial, inicial = excluded.inicial, copias = excluded.copias,
    raridade = excluded.raridade, custo_dinheiro = excluded.custo_dinheiro,
    custos = excluded.custos,
    versao = c.versao + 1, ativa = true, atualizada_em = now();

  -- carta nova também entra no histórico: "criada" é uma mudança de
  -- balanceamento como qualquer outra
  if not coalesce(v_existia, false) then
    insert into public.cartas_antigas (carta_id, familia, versao, dados, tipo, o_que, porque)
    select v_id, 'acao', c.versao, to_jsonb(c), 'criada', coalesce(p_o_que, 'Carta nova'), p_porque
    from public.cartas c where c.id = v_id;
  end if;

  update public.baralho set versao = versao + 1 where unica;
  return public.catalogo();
end;
$$;

create function public.admin_salvar_evento(
  p_evento jsonb,
  p_o_que  text,
  p_porque text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id      uuid;
  v_texto   text := p_evento ->> 'id';
  v_existia boolean;
begin
  if not public.sou_admin() then
    raise exception 'Só admin mexe no catálogo.';
  end if;
  -- v0.35: carta e evento novos nascem com uuid (`crypto.randomUUID()`)
  if v_texto is null or v_texto !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Id inválido: o id da carta é um uuid.';
  end if;
  v_id := v_texto::uuid;
  if coalesce(btrim(p_porque), '') = '' then
    raise exception 'Diga por que está mudando: é isso que o jogador lê no histórico.';
  end if;

  select true into v_existia from public.cartas_evento where id = v_id;

  if v_existia then
    perform public.arquivar_carta(v_id, 'evento', 'ajustada', p_o_que, p_porque);
  end if;

  insert into public.cartas_evento as e (id, nome, tom, texto, efeitos, escolhas, versao)
  values (
    v_id,
    coalesce(p_evento ->> 'nome', 'Sem nome'),
    coalesce(p_evento ->> 'tom', 'negativo'),
    coalesce(p_evento ->> 'texto', ''),
    coalesce(p_evento -> 'efeitos', '[]'::jsonb),
    case when p_evento -> 'escolhas' = 'null'::jsonb then null else p_evento -> 'escolhas' end,
    1
  )
  on conflict (id) do update set
    nome = excluded.nome, tom = excluded.tom, texto = excluded.texto,
    efeitos = excluded.efeitos, escolhas = excluded.escolhas,
    versao = e.versao + 1, ativa = true, atualizada_em = now();

  if not coalesce(v_existia, false) then
    insert into public.cartas_antigas (carta_id, familia, versao, dados, tipo, o_que, porque)
    select v_id, 'evento', e.versao, to_jsonb(e), 'criada', coalesce(p_o_que, 'Evento novo'), p_porque
    from public.cartas_evento e where e.id = v_id;
  end if;

  update public.baralho set versao = versao + 1 where unica;
  return public.catalogo();
end;
$$;

-- Excluir NÃO apaga a linha. `ativa = false` tira a carta dos baralhos novos
-- e das recompensas, e o motor continua sabendo o que ela faz — porque pode
-- haver alguém no meio de uma run com ela na mão neste exato momento.
create function public.admin_excluir_carta(
  p_id      uuid,
  p_familia text,
  p_porque  text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.sou_admin() then
    raise exception 'Só admin mexe no catálogo.';
  end if;
  if coalesce(btrim(p_porque), '') = '' then
    raise exception 'Diga por que está removendo: o replay de quem jogou com ela vai mostrar esse texto.';
  end if;

  perform public.arquivar_carta(p_id, p_familia, 'removida', 'Carta removida do jogo', p_porque);

  if p_familia = 'acao' then
    update public.cartas set ativa = false, atualizada_em = now() where id = p_id;
  else
    update public.cartas_evento set ativa = false, atualizada_em = now() where id = p_id;
  end if;

  update public.baralho set versao = versao + 1 where unica;
  return public.catalogo();
end;
$$;

-- Salvar um modo é mexer no aluguel de todo mundo. Pede motivo pelo mesmo
-- motivo que a carta pede: quem estiver jogando vai sentir a diferença, e
-- merece poder ler por quê.
--
-- Quem já está no meio de uma run NÃO é afetado: a run copia as regras na
-- criação e joga com elas até o fim (`GameState.modo`). O preço novo vale
-- para a próxima partida.
create function public.admin_salvar_modo(p_modo jsonb, p_o_que text, p_porque text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id      uuid;
  v_texto   text := p_modo ->> 'id';
  v_existia boolean;
  v_regras  jsonb := p_modo - 'id' - 'nome' - 'descricao' - 'padrao';
begin
  if not public.sou_admin() then
    raise exception 'Só admin mexe nas regras do jogo.';
  end if;
  if v_texto is null or v_texto !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Id inválido: o id do modo é um uuid.';
  end if;
  v_id := v_texto::uuid;
  if coalesce(btrim(p_porque), '') = '' then
    raise exception 'Diga por que está mudando: quem joga vai sentir a diferença.';
  end if;
  if jsonb_array_length(coalesce(v_regras -> 'semanas', '[]'::jsonb)) = 0 then
    raise exception 'Um modo sem semanas não tem como ser jogado.';
  end if;

  select true into v_existia from public.modos where id = v_id;
  if v_existia then
    perform public.arquivar_carta(v_id, 'modo', 'ajustada', p_o_que, p_porque);
  end if;

  insert into public.modos as m (id, nome, descricao, regras, padrao, versao)
  values (
    v_id,
    coalesce(p_modo ->> 'nome', 'Sem nome'),
    coalesce(p_modo ->> 'descricao', ''),
    v_regras,
    coalesce((p_modo ->> 'padrao')::boolean, false),
    1
  )
  on conflict (id) do update set
    nome = excluded.nome, descricao = excluded.descricao, regras = excluded.regras,
    padrao = excluded.padrao, versao = m.versao + 1, ativo = true, atualizado_em = now();

  if not coalesce(v_existia, false) then
    insert into public.cartas_antigas (carta_id, familia, versao, dados, tipo, o_que, porque)
    select v_id, 'modo', m.versao, to_jsonb(m), 'criada', coalesce(p_o_que, 'Modo novo'), p_porque
    from public.modos m where m.id = v_id;
  end if;

  -- só pode haver um padrão
  if coalesce((p_modo ->> 'padrao')::boolean, false) then
    update public.modos set padrao = false where id <> v_id;
  end if;

  return public.catalogo();
end;
$$;

grant execute on function public.admin_salvar_carta(jsonb, text, text)   to authenticated;
grant execute on function public.admin_salvar_evento(jsonb, text, text)  to authenticated;
grant execute on function public.admin_excluir_carta(uuid, text, text)   to authenticated;
grant execute on function public.admin_salvar_modo(jsonb, text, text)    to authenticated;

-- Todas as versões antigas de uma família, COM o `dados` que o `catalogo()`
-- deixa de fora. É o que deixa o /lab devolver uma carta ao formato que ela
-- tinha — o balanceamento feito à mão que um "Trazer do código" desfez mora
-- aqui, no `dados` da linha que o desfez. Só admin: não é segredo, mas é
-- grande e só a bancada usa.
create function public.admin_versoes(p_familia text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.sou_admin() then
    raise exception 'Só admin mexe no catálogo.';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', a.id, 'carta', a.carta_id, 'versao', a.versao, 'tipo', a.tipo,
      'oQue', a.o_que, 'porque', a.porque, 'dados', a.dados,
      'data', to_char(a.criada_em, 'YYYY-MM-DD')
    ) order by a.criada_em desc, a.versao desc)
    from public.cartas_antigas a
    where a.familia = p_familia
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_versoes(text) to authenticated;

-- ---------------------------------------------------- replay de outra pessoa
-- O replay de uma partida de qualquer jogador, pelo id. Ela já aparecia na
-- lista de `jogos_do_jogador()` — o que se abre aqui é o dia-a-dia dela, as
-- cartas jogadas. O que NÃO sai: o player_id, o nome, o e-mail. Run largada
-- no meio (abandono) e run que o jogador pediu para não guardar não abrem.
create function public.jogo_publico(p_run_id uuid)
returns table (
  id           uuid,
  ended_at     timestamptz,
  outcome      text,
  day          smallint,
  money        integer,
  week_reached smallint,
  details      jsonb,
  nick         text,
  avatar       jsonb
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select r.id, r.ended_at, r.outcome, r.day, r.money, r.week_reached, r.details, p.nick, p.avatar
  from public.runs r
  join public.players p on p.id = r.player_id
  where r.id = p_run_id and r.visivel and r.outcome <> 'abandono' and p.nick is not null;
$$;

grant execute on function public.jogo_publico(uuid) to anon, authenticated;

-- ------------------------------------------------------------- amizades
-- Tudo por função, com `auth.uid()` conferido por dentro. Quem pede precisa
-- de conta — convidado não tem como ser avisado de nada.

create function public.pedir_amizade(p_nick text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_eu     uuid := auth.uid();
  v_meu    text;
  v_outro  uuid;
  v_conv   boolean;
  v_estado text;
begin
  select nick into v_meu from public.players where id = v_eu and not convidado;
  if v_eu is null or v_meu is null then
    raise exception 'Crie uma conta para ter amigos.' using errcode = '42501';
  end if;
  select id, convidado into v_outro, v_conv from public.players where nick = lower(trim(p_nick));
  if v_outro is null then
    raise exception 'Ninguém com esse nick.' using errcode = '02000';
  end if;
  if v_outro = v_eu then
    raise exception 'Essa pessoa é você.' using errcode = '22023';
  end if;
  if v_conv then
    raise exception 'Convidado não recebe pedido de amizade.' using errcode = '22023';
  end if;

  -- o outro lado já tinha pedido: pedir de volta é aceitar
  update public.amizades set estado = 'aceita', aceita_em = now()
  where de = v_outro and para = v_eu and estado = 'pendente';
  if found then
    insert into public.notificacoes (destinatario_id, tipo, titulo)
    values (v_outro, 'amizade_aceita', v_meu || ' aceitou seu pedido de amizade');
    return 'aceita';
  end if;

  select estado into v_estado from public.amizades
  where (de = v_eu and para = v_outro) or (de = v_outro and para = v_eu);
  if v_estado is not null then
    return v_estado;
  end if;

  insert into public.amizades (de, para) values (v_eu, v_outro);
  insert into public.notificacoes (destinatario_id, tipo, titulo, corpo)
  values (v_outro, 'amizade_pedido', v_meu || ' quer ser seu amigo',
          'Aceite no seu perfil, ou no perfil de ' || v_meu || '.');
  return 'pendente';
end;
$$;

grant execute on function public.pedir_amizade(text) to authenticated;

-- aceitar ou recusar um pedido RECEBIDO. Recusar apaga, sem avisar ninguém
create function public.responder_amizade(p_nick text, p_aceitar boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_eu    uuid := auth.uid();
  v_meu   text;
  v_outro uuid;
begin
  select nick into v_meu from public.players where id = v_eu;
  select id into v_outro from public.players where nick = lower(trim(p_nick));
  if v_eu is null or v_outro is null then
    return;
  end if;
  if p_aceitar then
    update public.amizades set estado = 'aceita', aceita_em = now()
    where de = v_outro and para = v_eu and estado = 'pendente';
    if found then
      insert into public.notificacoes (destinatario_id, tipo, titulo)
      values (v_outro, 'amizade_aceita', v_meu || ' aceitou seu pedido de amizade');
    end if;
  else
    delete from public.amizades where de = v_outro and para = v_eu and estado = 'pendente';
  end if;
end;
$$;

grant execute on function public.responder_amizade(text, boolean) to authenticated;

-- desfaz nos dois sentidos, e cancela pedido enviado também
create function public.desfazer_amizade(p_nick text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.amizades a
  using public.players o
  where o.nick = lower(trim(p_nick))
    and ((a.de = auth.uid() and a.para = o.id) or (a.de = o.id and a.para = auth.uid()));
$$;

grant execute on function public.desfazer_amizade(text) to authenticated;

-- o estado visto de quem pergunta: é o que o botão do perfil mostra
create function public.amizade_com(p_nick text)
returns text
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select case
    when auth.uid() is null then 'sem_conta'
    when o.id = auth.uid() then 'eu'
    when a.estado = 'aceita' then 'amigos'
    when a.de = auth.uid() then 'enviado'
    when a.para = auth.uid() then 'recebido'
    else 'nenhuma'
  end
  from public.players o
  left join public.amizades a
    on (a.de = auth.uid() and a.para = o.id) or (a.de = o.id and a.para = auth.uid())
  where o.nick = lower(trim(p_nick));
$$;

grant execute on function public.amizade_com(text) to anon, authenticated;

-- os amigos, com a última partida guardada de cada um. Só nick e avatar,
-- como em qualquer outro lugar público
create function public.meus_amigos()
returns table (
  nick           text,
  avatar         jsonb,
  ultima_id      uuid,
  ultima_outcome text,
  ultima_money   integer,
  ultima_em      timestamptz
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select o.nick, o.avatar, u.id, u.outcome, u.money, u.ended_at
  from public.amizades a
  join public.players o on o.id = case when a.de = auth.uid() then a.para else a.de end
  left join lateral (
    select r.id, r.outcome, r.money, r.ended_at from public.runs r
    where r.player_id = o.id and r.visivel and r.outcome <> 'abandono'
    order by r.ended_at desc limit 1
  ) u on true
  where a.estado = 'aceita' and (a.de = auth.uid() or a.para = auth.uid())
  order by u.ended_at desc nulls last, o.nick;
$$;

grant execute on function public.meus_amigos() to authenticated;

create function public.pedidos_de_amizade()
returns table (nick text, avatar jsonb, criada_em timestamptz)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select o.nick, o.avatar, a.criada_em
  from public.amizades a
  join public.players o on o.id = a.de
  where a.para = auth.uid() and a.estado = 'pendente'
  order by a.criada_em desc;
$$;

grant execute on function public.pedidos_de_amizade() to authenticated;

-- ------------------------------------------------------------- conquistas
-- Confere TUDO de um jogador de uma vez, a partir das runs e da coleção, e
-- grava o que faltava. É idempotente (a chave primária impede a conquista
-- repetida), então chamar duas vezes, ou depois de um registro que falhou e
-- subiu mais tarde, não faz estrago. Recebe o id porque o convidado não tem
-- auth.uid() — e o pior que alguém faz chamando com o id de outra pessoa é
-- dar a ela uma conquista que os números dela já davam.
create function public.conferir_conquistas(p_player_id uuid)
returns setof uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with candidatas as (
    select '87fda2d8-dd38-5831-8d40-8e3603c10b81'::uuid /* primeira-semana */ as c, (select r.id from public.runs r where r.player_id = p_player_id and r.week_reached >= 2 order by r.ended_at limit 1) as run
    union all
    select '5c3894eb-657e-55a6-b947-b239cbb45244' /* mes-fechado */, (select r.id from public.runs r where r.player_id = p_player_id and r.outcome = 'vitoria' order by r.ended_at limit 1)
    union all
    select '6616e645-61d3-535c-8173-3e3a579c2e91' /* ficha-limpa */, (select r.id from public.runs r where r.player_id = p_player_id and r.outcome = 'vitoria' and coalesce(r.warnings, 1) = 0 order by r.ended_at limit 1)
    union all
    select 'c3d0035f-1c26-56f8-9290-7d65096d6552' /* zen */, (select r.id from public.runs r where r.player_id = p_player_id and r.outcome = 'vitoria'
                   and (r.details -> 'history' -> -1 ->> 'stress')::int <= 3 order by r.ended_at limit 1)
    union all
    select 'c22fd9f3-3e96-5262-b386-ae57a8157a4b' /* embalo */, (select r.id from public.runs r where r.player_id = p_player_id and r.max_combo >= 4 order by r.ended_at limit 1)
    union all
    select 'd474304c-310f-5ecd-bb91-ca9542212dc0' /* rico */, (select r.id from public.runs r where r.player_id = p_player_id and r.outcome <> 'abandono' and r.money >= 1000 order by r.ended_at limit 1)
    union all
    select 'c14565ac-b92b-517c-823a-4c21e67f6325' /* segunda-feira */, (select r.id from public.runs r where r.player_id = p_player_id and r.outcome = 'burnout' and r.day = 1 order by r.ended_at limit 1)
    union all
    -- as que contam partidas: a run que fechou a conta é a de número N
    select 'cf8cbc2c-447b-5e1f-8483-e4ba42eec8e1' /* veterano */, (select r.id from public.runs r where r.player_id = p_player_id and r.outcome <> 'abandono' order by r.ended_at offset 9 limit 1)
    union all
    select 'c54ee3e8-d73d-539c-94ec-d1dfd71282e8' /* veterano-prata */, (select r.id from public.runs r where r.player_id = p_player_id and r.outcome <> 'abandono' order by r.ended_at offset 49 limit 1)
    union all
    select '645ffe11-2bce-59f2-8fbb-9318e409681d' /* veterano-ouro */, (select r.id from public.runs r where r.player_id = p_player_id and r.outcome <> 'abandono' order by r.ended_at offset 149 limit 1)
    union all
    select '93dcac53-a809-552c-9969-b1c4c96d9c2f' /* funcionario */, (select r.id from public.runs r where r.player_id = p_player_id and r.outcome = 'vitoria' order by r.ended_at offset 2 limit 1)
    union all
    select '1e465b87-72e7-5457-8ac1-367e774e9755' /* funcionario-prata */, (select r.id from public.runs r where r.player_id = p_player_id and r.outcome = 'vitoria' order by r.ended_at offset 9 limit 1)
    union all
    select '91e42b9e-8a3d-540c-94e2-e613bfba09ad' /* funcionario-ouro */, (select r.id from public.runs r where r.player_id = p_player_id and r.outcome = 'vitoria' order by r.ended_at offset 24 limit 1)
    union all
    -- as ocultas
    select '85672f2a-90fe-5024-bccd-f0700a610028' /* despejado */, (select r.id from public.runs r where r.player_id = p_player_id and r.outcome = 'despejo' order by r.ended_at limit 1)
    union all
    select '371c2c6d-4adb-5025-a0b0-6856dd15290b' /* justa-causa */, (select r.id from public.runs r where r.player_id = p_player_id and r.outcome = 'demissao' order by r.ended_at limit 1)
    union all
    select '18877d78-e990-5859-840d-ac0516800243' /* por-um-fio */, (select r.id from public.runs r where r.player_id = p_player_id and r.outcome = 'vitoria'
                          and (r.details -> 'history' -> -1 ->> 'stress')::int >= 9 order by r.ended_at limit 1)
    union all
    -- da coleção, não de uma run: o run_id fica nulo. Lê os dois formatos:
    -- o antigo (`equipped`/`unequipped`) e o de cópias da v0.15 (`tenho`),
    -- que esta conta não via — e por isso ninguém ganhava a conquista
    select n.c, case when (
      select count(distinct t.x) from public.saves s,
        lateral (
          select jsonb_array_elements_text(coalesce(s.collection -> 'equipped', '[]') || coalesce(s.collection -> 'unequipped', '[]'))
          union all
          select jsonb_object_keys(case when jsonb_typeof(s.collection -> 'tenho') = 'object' then s.collection -> 'tenho' else '{}'::jsonb end)
        ) as t(x)
      where s.player_id = p_player_id
    ) >= n.meta then '00000000-0000-0000-0000-000000000000'::uuid end
    from (values ('2736b724-e383-574e-8099-3f2a5600326a'::uuid /* colecionador */, 12), ('871d6dbb-7839-5353-9f39-65db5f5e03b2' /* colecionador-prata */, 24), ('56b1b525-d1c5-59d5-9a39-0820250457d2' /* colecionador-ouro */, 40)) as n(c, meta)
  )
  insert into public.conquistas_do_jogador (player_id, conquista, run_id)
  select p_player_id, c.c, nullif(c.run, '00000000-0000-0000-0000-000000000000'::uuid)
  from candidatas c
  where c.run is not null and exists (select 1 from public.players where id = p_player_id)
  on conflict do nothing
  returning conquista;
end;
$$;

grant execute on function public.conferir_conquistas(uuid) to anon, authenticated;

-- todas as conquistas, com a data para as que este jogador já tem — a tela
-- mostra as que faltam apagadas, porque saber o que existe é metade da graça
-- a OCULTA que ainda não foi ganha sai sem nome e sem como-se-ganha: é o
-- banco que esconde, e não a tela
create function public.minhas_conquistas(p_player_id uuid)
returns table (id uuid, nome text, descricao text, icone text, ganha_em timestamptz,
               oculta boolean, tokens smallint, grupo text, nivel smallint)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select c.id,
         case when c.oculta and j.ganha_em is null then 'Conquista oculta' else c.nome end,
         case when c.oculta and j.ganha_em is null then 'Só se descobre ganhando.' else c.descricao end,
         case when c.oculta and j.ganha_em is null then 'oculta' else c.icone end,
         j.ganha_em, c.oculta, c.tokens, c.grupo, c.nivel
  from public.conquistas c
  left join public.conquistas_do_jogador j on j.conquista = c.id and j.player_id = p_player_id
  order by c.ordem;
$$;

grant execute on function public.minhas_conquistas(uuid) to anon, authenticated;

-- as de outra pessoa: só as ganhas
create function public.conquistas_publicas(p_nick text)
returns table (id uuid, nome text, descricao text, icone text, ganha_em timestamptz,
               oculta boolean, tokens smallint, grupo text, nivel smallint)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select c.id, c.nome, c.descricao, c.icone, j.ganha_em, c.oculta, c.tokens, c.grupo, c.nivel
  from public.conquistas_do_jogador j
  join public.conquistas c on c.id = j.conquista
  join public.players p on p.id = j.player_id
  where p.nick = lower(trim(p_nick))
  order by c.ordem;
$$;

grant execute on function public.conquistas_publicas(text) to anon, authenticated;

-- as conquistas que UMA partida deu, para o recibo do replay. A ligação já
-- existia (`conquistas_do_jogador.run_id`, a run que cumpriu a conquista);
-- o que esta função acrescenta é ler por ela. Abre o mesmo que o replay
-- público abre: run guardada, e a do abandono só não tem conquista nenhuma
create function public.conquistas_da_run(p_run_id uuid)
returns table (id uuid, nome text, descricao text, icone text, ganha_em timestamptz,
               oculta boolean, tokens smallint, grupo text, nivel smallint)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select c.id, c.nome, c.descricao, c.icone, j.ganha_em, c.oculta, c.tokens, c.grupo, c.nivel
  from public.conquistas_do_jogador j
  join public.conquistas c on c.id = j.conquista
  join public.runs r on r.id = j.run_id
  where j.run_id = p_run_id and r.visivel
  order by c.ordem;
$$;

grant execute on function public.conquistas_da_run(uuid) to anon, authenticated;

-- ------------------------------------------------------ a coleção do amigo
-- O perfil de um AMIGO mostra os baralhos e as cartas dele (v0.34), e quem
-- não é amigo vê só o resumo. Quem decide é aqui: a amizade aceita, nos dois
-- sentidos, ou a própria pessoa. Sai só o que é carta — o que tem, os
-- baralhos e qual está equipado —, e nunca o saldo, as recompensas fechadas
-- ou a máquina, que não são da conta de ninguém
create function public.colecao_de_amigo(p_nick text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_eu    uuid := auth.uid();
  v_outro uuid;
  v_col   jsonb;
begin
  if v_eu is null then
    return null;
  end if;
  select id into v_outro from public.players where nick = lower(trim(p_nick));
  if v_outro is null then
    return null;
  end if;
  if v_outro <> v_eu and not exists (
    select 1 from public.amizades a
    where a.estado = 'aceita'
      and ((a.de = v_eu and a.para = v_outro) or (a.de = v_outro and a.para = v_eu))
  ) then
    return null;
  end if;
  select s.collection into v_col from public.saves s where s.player_id = v_outro;
  if v_col is null then
    return null;
  end if;
  return jsonb_build_object(
    'tenho', v_col -> 'tenho',
    'baralhos', v_col -> 'baralhos',
    'ativo', v_col -> 'ativo',
    'equipped', v_col -> 'equipped',
    'unequipped', v_col -> 'unequipped'
  );
end;
$$;

grant execute on function public.colecao_de_amigo(text) to authenticated;

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
