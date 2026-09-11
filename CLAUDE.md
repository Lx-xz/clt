# CLT — contexto do projeto

Arquivo de contexto para quem (pessoa ou IA) for mexer neste repositório sem ter
acompanhado a construção. O [`README.md`](README.md) é o documento do jogo — as
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
| `/` | Entrada: pede um nick, procura no banco, oferece criar se não existir |
| `/jogar` | A mesa. Ocupa a janela inteira, sem rolagem |
| `/baralho` | Cartas equipadas, não equipadas e bloqueadas |
| `/ranking` | Placar público: todo nick já salvo, vitórias/derrotas. Link na barra lateral. No celular a linha mostra só nick/V/D e abre no toque com o resto |
| `/meus-jogos` | Toda run terminada do jogador da sessão. Link na barra lateral |
| `/meus-jogos/detalhe?id=` | Replay dia a dia de uma run (evento, cartas jogadas, produtividade/estresse/dinheiro). Chega-se clicando numa run em `/meus-jogos` |
| `/perfil` | Só o nick de quem está jogando. Link no fim da barra lateral |
| `/analytics` | Agregados de todo mundo (jogadores, vitórias, tipo de derrota). Link na barra lateral, como "Análise" |

**20 cartas de ação** (8 tipos iniciais somando 15 cartas no baralho, 12
desbloqueáveis) e **20 cartas de evento**, das quais 4 são ambíguas e pedem uma
escolha.

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
  cards.ts      20 cartas de ação, progressão das semanas, constantes
  events.ts     20 cartas de evento
  engine.ts     o motor: funções puras GameState -> GameState
  storage.ts    localStorage (espelho), validação de formato do save
  session.ts    quem está jogando (id + nick)
src/data/     tudo que fala com o Supabase
  supabase.ts   cliente, normalização da URL
  nick.ts       regras do nick, espelhando as constraints da tabela
  players.ts    acharJogador / criarJogador, via RPC
  saves.ts      baixar/subir save, registrar run terminada
  sync.ts       banco como fonte da verdade, localStorage como espelho
src/components/  Card, CardDetail, Medidor, SideNav, SessaoGuard, icons
src/app/
  page.tsx           entrada por nick
  (app)/layout.tsx   guarda de sessão + barra lateral
  (app)/jogar/       a mesa
  (app)/baralho/     montagem do baralho
supabase/schema.sql  o banco inteiro, para rodar no SQL Editor
```

**O princípio que sustenta tudo:** `src/game/` não importa React. O motor é um
conjunto de funções puras sobre `GameState`, o que permite **simular runs fora do
navegador** para checar balanceamento sem passar pela interface. Foi assim que os
números da seção de balanceamento saíram. Não coloque lógica de regra em
componente.

---

## Regras implementadas que não estão no design em papel

O README original foi escrito antes de qualquer código. Duas coisas mudaram:

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
  carta carrega o atributo `data-carta` no elemento arrastável — é o que a barra
  lateral usa para não roubar o gesto de arrastar uma carta (veja abaixo).
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
  Muda de página fecha o gaveteiro sozinho. "Reiniciar run" mora aqui agora,
  com confirmação — saiu do HUD da mesa. No fim da barra ficam "Perfil" (a
  rota `/perfil`) e "Configurações", que abre um diálogo com os dois volumes
  (geral e música) — o mesmo `.fundo`/`.dialogo` da confirmação de reinício.
- **HUD do celular:** header colado nas bordas, dia à esquerda e nick à
  direita, "Próx. dia" ancorado abaixo do header, status de sync vira ícone
  (girando / check / sem conexão) em vez de texto. Baralho e descarte somem da
  mesa no celular (a carta jogada e a mão já ocupam o espaço). **A mão tem seu
  próprio `--carta-h`** (`.zonaMao` no `@media (max-width: 760px)` de
  `jogar.module.sass`, hoje `clamp(148px, 40vw, 192px)`) maior que o padrão da
  mesa — é a carta que o jogador mais precisa ler no celular, e não deve
  encolher só porque o resto da mesa encolheu.
- **Paleta "papelada de escritório"** em `src/styles/_tokens.sass`: papel manila,
  tinta de caneta, custo como carimbo. Tem variante escura.

O detalhe da carta no clique **resolve o problema do texto longo** (a Reunião é o
texto mais comprido do baralho): a carta corta e o texto inteiro vive no modal.
Não encurte os textos em `cards.ts` por causa de espaço.

**Trocar de conta limpa o localStorage do jogo.** `limparLocalDoJogo()`
(`storage.ts`) + `cancelarSync()` (`sync.ts`) rodam ao clicar em "trocar" na
home. Sem isso o save de um nick vazava para o próximo jogador que entrasse
no mesmo navegador — o espelho local não sabe de quem é.

---

## Armadilhas conhecidas

Todas já morderam neste projeto. Leia antes de mexer nas áreas correspondentes.

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
fonte de 16px ou mais em campo de formulário — hoje, `.campo` em
`page.module.sass`, o único input do site.

**Regra depois de `@media` ganha da regra dentro dele.** Com a mesma
especificidade, quem vem por último na folha vence — estar dentro de uma
media query não conta como mais específico. Em `ranking.module.sass` as
regras base (`.seta`, `.curto`, `.detalhe` em `display: none`) ficam **antes**
do `@media (max-width: 640px)` de propósito; movê-las para baixo apagaria o
comportamento do celular sem erro nenhum aparecer.

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
| `players` | nick e id. **O site nunca lê esta tabela direto** |
| `saves` | run em andamento e coleção, em `jsonb` |
| `runs` | registro append-only de runs terminadas, para balanceamento |

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

Duas decisões de segurança que não devem ser desfeitas:

- **A busca de nick passa por função `security definer`** (`find_player`,
  `create_player`), não por `select`. Com `select`, o site precisaria de leitura
  em `players` e qualquer pessoa baixaria a lista de nicks de todo mundo.
- **`runs` só aceita `insert` direto.** Toda leitura agregada ou por jogador
  passa por função `security definer`, nunca por `select` cru:
  - `estatisticas_gerais()` — agregados globais, usada por `/analytics`.
  - `ranking()` — nick + vitórias/derrotas de todo mundo, usada por
    `/ranking`. **Exceção deliberada:** esta função expõe o `nick` de todo
    jogador publicamente. É intencional — o nick já não protegia nada (não é
    senha, é só identificação) e virar uma lista pública é o que a rota
    pede. Não estenda esse padrão para expor qualquer outra coluna.
  - `meus_jogos(p_player_id)` — runs de um jogador específico, usada por
    `/meus-jogos`.
  - `jogo_detalhe(p_run_id, p_player_id)` — uma run específica, checando que
    pertence ao `p_player_id` informado (devolve vazio se não pertencer),
    usada por `/meus-jogos/detalhe`.
  Nenhuma delas dá `grant select` em `players` ou `runs` para `anon` — o
  acesso continua só pela função.

### O nick não é autenticação

Entrar só com um nick **identifica**, não autentica. Quem digitar o nick de outra
pessoa joga no save dela. É uma escolha consciente para a fase de teste, dita na
própria tela e no README. O caminho para valer é Supabase Auth (magic link ou
login anônimo). Não trate isso como bug até que alguém decida trocar.

### Variáveis

`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`, em `.env.local`
para desenvolvimento e como secrets do repositório para o deploy. Veja
`.env.example`.

A chave anon (= publishable) é **pública por natureza**: o build é estático,
então ela vai embutida no JavaScript do site. Quem protege os dados é o RLS. A
chave `service_role` (= secret) **nunca** pode entrar no projeto — ela ignora o
RLS.

Sem as variáveis o site continua de pé e avisa que o banco não está configurado.
Mas o gate de nick bloqueia `/jogar` e `/baralho`, então **na prática não dá para
jogar localmente sem credencial** — é uma pendência aberta (veja abaixo).

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

Simulando 500 runs com um bot mediano (bate a cota, descansa com energia
sobrando), antes do Embalo: **309 burnouts, 173 demissões, 11 despejos, 7
vitórias.** Os 20 dias são alcançáveis e os quatro desfechos disparam.

O gargalo não é dinheiro, é estresse: como `Energia = 10 − Estresse`, um dia ruim
encolhe todos os seguintes e `−3` no fim de semana raramente recupera. O despejo
quase não acontece — a conta de R$ 300 está confortável perto do estresse.

**Estes números são anteriores ao Embalo e ao bot ser refeito.** Rode de novo
antes de usá-los para decidir qualquer coisa.

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
- **Rebalancear depois do Embalo**, especialmente a classe `grana`.
- **Efeitos sonoros.** A música de fundo já toca (`src/components/Musica.tsx`,
  `public/som/`), com os dois volumes em `src/data/som.ts`. Falta o resto: um
  som por evento do jogo (carta jogada, cota batida, advertência, vitória,
  derrota). Quando entrarem, o volume deles é mais um multiplicador em
  `som.ts`, ao lado de `volumeDaMusica()` — e o autor separa os arquivos.
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
