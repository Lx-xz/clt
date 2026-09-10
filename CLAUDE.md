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
  preso a `vh` (`--carta-h`) justamente para caber sem rolar.
- **Carta em 3D com verso.** Duas faces com `backface-visibility: hidden`,
  girando em `rotateY`. Vale para mão, evento e pilhas. Cartas jogadas no tapete
  ficam maiores e se empilham quando são muitas.
- **Interação da carta:** hover cresce e levanta · clique simples abre o detalhe
  com o texto completo · clique duplo **ou** arraste até o tapete joga.
- **Medidores compactos:** só ícone e valor (`⚡ 10`), com nome e explicação numa
  dica que aparece no hover, no foco e no toque. No celular o dinheiro perde o
  "R$" e os 6 medidores viram uma grade 3×2.
- **Barra lateral recolhível** (`SideNav.tsx`): no desktop fica só com ícones e
  cresce no hover; no celular fica escondida e abre arrastando da borda
  esquerda para a direita (fecha arrastando de volta). Muda de página fecha o
  gaveteiro sozinho. "Reiniciar run" mora aqui agora, com confirmação — saiu
  do HUD da mesa.
- **HUD do celular:** header colado nas bordas, dia à esquerda e nick à
  direita, "Próx. dia" ancorado abaixo do header, status de sync vira ícone
  (girando / check / sem conexão) em vez de texto. Baralho e descarte somem da
  mesa no celular (a carta jogada e a mão já ocupam o espaço).
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

---

## Banco

Esquema completo em [`supabase/schema.sql`](supabase/schema.sql), para rodar no
SQL Editor do projeto.

| Tabela | Guarda |
|---|---|
| `players` | nick e id. **O site nunca lê esta tabela direto** |
| `saves` | run em andamento e coleção, em `jsonb` |
| `runs` | registro append-only de runs terminadas, para balanceamento |

Duas decisões de segurança que não devem ser desfeitas:

- **A busca de nick passa por função `security definer`** (`find_player`,
  `create_player`), não por `select`. Com `select`, o site precisaria de leitura
  em `players` e qualquer pessoa baixaria a lista de nicks de todo mundo.
- **`runs` só aceita `insert`, nunca `select`.** Telemetria é escrita pelo site e
  lida no painel do Supabase.

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

---

## Convenções

- **Português** em nomes, comentários e mensagens de commit. O código mais antigo
  (`src/game/`) tem nomes em inglês por ter vindo do README; código novo é em
  português. Não vale a pena renomear o antigo só por consistência.
- **Comentário explica o porquê, não o quê.** Os comentários deste código
  registram decisões e armadilhas — preserve-os ao refatorar.
- **Verificação é pelo navegador.** Não há suíte de testes. As mudanças foram
  validadas dirigindo o app com Playwright: jogar uma run inteira, medir se a
  carta acompanha o cursor, conferir vazamento horizontal no celular. Se for
  mexer em interação ou layout, meça — não confie em parecer certo.
- **Mensagem de commit conta o porquê**, incluindo a causa raiz quando o commit
  conserta um bug. O histórico é curto e vale ler.
