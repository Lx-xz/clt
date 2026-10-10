# CLT — contexto do projeto

Arquivo de contexto para quem (pessoa ou IA) for mexer neste repositório sem ter
acompanhado a construção. (Existe também um `CONTEXTO-TOTAL-<data>.md`, que é
uma FOTO datada para levar o projeto a outra conversa e não é mantido — se os
dois discordarem, este aqui ganha. E `CONTEXTO-VOZ.md` está desatualizado.) O [`README.md`](README.md) é o documento do jogo — as
regras, as cartas, o balanceamento. Aqui está o resto: como o código está
organizado, o que foi decidido e por quê, e as armadilhas que já custaram tempo.

**Trabalho de faculdade.** Luiz Adolfo Frederico — CC4M. Single player, sem
multiplayer, sem monetização, sem dados sensíveis.

---

## O jogo em um parágrafo

Card game roguelike sobre atravessar um mês de trabalho formal sem ficar no
vermelho e sem surtar. Cada dia é uma rodada, cada semana é uma cobrança do
chefe, o mês inteiro é uma run. O que sustenta o jogo é que **o estresse não some
sozinho**: `Energia do dia = 10 − Estresse`, então um dia mal administrado
encolhe todos os dias seguintes. Vence quem chega ao fim das 4 semanas empregado
e com as contas pagas; a pontuação é o dinheiro que sobrou.

Quatro recursos: **energia** (reinicia todo dia), **estresse** (acumula entre os
dias), **produtividade** (zera todo dia, é o que o chefe mede), **dinheiro**
(acumula, sai nas contas de sexta).

Três derrotas: estresse chega a 10 (burnout), 3 advertências (demissão), não
pagar as contas de sexta (despejo).

---

## Estado atual

Jogável de ponta a ponta: 20 dias, 4 semanas, as três derrotas e a vitória
funcionam. No ar em <https://lx-xz.github.io/clt/>, deploy automático a cada push.

| Rota | O que é |
|---|---|
| `/auth` | A porta: entrar, criar conta (e-mail/senha ou Google), ou jogar como convidado. Fora de `(app)`; quem já tem sessão é mandado para `/` |
| `/` | O início, dentro de `(app)`: avatar, "Continuar — semana 2, quarta" (ou "Começar o mês"), as missões do dia (e o envelope por abrir), a última partida, amigos, conquistas recentes e atalhos |
| `/termos` | Termos de uso. Fora de `(app)`: dá para ler sem estar logado |
| `/jogar` | A mesa. Ocupa a janela inteira, sem rolagem |
| `/baralho` | Cartas equipadas, não equipadas e bloqueadas |
| `/ranking` | Placar público, no jeito do Duolingo: medalha nas três primeiras, avatar redondo, nick e V/D à direita. A linha inteira leva ao perfil; não há mais "abrir para ver mais" |
| `/perfil` | O seu: avatar, rank, a ÚLTIMA partida e as conquistas em selos (cada um com "ver todas" num popup) e amigos. Nome, e-mail, pontos e Sair NÃO moram aqui: moram em Configurações |
| `/perfil/editar` | O editor do avatar |
| `/jogador?nick=` | O perfil de outra pessoa: avatar, placar, o botão de amizade, conquistas e partidas (que abrem o replay). **Sem nome, e-mail ou pontos** |
| `/meus-jogos/detalhe?id=` | Replay dia a dia de uma run, com as cartas desenhadas — a sua (`jogo_detalhe`) ou, se não for sua, a de outra pessoa (`jogo_publico`) |
| `/comunidade` | Novidades, Feedbacks e Análise, em abas. É a única das três no menu |
| `/nova-senha` | Onde o link de "esqueci a senha" cai. Fora de `(app)` |
| `/lab` · `/lab/avatar` · `/lab/cartas` · `/lab/eventos` · `/lab/regras` | A oficina. **Só admin**, pelo layout de `/lab` |

**33 cartas de ação** (8 tipos iniciais somando 15 cartas no baralho, 25
desbloqueáveis, em três raridades) e **21 cartas de evento**, das quais 4 são ambíguas e pedem uma
escolha. Esses números são o baralho de REFERÊNCIA (`cards.ts`/`events.ts`);
o que está no ar é o que estiver na tabela `cartas` — veja abaixo.

---

## Stack

| | |
|---|---|
| Next 15 (App Router) + React 19 | export estático — não há servidor |
| TypeScript 5 | **não subir para a 7**: quebra o carregador do `next.config.ts` |
| Sass **indentado** (`.sass`, sem chaves) | pedido do autor; não converter para `.scss` |
| `lucide-react` | ícones, MIT e tree-shakeable |
| `@supabase/supabase-js` | banco, chamado direto do navegador |

**O que foi deliberadamente recusado:** nenhuma lib de animação (as animações são
CSS + um `requestAnimationFrame` de 30 linhas), nenhum gerenciador de estado
(`useState` basta), nenhum framework de UI. Só adicione dependência se ela pagar
o próprio peso — o jogo é pequeno.

---

## Arquitetura

```
src/game/     regras puras — nenhum import de React
  types.ts      GameState e companhia
  acoes.ts      o catálogo de AÇÕES: o vocabulário que carta e evento têm
  catalogo.ts   quais cartas e eventos existem agora — a porta única de getCard
  cards.ts      o baralho de referência (semente e rede)
  regras.ts     os modos de jogo: aluguel, cota, salário, energia base
  colecao.ts    cópias, baralhos montados e o sorteio de cartas
  missoes.ts    missões diárias e envelopes: de onde vem carta nova
  events.ts     os eventos de referência, pelo mesmo motivo
  engine.ts     o motor: funções puras GameState -> GameState
  storage.ts    localStorage (espelho), validação de formato do save
  session.ts    quem está jogando (perfil da conta, ou o convidado)
src/data/     tudo que fala com o Supabase
  supabase.ts   cliente, normalização da URL
  conta.ts      contas: entrar, cadastrar, Google, convidado, sair
  nick.ts       regras do nick, espelhando as constraints da tabela
  saves.ts      baixar/subir save, registrar run terminada
  sync.ts       banco como fonte da verdade, localStorage como espelho
  feedback.ts   bugs e sugestões, tudo por RPC
  notificacoes.ts  o sininho da barra lateral
  changelog.ts  o histórico de versões, escrito à mão
  cartas.ts     o catálogo do lado do banco: tradução, carga e as RPCs de admin
  balanceamento.ts  as perguntas que a interface faz sobre versões de carta
  amizades.ts   pedir, aceitar, desfazer, listar
  conquistas.ts conferir depois de uma run, e listar
  pendencias.ts "há algo por salvar?" — quem navega pergunta antes
src/components/  uma PASTA por componente: X/X.tsx, X/X.module.sass e um
                 X/index.ts que reexporta tudo — quem importa continua
                 escrevendo `@/components/X`. Componente novo nasce assim;
                 de um componente para outro, o import é `../X`
                 (Card, CardDetail, Medidor, SideNav, SessaoGuard, Dialogo,
                 ComoJogar, icons e o resto)
src/app/
  auth/              a porta: entrar, cadastrar, Google ou convidado
  (app)/page.tsx     o início de quem já entrou
  termos/            termos de uso, fora da guarda de sessão
  (app)/layout.tsx   guarda de sessão + barra lateral
  (app)/jogar/       a mesa
  (app)/baralho/     montagem do baralho
supabase/schema.sql  o banco inteiro, para rodar no SQL Editor
supabase/reset.sql   apaga tudo (contas inclusive) para recomeçar do zero
```

**O princípio que sustenta tudo:** `src/game/` não importa React. O motor é um
conjunto de funções puras sobre `GameState`, o que permite **simular runs fora do
navegador** para checar balanceamento sem passar pela interface. Foi assim que os
números da seção de balanceamento saíram. Não coloque lógica de regra em
componente.

---

## Regras implementadas que não estão no design em papel

O README original foi escrito antes de qualquer código. Duas coisas mudaram:

### O que a carta faz é dado, e agora não sobrou exceção

`ActionCard.efeitos` é uma lista de **ações** do catálogo em `src/game/acoes.ts`
— `recurso`, `comprar`, `descartar`, `custo`, `advertencia`, `sorteio` e mais
uma dúzia —, cada bloco com um `se` (condição) e um `quando` (gatilho)
opcionais. `playCard` roda a lista e acabou: **o motor não conhece o id de
carta nenhuma.** As cinco que tinham `case` no `switch` viraram dado como
qualquer outra:

| Carta | Como virou dado |
|---|---|
| Reunião | dois blocos excludentes por `se: jaJogadaHoje` |
| Foco Total | `descartar: 'tudo'` |
| Puxar o Saco | `restricao: { umaVezPorRun, exige: advertencias ≥ 1 }` + `advertencia: −1` |
| Automatizar | `produtividadePassiva: +1` |
| Pedir Aumento | `sorteio` com `entao`/`senao` |

Os 20 eventos seguiram o mesmo caminho (`EventCard.efeitos`, e as escolhas dos
ambíguos carregam suas próprias `acoes`), então `revealEvent` também perdeu o
`switch`. `especial: true` continua existindo, mas com outro sentido: marca a
carta que faz mais do que somar recurso, para o editor avisar que mexer só nos
números não conta a carta inteira.

**Duas regras seguram isto de pé:**

1. **A composição acontece na LISTA, não em função nova.** "Reembaralhar 1" não
   é uma ação: é `descartar(1)` seguido de `comprar(1)`. Se cada combinação
   virar primitiva, em três meses são trinta primitivas — e trinta linhas para
   ler antes de entender uma carta.
2. **Isto não é para virar linguagem de programação.** Laço, variável e
   expressão ficam de fora; o que não couber continua sendo código no motor, e
   tudo bem. Desde que existe um editor visual, a régua deixou de ser "o editor
   aguenta desenhar isso?" e passou a ser a única que sempre valeu: **cabe numa
   carta que alguém lê na mão, em três linhas?**
   O aninhamento é sempre "uma lista dentro de um campo", e os pontos são
   `sorteio.entao/senao`, `se.entao/senao`, `escolherDescarte.entao`,
   `amanha.acoes`, cada opção de `escolha`, e condição dentro de condição
   (`nao`/`todas`/`alguma`). São muitos mais do que os dois de antes, e ainda
   assim é a mesma forma repetida — é por isso que o editor não cresceu junto.
3. **Ação nova precisa de um descritor.** Quem sabe desenhar o formulário de
   uma ação é `src/app/(app)/lab/_catalogo/descritores.ts`, e ela é um
   `satisfies Record<Acao['faz'], Descritor>` — esquecer o descritor quebra o
   build, em vez de deixar a ação sem editor em silêncio.

**O vocabulário mudou de novo na v0.12, e as trocas foram estas:**

| Antes | Agora | Por quê |
|---|---|---|
| `salarioPermanente` · `produtividadePassiva` | `recorrente` (`qual`, `quanto`, `cada`, `duracao`) | eram a mesma ideia escrita duas vezes: uma somava na sexta, a outra todo dia. O que as separava não era o recurso, era a CADÊNCIA — e de brinde veio a `duracao`, que não existia |
| `amanha { qual, quanto }` | `amanha { acoes }` | adiar valia para dois números escolhidos a dedo; agora vale para qualquer coisa |
| `aviso` | `mensagem` | ela escrevia numa lista que **ninguém desenhava**. Agora aparece na mesa |
| — | `se { condicao, entao, senao }` | o `se` só existia no nível do bloco: dentro de um `sorteio` não dava para perguntar nada |
| — | `escolha { opcoes }` | a carta pergunta, como os eventos ambíguos já faziam |
| — | `nao` · `todas` · `alguma` | um bloco só conseguia perguntar UMA coisa |
| — | `dia` · `semana` · `cartasNaMao` · `cartasJogadasHoje` · `classeJogadaHoje` | `cartasJogadasHoje noMaximo: 0` é "só se for a primeira do dia", e é mais geral do que uma condição com esse nome |
| — | gatilhos `aoDescartar` e `fimDaSemana` | a carta reage a SAIR da mão, e a semana ganhou um fechamento |

**A armadilha que essa troca cria, e que vale para qualquer troca futura:** as
cartas moram no BANCO desde a v0.10, e o `switch` de `executarAcao` **não tem
`default`**. Tirar um nome da união faria a carta que está no ar carregar uma
ação que o motor não conhece — sem erro, sem aviso, sem efeito. Por isso a
tradução do vocabulário antigo acontece na LEITURA (`migrarAcoes` em
`acoes.ts`, chamada por `src/data/cartas.ts`), exatamente como `lerAvatar()`
valida a receita do avatar. Não há migração para rodar no banco: salvar a carta
de novo no `/lab` já grava o formato de hoje.

**`escolha` e `escolherDescarte` PARAM a lista.** `executar` devolve o que
faltava para dentro da pergunta (`escolhaAberta.resto`) e retoma ao responder —
senão as ações depois da pergunta aconteceriam antes dela, que é contar o fim
antes do começo. **A ação `escolha` é só de CARTA:** num evento, a pausa não
sobrevive à compra da mão que vem logo depois do efeito, e `revealEvent` a
descarta com uma linha no histórico em vez de deixar a mesa travada.

**O que NÃO foi para o catálogo, de propósito:** comprar, descartar e
embaralhar continuam funções do motor, entregues ao interpretador por
`contexto()`. "Quando o baralho acaba, o descarte é embaralhado e vira o
baralho" é regra do jogo, não de uma carta, e nenhuma carta deveria poder
mudá-la. O sorteio também entra por ali (`ctx.sorte`) em vez de a ação chamar
`Math.random()` — é o que permite rodar o motor com sorteio determinístico.

A migração foi conferida com o comparador determinístico: o mesmo bot, com
`Math.random` trocado por um LCG semeado, rodou 80 runs com **todas** as cartas
equipadas nos dois motores, e o **estado final inteiro** (log, histórico,
baralho, descarte) bateu byte a byte — com as cinco cartas especiais e o
dobramento de advertência informal aparecendo o mesmo número de vezes nos dois.
Faça o mesmo antes de dar por boa qualquer refatoração do motor.

### O versionamento do baralho

Rebalancear é mexer em carta que já foi jogada. Sem cuidado, mudar a Hora Extra
de 4 para 6 reescreve todas as partidas antigas — o replay passa a mostrar a
carta de hoje no lugar da que a pessoa jogou —, e apagar uma carta deixa o
replay sem nem nome para mostrar. A solução tem duas metades, que resolvem
coisas diferentes:

1. **O retrato, dentro da run.** `createRun` grava em `GameState.baralho` uma
   cópia de cada carta equipada como ela era naquele dia, mais `VERSAO_BARALHO`.
   Sobe junto com a run (`runs.details.baralho`, e a versão também em
   `runs.versao_baralho`) e é o que faz o replay continuar verdadeiro para
   sempre, sem depender de nada externo. **É a única metade que não dá para
   acrescentar depois**: run jogada antes disto existir nunca vai saber quanto
   a carta custava — foi por isso que entrou antes de o balanceamento começar,
   e não junto com ele. (Até a v0.14 a recompensa semanal entrava no
   baralho no meio da run e era fotografada à parte; desde a v0.15 a
   recompensa é do fim e vai para a coleção, então o retrato inicial basta.)
2. **O histórico, à mão.** `MUDANCAS` em `src/data/balanceamento.ts`, uma linha
   por ajuste, com `oQue` (o número) e `porque` (o motivo). É o que o jogador lê
   ao abrir uma carta no baralho (o histórico mora dentro do detalhe). Um diff automático saberia
   dizer "custo 4 → 6" e não saberia dizer "porque Freela → Hora Extra fechava
   a semana 1 sozinha", que é a parte que importa.

**Ao ajustar uma carta:** suba `VERSAO_BARALHO`, acrescente a linha em
`MUDANCAS`, e cite em `changelog.ts`. Carta removida vai para
`CARTAS_REMOVIDAS` com o último formato que teve — `cartaComoEra()` procura
nessa ordem (retrato da run → baralho de hoje → removidas → rótulo honesto) e
por isso nenhuma dessas mudanças derruba a página de ninguém.

**Onde as cartas moram, desde a v0.10:** na tabela `cartas` (e
`cartas_evento`). `cards.ts` e `events.ts` continuam existindo como SEMENTE
(é a lista que `admin_semear_catalogo` leva para o banco na estreia) e como
REDE: sem banco configurado, com a rede fora, ou com o catálogo ainda vazio,
o jogo abre com elas em vez de não abrir. Quem serve as cartas para o resto
do código é `src/game/catalogo.ts`, e `getCard`/`getEvent` vêm de lá — nunca
de um array importado.

**As três peças que tornaram o banco seguro**, e que precisam continuar
valendo juntas (foi a ausência delas que adiou esta mudança por duas
entregas):

1. **Nada é apagado.** Remover é `ativa = false` mais uma linha em
   `cartas_antigas`. A carta continua no catálogo, então quem está no meio de
   uma run com ela na mão termina a partida; o que ela deixa de fazer é
   entrar em baralho novo e sair como recompensa.
2. **A run guarda o próprio retrato.** Mudar o custo hoje não reescreve a
   partida de ontem.
3. **Não dá para mudar em silêncio.** `admin_salvar_carta` recusa `porque`
   vazio. O `o_que` ("Custo 4 → 6") é sugerido automaticamente pela bancada,
   porque essa metade um diff sabe escrever; o `porque` é digitado, porque
   essa não.

**Uma carta desconhecida não derruba mais nada.** `getCard` devolve uma carta
inerte (custo 0, sem classe, sem efeito) e avisa no console, em vez de lançar.
Com o catálogo no banco, id desconhecido deixou de ser impossível e virou
raro — um save antigo, um `delete` na mão no SQL Editor —, e lançar ali
levaria a mesa inteira junto.

### Os modos de jogo

Os números que não pertencem a carta nenhuma — aluguel, cota, meta da semana,
salário, energia base, estresse de burnout — moravam soltos em `cards.ts`
como `const`. Isso queria dizer que **mexer no aluguel era publicar o site**,
que é exatamente o contrário do que balancear precisa ser.

Hoje eles são um **modo de jogo**: uma linha na tabela `modos`, carregada
junto com o catálogo, editável em `/lab/regras`. Existe só o `normal`; a
estrutura já é uma tabela porque um dia pode haver um "difícil", e porque
isso não custou nada a mais do que uma coluna custaria.

**A run copia as regras quando começa** (`GameState.modo`) e o motor lê de
lá, nunca da global. Duas consequências, e as duas são o ponto:

- Mexer no aluguel às três da tarde não muda o preço de quem está no dia 12.
  A partida termina com as regras que começou.
- O replay de uma partida antiga continua batendo, pelo mesmo motivo que o
  retrato do baralho existe: `runs.details.modo` guarda as regras daquele dia,
  e `runs.modo` guarda o id, para não comparar no mesmo gráfico uma run de
  aluguel 300 com uma de 380.

Quem NÃO lê da run é quem não tem run: o tutorial (`ComoJogar`) e a bancada
mostram as regras de hoje, porque explicam o jogo e não uma partida. Por isso
`recursos()` e `derrotas()` lá viraram funções — um valor calculado no
carregamento do módulo congelaria o número de ontem.

**Cuidado com número de regra escrito dentro de carta.** O Dia Tranquilo era
`HAND_SIZE + 2`, resolvido na hora de montar o arquivo; com a mão vindo do
banco isso congelaria o 7 para sempre. Virou `{ faz: 'maoDoDia', quantas: 2,
relativo: true }`. Qualquer carta nova que queira "a mais" ou "a menos" de
uma regra precisa desse tipo de relativo, e não do total já somado.

### A coleção conta cópias, e o baralho tem regras (v0.15)

A coleção era `{ equipped, unequipped }`: binária. Cópia só existia para carta
inicial (`card.copies`, lido em `createRun`), então tirar a Tarefa Simples
tirava as quatro, toda desbloqueável existia uma vez só, e a recompensa morria
quando as 13 desbloqueáveis acabavam. Hoje (`src/game/colecao.ts`):

- `Collection = { tenho, baralhos, ativo }`: cópias possuídas por carta, até
  `MAXIMO_DE_BARALHOS` (3) baralhos com nome, e qual está equipado.
- **O teto de cópias é da raridade** (`COPIAS_POR_RARIDADE`: comum 4, incomum
  3, rara 2), nunca abaixo das cópias iniciais da carta.
- **`lerColecao()` traduz o formato antigo na LEITURA**, como `lerAvatar` e
  `migrarAcoes`: inicial equipada vira as suas cópias, desbloqueável vira 1.
  Ela roda no localStorage (`clt:collection:v2`, lendo a `v1` se a v2 não
  existir) e no que vem do banco (`saves.collection` é lido cru). Sem migração.
- **`garantirNaipes()` é rede, não regra.** O banco de produção ainda diz
  Reunião ×2; com o mínimo de 3 por naipe, todo jogador abriria com um baralho
  recusado. Ela completa cada naipe com cópias da carta inicial dele. Quando o
  catálogo do banco tiver as cópias novas, ela para de ter o que fazer.
- `createRun(cartas)` recebe UMA ENTRADA POR CÓPIA
  (`cartasDoBaralho(baralhoAtivo(colecao))`). A troca foi conferida com o
  `--hash` do simulador antes da troca da Reunião: idêntico.

**As regras do baralho são do modo** (`baralhoMinimo` 15, `baralhoMaximo` 25,
`minimoPorNaipe` 3, editáveis em `/lab/regras`). Carta sem naipe é livre: é
coringa, não naipe. Quem confere é uma função só, `problemasDoBaralho()` em
`src/game/baralho.ts`, que devolve os MOTIVOS em português: a página do
baralho os lista, e a mesa os mostra num popup em vez de começar a run.

**A recompensa saiu da sexta e foi para o fim da run** (v0.15). A semanal
mexia no baralho no meio da partida — "como estou indo" misturado com "o que
eu tenho" — e morria quando as desbloqueáveis acabavam. Hoje:

- `restWeekend` vai direto para a segunda. A fase `recompensa` continua no
  tipo só para o save gravado no meio dela, que `pularRecompensaSemanal` tira
  de lá na abertura da mesa.
- No recibo de fim, `opcoesDeRecompensa(colecao, semana, venceu)` sorteia
  pela DISTÂNCIA (`raridadesDaRecompensa`: semana 1 só comuns, a rara só da
  semana 4 em diante, quem vence escolhe entre 4). Só entra carta abaixo do
  teto de cópias; a raridade esgotada cai para a de baixo; coleção cheia é
  lista vazia e o recibo diz.
- As opções são sorteadas na jogada que encerra a run e gravadas nela
  (`rewardOptions`, `recompensaEscolhida`): recarregar não sorteia de novo.
  `recompensaEscolhida` é OPCIONAL de propósito — campo obrigatório novo em
  `GameState` obrigaria a subir a chave do save e descartaria as runs em
  andamento.
- A raridade é coluna da carta (`cartas.raridade`), dada às cartas antigas
  UMA vez, no bloco `do $$` que cria a coluna — rodar o `schema.sql` de novo
  não desfaz o que o admin escolheu depois no `/lab`.

**Desde a v0.16 a carta do recibo também saiu: carta vem de ENVELOPE, e
envelope vem de MISSÃO DIÁRIA** (`src/game/missoes.ts`). A do recibo amarrava
a coleção ao número de partidas — largar cedo e recomeçar colecionava mais
rápido do que jogar o mês —, e fazia do recibo de uma derrota uma vitrine.

- `MISSOES` é uma tabela (como `CABELOS_FORMA`): "Bater o ponto" (terminar
  uma partida → envelope pardo) e "Fechar o mês" (vencer → envelope
  confidencial, o "raro"). Missão nova é uma linha; o que ela pode perguntar
  é o que `FimDeRun` traz, não o `GameState` inteiro.
- **Envelope, e não baú** (pedido do autor: baú não combina). É papelada:
  o pardo diz "RH · interno", o confidencial leva o carimbo vermelho.
  `ENVELOPES` diz as raridades das vagas; o sorteio é `sortearCartas()` em
  `colecao.ts` (a mesma lógica de "só o que cabe, raridade esgotada cai para
  a de baixo" da recompensa antiga).
- **Envelopes e missões moram na COLEÇÃO** (`Collection.envelopes`,
  `Collection.missoes`): são coisa que se tem, e assim sobem em
  `saves.collection` sem coluna nova. `lerColecao` os dá vazios a quem
  gravou antes — sem migração.
- A missão vira à meia-noite LOCAL (`hoje()`), não UTC: senão renovaria às
  21h em Brasília. Quem confere é a mesa, na jogada que encerra a run, ANTES
  do `sincronizar` — o envelope sobe junto. `cumprirMissoes` é idempotente
  pelo `feitas`. Abandono não passa por ali e não conta.
- Abrir o envelope muda a coleção ANTES da animação (`Envelope.tsx`): fechar
  no meio não perde carta. Ele abre no início e no recibo de fim.
- `recompensaEscolhida`/`rewardOptions` e `escolherRecompensa` ficaram só
  para o save que terminou na v0.15 com a escolha pendente.

**O preço disso, medido:** sem a recompensa semanal o bot mediano não tem mais
como melhorar o baralho no meio do mês, e a vitória dele foi de 0,4% para 0%
(burnout 100%, dia mediano 5). O jogo já estava duro demais; isto deixa a
conta do rebalanceamento mais clara, não mais difícil de fazer.

**A página do baralho move UMA cópia:** clique duplo ou arrastar para a outra
coluna ("No baralho" ↔ "Fora", o mesmo `onPlay` + `dropRef` da mesa). O clique
simples abre o detalhe, que nesta página leva o seletor de cópias (− n +) e o
histórico da carta (`MudancasDaCarta`), pelos `children` do `CardDetail`.

### Os custos além da energia (v0.15, lista desde a v0.17)

A carta cobra energia em `cost` e o resto em `ActionCard.custos`, uma LISTA
de `{ qual, quanto }` com `qual` entre dinheiro, estresse e produtividade
(`src/game/custos.ts`). Era um campo por recurso (`custoDinheiro`, coluna
`custo_dinheiro`), e a carta que custasse estresse pediria outro campo,
outra coluna e outro `if` em cada tela. A energia ficou fora da lista de
propósito: toda carta a tem, e os eventos mexem nela (`effectiveCost`). No
`/lab/cartas` as duas aparecem na MESMA lista ("+ Custo"), e quem separa é
o `EditorDeCustos`.

- Custo é CUSTO, não efeito: `canPlay` recusa sem saldo de dinheiro ou de
  produtividade (`custoQueFalta`), e `playCard` paga ANTES dos efeitos — a
  carta que rende dinheiro não se paga com o próprio rendimento. Estresse
  não tem saldo: pagar é subir, mesmo até o burnout.
- Um efeito `recurso dinheiro −80` continua possível, mas deixa jogar no
  vermelho e só cobra na sexta. O `/lab/cartas` acha essas cartas no
  catálogo vivo ("Cartas que cobram dinheiro pelo efeito") e as converte,
  tirando o "−R$" do texto.
- Um carimbo por custo, com o ÍCONE e a cor do medidor do recurso (energia
  é o raio, estresse o foguinho, dinheiro a cédula). Zero não é cobrança: a
  carta sem custo nenhum não mostra carimbo nenhum (`.custos:empty`), e a
  que só cobra outra coisa não mostra o "0" de energia. Energia encarecida
  por evento continua azul, com um anel vermelho — vermelho é do estresse.
- **Tradução na LEITURA, nas três portas:** `custosDaLinha` (banco: coluna
  `custos` se tiver algo, senão `custo_dinheiro`), `custosDe` (retrato de
  run antiga, que guarda `custoDinheiro`) e `lerCustos` (soma repetidos,
  descarta recurso desconhecido). `custo_dinheiro` continua sendo gravado
  como espelho da parte em R$ — zero quando ela sai, senão a leitura a
  ressuscitaria.
- O retrato da run só ganha `custos` quando eles existem, para o retrato
  das cartas de sempre continuar idêntico no `--hash` do simulador.

### A carta neutra

`ActionCard.kind` aceita `null`, e isso é a AUSÊNCIA de classe, não uma
quinta classe. Duas consequências, e as duas são regra:

- Nenhum evento de bloqueio a alcança — Sistema Fora do Ar não tem como
  proibir "nenhum tipo".
- Ela não entra no embalo, e jogar uma QUEBRA o embalo que estiver em pé.
  Deixá-la atravessar em silêncio seria um combo escondido, que ninguém
  leria na carta. É uma linha em `aplicarEmbalo` — se um dia a decisão for
  outra, é lá que se muda.

### O descarte é visível, e às vezes é escolha

Duas coisas diferentes, que antes eram a mesma:

- **`descartar`** tira carta sem perguntar (Fofoca de Corredor, Foco Total).
  O que mudou é que agora a mesa MOSTRA: `GameState.ultimoDescarte` guarda o
  lote e o motivo, e `DescarteNaMesa.tsx` desenha as cartas saindo. Antes a
  mão só encolhia, e o único vestígio era uma linha no histórico que ninguém
  lê no meio da jogada. O lote é anunciado de uma vez de propósito —
  "descartou 2" é um acontecimento só. O descarte de fim de dia NÃO é
  anunciado: o dia está acabando de qualquer jeito.
- **`escolherDescarte`** para o dia e pergunta. Enquanto
  `GameState.escolhaDeDescarte` existir, `canPlay` recusa tudo e `endDay`
  não fecha o dia; `escolherParaDescartar()` é a resposta, e quando a conta
  fecha o `entao` roda. É o `entao` que sustenta "descarte 1 para comprar 1"
  sem uma ação nova para cada troca.

**A mão em modo de escolha não embrulha a carta num `<div>`.** O leque
posiciona os filhos DIRETOS a partir de `--carta-w`, que mora na própria
carta; um invólucro no meio come a sobreposição e o arco. O rótulo
"Descartar" é um `::after` com `pointer-events: none` — a carta inteira já é
o alvo do clique.

### A carta se monta em blocos

O que uma carta faz era um `textarea` de JSON no `/lab`. Hoje é uma pilha de
blocos: menu agrupado para acrescentar ação, setas para reordenar, e listas
dentro de listas nos dois únicos pontos de aninhamento que a linguagem tem
(`sorteio.entao/senao` e `escolherDescarte.entao`).

**Isto NÃO é o Scratch, e é por isso que coube em dois arquivos.** O Scratch é
caro porque tem expressão (bloco que devolve valor e encaixa dentro de outro),
variável e uma tela 2D com física de encaixe. Aqui todo parâmetro é literal,
não há variável, e o aninhamento é só aquele — então uma lista vertical cobre
100% da linguagem. Canvas, encaixe por forma e arrastar não acrescentariam
capacidade nenhuma, e ficaram de fora de propósito: as setas ↑ ↓ resolvem a
ordem, que era o que o arraste faria.

- `_catalogo/descritores.ts` diz, por ação, o rótulo em português e os campos
  (número, porcentagem, escolha, texto, sim/não, id de carta, lista de ações).
- `_catalogo/EditorDeAcoes.tsx` tem os cinco tipos de campo e a recursão, e
  mais nada específico de ação nenhuma.

**A armadilha que a tabela cria:** ela é uma segunda fonte da verdade ao lado
da união `Acao`. O `satisfies Record<Acao['faz'], Descritor>` é o que faz o
esquecimento virar erro de build em vez de silêncio.

**O JSON não sumiu, ficou recolhido** (`EscapeJson`). Continua sendo o jeito de
colar uma carta inteira de fora e de conferir o que o editor produziu; texto
inválido não é aplicado, e o editor de cima segue com o último estado bom.

### Embalo

Cartas seguidas da **mesma classe** no mesmo dia rendem bônus crescente: a 2ª
rende `+1` do recurso da classe (tarefa → produtividade, descanso → energia,
grana → R$ 10, social → −1 estresse), a 3ª em diante rende o dobro. Jogar outra
classe zera. Reinicia todo dia.

Foi acrescentado porque, sem ele, **a ordem das jogadas era indiferente** — não
havia motivo para jogar cartas em sequência específica. É o primeiro candidato a
ajuste de balanceamento: o embalo de `grana` pode tornar Freela → Hora Extra
forte demais na semana 1.

### Evento revelado por clique

No README o evento é virado e aplicado de uma vez. No código o motor separa
"evento na mesa, virado para baixo" de "evento revelado": `revealEvent()` aplica
o efeito **e só então compra a mão**. A ordem passou a ser acordar → virar evento
→ comprar 5 cartas, que é a do README, mas com o jogador no controle do momento.

### Sexta em três passos

`paySalary` → `payBills` → `restWeekend`, cada um confirmado pelo jogador, em vez
de resolver tudo num clique. Motivo: dava para chegar na segunda-feira sem ter
visto quanto dinheiro entrou antes de sair.

---

## Decisões de interface

O layout foi escolhido pelo autor a partir de um protótipo interativo com três
opções. O que ele escolheu, e que deve ser preservado:

- **Leque + carta estilo TCG.** Mão em leque sobreposto embaixo; carta com arte no
  topo, custo numa aba no canto superior esquerdo, ícone do tipo só no canto
  direito (sem rótulo de texto), e o resto da carta como área de texto.
- **Mesa em tela cheia.** `100dvh`, sem rolagem no jogo. O tamanho da carta é
  preso a `vh` (`--carta-h`) justamente para caber sem rolar. Essa regra de
  "nenhuma página rola" é global (`html, body { overflow: hidden }` em
  `global.sass`); a **única exceção é o baralho**, que cresce com o tamanho da
  coleção — `.conteudo:has(:global(.page))` em `shell.module.sass` reabre
  `overflow-y: auto` só quando a página renderizada carrega a classe global
  `.page` (usada apenas por `/baralho`). Uma página nova que precise rolar
  tem que ou usar essa mesma classe `.page`, ou ganhar sua própria exceção —
  o padrão-fixo, hoje, é não rolar.
- **Carta em 3D com verso.** Duas faces com `backface-visibility: hidden`,
  girando em `rotateY`. Vale para mão, evento e pilhas. Cartas jogadas no tapete
  ficam maiores e se empilham quando são muitas. **O verso é uma estampa dos 3
  ícones da logo** (Coffee, Hammer, Droplet — Coffee, Labor and Tears), repetidos
  numa grade com leve rotação alternada, sem nome nem texto nenhum.
- **Interação da carta:** hover cresce e levanta · clique simples abre o detalhe
  com o texto completo · clique duplo **ou** arraste até o tapete joga. Toda
  carta ARRASTÁVEL (com `onPlay`) carrega o atributo `data-carta` — é o que a
  barra lateral usa para não roubar o gesto de arrastar uma carta (veja
  abaixo). Carta parada (bloqueada, histórico) não leva o atributo: ela não
  tem gesto para proteger, e com ele o arraste da borda morria em cima dela.
- **Medidores compactos:** só ícone e valor (`⚡ 10`), com nome e explicação numa
  dica que aparece no hover, no foco e no toque. No celular o dinheiro perde o
  "R$" e os 6 medidores viram uma grade 3×2.
- **Barra lateral recolhível** (`SideNav.tsx`): no desktop fica só com ícones e
  cresce no hover; no celular fica escondida e **abre arrastando da esquerda
  para a direita em qualquer ponto da tela** — o painel acompanha o dedo em
  tempo real via uma variável CSS (`--arraste`, em px), e só assume a posição
  final (aberto/fechado) ao soltar, conforme passou ou não da metade do
  caminho. Fecha arrastando de volta pra esquerda, também de qualquer ponto. Um
  arraste que começa em cima de uma carta (`[data-carta]`) é ignorado, porque a
  carta já usa esse mesmo gesto para ser jogada — sem essa exclusão, jogar uma
  carta no celular abriria o menu.
  Muda de página fecha o gaveteiro sozinho. Os links vêm em dois grupos
  separados por um fio — o JOGO (Início, Jogar, Baralho) e a GENTE (Ranking,
  Comunidade) —, o "Jogar" ganha um ponto quando há run em andamento, e o
  "Perfil" é desenhado com o avatar de quem está jogando. No fim da barra
  ficam "Lab" (só admin), "Perfil", "Avisos" (o sininho, escondido para
  convidado) e "Configurações".
  **"Reiniciar run" e "Sair" saíram da barra (v0.14).** Reiniciar virou
  "Pedir demissão", dentro da mesa, que é onde a vontade de desistir
  aparece; Sair foi para o fim das Configurações — na barra ele ficava a um
  clique errado de distância, e estava repetido no fim do perfil. Os dois
  confirmam com o segundo clique (`BotaoConfirmar`, abaixo).
  **Nada de barra inferior no celular** — foi proposta e recusada pelo
  autor. A porta continua sendo o arraste, e o início tem tudo à mão.
  **Sair com coisa por salvar avisa.** A barra pergunta a
  `src/data/pendencias.ts` antes de navegar, e abre um `Dialogo` se a página
  marcou pendência (hoje só o editor do avatar). Não existe "antes de sair
  da rota" no App Router: é por isso que quem navega pergunta.
  **O menu encolheu de propósito:** "Meus jogos" virou parte do perfil (o
  seu e o dos outros), e Análise/Feedbacks/Novidades viraram abas de
  `/comunidade` — eram três entradas para o mesmo assunto, "o que está
  acontecendo com o jogo". "Como jogar" saiu daqui e foi para a mesa, no
  canto oposto ao "Próximo dia": é lá que a dúvida aparece, e abrir o menu
  no meio da partida é atravessar o jogo inteiro.
  Enquanto houver popup aberto o arraste do menu é ignorado — veja `Dialogo`
  abaixo.
- **O tutorial (`ComoJogar.tsx`) monta as cartas de verdade.** Ele renderiza o
  componente `Card` com cartas tiradas de `cards.ts`, e os números (energia
  base, contas, estresse máximo) saem das constantes — rebalancear o jogo não
  pode deixar o tutorial mentindo. As cores dos recursos são as mesmas do HUD:
  o jogador reconhece o medidor pela cor antes de ler o nome, e o tutorial não
  pode falar outra língua.
- **Todo popup é o `Dialogo`** (`src/components/Dialogo/Dialogo.tsx`). Ele fecha ao
  clicar fora e no Esc, e trava a página atrás marcando `data-popup` no
  `<html>` (a regra que congela a rolagem está em `shell.module.sass`). Não
  escreva popup novo à mão: os três que existiam antes erravam cada um uma
  dessas coisas. `largo` só muda a largura.
  - **Dois papéis, por assunto (`estilo`):** `nota` (nota fiscal: estreita,
    fonte mono, serrilha por `mask`) para dinheiro e resultado — a sexta, a
    recompensa, o fim de run —, e `prancheta` (padrão) para o resto. **A
    prancheta é o papel de sempre do site** (borda fina, mesmo raio, mesma
    sombra) com uma presilha pequena na cor da linha, e só. A primeira
    versão, com borda grossa de papelão e presilha de metal, foi recusada
    pelo autor por destoar da paleta — popup não pode chamar mais atenção
    que a mesa. A serrilha é máscara, e máscara
    corta a `box-shadow` do próprio elemento: por isso a sombra mora num
    invólucro (`.moldura`) com `filter: drop-shadow`.
  - **`semTravarNav`** é o popup da MESA: não marca `data-popup` e a cortina
    começa depois da barra recolhida (`left: 62px`, `z-index` abaixo da
    barra). Foi o que consertou o fim de run que prendia o jogador — antes o
    painel cobria a barra e só "Nova run" tirava dali.
  - **Sem `onFechar` não fecha** (nem X, nem fora, nem Esc): é a sexta e a
    recompensa, que pedem decisão.
  - **Entra e sai animado (v0.16).** A nota sobe de baixo da tela (papel
    saindo da maquininha) e sai por cima (o recibo arrancado); a prancheta
    só aparece e some. Fechar pelo X/fora/Esc anima e SÓ ENTÃO chama
    `onFechar`. Fechar por fora (a sexta acabou, a run recomeçou) é
    `aberto={false}` em vez de desmontar: o diálogo **congela o conteúdo**
    do último render aberto enquanto sai, senão a nota sairia mostrando a
    segunda-feira. `SAIDA_MS` no componente tem que bater com `.saindo` no
    sass.
- **Ação destrutiva confirma com o segundo clique** (`BotaoConfirmar.tsx`),
  não com popup: o primeiro clique arma (texto troca, fica vermelho, treme),
  o segundo executa, e ele desarma sozinho em 3 s ou quando perde o foco. O
  estado armado vai para o leitor de tela por `aria-live`. Vale para Sair,
  Pedir demissão, desfazer amizade e o "voltar" do editor com alteração.
- **Avatar pequeno é a exceção, não a regra.** Abaixo de 33 px o `Avatar`
  se aproxima da cabeça (`viewBox '8 0 84 84'`), e em 20–28 px os cortes
  pareciam desalinhados entre si. Os tamanhos de lista subiram: barra lateral
  30, relatos 32, amigos 44, ranking 52 (44 no celular, e redondo). Não volte
  para menos que isso numa lista em que os rostos ficam lado a lado.
- **O perfil é resumo; a lista inteira é popup.** Rank, a última partida e
  os selos das conquistas (`<Conquistas selos />`), cada um com "ver todas"
  abrindo um `Dialogo` — o mesmo em `/perfil` e `/jogador`. Os dados da
  conta (nome, e-mail, tipo, pontos, admin) foram para as Configurações: o
  perfil é a página que os OUTROS veem.
- **O avatar da mesa é um crachá no canto do tapete** (`.cracha`), 56 px no
  celular e 72 no desktop, abaixo das cartas jogadas no `z-index`. Morava no
  header com 24 px e no celular não dava para ver a cara mudar. A `key` pelo
  humor remonta o crachá quando a cara troca, e é isso que dispara o balanço.
- **HUD do celular:** header colado nas bordas, dia à esquerda e nick à
  direita, "Próx. dia" ancorado abaixo do header, status de sync vira ícone
  (girando / check / sem conexão) em vez de texto. Baralho e descarte somem da
  mesa no celular (a carta jogada e a mão já ocupam o espaço). **A mão tem seu
  próprio `--carta-h`** (`.zonaMao` no `@media (max-width: 760px)` de
  `jogar.module.sass`, hoje `clamp(148px, 40vw, 192px)`) maior que o padrão da
  mesa — é a carta que o jogador mais precisa ler no celular, e não deve
  encolher só porque o resto da mesa encolheu.
- **O dinheiro do jogo não é real: nada de "R$" na tela** (v0.17). É o
  ícone da cédula e o número (`Dinheiro`, `src/components/Dinheiro`), o
  mesmo ícone do medidor. O texto que vem de DADO — carta, evento, log,
  changelog, histórico da carta — continua escrito "R$ N", que aqui é a
  NOTAÇÃO, e `TextoComIcones` o desenha como ícone. Trocar no banco
  obrigaria a reescrever toda carta e todo log de run antiga. Texto novo na
  tela: `<Dinheiro valor={n} />`, nunca "R$". Onde só cabe string (aria,
  title), `textoSemReais`.
- **Paleta "papelada de escritório"** em `src/styles/_tokens.sass`: papel manila,
  tinta de caneta, custo como carimbo.
- **Tema com três estados**, em Configurações: claro, escuro e sistema.
  `src/data/tema.ts` escreve `data-tema` no `<html>` e o CSS faz o resto —
  nenhum componente conhece cor. "Sistema" é a **ausência** do atributo, que
  é o que deixa o `prefers-color-scheme` mandar; por isso o bloco escuro
  aparece duas vezes em `_tokens.sass` (uma no media query, excluindo
  `[data-tema="claro"]`, e outra em `[data-tema="escuro"]`), via o mixin
  `+escuras`. O tema é aplicado por um **script em linha no `<head>`**
  (`SCRIPT_TEMA`): sem ele o site abre claro e pisca para escuro quando o
  React monta — justamente no tema que a pessoa não quer ver.
- **O avatar é uma receita, não uma imagem** (`src/components/Avatar/Avatar.tsx` +
  `src/data/avatar.ts`). O que vai para o banco é um punhado de palavras
  (rosto, pele, cabelo, cor, expressão, barba e a cor dela, tronco, roupa,
  óculos, acessório e a cor dele, crachá, fundo) num `jsonb`; o SVG é montado na hora. Trocar de avatar é um `update` numa
  linha, o desenho é nítido em qualquer tamanho, e não existe imagem imprópria
  para moderar porque ninguém sobe imagem. Ele aparece no perfil, em
  `/jogador`, na mesa (o crachá), no ranking, ao lado dos relatos e na lista
  de amigos. O ranking e os relatos vieram na v0.14, com a decisão do autor de
  estender `ranking()` a essa coluna (veja "Banco"). No perfil e em
  `/jogador` ele é a CAPA da página (`AvatarHero`: faixa na cor do fundo,
  figura saindo pela borda de baixo), e editar é o lápis no canto dela; o
  editor põe a figura grande ao lado das opções, que são miniaturas e
  amostras quadradas SEM nome escrito (o nome vai no `title` e no leitor de
  tela). **No editor, o cabeçalho é preso no topo** (voltar, sortear só com o
  ícone, Salvar à direita) e, no celular, a figura e as abas grudam embaixo
  dele; `.editor` vira `display: block` ali porque item de grade só gruda
  dentro da própria linha. A amostra "igual ao cabelo" da barba é um pente.
  - **A receita não tem gênero (v0.13).** Era `corpo: homem | mulher`, e o
    corpo decidia o rosto e a gola. O cadastro já tinha parado de perguntar
    gênero na v0.8, por ser dado pessoal, e o editor continuava perguntando.
    Hoje o primeiro campo é o FORMATO do rosto (`quadrado`, `redondo`, `oval`),
    e o que lê como masculino ou feminino vem do cabelo e da barba.
    `lerAvatar()` traduz a receita antiga na leitura (`homem → quadrado` +
    gola V, `mulher → oval` + gola alta, olho novo para todo mundo) — sem
    migração no banco.
  - **O avatar sente o estresse.** `humor` é uma camada por cima do rosto, não
    peça da receita: `humorDoEstresse()` escolhe a cara em FRAÇÕES do estresse
    máximo (olheira, suor, lágrima no 9, olhos em X no burnout). A mesa o
    mostra no crachá e no recibo de fim; o início, com o humor da run salva; o perfil mostra sem humor. É o medidor de estresse com cara — a conta
    `Energia = 10 − Estresse` só existia em texto antes dele. **O que se lê em
    24px é a COR do fundo**, que esquenta com o estresse (`HUMORES.fundo`):
    olheira e suor só aparecem do tamanho do perfil para cima. Em 32px ou
    menos o `viewBox` se aproxima da cabeça.
  - **Nenhum contorno, nem com contraste baixo.** Dez das 49 combinações de
    cabelo e pele ficam abaixo de 1,35:1 (mel em canela é 1,01:1), e por um
    tempo elas ganharam borda no rosto e um anel escuro no cabelo e na barba.
    O autor recusou: o traço em volta destoava de um desenho todo chapado e
    lia pior que a mancha que consertava. Não volte com contorno — se o
    contraste for problema, a saída é a cor.
  - **O fundo e a borda são CSS, não SVG.** Eram um `rect` dentro de um
    `clipPath` e outro `rect` com `stroke` por cima; o stroke de um retângulo
    colado na borda do viewBox é **cortado ao meio pela própria caixa**, e
    saía uma linha irregular. Hoje quem faz fundo, canto e borda é o `<span>`
    em volta (`Avatar.module.sass`), e com isso sumiu o `clipPath` — e o id
    único que ele exigia. Regra geral: moldura é CSS, desenho é SVG.
  - **O manequim é o padrão de quem não escolheu**: a figura de madeira sem
    rosto. É o avatar de todo mundo que chega — convidado, Google ou e-mail —,
    e ele diz "ainda não escolhi" sem fingir ser ninguém. Ele não veste óculos,
    barba nem chapéu: seria fingir uma pessoa.
  - **O cabelo custou três tentativas** e está comentado no componente:
    silhueta fechada ATRÁS do rosto (o miolo some debaixo dele, então não há
    encaixe para errar), franja por cima com a borda de fora sendo um arco da
    MESMA elipse da silhueta, e as mechas do comprido subindo acima da linha
    do cabelo. Cada regra conserta um defeito que só apareceu no zoom: tiara,
    corte reto na têmpora e faixa de pele. **O cabelo é de uma cor só de
    propósito** — com dois tons, toda emenda entre as peças virava um
    retângulo visível.
  - **O rosto é paramétrico** (`MEDIDAS`), e a silhueta e a franja saem dos
    mesmos números — é o que deixa o homem ser maior e de queixo reto sem
    nada desencaixar. `cantoY`/`cantoX` são o raio do canto do rosto: iguais
    a `larg`, o queixo vira ponta. Mexer nisso é o assunto do `/lab/avatar`.
    São 17 números hoje: além do rosto e do cabelo, o pescoço (grossura e
    quanto dele aparece), a borda do ombro, o tamanho da cabeça inteira
    (`escalaCabeca`, ancorada no QUEIXO para não descolar do pescoço) e os
    três multiplicadores de feição (nariz, sobrancelha, olho).
  - **O corte de cabelo é uma TABELA, não um `if`** (`CABELOS_FORMA` em
    `Avatar.tsx`). Era `longo ? silhueta : elipse`, o que fazia de todo corte
    novo mais um ramo; hoje é uma linha, pela mesma razão que as cartas
    viraram dado. `ACESSORIOS`, `OLHOS` e `TRONCOS` seguem o mesmo formato.
    Cada linha diz o que vai ATRÁS do rosto e o que vai na FRENTE, e
    `teste: true` marca a que o jogador ainda não alcança.
  - **A CAIXA DO ROSTO é o esqueleto, e corte novo nasce dela.** Os dois
    cortes antigos (`curto`, `longo`) saem de uma elipse SOLTA
    (`rx`/`ry`/`cy`), sem relação com a cabeça — e as três consequências
    apareceram juntas: eles cobrem a orelha, não cabem embaixo do boné e leem
    todos como o mesmo cabelo comprido ("os cabelos parecem todos femininos").
    Os cortes novos são desenhados a partir de `larg`/`topo`/`queixo`, os
    mesmos números do rosto, e por isso o chapéu encaixa sem ajuste por corte.
  - **A orelha é MEDIDA, não peça** (`orelha`, zero no jogo de hoje). É um
    número só, e sendo medida ela some sozinha nos cortes mais largos que a
    cabeça — quem esconde a orelha é o cabelo, não um `if`.
  - **O degradê é o único corte que pinta a PELE**, e custou cinco versões:
    duas elipses atrás do rosto (dois tons com a transição escondida), a testa
    inteira em gradiente (o centro lia como mancha), faixas nas têmporas com
    borda dura (liam como listras), e uma com coroa atrás da cabeça (fazia uma
    borda redonda de volume em volta do topo — e degradê é o corte SEM volume).
    A sexta esmaecia de LADO, e a pálpebra do "De lado" (pele por cima)
    mostrou a mancha translúcida na têmpora. Hoje é o militar da referência:
    topo pintado dentro do rosto, testa baixa de cantos redondos, e laterais
    estreitas de cor CHEIA que só esmaecem para baixo, até a orelha
    (`esmaecido`). O espetado usa o mesmo fade.
  - **As laterais descem até a orelha e terminam afinando** (`capaceteDe`).
    Todo corte curto acabava numa quina reta na altura da têmpora, e lia como
    peruca. O capacete é uma peça só — capa, laterais e a linha do cabelo, que
    é o que cada corte muda —, sem peça de trás. Ele também baixou a testa:
    a linha do cabelo ficava em 0,1 da cabeça, e hoje fica entre 0,2 e 0,27.
  - **O topo do cabelo é um só para trás e frente** (`capaDe`). Chanel e coque
    tinham franja de cantos retos sobre silhueta redonda, e os cantos saíam por
    cima como pontas. Corte novo que tenha franja usa `capaDe` dos dois lados.
  - **Careca é sem cabelo nenhum.** Já foi "a coroa que sobra nas laterais",
    e lia como dois tufos na orelha.
  - **Do queixo para baixo, toda gola nasce de `pescocoLarg`.** As golas eram
    números fixos (41 a 59, ±11) sobre um pescoço de ±6,5, e sobravam cunhas.
    O pescoço é da cor da PELE, com a sombra só numa meia-lua debaixo do
    queixo — na cor da sombra inteiro, ele ficava mais escuro que o colo do
    decote. Ele é desenhado DEPOIS do tronco, e o que vai embaixo dele (o V
    do jaleco, a camiseta do colete) ANTES: na ordem trocada sobrava um fio
    de 1px atravessando o pescoço. As golas são recortadas pelo tronco
    (`naRoupa`) — o decote do rosto oval subia acima do ombro. No "sem
    pescoço" a sombra é o contorno do próprio rosto deslocado para baixo:
    uma meia-lua de largura fixa lia como gola fora do lugar.
  - **A boca dentro da barba cheia é da cor da barba, mais escura** (mais
    clara na barba quase preta, onde não existe mais escuro). Era um recorte
    de pele em elipse, que lia como máscara. A barba por fazer é a cor da
    barba bem fraca, e só — o padrão de pontos lia como rede.
  - **O boné é de frente**, como o da referência: copa com gomos e botão, e a
    aba é uma FAIXA curva mais escura atravessando a testa. A aba de lado lia
    como boné virado, e a meia-lua cheia, como uma segunda copa. Os `id` de gradiente, máscara, padrão e
    recorte vêm todos de `useId()` **sem pontuação** (os dois-pontos não
    sobrevivem a um `url(#...)`, e id repetido pinta todos os avatares da
    página com a cor do primeiro).
  - **Boné e chapéu apertam o cabelo.** Foram quatro regras: um `sobChapeu`
    por corte brigando com a aba; o cabelo inteiro recortado da aba para
    baixo (o volume continuava, como se o boné não apertasse); e o cabelo
    sumindo inteiro (todo mundo parecia careca). Hoje embaixo da aba
    (`ACESSORIOS.aba`) aparecem só as LATERAIS de cada corte, recortadas pelo
    componente; os volumosos usam laterais de curto, e os compridos
    (`FormaCabelo.sobChapeu.atras`) um comprimento rente à cabeça, caindo
    atrás do pescoço. A aba do boné curva PARA CIMA — para baixo ela lia
    como sorriso. A aba do chapéu fica em 0,22 da cabeça
    porque mais baixa ela cobria a sobrancelha, que é metade da expressão.
    A cor é escolha própria (`corChapeu`); "a da roupa" é o padrão de quem
    gravou antes de ela existir.
  - **Crespos têm a textura no CONTORNO** (`bordaCrespa`, `linhaRedondaDe`):
    black power, puff e a linha de cabelo deles são bordas onduladas, porque é
    a borda que aparece em 24px. Com a linha de cabelo lisa, o puff lia como
    gorro.
  - **Do queixo para baixo é uma peça só** (`TRONCOS`): pescoço, tronco e gola
    se recortam, e gola desenhada sem saber onde o pescoço acabou deixa lascas
    de pele nos cantos. O `padrao` é o único que olha o corpo — se um tronco de
    teste virar o padrão, é ele que passa a dizer o que separa homem de
    mulher, que hoje é a gola.
    **Promover uma peça de teste não precisa de migração:** basta acrescentar
    o valor ao tipo em `src/data/avatar.ts` e o rótulo na lista. É `lerAvatar()`
    que valida, na leitura, caindo no padrão diante de peça desconhecida — e é
    exatamente por isso que `salvar_avatar()` não valida nada.
  - **Escolhe-se EXPRESSÃO, não olho.** O olho é sempre a amêndoa, e
    a expressão é a pálpebra, a abertura e a sobrancelha
    (`OLHOS[].sobrancelha`). O campo continua `olhos` e as chaves antigas
    também (`emPe` é a "Decidida", `surpreso` a "Surpresa"); "Ponto" saiu, e
    quem o tinha cai na amêndoa pela leitura. **Sem brilho na íris**: no
    tamanho do perfil ele lia como o único reflexo de luz num desenho chapado.
    **Cada expressão tem a sua boca** (`OLHOS[].boca`: curva, `'o'`,
    `'torta'`, `'aberta'`) — a surpresa sorria. As caras do estresse
    (cansada, suando, chorando, burnout, vitória) também são expressões
    (`OLHOS[].humor`), para o PERFIL: na mesa, com `humor` dado, elas viram
    a amêndoa e quem manda é o estresse, então a run começa tranquila. O
    humor `tranquilo` não tem boca: vale a da expressão.
  - **A barba encontra o cabelo como a pessoa escolher** (`ladoBarba`):
    costeleta até o fim da lateral do cabelo (`fimDoLado`), costeleta
    esmaecendo para cima, ou nada. Só as barbas `temLado` (as que cobrem a
    mandíbula); bigode não tem lado. O bigodão `escondeBoca`: a boca nem é
    desenhada. **A barba é desenhada ANTES do cabelo da frente, e a
    costeleta sobe por baixo dele até a linha do cabelo, com a largura da
    lateral do corte** (`FormaCabelo.lateral`). As duas peças encostando
    uma na outra deixavam degrau, emenda e faixa de pele em centenas de
    combinações; por baixo, o cabelo cobre o encontro e não há emenda para
    errar. Corte novo com lateral declara a `lateral`; no careca a costeleta
    para na orelha. A grade "Barba × cabelo" do `/lab/avatar` mostra a
    têmpora de toda combinação.
  - **O olho é FORMA, não detalhe.** A primeira tentativa foi realista —
    branco, íris, pupila e um brilho — e ficou pior: em 24px o brilho some,
    a pupila vira um ponto, e o rosto foge do estilo chapado do resto. O que
    dá expressão aqui são três coisas, e nenhuma é detalhe: forma grande e
    sólida (branco e íris, sem pupila e sem brilho), **inclinação espelhada**
    entre os dois olhos — é o ângulo que diz curioso, desconfiado ou
    surpreso —, e a íris **fora do centro**, encostada no lado do nariz, que
    é o que faz o rosto olhar para quem vê. O `Feliz` é a prova: é o mais
    expressivo dos cinco e o que tem menos desenho (dois arcos).
    A pálpebra do "De lado" é um retângulo da COR DA PELE por cima do olho —
    como ele mora dentro do rosto, o que sobra dela fora do olho é pele
    também e some sozinho, sem precisar de recorte.
  - **Acessório é a peça barata**, e cabelo é a cara: acessório vai solto por
    cima de tudo, sem encaixe com o rosto nem com o cabelo para errar. Boné,
    chapéu, óculos e barba são todos dessa família. Óculos e chapéu são
    campos SEPARADOS da receita (um é do rosto, o outro da cabeça); o chapéu
    tem cor própria, e os óculos têm armação escura fixa. O crachá passa POR
    TRÁS do pescoço: o cordão sai dos lados da base dele, já sobre a roupa.
    O brinco (`brinco`: nenhum, numa orelha — a da direita de quem olha — ou
    nas duas; `corBrinco` dourado ou prateado) é uma argola no lobo,
    desenhada ANTES do acessório: a concha do headset o esconde junto com a
    orelha. Sem orelha (manequim, ou a medida `orelha` em zero), sem brinco.
- **`/lab` é a oficina, e nenhuma bancada dela grava no jogo.** A trava é o
  layout de `/lab` (`GuardaAdmin`), que pergunta ao banco — mas ela é
  conveniência, não segurança: o código vai no mesmo bundle para todo mundo,
  porque o site é estático. O que protege de verdade é o Postgres recusar as
  ações de admin. Não ponha ali dentro nada que dependa de esconder.
  Os dois atalhos de teste da porta (**desbloquear tudo**, **resetar**) são a
  exceção que mexe na conta de quem clica — e são de admin porque uma coleção
  inteira desbloqueada estraga qualquer leitura de dificuldade que venha
  daquela conta. **Eles moram SÓ aqui.** Estiveram no `/baralho` por um
  tempo, ao alcance de qualquer jogador, que é justamente onde não podiam
  estar.
- **`/lab/regras` é a bancada do aluguel.** Os números do modo de jogo, com a
  conta do mês se refazendo enquanto se digita (entra tanto de salário contra
  tanto de contas) — porque a pergunta que se faz ali é sempre "isso ainda
  fecha?". Salvar pede motivo como as cartas, e a tela diz na cara que quem
  está jogando não é afetado.
- **A mesa mostra o que aconteceu, e guarda.** A ação `mensagem` aparece num
  balão no rodapé do tapete (`MensagemNaMesa.tsx`, mesmo mecanismo de `selo` +
  timer do `DescarteNaMesa`, e num canto diferente porque o Foco Total dispara
  os dois na mesma jogada). E o botão **Histórico**, ao lado do "Como jogar",
  abre a run inteira agrupada por dia (`HistoricoDaRun.tsx`) — dia mais novo em
  cima, com as CARTAS desenhadas (o evento, as jogadas numeradas na ordem, as
  que sobraram na mão) e os números do `DayLog` numa fita de caixa; as frases
  do `log` ficam recolhidas em "detalhes". A peça é `LinhaDoTempo.tsx`, a
  MESMA do replay: as duas telas contavam a mesma história de jeitos
  diferentes. As cartas saem do retrato da run (`cartaParaMostrar`), e o
  `log` passou a subir em `runs.details.log` para o replay também tê-lo. Ele aparece em TODA fase, inclusive depois da derrota: é aí que se
  quer ler o que aconteceu. Os dois botões do canto esquerdo vivem num
  invólucro (`.cantoEsquerdo`) — com cada um preso em `left` por conta própria,
  o segundo precisaria de uma conta à mão.
- **`/lab/cartas` e `/lab/eventos` gravam no banco.** Até a v0.10 a bancada
  era um rascunho que devolvia `cards.ts` para colar, e o motivo era bom: com
  as cartas no código, um `delete` apagaria uma carta que está dentro do save
  de alguém. O que mudou não foi a opinião, foram as três peças descritas em
  "O versionamento do baralho" — sem elas, isto volta a ser perigoso.
  A edição tem dois níveis de propósito: os quatro campos de recurso mexem no
  bloco de efeito SEM condição (é o atalho de quem só quer rebalancear um
  número), e o editor de blocos abaixo monta a carta inteira, condição e
  sorteio inclusive — veja "A carta se monta em blocos".
  **Salvar pede um motivo, e a função do banco recusa sem ele.** O histórico
  de uma carta nasce no momento da mudança, porque escrito depois ele não
  seria escrito.
- **`/lab/avatar` produz código, não salva nada.** O site é export estático:
  não há servidor para escrever arquivo, então a bancada devolve a linha de
  `MEDIDAS` para colar em `Avatar.tsx`. Ela desenha com o **mesmo** componente
  do jogo (pela prop `ajustes`), nunca com uma cópia — laboratório que desenha
  diferente do jogo mente sobre o resultado. A grade com todas as combinações
  no rodapé existe porque é lá que o estrago aparece: ajuste que fica bom num
  caso costuma abrir buraco em outro.
  Os botões de pele saíram: quem manda na pele é o slot de cor, com hex livre
  — dois controles para a mesma coisa é um deles mentindo.
  **As peças marcadas com o frasco são de TESTE**, e essa marca é a informação
  mais importante da tela: elas são desenhadas de verdade pelo componente do
  jogo, mas o jogador não as alcança, porque a receita gravada no banco não
  tem como pedi-las. Clique simples experimenta; **clique duplo abre a
  confirmação**, que NÃO escreve código (não há servidor) — ela guarda a peça
  numa lista, com os passos de código que faltam para promovê-la. Ver peça de
  teste e achar que já está no jogo é o erro caro aqui, e é por isso que o
  tracejado, o frasco e o aviso do topo dizem a mesma coisa três vezes.
- **Escolha curta e excludente é o `Segmentado`** (`src/components/Segmentado/Segmentado.tsx`):
  tema, abas de entrar/criar, gênero no cadastro, novos/todos nos avisos. O
  fundo do selecionado é **um elemento só que desliza**, posicionado por
  medição do botão ativo (`offsetLeft`/`offsetWidth`) e não por fração da
  largura — as opções têm textos de tamanhos diferentes, e dividir o espaço
  igualmente deixaria o retângulo fora do texto em metade dos casos.
- **A música toca no site inteiro, baixinha fora da mesa.** Cortar de vez ao
  sair de `/jogar` fazia o som entrar e sair a cada clique, o que é pior do
  que os dois estados. `volumeDaMusica(v, naMesa)` multiplica por
  `FATOR_FORA` fora da mesa, e a transição é uma rampa no GainNode — trocar
  o ganho de uma vez estala. O efeito que dá `play()` **não** depende de
  `naMesa`, senão trocar de página reiniciaria a trilha.
- **Slider e checkbox são desenhados, não nativos** (`Slider.tsx`,
  `Check.tsx`). O `input[type=range]` é irregular entre navegadores e no
  celular disputa o gesto de arrastar com o menu; o slider daqui é uma trilha
  com Pointer Events e captura do ponteiro, com botões de − e + (acertar 5%
  arrastando num celular é loteria) e teclas de seta. O check mantém o
  `input` nativo invisível — é ele que dá teclado, leitor de tela e rótulo
  clicável de graça; `opacity: 0`, nunca `display: none`, senão ele perde o
  foco.

O detalhe da carta no clique **resolve o problema do texto longo** (a Reunião é o
texto mais comprido do baralho): a carta corta e o texto inteiro vive no modal.
Não encurte os textos em `cards.ts` por causa de espaço.

**Sair (ou entrar como convidado) limpa o localStorage do jogo.**
`limparLocalDoJogo()` (`storage.ts`) + `cancelarSync()` (`sync.ts`) rodam ao
sair (nas Configurações e no "falta o nick" de `/auth`), e também ao entrar
como convidado. Sem isso o save
de um jogador vazava para o próximo que entrasse no mesmo navegador — o
espelho local não sabe de quem é.

---

## Armadilhas conhecidas

Todas já morderam neste projeto. Leia antes de mexer nas áreas correspondentes.

**Um `switch` sem `default` transforma dado desconhecido em silêncio.** É a
armadilha mais cara deste projeto, porque ela não deixa rastro: o
interpretador de ações não tem ramo padrão, então uma ação cujo nome mudou não
dá erro — ela simplesmente não acontece, e a carta parece quebrada sem que nada
apareça no console. Toda mudança de vocabulário precisa da tradução na leitura
(`migrarAcoes`), e o `satisfies Record<Acao['faz'], Descritor>` dos descritores
é a outra metade da rede: ele quebra o BUILD quando falta o formulário.

**Começar o dia passou a poder matar.** `startDay` sempre foi seguro: ele só
somava energia e cota. Com a fila do `amanha` carregando ações quaisquer, o dia
pode nascer com estresse ou advertência suficientes para acabar a run — por
isso ele termina em `checkDefeat`. Qualquer coisa nova que rode ali precisa do
mesmo cuidado.

**Item flex não encolhe abaixo do próprio min-content.** O popup é um item
flex centralizado pela cortina, com `width: min(100%, 560px)`. Isso NÃO
impedia ele de ficar mais largo que a tela: bastava um filho com min-content
grande (um `Segmentado` de cinco opções, um grid de `minmax(130px, 1fr)`) para
a janela inteira passar de 390px no celular, e o `100%` não adiantava nada. O
conserto é `min-width: 0` no painel — aí quem transborda é o conteúdo, e é ele
que ganha um `overflow-x: auto` próprio (a tabela das semanas, a fileira de
classes). Vale para qualquer caixa que seja item de um flex.

**Popup dentro da nota fiscal precisa de portal.** `mask` (a serrilha) e
`filter` (o drop-shadow da moldura) também viram bloco contentor de
`position: fixed`, como o `perspective` abaixo: o popup do envelope, aberto
de dentro do recibo de fim, ficava preso no tamanho do recibo. `Missoes`
monta o `Envelope` com `createPortal(…, document.body)`. Qualquer popup que
nasça de dentro de outro precisa do mesmo.

**`position: fixed` dentro de elemento com `perspective`.** Um elemento com
`perspective` vira bloco contentor de descendentes fixos — `left/top` passam a
ser relativos a ele, não à viewport. Como a carta precisa de `perspective` para o
3D, arrastar com `position: fixed` jogava a carta longe do cursor. **A solução
atual:** a carta anda por delta de `transform`; o JS informa só o deslocamento do
ponteiro em `--ddx/--ddy` e o CSS compõe posição, levantada e escala. Não volte
para posicionamento absoluto.

**`getBoundingClientRect()` devolve a caixa já transformada.** No leque a carta é
girada, então medir a carta para calcular o offset do arraste dá errado. Meça o
slot (`.palco`), que não é transformado — ou, melhor, use delta puro.

**Pseudo-elemento por cima da carta.** O contorno tracejado do slot vazio é um
`::after` que pinta depois da carta e engolia o ponteiro mesmo com `opacity: 0`.
Qualquer decoração sobreposta precisa de `pointer-events: none`.

**Inline style ganha de `:hover`.** O levantar no hover não funcionava porque o
componente escrevia `--ty` inline. Hoje o inline escreve `--lift` e o CSS compõe
`--ty`. Cuidado ao adicionar variáveis novas na carta.

**A mesa não pode abrir antes do catálogo.** `SessaoGuard` espera
`catalogoPronto()` junto com `lerConta()` — em paralelo, então custa o tempo
da mais lenta e não a soma. Começar uma run com o baralho de referência e
terminá-la com o do banco seria trocar as cartas no meio do jogo. A home
dispara a mesma promessa sem esperar (`CarregarCatalogo.tsx`), porque lá o
tutorial só abre no clique e até então a resposta chegou.

**Save de versão antiga derruba a página.** Quando `GameState` ganha campo novo,
um save gravado pela versão anterior não o tem e a mesa quebra ao ler. Já
aconteceu em produção. **A regra:** ao mudar o formato de `GameState`, incremente
a chave em `storage.ts` e some o campo em `CAMPOS_DA_RUN`. A validação
(`runUsavel`) roda tanto no save local quanto no que vem do banco.

**URL do Supabase com caminho.** O painel mostra a URL do projeto num lugar e a
"API URL" (terminada em `/rest/v1`) em outro. A `supabase-js` quer a primeira —
passar a segunda gera `/rest/v1/rest/v1` e "Invalid path specified in request
URL". O código normaliza, mas o valor certo é a URL do projeto pura.

**Página de detalhe com "id" não pode ser rota dinâmica.** O site é export
estático (`output: 'export'`), e `/meus-jogos/[id]` exigiria listar todo
`run_id` possível em build time — inviável para IDs criados em produção. A
saída é uma rota estática com o id por query string
(`/meus-jogos/detalhe?id=123`), lida no cliente com `useSearchParams()`. Isso
só funciona dentro de um `<Suspense>` — sem ele o build estático falha. Use
esse padrão para qualquer página futura de "ver um item específico" que
precise de export estático.

**Ícone de "Adicionar à Tela de Início" no iPhone.** O iOS ignora o
`icon.svg` e ignora os `icons` do manifest: ele só lê a tag
`apple-touch-icon`, e só aceita **PNG opaco** (sem transparência, sem canto
arredondado — a máscara é dele). É o `src/app/apple-icon.png`, 180×180, que
o Next publica sozinho. Trocar só o `icon.svg` não muda o ícone do atalho.
E cuidado com o basePath: o Next prefixa o `<link>` para o manifest, mas
**não** prefixa o conteúdo de dentro dele — `start_url`, `scope` e `icons`
em `src/app/manifest.ts` levam o `/clt` na mão, senão o atalho instalado
abre na raiz do domínio.

**Campo com fonte menor que 16px dá zoom no iPhone — e não desfaz.** O Safari
do iOS dá zoom sozinho ao focar qualquer `input` com `font-size` abaixo de
16px, e ao desfocar **não volta**: a página fica maior que a tela pelo resto
da visita. Não existe jeito confiável de pedir o zoom-out por JS, e a saída
comum (`maximum-scale=1`) é hostil a quem precisa ampliar. A regra é só ter
fonte de 16px ou mais em campo de formulário — hoje `.campo` em
`page.module.sass` e `.campo`/`.campoTexto` em `feedback.module.sass`.

**`flex` com base em px num container que virou coluna.** `.campo` na home
tinha `flex: 1 1 200px` de quando o formulário era uma linha. O formulário
virou coluna (login, cadastro), e aquele `200px` deixou de ser largura e
passou a ser **altura**: cada campo abria com 200px de alto e ainda crescia
para preencher a sobra. Campo de formulário não leva `flex` com base em px —
e, ao virar um flex container de linha para coluna, confira TODO `flex` dos
filhos. Mesmo cuidado em `feedback.module.sass`, onde `.campoTexto` só recebe
`flex: 1` dentro de `.responder`, que é a única linha de verdade.

**No toque, `pointerenter` dispara junto com o clique.** A dica dos medidores
abria com `onPointerEnter` e alternava no `onClick`. No dedo os dois eventos
acontecem na mesma batida, em ordem que varia, e o resultado era a dica
presa aberta para sempre. A regra: passar o mouse é do mouse
(`e.pointerType === 'mouse'`), tocar é só o clique — e, no toque, é preciso
fechar explicitamente (clique fora, Esc), porque não existe "tirar o mouse
de cima".

**Dica presa ao elemento é cortada nas pontas.** A mesma dica era
`position: absolute` dentro do chip: nos medidores das bordas ela saía da
tela, e no celular, com seis tijolos numa grade 3×2, "as bordas" é metade
deles. Hoje ela é `position: fixed` e o componente calcula `left`/`top` a
partir do `getBoundingClientRect()` do chip, limitando à janela e virando
para cima quando não cabe embaixo. Vale para qualquer balão futuro: ou é
fixed com limite, ou vai ser cortado em algum lugar.

**Regra depois de `@media` ganha da regra dentro dele.** Com a mesma
especificidade, quem vem por último na folha vence — estar dentro de uma
media query não conta como mais específico. Regra base fica ANTES do
`@media` que a sobrescreve; movida para baixo, ela apaga o comportamento do
celular sem erro nenhum aparecer. (Mordeu no ranking antigo, de tabela.)

**Run terminada não pode ser gravada por timer com debounce.** Foi bug em
produção: o registro da run terminada morava no mesmo `setTimeout` de 900ms
que sobe o save, e qualquer sincronização seguinte dava `clearTimeout`.
Começar uma run nova logo depois de perder cancelava a gravação da derrota,
que sumia sem erro nenhum na tela. Hoje `registrarRunAgora()` (`sync.ts`)
grava na hora, fora do timer, e o que falhar entra numa fila em
`clt:runs-pendentes:v1` que sobe na próxima abertura da mesa. Não pendure
nada que só acontece uma vez naquele timer.
E o erro do banco não pode mais ser engolido: `registrarRunAgora()` devolve
o motivo, escreve `console.error` com a mensagem do PostgREST inteira
(`message · details · hint · code`) e a mesa mostra essa mesma mensagem
crua no painel de fim — no iPhone não há console para abrir sem um Mac por
perto, então o erro tem que caber na tela. Foi por não ter nada disso que "joguei até o fim e não salvou" levou
duas rodadas para ser diagnosticado.

**`create policy` não tem "if not exists".** Rodar `schema.sql` de novo num
banco que já o rodou antes (para pegar funções/colunas novas) falha em
"policy ... already exists" na primeira `create policy` que encontrar,
mesmo que todo o resto do arquivo seja `create or replace`/`if not exists`.
A saída é um `drop policy if exists` logo antes de cada `create policy`.
Qualquer política nova que entrar no arquivo precisa do mesmo par.

**`create or replace function` não muda o tipo de retorno.** O irmão da
armadilha acima: se uma função `returns table (...)` ganha coluna nova,
rodar o arquivo num banco que já tem a versão antiga falha em "cannot
change return type of existing function". Por isso `schema.sql` derruba
todas as funções (`drop function if exists`, com a assinatura completa)
num bloco só, antes de recriá-las. Função nova entra nesse bloco também —
e o `grant execute` tem que vir depois do `create`, porque o drop leva o
grant junto.

**`src` de mídia não ganha o basePath.** O Next prefixa os links que ele
mesmo gera, não o `src` de uma tag `<audio>`/`<img>` escrita à mão. O
caminho do mp3 é montado no `(app)/layout.tsx`, que roda no servidor e
enxerga `DEPLOY_TARGET` — mesmo remendo do manifest e do apple-touch-icon.
Componente cliente não serve para isso: o Next só embute `process.env` no
bundle do navegador para variáveis `NEXT_PUBLIC_`.

**Áudio tocando a volume zero rouba o som do aparelho.** Mudo era ganho 0 com
o elemento tocando — silencioso, mas ainda "tocando" para o sistema. Um
elemento de mídia em reprodução toma o foco de áudio: no celular ele vira a
faixa dos controles do aparelho e PAUSA o YouTube (ou o Spotify) que estava
tocando. Do lado de quem usa, o som simplesmente trava sem motivo, porque o
nosso já era zero. Volume zero tem que ser `pause()` no elemento mais
`suspend()` no AudioContext, devolvendo o foco; sair do mudo volta a tocar
sozinho. No mudo o contexto nem nasce, e a trilha de 3,7 MB nem é baixada.

**Áudio não toca antes de o visitante interagir.** Chamar `play()` na
montagem é recusado em silêncio numa aba recém-aberta. `Musica.tsx` tenta
assim mesmo (quem chegou navegando por dentro do site traz a interação
junto) e, se for recusado, espera o primeiro `pointerdown`/`keydown`/
`touchstart`. Qualquer som novo precisa da mesma rede de proteção.

**No iOS `audio.volume` é somente leitura.** Escrever nele não dá erro e não
muda nada — no iPhone só os botões do aparelho mexem no som. Foi por isso
que os controles de volume não funcionavam. A saída é passar o elemento por
um `GainNode` da Web Audio (`createMediaElementSource` → gain → destination)
e mexer no ganho; o iPhone respeita. `createMediaElementSource` só pode ser
chamado **uma vez por elemento**, e o `AudioContext` precisa nascer depois
de uma interação — daí a criação preguiçosa dentro do primeiro `play()`.

**Gatilho em `auth.users` some se você derrubar a função dele.** O perfil
nasce de `ao_criar_usuario`, um gatilho `after insert` em `auth.users` — uma
tabela de OUTRO schema, que o `reset.sql` não apaga. Por isso o bloco de drop
do `schema.sql` derruba o gatilho ANTES da função (`drop trigger ... on
auth.users`): dropar só a função deixaria um gatilho quebrado, e todo cadastro
novo passaria a falhar com erro do Postgres na cara de quem está se
inscrevendo.

**"Confirm email" ligado significa cadastro sem sessão.** Com a confirmação de
e-mail ligada no painel (é o padrão), `signUp()` devolve `data.session === null`
e insistir em entrar logo depois só dá erro. `cadastrar()` devolve
`precisaConfirmar` justamente para a tela dizer "confira a caixa de entrada"
em vez de fingir que deu certo. Para testar rápido, desligue a confirmação em
Authentication > Providers > Email.

**O endereço de volta do Google precisa estar na lista do Supabase.**
`enderecoDeVolta()` (`conta.ts`) monta `<raiz>/auth/` — a raiz é o endereço
atual sem o `auth/` do fim, com o `/clt` do GitHub Pages incluso, sem remontar
basePath à mão. Só que o Supabase recusa qualquer redirect que não esteja em
Authentication > URL Configuration > Redirect URLs, e o sintoma é voltar para
o site errado, sem erro nenhum. **Desde a v0.14 a porta é `/auth`:**
`localhost:3000/auth/` e `lx-xz.github.io/clt/auth/` precisam estar lá (além
dos de `nova-senha/`). Mudar a rota da porta sem mexer na lista quebra o
login do Google em silêncio.

**Coluna nova e o cache do PostgREST.** A API que a `supabase-js` chama
guarda o formato das tabelas em cache. Logo depois de um `alter table add
column`, um insert com a coluna nova pode falhar com "column ... does not
exist" mesmo com a coluna criada. `schema.sql` termina com
`notify pgrst, 'reload schema';` por isso.

**Gesto de arraste em `window` disputando com o arraste da carta.** A barra
lateral no celular ouve `touchstart/touchmove` em `window` para abrir com
arraste de qualquer ponto da tela. Sem cuidado, isso também dispara ao começar
um arraste em cima de uma carta (que usa Pointer Events, não Touch Events, mas
ambos os eventos disparam para o mesmo toque físico). A correção é checar
`e.target.closest('[data-carta]')` no `touchstart` e ignorar o gesto inteiro
quando ele começa numa carta. Qualquer novo elemento arrastável na mesa
precisa do mesmo cuidado — ou herdar o atributo `data-carta`, ou a barra vai
tentar abrir junto.

**Uma regra CSS só pode ler `var()` de uma variável que ELA MESMA declarou,
via cascata — não a variável de quem a chamou.** O painel da barra lateral usa
um truque válido, mas fácil de "simplificar" por engano: a regra base
(`.painel`) calcula `transform` a partir de `var(--arraste, 0px)`; a regra
mais específica (`.nav.aberta .painel`) só redeclara `--arraste`, sem tocar em
`transform`. Funciona porque `var()` resolve o valor cascateado da
propriedade *no elemento*, não da regra que a declarou. Reescrever a regra
`.aberta` para also declarar `transform: translateX(0)` direto quebraria o
arraste ao vivo (o JS escreve `--arraste` inline durante o gesto, e essa
declaração fixa ganharia por especificidade). O mesmo padrão já existia em
`Card.module.sass` para `--lift`/`--ty`.

---

## Banco

Esquema completo em [`supabase/schema.sql`](supabase/schema.sql), para rodar no
SQL Editor do projeto.

| Tabela | Guarda |
|---|---|
| `players` | o perfil: nick, nome, e-mail, se é convidado, se é admin, pontos, avatar. **O site nunca lê esta tabela direto** |
| `saves` | run em andamento e coleção, em `jsonb` |
| `runs` | registro append-only de runs terminadas, para balanceamento. `versao_baralho` diz em que balanceamento a run foi jogada, e `details.baralho` guarda as cartas como eram naquele dia |
| `feedbacks` | bugs e sugestões, com estado, urgência e nota |
| `feedback_comentarios` | a conversa de cada relato |
| `notificacoes` | o que aconteceu com o relato de cada um |
| `cartas` · `cartas_evento` | o catálogo do jogo. `ativa = false` é carta removida, que continua existindo |
| `cartas_antigas` | versões anteriores E cartas removidas, com `o_que` e `porque` de cada mudança |
| `baralho` | uma linha só: a versão do baralho, que sobe a cada mudança de carta |
| `modos` | os NÚMEROS do jogo: aluguel, cota, salário, energia base. Hoje só o `normal` |
| `amizades` | um pedido por linha (`de`, `para`, `estado`). Recusar e desfazer apagam |
| `conquistas` · `conquistas_do_jogador` | a lista (populada pelo próprio `schema.sql`) e quem ganhou o quê. `premio` é para os cosméticos de depois |

Para apagar tudo e recomeçar do zero existe [`supabase/reset.sql`](supabase/reset.sql)
— ele derruba as tabelas **e as contas do Auth**, e não tem desfazer.

### Contas

Quem identifica o jogador é o **Supabase Auth**: e-mail e senha, ou Google. O
`players.id` é o **mesmo id do `auth.users`**, e é isso que deixa
`auth.uid() = player_id` funcionar direto nas políticas de `saves` e `runs`,
sem tabela de ligação. O perfil nasce por um **gatilho em `auth.users`**
(`ao_criar_usuario`), não pelo site: assim nunca existe conta sem perfil, nem
que o navegador feche no meio do cadastro.

Quem entra pelo Google chega **sem nick** (o Google não tem como saber um), e
o mesmo acontece quando o nick é tomado entre a checagem na tela e o cadastro.
Nos dois casos o perfil fica com `nick = null`, `lerConta()` devolve
`{ tipo: 'incompleto' }` e a home pede o resto antes de deixar jogar. Nick nulo
não colide com nick nulo no índice único, então isso não trava ninguém.

**O convidado** não tem conta no Auth: `criar_convidado()` cria uma linha em
`players` com `convidado = true` e um nick sorteado (`convidado-a3f2`), e a
identidade mora no localStorage deste navegador. Ele joga tudo, e as partidas
dele são gravadas com `runs.convidado = true` — mas não relata bug (não há
como responder a ninguém) e perde o progresso ao sair, o que a tela avisa
antes, no perfil, e na página de feedbacks.

**Admin se dá no SQL Editor**, com o e-mail na mão
(`update public.players set admin = true where email = '...'`), depois de a
conta existir. Não há tela para promover ninguém, de propósito.

**Perfil de outra pessoa mostra só o que já era público.** `perfil_publico()`
e `jogos_do_jogador()` devolvem nick, avatar, placar e partidas — o mesmo que
o ranking já mostrava, mais o desenho. Nome, e-mail e pontos **não passam por
lá**: quem devolve esses é `meu_perfil()`, filtrado por `auth.uid()`. A
decisão de o que é público mora na função do banco, não na tela.

**A urgência tem duas línguas, e uma coluna só.** "Urgência crítica" não quer
dizer nada numa sugestão — sugestão não é urgente, ela entra antes ou depois.
Os quatro valores no Postgres continuam `baixa/media/alta/critica`; o que muda
é o rótulo, conforme o tipo do relato (`escalaDe()` em `src/data/feedback.ts`):
bug fala em gravidade (Cosmético → Quebra o jogo), ideia fala em quando entra
(Algum dia → Entra já). Não crie coluna nova para isso.

**`salvar_avatar()` não valida o conteúdo, e é de propósito.** Quem valida é
`lerAvatar()` no site, na LEITURA: peça desconhecida cai no padrão (o
manequim). Assim acrescentar um cabelo novo não exige mexer no banco, e um
avatar gravado por uma versão antiga nunca derruba a página de ninguém. O
convidado não passa por aqui — o avatar dele mora no localStorage, junto com
o resto dele.

**O cadastro não escolhe avatar (desde a v0.8).** Ele perguntava o gênero
para sortear um desenho, e isso era pedir um dado pessoal para enfeitar a
tela. Hoje todo mundo nasce manequim. O gatilho `ao_criar_usuario` ainda lê
`raw_user_meta_data -> 'avatar'`, que o site não manda mais — o valor é nulo
e `lerAvatar()` o transforma no manequim. `avatarAleatorio()` é o botão
Sortear do editor.

**Comentário de admin faz a triagem sozinho.** `comentar_feedback()` move o
relato de `novo` para `triado` quando quem comenta é admin: responder já é ter
lido, e deixar o relato dizendo "ainda não foi lido com calma" depois de uma
resposta é mentira na cara do autor.

`runs` tem uma coluna `run_id` (uuid, gerado com `crypto.randomUUID()` na
criação da run, em `createRun()`) com índice único, e uma coluna `details`
(`jsonb`) com o dia-a-dia da partida (`GameState.history`, ver
`src/game/types.ts` — `DayLog`). `enviarRun()` (`src/data/saves.ts`) grava com um
`insert` cru e trata `23505` (unique_violation) como sucesso: se a mesma run
for enviada duas vezes (duas abas, uma retentativa depois de a resposta se
perder), a segunda esbarra no índice único e isso é exatamente o resultado
desejado. **Não troque por `upsert`** — foi o que estava aqui e quebrou em
produção: o upsert vira `on conflict do nothing`, e o Postgres cobra SELECT
na tabela por causa da cláusula `on conflict`, então toda gravação voltava
com `permission denied for table runs · GRANT SELECT ON public.runs TO anon
· 42501`. Seguir a dica da mensagem daria leitura da telemetria de todo
mundo para o `anon`, que é justamente o que a seção de segurança abaixo
proíbe. `run_id` é nulo nas linhas
gravadas antes desta mudança — nulo nunca colide com nulo num índice único do
Postgres, então convivem sem problema.

`runs` tem ainda `started_at`, `max_combo`, `cards_played`, `warnings` (o que
o histórico não deduz sozinho) e `visivel`. **`visivel = false` é a run largada
no meio sem permissão do jogador:** ao reiniciar, o menu pergunta se quer
guardar; dizendo não, a run é gravada assim mesmo, com `outcome = 'abandono'`,
mas fora de `meus_jogos()`, `ranking()` e `jogo_detalhe()` — quantas runs são
largadas, e em que dia, é dado de balanceamento. `'abandono'` é o quinto valor
do check de `outcome` e **não conta** como derrota em lugar nenhum. **Só é
gravado do dia 3 em diante:** reiniciar no primeiro minuto é "ainda estou
escolhendo o baralho", não desistência.

As estatísticas de carta saem todas de `details`, que já guarda as cartas de
cada dia na ordem jogada: `cartas_jogadas()`, `cartas_fatais()` (a última carta
antes de a run acabar mal, via índice `-1` do jsonb), `escolhas_de_evento()`,
`estresse_por_dia()` e `estatisticas_nerds()`. Nenhuma delas precisou de
contador novo no motor — antes de criar campo em `GameState` para uma
estatística, veja se ela não sai do histórico.

Decisões de segurança que não devem ser desfeitas:

- **`players` não tem política nenhuma.** Com o RLS ligado e zero políticas, a
  tabela é invisível para o site: o que se sabe do próprio perfil vem de
  `meu_perfil()`, que filtra por `auth.uid()`. E-mail e nome **nunca** saem
  para outra pessoa — o que aparece em ranking, feedback e comentário é só o
  nick.
- **Quem é admin, quem pergunta é o banco.** A página de feedbacks chama
  `sou_admin()` ao abrir, em vez de confiar no `admin` do perfil guardado no
  navegador: virar admin é um `update` no banco, não uma ação do site, e o
  espelho local pode estar velho. O selo "modo admin" no título existe para
  isso ser visível — se ele não aparece, a conta não é admin, ponto.
- **`amizades`, `conquistas` e `conquistas_do_jogador` seguem a mesma regra**
  de `feedbacks`: sem política nem grant. `pedir_amizade()` confere
  `auth.uid()` e recusa convidado (não há conta para receber o aviso); um
  pedido de volta vira aceite, nunca uma segunda linha; recusar e desfazer
  APAGAM a linha. O pedido e o aceite geram linha em `notificacoes`, e o
  sininho os mostra. `conferir_conquistas(p_player_id)` recebe o id porque o
  convidado não tem `auth.uid()` — o pior que alguém faz chamando com o id de
  outra pessoa é dar a ela a conquista que os números dela já davam. Ela é
  idempotente pela chave primária e lê só `runs` e `saves.collection`:
  nenhum contador novo no motor.
- **`feedbacks`, `feedback_comentarios` e `notificacoes` também não têm
  política nem grant.** Tudo passa por função `security definer` que confere
  `auth.uid()` por dentro: `criar_feedback` recusa quem não tem conta,
  `editar_feedback`/`excluir_feedback` só aceitam o autor ou o admin, e
  `admin_atualizar_feedback` só o admin. Quem decide é o banco, não a tela —
  esconder o botão no React não é permissão.
- **`eh_convidado()` é `security definer` porque as POLÍTICAS a chamam.** A
  expressão de uma política roda com os privilégios de quem consulta, e o
  `anon` não tem select em `players`: sem `security definer` a política
  falharia com "permission denied for table players". Pelo mesmo motivo ela é
  criada **antes** das políticas e fica **fora** do bloco de drop — derrubar
  função de que uma política depende é erro.
- **`runs` só aceita `insert` direto.** Toda leitura agregada ou por jogador
  passa por função `security definer`, nunca por `select` cru:
  - `estatisticas_gerais()` — agregados globais, usada por `/analytics`.
  - `ranking()` — nick, avatar e vitórias/derrotas de todo mundo, usada por
    `/ranking`. **Exceção deliberada:** esta função expõe o `nick` de todo
    jogador publicamente. É intencional — o nick já não protegia nada (não é
    senha, é só identificação) e virar uma lista pública é o que a rota
    pede. **O avatar entrou na v0.14 por decisão explícita do autor** (ele já
    era público pelo `perfil_publico()`). Não estenda esse padrão para expor
    qualquer outra coluna.
    **Convidado não entra no ranking** (`not p.convidado and not
    r.convidado`, as duas marcas porque o perfil do convidado é apagável e a
    run guarda a dela): o nick dele é sorteado e some quando ele sai, e o
    placar se enchia de `convidado-xxxx`.
  - `meus_jogos(p_player_id)` — runs de um jogador específico, usada por
    `/meus-jogos`.
  - `jogo_detalhe(p_run_id, p_player_id)` — uma run específica, checando que
    pertence ao `p_player_id` informado (devolve vazio se não pertencer),
    usada por `/meus-jogos/detalhe`.
  - `jogo_publico(p_run_id)` — o replay de outra pessoa: o `details`, mais o
    nick e o avatar do dono. **Nunca** o `player_id`, o nome ou o e-mail, e
    não abre run largada (`abandono`) nem run não guardada. Pelo mesmo motivo
    `jogos_do_jogador()` deixou de listar abandono para os outros.
  Nenhuma delas dá `grant select` em `players` ou `runs` para `anon` — o
  acesso continua só pela função.

### O nick agora é só um nome

Até a v0.3 entrar era digitar um nick, e quem digitasse o nick de outra pessoa
jogava no save dela. **Isso acabou**: o nick virou apenas o nome público
(ranking, feedbacks, comentários) e quem identifica é o Auth. A única entrada
sem senha é o convidado, que por definição não tem nada a proteger.

### Variáveis

`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`, em `.env.local`
para desenvolvimento e como secrets do repositório para o deploy. Veja
`.env.example`.

A chave anon (= publishable) é **pública por natureza**: o build é estático,
então ela vai embutida no JavaScript do site. Quem protege os dados é o RLS. A
chave `service_role` (= secret) **nunca** pode entrar no projeto — ela ignora o
RLS.

Sem as variáveis o site continua de pé e avisa que o banco não está configurado.
Mas sem conta (e sem convidado, que também precisa do banco) a guarda bloqueia
`/jogar` e `/baralho`, então **na prática não dá para jogar localmente sem
credencial** — é uma pendência aberta (veja abaixo).

O login por e-mail e por Google se liga no painel do Supabase, não em variável
nenhuma: o `.env.example` lista o que precisa estar configurado lá.

---

## Rodar e publicar

```bash
npm ci                # não apague o package-lock.json
cp .env.example .env.local   # preencha antes de rodar
npm run dev           # http://localhost:3000
npm run build         # build normal, com checagem de tipos
npm run build:pages   # gera out/ com basePath, igual ao CI
```

O deploy é `.github/workflows/pages.yml`, disparado a cada push no branch padrão
ou à mão em Actions. Como é página de projeto, o site é servido em `/clt` e o
build de deploy usa `basePath` — mas **só** quando `DEPLOY_TARGET=gh-pages`, para
o `npm run dev` continuar na raiz.

---

## Balanceamento

**O simulador está no repositório:** `npm run simular` (`scripts/simular.ts`).
Ele roda o motor fora do navegador — que é o que o princípio de `src/game/` não
importar React compra — com `Math.random` trocado por um LCG semeado, então a
mesma semente dá exatamente a mesma partida. É isso que permite comparar duas
versões do motor jogada por jogada: foi assim que a mudança de vocabulário da
v0.12 foi conferida (300 runs, **zero diferenças**).

Ele não existia antes: as medições eram feitas por um script escrito na conversa
e jogado fora, e por isso envelheceram sem ninguém conseguir refazê-las.

**Medição de 16/09/2026 — 1000 runs, bot mediano** (joga tarefa quando falta
cota, descansa quando o estresse aperta, recua quando uma carta o levaria perto
do teto):

| | |
|---|---|
| vitória | **0,7%** |
| burnout | **98,1%**, dia mediano **5** |
| demissão | 1,2%, dia mediano 15 |
| despejo | **0%** |
| cota batida | 46% dos dias |
| duração | 6,9 dias por run |

**O jogo está duro demais, e o gargalo continua sendo o estresse.** A run
mediana morre na primeira semana: como `Energia = 10 − Estresse`, cada dia sem
bater a cota custa `+2` de estresse, que vira menos energia no dia seguinte, que
faz perder a cota de novo. O `−3` do fim de semana quase nunca chega a tempo. O
despejo **nunca** acontece: a conta de R$ 300 é irrelevante perto disso.

**A troca da Reunião (v0.15)** — 1 Tarefa Simples a menos, 1 Reunião a mais,
para o inicial ter 3 de cada naipe — custou um pouco: vitória 0,4%, burnout
98,9%, cota batida 40,6%, 6,1 dias por run. Esperado: a Reunião rende menos
produtividade que a Tarefa. É a regra de naipe pagando o preço, não o ajuste
que o jogo precisa.

**As cartas da v0.15** (baralho v3: 7 ajustes e 12 cartas novas, 5 delas
pagas em R$). O bot paga R$ só se o saldo continuar cobrindo as contas da
sexta. Medição de 1000 runs:

| | baralho inicial | `--tudo` (inicial + 1 de cada desbloqueável) |
|---|---|---|
| vitória | 0% | 3,4% (pontuação mediana R$ 825) |
| burnout | 99,9%, dia mediano 5 | 96,6%, dia mediano 5 |
| cota batida | 42,2% dos dias | 49,8% dos dias |

**Leitura:** as cartas mexem na margem, e não no problema. Com o baralho
inicial a run continua morrendo na primeira semana — quem decide isso são as
REGRAS (o `+2` de estresse por cota perdida, a cota da semana 1), e é por
elas que o rebalanceamento tem que começar, no `/lab/regras`. As cartas
pagas são jogadas pouco (0,2–0,3 por run) porque o bot quase nunca tem R$ 300
de folga acima das contas: o dinheiro só sobra para quem chega à semana 2.

Os números antigos do CLAUDE.md (309 burnouts em 500) eram anteriores ao Embalo
e a um bot diferente — não compare os dois.

---

## Pendências abertas

- **Jogar sem banco.** Quem clonar o repositório sem credencial não consegue nem
  abrir o jogo. Cair num modo local quando o banco não estiver configurado foi
  oferecido e não decidido.
- **Animação de compra.** No protótipo as cartas voavam do baralho para a mão uma
  a uma; isso não foi portado para o app.
- **Sinergias entre cartas.** O Embalo cobre "ordem importa"; gatilhos nomeados
  ("Café depois de Reunião não gera estresse") foram propostos e não feitos.
- **Código morto:** `embaloAtual()` e `weekNumber()` em `engine.ts` não têm uso
  fora do próprio arquivo.
- **Rebalancear: o jogo está duro demais.** A medição de 1000 runs (veja
  Balanceamento) dá 98% de burnout, quase sempre na primeira semana, e 0% de
  despejo. As duas pontas a mexer são o custo do estresse (o `+2` por cota não
  batida, e o `−3` do fim de semana) e a cota da semana 1. A infraestrutura toda
  já existe: o retrato dentro da run, `VERSAO_BARALHO`, o histórico por carta, e
  agora o `npm run simular` para medir antes de decidir. Falta decidir os
  números — e dá para fazer pelo `/lab/regras` sem publicar o site.
- **Semear o catálogo em produção.** A tabela nasce vazia e o jogo cai no
  baralho do código até alguém apertar "Semear" no `/lab/cartas`. Enquanto
  isso não acontece, editar carta é impossível (o botão fica desligado) e o
  jogo funciona normalmente — é o estado intencional, não um bug.
- **Rodar o `schema.sql` da v0.17** (coluna `cartas.custos`). Sem ele o
  custo em R$ segue funcionando pelo `custo_dinheiro`, mas custo de estresse
  ou produtividade salvo no `/lab` não é gravado.
- **Mudar carta em `cards.ts` NÃO muda o jogo no ar.** Semear só escreve o
  que não existe, e rodar o `schema.sql` não toca em carta. Com o banco já
  semeado, quem leva o código para lá é a caixa "O código tem cartas que o
  banco não tem" do `/lab/cartas` (v0.16): lista as novas e as diferentes,
  deixa desmarcar o que o admin editou de propósito, e salva pelo mesmo
  `admin_salvar_carta`, com o motivo de `MOTIVOS_DO_CODIGO` (`cards.ts`).
  A comparação ordena as chaves: o `jsonb` reordena, e o texto cru acusaria
  diferença em toda carta. Ao ajustar carta no código, escreva o porquê lá.
- **Rodar o `schema.sql` da v0.14 em produção** e acrescentar `/auth/` nas
  Redirect URLs do Supabase (veja a armadilha do Google). Até lá o site
  funciona: amigos, conquistas e o replay alheio somem em silêncio
  (`faltaFuncao()` em `jogadores.ts`) em vez de quebrar a página.

- **Efeitos sonoros.** A música de fundo já toca (`src/components/Musica/Musica.tsx`,
  `public/som/`), com os dois volumes em `src/data/som.ts`. Falta o resto: um
  som por evento do jogo (carta jogada, cota batida, advertência, vitória,
  derrota). Quando entrarem, o volume deles é mais um multiplicador em
  `som.ts`, ao lado de `volumeDaMusica()` — e o autor separa os arquivos.
- **Cosméticos desbloqueáveis.** `conquistas.premio` já existe, nulo: é
  onde o acessório que a conquista destrava (crachá, caneca, óculos da
  firma) vai morar. Junto com os pontos de feedback, resolve a pendência "o
  que se compra com os pontos".
- **Espiral visível e o jogo duro de propósito.** Decidido: meta de 10–20% de
  vitória para o bot mediano — e, por isso mesmo, junto com o que torna a
  espiral LEGÍVEL: o `+2` de estresse por cota perdida virando regra de
  `modos` (hoje está fixo em `engine.ts`), prévia de jogada rodando `playCard`
  puro, "amanhã: X de energia", zonas de perigo no estresse, a cota como
  barra, o veredito do dia e o fim do `−N` vermelho falso na virada da
  produtividade. Duro e ilegível é injusto.
- **Recompensa por feedback.** A nota que o admin dá já vira `players.pontos`
  (nota × 10, recalculado a cada mudança) e aparece no perfil. Falta decidir o
  que se compra com ela — carta, tema, nada disso.
- **Notificação de verdade.** A tabela `notificacoes` já é preenchida a cada
  resposta do admin, mudança de estado e comentário novo, e o sininho da barra
  lateral já lê e marca como lida. Falta o aviso sair do site: e-mail, ou push.
  Foi feito assim de propósito — quando isso chegar, o histórico já existe.
- **O changelog é escrito à mão** (`src/data/changelog.ts`). Ao entregar coisa
  nova, acrescente a versão no topo e tire o item de `EM_ANDAMENTO`.
- **Convidado é criável à vontade pelo `anon`.** `criar_convidado()` não tem
  limite: dá para encher a tabela de perfis de convidado. Para um trabalho de
  faculdade tudo bem; se virar problema, o caminho é rate limit no Supabase.
- **O mp3 da trilha tem 3,7 MB.** Vai inteiro para o GitHub Pages em toda
  visita (o navegador cacheia depois). Se a trilha crescer, vale reencodar
  em bitrate menor ou cortar um loop curto.

---

## Convenções

- **Português** em nomes, comentários e mensagens de commit. O código mais antigo
  (`src/game/`) tem nomes em inglês por ter vindo do README; código novo é em
  português. Não vale a pena renomear o antigo só por consistência.
- **Comentário explica o porquê, não o quê.** Os comentários deste código
  registram decisões e armadilhas — preserve-os ao refatorar.
- **Verificação é pelo navegador — mas na medida da mudança.** Não há suíte de
  testes, então o que valida é dirigir o app com Playwright. Só que subir
  servidor + Supabase falso + navegador custa caro, e nem toda mudança paga
  esse preço. A régua:
  - **Dados ou marcação** (um link novo no menu, um texto, uma cor): só
    `npx tsc --noEmit` e `npm run build`. Sem navegador.
  - **Interação ou layout** (arraste, tamanho de carta, rolagem, celular):
    meça no navegador. Todas as armadilhas da seção acima nasceram assim, e
    nenhuma delas apareceria só lendo o código.
  - **Fluxo novo inteiro** (uma rota nova, uma regra nova do motor): um
    teste de ponta a ponta no fim, não um a cada passo.
- **Mensagem de commit conta o porquê**, incluindo a causa raiz quando o commit
  conserta um bug. O histórico é curto e vale ler.
- **"Pergunta" ou "constatação" no começo da mensagem = não mexa em nada.** O
  autor usa essas duas palavras para marcar conversa, não tarefa: absorva,
  responda, e pare. Nada de editar arquivo, rodar build, subir navegador ou
  commitar. No fim, diga o que faria e pergunte se pode.
