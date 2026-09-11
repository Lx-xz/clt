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
| `/` | Entrada: entrar, criar conta (e-mail/senha ou Google), ou jogar como convidado. Também abre o popup "Como jogar" |
| `/termos` | Termos de uso. Fora de `(app)`: dá para ler sem estar logado |
| `/jogar` | A mesa. Ocupa a janela inteira, sem rolagem |
| `/baralho` | Cartas equipadas, não equipadas e bloqueadas |
| `/ranking` | Placar público. O nick leva ao perfil daquela pessoa. No celular a linha mostra só nick/V/D e abre no toque com o resto |
| `/perfil` | O seu: avatar, posição no ranking, dados, **suas partidas** e o botão de sair |
| `/perfil/editar` | O editor do avatar |
| `/jogador?nick=` | O perfil de outra pessoa: avatar, placar e partidas. **Sem nome, e-mail ou pontos** |
| `/meus-jogos/detalhe?id=` | Replay dia a dia de uma run. Chega-se clicando numa partida no seu perfil |
| `/comunidade` | Novidades, Feedbacks e Análise, em abas. É a única das três no menu |
| `/nova-senha` | Onde o link de "esqueci a senha" cai. Fora de `(app)` |
| `/lab` · `/lab/avatar` · `/lab/cartas` | A oficina. **Só admin**, pelo layout de `/lab` |

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
  acoes.ts      o catálogo: o vocabulário que carta e evento têm para mexer no jogo
  cards.ts      20 cartas de ação, progressão das semanas, constantes
  events.ts     20 cartas de evento
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
  balanceamento.ts  a versão do baralho e o que já mudou em cada carta
src/components/  Card, CardDetail, Medidor, SideNav, SessaoGuard, Dialogo,
                 ComoJogar, icons
src/app/
  page.tsx           entrada: entrar, cadastrar, Google ou convidado
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
   virar primitiva, em três meses são trinta primitivas e o editor precisa de
   um formulário para cada uma.
2. **Isto não é para virar linguagem de programação.** `sorteio` já carrega
   listas dentro e é o limite: laço, variável e expressão ficam de fora. O que
   não couber continua sendo código no motor, e tudo bem.

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
   e não junto com ele. A recompensa de fim de semana é fotografada em
   `chooseReward`, porque ela entra no baralho depois do retrato inicial.
2. **O histórico, à mão.** `MUDANCAS` em `src/data/balanceamento.ts`, uma linha
   por ajuste, com `oQue` (o número) e `porque` (o motivo). É o que o jogador lê
   ao clicar em **histórico** numa carta do baralho. Um diff automático saberia
   dizer "custo 4 → 6" e não saberia dizer "porque Freela → Hora Extra fechava
   a semana 1 sozinha", que é a parte que importa.

**Ao ajustar uma carta:** suba `VERSAO_BARALHO`, acrescente a linha em
`MUDANCAS`, e cite em `changelog.ts`. Carta removida vai para
`CARTAS_REMOVIDAS` com o último formato que teve — `cartaComoEra()` procura
nessa ordem (retrato da run → baralho de hoje → removidas → rótulo honesto) e
por isso nenhuma dessas mudanças derruba a página de ninguém.

**Por que ainda não há tabela `cartas` no banco:** com as cartas no código, o
retrato dentro da run já garante a integridade das partidas antigas e
`MUDANCAS` já dá a leitura para o jogador. A tabela vira necessária quando as
cartas saírem do código — e aí `CARTAS_REMOVIDAS` + `MUDANCAS` são exatamente
o conteúdo de `cartas_antigas`, então esta estrutura migra sem mudar de forma.

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
  com confirmação — saiu do HUD da mesa. No fim da barra ficam "Lab" (só
  admin), "Perfil", "Avisos" (o sininho, escondido para convidado),
  "Configurações" e "Sair" (com confirmação, e com texto diferente para
  convidado, que perde o progresso ao sair).
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
- **Todo popup é o `Dialogo`** (`src/components/Dialogo.tsx`). Ele fecha ao
  clicar fora e no Esc, e trava a página atrás marcando `data-popup` no
  `<html>` (a regra que congela a rolagem está em `shell.module.sass`). Não
  escreva popup novo à mão: os três que existiam antes erravam cada um uma
  dessas coisas. `largo` só muda a largura.
- **HUD do celular:** header colado nas bordas, dia à esquerda e nick à
  direita, "Próx. dia" ancorado abaixo do header, status de sync vira ícone
  (girando / check / sem conexão) em vez de texto. Baralho e descarte somem da
  mesa no celular (a carta jogada e a mão já ocupam o espaço). **A mão tem seu
  próprio `--carta-h`** (`.zonaMao` no `@media (max-width: 760px)` de
  `jogar.module.sass`, hoje `clamp(148px, 40vw, 192px)`) maior que o padrão da
  mesa — é a carta que o jogador mais precisa ler no celular, e não deve
  encolher só porque o resto da mesa encolheu.
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
- **O avatar é uma receita, não uma imagem** (`src/components/Avatar.tsx` +
  `src/data/avatar.ts`). O que vai para o banco são seis palavras (corpo,
  cabelo, pele, cor do cabelo, roupa, fundo) num `jsonb`; o SVG é montado na
  hora. Trocar de avatar é um `update` numa linha, o desenho é nítido em
  qualquer tamanho, e não existe imagem imprópria para moderar porque
  ninguém sobe imagem. **Por enquanto ele só aparece no perfil** — pôr no
  ranking e nos feedbacks é decisão do autor, não consequência automática.
  - **O fundo e a borda são CSS, não SVG.** Eram um `rect` dentro de um
    `clipPath` e outro `rect` com `stroke` por cima; o stroke de um retângulo
    colado na borda do viewBox é **cortado ao meio pela própria caixa**, e
    saía uma linha irregular. Hoje quem faz fundo, canto e borda é o `<span>`
    em volta (`Avatar.module.sass`), e com isso sumiu o `clipPath` — e o id
    único que ele exigia. Regra geral: moldura é CSS, desenho é SVG.
  - **O manequim é o padrão de quem não escolheu**: a figura de madeira sem
    rosto. É o avatar do convidado e de quem chegou pelo Google, e ele diz
    "ainda não escolhi" sem fingir ser ninguém. Quem se cadastra por e-mail
    responde o gênero e já ganha um avatar sorteado a partir dele.
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
    a `larg`, o queixo vira ponta. Mexer nisso é o assunto do `/avatar-lab`.
- **`/lab` é a oficina, e nenhuma bancada dela grava no jogo.** A trava é o
  layout de `/lab` (`GuardaAdmin`), que pergunta ao banco — mas ela é
  conveniência, não segurança: o código vai no mesmo bundle para todo mundo,
  porque o site é estático. O que protege de verdade é o Postgres recusar as
  ações de admin. Não ponha ali dentro nada que dependa de esconder.
  Os dois atalhos de teste da porta (**desbloquear tudo**, **resetar**) são a
  exceção que mexe na conta de quem clica — e são de admin porque uma coleção
  inteira desbloqueada estraga qualquer leitura de dificuldade que venha
  daquela conta.
- **`/lab/cartas` edita a carta inteira.** Desde que o efeito virou lista de
  ações, não existe mais "a regra está no motor": os quatro campos de recurso
  mexem no bloco sem condição (o que se usa para rebalancear) e o painel de
  ações mostra a lista crua em JSON, que é a única forma de editar carta
  condicional sem inventar um formulário por tipo de ação. Continua sem gravar
  em lugar nenhum: leva o `cards.ts` pronto para o repositório.
- **`/lab/avatar` produz código, não salva nada.** O site é export estático:
  não há servidor para escrever arquivo, então a bancada devolve a linha de
  `MEDIDAS` para colar em `Avatar.tsx`. Ela desenha com o **mesmo** componente
  do jogo (pela prop `ajustes`), nunca com uma cópia — laboratório que desenha
  diferente do jogo mente sobre o resultado. A grade com todas as combinações
  no rodapé existe porque é lá que o estrago aparece: ajuste que fica bom num
  caso costuma abrir buraco em outro.
- **Escolha curta e excludente é o `Segmentado`** (`src/components/Segmentado.tsx`):
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
sair, na home e no perfil, e também ao entrar como convidado. Sem isso o save
de um jogador vazava para o próximo que entrasse no mesmo navegador — o
espelho local não sabe de quem é.

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
`redirectTo` é `window.location.origin + window.location.pathname` — a própria
home, com o `/clt` do GitHub Pages incluso, sem remontar basePath à mão. Só que
o Supabase recusa qualquer redirect que não esteja em Authentication > URL
Configuration > Redirect URLs, e o sintoma é voltar para o site errado, sem
erro nenhum. `localhost:3000/` e `lx-xz.github.io/clt/` precisam estar lá.

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

**O avatar do cadastro entra pelo GATILHO, não por uma chamada do site.** Com
"Confirm email" ligado não existe sessão logo depois do `signUp`, e um
`salvar_avatar()` nesse momento seria recusado — então o avatar sorteado
viaja como metadado (`options.data.avatar`) e `ao_criar_usuario` o grava
junto com o perfil. Quem vem do Google é o caso oposto: ali já há sessão, e
`completarPerfil()` grava direto.

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
- **Rebalancear depois do Embalo**, especialmente a classe `grana`. A
  infraestrutura já está pronta: retrato dentro da run, `VERSAO_BARALHO` e o
  histórico por carta. Falta decidir os números.
- **Cartas no banco (`cartas` + `cartas_antigas`).** Adiado de propósito: veja
  "O versionamento do baralho" acima para o que já cobre o problema hoje e o
  que a tabela resolveria.
- **Efeitos sonoros.** A música de fundo já toca (`src/components/Musica.tsx`,
  `public/som/`), com os dois volumes em `src/data/som.ts`. Falta o resto: um
  som por evento do jogo (carta jogada, cota batida, advertência, vitória,
  derrota). Quando entrarem, o volume deles é mais um multiplicador em
  `som.ts`, ao lado de `volumeDaMusica()` — e o autor separa os arquivos.
- **Mais peças de avatar.** Óculos e barba são as próximas que rendem muito
  por pouco: peças soltas por cima de tudo, sem encaixe para errar — o
  oposto do cabelo. O `/avatar-lab` aceita colar o `d=` de uma peça nova
  para testar antes de virar código.
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
