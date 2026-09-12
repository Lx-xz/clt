# CLT — retrato do projeto em 12/09/2026

> **Leia isto primeiro.** Este arquivo é uma **foto datada**, feita para levar o
> projeto para outra conversa (outra IA, outra máquina, outro dia) sem precisar
> reconstruir o contexto do zero. Ele **não é mantido**: a verdade viva é o
> [`CLAUDE.md`](CLAUDE.md) na raiz, que é atualizado a cada entrega. Se os dois
> discordarem, o CLAUDE.md ganha.
>
> **Se a outra IA tiver o repositório em mãos, ela não precisa deste arquivo** —
> basta dizer "leia o `CLAUDE.md` antes de mexer em qualquer coisa". Este aqui
> serve para quem NÃO tem o repositório aberto, ou para começar uma conversa
> nova já sabendo o que não precisa ser rediscutido.
>
> **`CONTEXTO-VOZ.md` está desatualizado** (ele ainda descreve o login por nick,
> que deixou de existir na v0.3). Não use.

---

## 1. O que é

**CLT — Coffee, Labor and Tears.** Card game roguelike single-player sobre
atravessar um mês de trabalho formal sem ficar no vermelho e sem surtar.
Trabalho de faculdade de **Luiz Adolfo Frederico (CC4M)**. Sem multiplayer, sem
monetização, sem dado sensível.

Cada dia é uma rodada, cada semana é uma cobrança do chefe, o mês inteiro (4
semanas, 20 dias úteis) é uma **run**.

**A ideia que sustenta o jogo:** o estresse não some sozinho. A energia de cada
dia é `10 − estresse acumulado`, então um dia mal jogado encolhe todos os
seguintes. É uma espiral, não um recurso que reinicia.

- **Recursos:** energia (reinicia todo dia), estresse (acumula), produtividade
  (zera todo dia, é o que o chefe mede), dinheiro (acumula, sai nas contas de
  sexta).
- **Derrotas:** estresse chega a 10 (burnout), 3 advertências (demissão), não
  pagar as contas de sexta (despejo).
- **Vitória:** chegar ao fim das 4 semanas empregado e com as contas pagas. A
  pontuação é o dinheiro que sobrou.
- **Embalo:** cartas seguidas da mesma classe (tarefa, descanso, grana, social)
  no mesmo dia rendem bônus crescente. Existe para a ORDEM das jogadas
  importar — sem ele, tanto fazia.

Conteúdo: 21 cartas de ação e 21 eventos (4 deles ambíguos, que perguntam).

---

## 2. Onde está

| | |
|---|---|
| Repositório | GitHub, `Lx-xz/clt` |
| Branch de trabalho | `claude/card-game-initial-site-s3ck6j` |
| No ar | <https://lx-xz.github.io/clt/> — GitHub Pages, deploy a cada push |
| Último commit deste retrato | `ccbe7fd` "A carta se monta em blocos, e o mudo devolve o som do aparelho" |

```bash
npm ci                       # não apague o package-lock.json
cp .env.example .env.local   # preencha antes de rodar
npm run dev                  # http://localhost:3000
npm run build                # build normal, com checagem de tipos
npm run build:pages          # gera out/ com basePath, igual ao CI
```

---

## 3. Stack, e o que foi recusado

| | |
|---|---|
| Next 15 (App Router) + React 19 | `output: 'export'` — **não há servidor** |
| TypeScript 5 | **não subir para a 7**: quebra o carregador do `next.config.ts` |
| Sass **indentado** (`.sass`, sem chaves) | pedido do autor; não converter para `.scss` |
| `lucide-react` | ícones |
| `@supabase/supabase-js` | banco, chamado direto do navegador |

**Deliberadamente recusado, não esquecido:** nenhuma lib de animação (as
animações são CSS mais um `requestAnimationFrame` de 30 linhas), nenhum
gerenciador de estado (`useState` basta), nenhum framework de UI. Só entra
dependência que pague o próprio peso.

---

## 4. Mapa do repositório

```
src/game/        regras puras — NENHUM import de React
  types.ts         GameState e companhia
  acoes.ts         o catálogo de AÇÕES: o vocabulário de carta e evento
  catalogo.ts      quais cartas existem AGORA — a porta única de getCard
  cards.ts         o baralho de referência (semente e rede)
  events.ts        os eventos de referência
  regras.ts        os modos de jogo: aluguel, cota, salário, energia base
  engine.ts        o motor: funções puras GameState -> GameState
  storage.ts       localStorage (espelho) e validação do save
  session.ts       quem está jogando
src/data/        tudo que fala com o Supabase
  supabase.ts conta.ts nick.ts saves.ts sync.ts feedback.ts
  notificacoes.ts changelog.ts cartas.ts balanceamento.ts avatar.ts tema.ts som.ts
src/components/  Card, CardDetail, Medidor, SideNav, SessaoGuard, Dialogo,
                 ComoJogar, Avatar, Musica, Segmentado, Slider, Check, icons
src/app/
  page.tsx             entrada: entrar, cadastrar, Google ou convidado
  termos/              fora da guarda de sessão
  (app)/layout.tsx     guarda de sessão + barra lateral
  (app)/jogar/         a mesa
  (app)/baralho/       montagem do baralho
  (app)/lab/           a oficina, só admin
supabase/schema.sql  o banco inteiro, para rodar no SQL Editor
supabase/reset.sql   apaga tudo (contas inclusive), sem desfazer
```

**O princípio que sustenta tudo:** `src/game/` não importa React. O motor é um
conjunto de funções puras sobre `GameState`, o que permite **simular centenas
de runs fora do navegador** para checar balanceamento. Foi assim que todo
número de balanceamento saiu. **Não ponha lógica de regra em componente.**

### Rotas

| Rota | O que é |
|---|---|
| `/` | entrar, criar conta (e-mail/senha ou Google), ou jogar como convidado |
| `/termos` | termos de uso, fora da guarda |
| `/jogar` | a mesa, tela cheia, sem rolagem |
| `/baralho` | cartas equipadas, não equipadas e bloqueadas |
| `/ranking` | placar público |
| `/perfil` · `/perfil/editar` | o seu perfil e o editor de avatar |
| `/jogador?nick=` | perfil de outra pessoa (sem nome, e-mail ou pontos) |
| `/meus-jogos/detalhe?id=` | replay dia a dia de uma run |
| `/comunidade` | Novidades, Feedbacks e Análise, em abas |
| `/nova-senha` | onde o link de "esqueci a senha" cai |
| `/lab` · `/lab/avatar` · `/lab/cartas` · `/lab/eventos` · `/lab/regras` | a oficina, **só admin** |

---

## 5. As quatro decisões estruturais

Se a conversa nova propuser desfazer alguma destas, ela está andando para trás.

### 5.1 O que a carta faz é DADO, não código

`ActionCard.efeitos` é uma lista de **ações** do catálogo em `src/game/acoes.ts`
(`recurso`, `comprar`, `descartar`, `sorteio`, `escolherDescarte` e mais uma
dúzia), cada bloco com um `se` (condição) e um `quando` (gatilho) opcionais.
**O motor não conhece o id de carta nenhuma** — nem as cinco que já tiveram
`case` no `switch` (Reunião, Foco Total, Puxar o Saco, Automatizar, Pedir
Aumento). Os eventos seguiram o mesmo caminho.

Três regras seguram isto:

1. **A composição acontece na LISTA, não em função nova.** "Reembaralhar 1" é
   `descartar(1)` seguido de `comprar(1)`, não uma primitiva.
2. **Isto não vira linguagem de programação.** `sorteio` carrega listas dentro
   e é o limite: laço, variável e expressão ficam de fora. A régua é: **cabe
   numa carta que alguém lê na mão, em três linhas?**
3. **Ação nova precisa de um descritor** em
   `src/app/(app)/lab/_catalogo/descritores.ts`, que é um
   `satisfies Record<Acao['faz'], Descritor>` — esquecer quebra o build, em vez
   de deixar a ação sem editor em silêncio.

O que NÃO virou ação, de propósito: comprar, descartar e embaralhar continuam
funções do motor, entregues por `contexto()`. "Quando o baralho acaba, o
descarte vira baralho" é regra do jogo, não de uma carta. O sorteio entra por
`ctx.sorte` em vez de `Math.random()` — é o que permite rodar o motor com
sorteio determinístico.

### 5.2 As cartas e as regras moram no BANCO

Desde a v0.10, as cartas estão na tabela `cartas` (e `cartas_evento`), e os
números que não pertencem a carta nenhuma (aluguel, cota, meta, salário,
energia base) estão na tabela `modos` como **modo de jogo** — hoje só o
`normal`. `cards.ts`/`events.ts`/`regras.ts` continuam existindo como
**semente** (o que "Semear" leva para o banco) e como **rede** (sem banco, sem
internet ou com catálogo vazio, o jogo abre com eles em vez de não abrir).

Quem serve as cartas é `src/game/catalogo.ts` — `getCard`/`getEvent` vêm de lá,
**nunca** de um array importado.

**Três peças tornam isso seguro, e precisam continuar valendo juntas:**

1. **Nada é apagado.** Remover é `ativa = false` mais uma linha em
   `cartas_antigas`. Quem está no meio de uma run com a carta na mão termina.
2. **A run guarda o próprio retrato.** `createRun` copia para
   `GameState.baralho` cada carta como ela era naquele dia, e para
   `GameState.modo` as regras daquele dia. Mudar o aluguel às três da tarde não
   muda o preço de quem está no dia 12, e o replay de ontem continua verdadeiro.
3. **Não dá para mudar em silêncio.** `admin_salvar_carta` recusa `porque`
   vazio. O "o quê" ("Custo 4 → 6") é sugerido automaticamente; o "por quê" é
   digitado, porque essa metade um diff não sabe escrever.

### 5.3 O editor visual de ações

Desde a v0.11, o que uma carta faz se monta em **blocos empilhados** no
`/lab/cartas`, não em JSON cru. **Isto não é o Scratch, e é por isso que coube
em dois arquivos:** todo parâmetro da linguagem é literal, não há variável, e
só existem dois pontos de aninhamento (`sorteio.entao/senao` e
`escolherDescarte.entao`) — uma lista vertical cobre 100% dela. Arrastar ficou
de fora de propósito: as setas ↑ ↓ fazem o que o arraste faria, e não
acrescentaria capacidade nenhuma.

O JSON virou `EscapeJson`, recolhido: serve para colar uma carta de fora e
conferir o resultado.

### 5.4 O avatar é uma receita, não uma imagem

O que vai para o banco são seis palavras (corpo, cabelo, pele, cor do cabelo,
roupa, fundo) num `jsonb`; o SVG é montado na hora por `Avatar.tsx`. Trocar de
avatar é um `update` numa linha, o desenho é nítido em qualquer tamanho, e não
existe imagem imprópria para moderar porque ninguém sobe imagem.

`salvar_avatar()` **não valida o conteúdo, de propósito**: quem valida é a
LEITURA (`lerAvatar()`), e peça desconhecida cai no padrão. Por isso
acrescentar um cabelo novo não exige migração nenhuma.

---

## 6. O banco

Esquema completo em `supabase/schema.sql`, para rodar no SQL Editor do Supabase.

| Tabela | Guarda |
|---|---|
| `players` | o perfil: nick, nome, e-mail, convidado, admin, pontos, avatar. **O site nunca lê esta tabela direto** |
| `saves` | run em andamento e coleção, em `jsonb` |
| `runs` | registro append-only de runs terminadas, para balanceamento |
| `feedbacks` · `feedback_comentarios` · `notificacoes` | bugs, sugestões, a conversa de cada um e os avisos |
| `cartas` · `cartas_evento` | o catálogo. `ativa = false` é carta removida, que continua existindo |
| `cartas_antigas` | versões anteriores e cartas removidas, com `o_que` e `porque` |
| `baralho` | uma linha só: a versão do baralho |
| `modos` | os números do jogo. Hoje só o `normal` |

**Contas:** quem identifica é o **Supabase Auth** (e-mail/senha ou Google).
`players.id` é o **mesmo id do `auth.users`**, e o perfil nasce por um gatilho
em `auth.users` (`ao_criar_usuario`), não pelo site. O **convidado** não tem
conta no Auth: `criar_convidado()` cria uma linha em `players` e a identidade
mora no localStorage. Admin se dá **à mão no SQL Editor**, de propósito.

### Segurança — o que NÃO pode ser desfeito

- A chave **`service_role` (secret) nunca entra no projeto.** Só a anon
  (publishable), que é pública por natureza num build estático. Quem protege
  os dados é o RLS.
- **`players` não tem política nenhuma.** RLS ligado e zero políticas = tabela
  invisível para o site. O próprio perfil vem de `meu_perfil()`, filtrado por
  `auth.uid()`. **Nunca** dar `grant select` em `players` ou `runs` para `anon`.
- **`feedbacks`, `feedback_comentarios` e `notificacoes` também não têm
  política nem grant.** Tudo passa por função `security definer` que confere
  `auth.uid()` por dentro. Esconder botão no React não é permissão.
- **`runs` só aceita `insert` direto.** Toda leitura passa por função
  `security definer`: `estatisticas_gerais()`, `ranking()`, `meus_jogos()`,
  `jogo_detalhe()`.
- **`ranking()` expõe o nick de todo mundo, e isso é uma exceção deliberada e
  documentada.** Não estenda o padrão para nenhuma outra coluna.
- **`enviarRun()` é um `insert` cru que trata `23505` (unique_violation) como
  sucesso. NÃO troque por `upsert`** — já quebrou em produção: o upsert exige
  SELECT na tabela por causa do `on conflict`, e a "solução" que a mensagem de
  erro sugere daria a telemetria de todo mundo para o `anon`.

---

## 7. Estado em 12/09/2026

Jogável de ponta a ponta: 20 dias, 4 semanas, as três derrotas e a vitória
funcionam, em desktop e celular.

**As três últimas entregas:**

- **v0.9** — cartas e eventos viraram dado; versionamento do baralho (retrato
  dentro da run).
- **v0.10** — cartas, eventos e regras foram para o banco; CRUD de verdade no
  `/lab`; carta neutra (sem classe); descarte visível e descarte escolhido pelo
  jogador; "desbloquear tudo" e "resetar" saíram do `/baralho`.
- **v0.11** — editor visual de ações em blocos; mudo passou a PARAR a música em
  vez de abaixá-la a zero; popup do lab parou de passar da largura da tela no
  celular. Junto, o `/lab/avatar` ganhou 7 medidas novas (pescoço, borda do
  ombro, tamanho da cabeça, nariz, sobrancelha, olho), o corte de cabelo virou
  TABELA (`CABELOS_FORMA`) em vez de `if`, e entraram peças de teste marcadas
  com frasco: cabelo quadrado, careca, degradê, boné, chapéu e olho detalhado
  — desenhadas de verdade, mas fora do alcance do jogador.

### Dois passos manuais que o autor ainda deve, e que travam coisas

1. **Rodar `supabase/schema.sql` de novo** no SQL Editor (por causa da tabela
   `modos`, da coluna `runs.modo`, de `admin_salvar_modo` e de
   `admin_semear_catalogo` ter passado a receber três argumentos).
2. **Apertar "Semear" uma vez** em qualquer bancada do `/lab`. Até isso
   acontecer, o jogo roda com o baralho do código e os botões de editar ficam
   desligados — é o estado intencional, não um bug.

### Decidido e ainda não aplicado

- **Rebalanceamento:** `contasSemanais` de 300 → 380 e Hora Extra de custo 4 →
  3. A medição mostrou que o despejo quase não acontece (o gargalo é estresse)
  e que o embalo de `grana` quase nunca sai porque duas cartas de grana custam
  o dia inteiro. Hoje dá para fazer isso pelo `/lab/regras` e pelo `/lab/cartas`
  sem publicar o site.

### Pendências abertas

- **Conquistas.** Decidido: a regra é **dado editável no `/lab`** (mesma ideia
  das cartas) e a **conferência fica no banco** (função `security definer` que
  lê `runs.details`, que já guarda o dia-a-dia). Combinado para entrar junto com
  a próxima mexida no `schema.sql`, depois do ok do autor.
- **Jogar sem banco.** Quem clonar sem credencial não abre o jogo. Modo local
  foi oferecido e não decidido.
- **Sinergias entre cartas** (gatilhos nomeados: "Café depois de Reunião não
  gera estresse"). O Embalo cobre "ordem importa" genericamente. O caminho
  proposto é mais valores de `quando` (`inicioDoDia`, `aoComprarCarta`,
  `aoDescartarCarta`, `aoFimDaSemana`) e mais `Condicao`, não laço.
- **Animação de compra** (cartas voando do baralho para a mão), do protótipo.
- **Efeitos sonoros** — a música já toca; falta um som por evento do jogo.
- **Mais peças de avatar** — cabelo quadrado, careca, degradê, boné, chapéu e
  olho detalhado já estão DESENHADOS e marcados como teste no `/lab/avatar`,
  esperando a decisão de promover. Promover cabelo e olho é barato (tipo +
  rótulo, sem migração); o acessório é o que custa, porque a receita ainda não
  tem campo para ele. Óculos e barba são da mesma família do acessório.
- **Recompensa por feedback** — a nota do admin já vira pontos; falta decidir o
  que se compra com eles.
- **Notificação de verdade** (e-mail ou push) — a tabela já é preenchida.
- **Código morto:** `embaloAtual()` e `weekNumber()` em `engine.ts`.

---

## 8. Decisões já tomadas — não rediscuta do zero

- **Layout:** leque de cartas sobreposto + carta estilo TCG. Escolhido pelo
  autor entre três protótipos.
- **Nenhuma página rola**, exceto `/baralho` (que usa a classe global `.page`).
- **Todo popup é o componente `Dialogo`.** Não escreva popup à mão: os três que
  existiam antes erravam cada um uma coisa (Esc, clique fora, travar o fundo).
- **O nick não é senha.** Isso mudou na v0.3: hoje o nick é só o nome público e
  quem identifica é o Auth. Se algum texto antigo disser o contrário, está
  velho.
- **O tutorial monta as cartas de verdade** com o componente `Card` e lê os
  números das regras — rebalancear não pode deixar o tutorial mentindo.
- **`/lab` é conveniência, não segurança.** O código vai no mesmo bundle para
  todo mundo, porque o site é estático. Quem protege é o Postgres recusar as
  ações de admin.
- **`/lab/avatar` produz código para colar, não salva nada** — não há servidor
  para escrever arquivo. E ele desenha com o MESMO componente do jogo, nunca
  com uma cópia: laboratório que desenha diferente mente sobre o resultado.
- **Português** em nomes, comentários e mensagens de commit. O código mais
  antigo (`src/game/`) tem nomes em inglês por ter vindo do README; não vale
  renomear só por consistência.

---

## 9. As armadilhas que mais custaram

O `CLAUDE.md` tem a lista inteira (umas 25, cada uma com a causa raiz). As que
mais voltam:

- **`position: fixed` dentro de elemento com `perspective`** vira relativo a
  ele, não à viewport. A carta anda por delta de `transform`, nunca por
  posicionamento absoluto.
- **Item flex não encolhe abaixo do próprio min-content** — foi isso que fazia
  o popup do lab ficar mais largo que a tela do celular.
- **Save de versão antiga derruba a página.** Ao mudar o formato de
  `GameState`, incremente a chave em `storage.ts` e some o campo em
  `CAMPOS_DA_RUN`.
- **`create policy` não tem "if not exists"** e **`create or replace function`
  não muda o tipo de retorno** — por isso o `schema.sql` tem `drop policy if
  exists` antes de cada política e derruba todas as funções num bloco só.
- **`src` de mídia não ganha o basePath** (o `/clt` do GitHub Pages). Vale para
  `<audio>`, manifest e apple-touch-icon.
- **No iOS `audio.volume` é somente leitura** — o volume passa por um GainNode
  da Web Audio.
- **Áudio tocando a volume zero rouba o foco de som do aparelho** e pausa o
  YouTube de quem está jogando. Mudo tem que ser `pause()` de verdade.
- **Campo de formulário com fonte menor que 16px dá zoom no iPhone e não
  desfaz.**
- **Página com "id" não pode ser rota dinâmica** num export estático: use query
  string dentro de um `<Suspense>`.

---

## 10. Como se trabalha aqui

- **Comentário explica o porquê, não o quê.** Os comentários deste código
  registram decisões e armadilhas — preserve-os ao refatorar.
- **Mensagem de commit conta o porquê**, incluindo a causa raiz quando conserta
  um bug.
- **Não há suíte de testes.** O que valida é dirigir o app com Playwright, na
  medida da mudança:
  - dados ou marcação → só `npx tsc --noEmit` e `npm run build`;
  - interação ou layout → meça no navegador;
  - fluxo novo inteiro → um teste de ponta a ponta no fim.
- **Refatoração do motor se confere com o comparador determinístico:** o mesmo
  bot, com `Math.random` trocado por um LCG semeado, rodando nos dois motores,
  e o estado final inteiro comparado byte a byte.
- **"Pergunta" ou "constatação" no começo da mensagem do autor = conversa, não
  tarefa.** Absorva, responda e pare; não edite arquivo, não rode build, não
  suba navegador, não commite. No fim, diga o que faria e peça permissão.
