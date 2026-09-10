# CLT — contexto para conversa por voz

> Cole este arquivo (ou leia em voz alta os pontos principais) no início de uma
> conversa de voz sobre o projeto, para a IA do outro lado saber do que se trata
> sem precisar abrir o repositório.

## O que é

**CLT — Coffee, Labor and Tears.** Jogo de cartas roguelike single-player, feito
como trabalho de faculdade (Luiz Adolfo Frederico, CC4M). O jogador atravessa um
mês de trabalho formal sem ficar no vermelho e sem surtar. Cada dia é uma rodada,
cada semana é uma cobrança do chefe, o mês inteiro (4 semanas, 20 dias úteis) é
uma "run".

A ideia central: **o estresse não some sozinho.** A energia de cada dia é
`10 menos o estresse acumulado`, então um dia mal jogado encolhe todos os
seguintes — é uma espiral, não um recurso que reseta.

Recursos: energia (reinicia todo dia), estresse (acumula, só cai no fim de
semana ou com cartas específicas), produtividade (zera todo dia, é o que o
chefe mede), dinheiro (acumula, sai nas contas de sexta).

Derrotas: estresse chega a 10 (burnout), 3 advertências (demissão), não pagar
as contas de sexta (despejo). Vitória: chegar ao fim das 4 semanas empregado —
pontuação é o dinheiro que sobrou.

## Onde está

- **Código:** GitHub, repositório `Lx-xz/clt`, branch `claude/card-game-initial-site-s3ck6j`.
- **No ar:** <https://lx-xz.github.io/clt/> — GitHub Pages, deploy automático a
  cada push.
- **Stack:** Next.js (export estático, não há servidor), TypeScript, Sass
  indentado (sem chaves — pedido específico), Supabase como banco.
- **O arquivo `CLAUDE.md`** na raiz do repo tem o contexto técnico completo e
  fica atualizado a cada mudança relevante — peça para ler esse arquivo se
  precisar de detalhe de implementação que não está aqui.

## Como o jogo evoluiu (histórico rápido)

1. **Começou** como site simples: baralho + tela de jogo, layout em lista
   vertical, clique para jogar carta.
2. **Virou mesa de verdade** depois de eu não gostar do layout de lista: agora é
   uma mesa em tela cheia (sem rolagem), recursos em cima, evento e "tapete" de
   jogo no meio, baralho/mão/descarte embaixo. Carta em 3D com verso, que vira
   ao ser revelada. Arrastar a carta até o tapete joga ela; clique simples abre
   um detalhe grande com o texto completo; clique duplo também joga.
3. **Ganhou mecânica nova, o "Embalo":** jogar cartas seguidas da mesma classe
   (tarefa, descanso, grana, social) no mesmo dia dá bônus crescente. Isso não
   estava no design original em papel — foi adicionado porque, sem ele, a ordem
   das cartas na mão era irrelevante.
4. **Sexta-feira virou 3 passos confirmados** (salário → contas → descanso) em
   vez de resolver tudo de uma vez, para dar tempo de ver o dinheiro entrar
   antes de sair.
5. **Ganhou login por nick e banco Supabase:** a home pede um nick, procura no
   banco, oferece criar conta se não existir. **Importante: nick não é senha** —
   é só identificação para testar com várias pessoas. Quem digitar o nick de
   outra pessoa joga no save dela. Isso é intencional por enquanto.
6. **Última mudança:** barra lateral de navegação recolhível (ícones só, cresce
   no hover; no celular abre arrastando da borda) e um HUD adaptado para tela
   pequena.

## O que funciona hoje

Jogo completo e jogável do início ao fim: 20 dias, 4 semanas, as 3 derrotas e a
vitória disparam corretamente. Testado em desktop e celular. Login por nick
funcionando com o Supabase real.

## Pendências conhecidas (o que ainda falta ou está em aberto)

- **Não dá pra jogar localmente sem configurar o Supabase** — o login bloqueia
  o acesso à mesa e ao baralho mesmo sem banco configurado. Modo local/offline
  foi cogitado e não decidido.
- **Rebalancear depois do Embalo**, especialmente a classe "grana" (dinheiro),
  que pode estar forte demais em sequência.
- **Sinergias entre cartas específicas** (tipo "Café depois de Reunião não gera
  estresse") foram propostas mas não implementadas — só existe o Embalo por
  classe genérica.
- **Animação de compra de cartas** do protótipo original (cartas voando do
  baralho pra mão uma a uma) não foi portada para o jogo de verdade.
- Duas funções sem uso (`embaloAtual`, `weekNumber` em `engine.ts`) — código
  morto que pode ser limpo ou vai ganhar uso ainda.

## Do que costumamos falar / decisões que já foram tomadas

Se a conversa for sobre continuar o desenvolvimento, estes pontos já foram
decididos e não precisam ser revisitados do zero:

- **Layout escolhido:** leque de cartas + estilo "TCG" (arte no topo, custo em
  círculo/aba, texto embaixo). Foi escolhido entre 3 opções de protótipo.
- **TypeScript preso na versão 5** — a versão 7 quebra o build do Next.
- **Sass tem que ser indentado**, não `.scss` com chaves.
- **O motor do jogo (`src/game/engine.ts`) é puro** — nenhum import de React,
  só funções `GameState -> GameState`. Isso permite simular centenas de runs
  fora do navegador pra checar balanceamento. Não misturar lógica de regra
  com componente de interface.
- **Segurança do banco:** a busca de nick passa por função do banco
  (`security definer`), não por leitura direta da tabela — assim ninguém
  consegue baixar a lista de todos os nicks. A tabela de runs terminadas só
  aceita escrita, nunca leitura pelo site (é telemetria, lida manualmente no
  painel do Supabase).

## Perguntas que fazem sentido levar pra essa conversa

- Vale a pena implementar sinergias entre cartas específicas, ou o Embalo já
  resolve o problema de "ordem importa"?
- Como rebalancear a classe "grana" sem re-simular do zero?
- Vale investir em modo offline/local antes de continuar com features novas?
- Que animações ou polish visual têm mais retorno para uma apresentação de
  faculdade?
