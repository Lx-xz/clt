import type { ActionCard } from './types'

/**
 * O baralho de referência: as cartas como o código as conhece.
 *
 * **Isto não é mais a fonte da verdade.** Desde a v0.10 as cartas moram no
 * banco, e quem as serve para o jogo é `catalogo.ts`. O que sobrou aqui é a
 * SEMENTE (é esta lista que `admin_semear_catalogo` leva para o banco na
 * estreia) e a REDE: sem banco configurado, ou com a rede fora do ar, o jogo
 * abre com estas cartas em vez de não abrir.
 *
 * O que cada uma FAZ continua sendo uma lista de ações (`acoes.ts`), e é por
 * isso que a mudança de casa foi barata: uma carta já era só dado.
 */
export const CARTAS_BASE: ActionCard[] = [
  // --- baralho inicial (15 cartas) ---
  {
    id: 'tarefa-simples', name: 'Tarefa Simples', cost: 3, kind: 'tarefa',
    text: '+2 produtividade', starter: true, copies: 3,
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'produtividade', quanto: 2 }] }],
  },
  {
    id: 'planilha-infinita', name: 'Planilha Infinita', cost: 1, kind: 'tarefa',
    text: '+1 produtividade', starter: true, copies: 2,
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'produtividade', quanto: 1 }] }],
  },
  {
    id: 'reuniao', name: 'Reunião', cost: 2, kind: 'social',
    text: '+1 produtividade. Se for a 2ª reunião do dia: +1 estresse e nenhuma produtividade.',
    especial: true, starter: true, copies: 3,
    // a carta que muda de poder ao se repetir: duas linhas excludentes,
    // separadas pela quantidade de vezes que ELA já saiu hoje
    efeitos: [
      { se: { se: 'jaJogadaHoje', noMaximo: 0 }, acoes: [{ faz: 'recurso', qual: 'produtividade', quanto: 1 }] },
      {
        se: { se: 'jaJogadaHoje', aoMenos: 1 },
        acoes: [
          { faz: 'recurso', qual: 'estresse', quanto: 1 },
          { faz: 'mensagem', texto: 'Segunda reunião do dia: só estresse, nenhuma produtividade.' },
        ],
      },
    ],
  },
  {
    id: 'cafe', name: 'Café', cost: 0, kind: 'descanso',
    text: '+3 energia, +1 estresse', starter: true, copies: 2,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'energia', quanto: 3 },
      { faz: 'recurso', qual: 'estresse', quanto: 1 },
    ] }],
  },
  {
    id: 'hora-extra', name: 'Hora Extra', cost: 3, kind: 'grana',
    text: '+R$ 40, +2 estresse', starter: true, copies: 2,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'dinheiro', quanto: 40 },
      { faz: 'recurso', qual: 'estresse', quanto: 2 },
    ] }],
  },
  {
    id: 'freela', name: 'Freela', cost: 5, kind: 'grana',
    text: '+R$ 50', starter: true, copies: 1,
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'dinheiro', quanto: 50 }] }],
  },
  {
    id: 'enrolar-no-corredor', name: 'Enrolar no Corredor', cost: 1, kind: 'descanso',
    text: '−1 estresse', starter: true, copies: 1,
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'estresse', quanto: -1 }] }],
  },
  {
    id: 'almoco-decente', name: 'Almoço Decente', cost: 1, kind: 'descanso',
    text: '+2 energia', starter: true, copies: 1,
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'energia', quanto: 2 }] }],
  },

  // --- desbloqueáveis (recompensa do fim da run) ---
  {
    id: 'atalho-no-sistema', name: 'Atalho no Sistema', cost: 3, kind: 'tarefa',
    text: '+3 produtividade, +1 estresse', starter: false,
    // o +1 de estresse é o que a separa da Tarefa Simples: sem ele, ela era
    // a Tarefa melhor em tudo, pelo mesmo custo
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'produtividade', quanto: 3 },
      { faz: 'recurso', qual: 'estresse', quanto: 1 },
    ] }],
  },
  {
    id: 'delegar', name: 'Delegar', cost: 1, kind: 'social',
    text: '+2 produtividade, +1 estresse (alguém vai reclamar)', starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'produtividade', quanto: 2 },
      { faz: 'recurso', qual: 'estresse', quanto: 1 },
    ] }],
  },
  {
    id: 'cafe-duplo', raridade: 'rara', name: 'Café Duplo', cost: 0, kind: 'descanso',
    text: '+5 energia, +2 estresse', starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'energia', quanto: 5 },
      { faz: 'recurso', qual: 'estresse', quanto: 2 },
    ] }],
  },
  {
    id: 'terapia', raridade: 'incomum', name: 'Terapia', cost: 0, custos: [{ qual: 'dinheiro', quanto: 80 }], kind: 'descanso',
    text: '−3 estresse', starter: false,
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'estresse', quanto: -3 }] }],
  },
  {
    id: 'vale-refeicao', name: 'Vale-Refeição', cost: 0, kind: 'grana',
    text: '+R$ 20, compre 1', starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'dinheiro', quanto: 20 },
      { faz: 'comprar', quantas: 1 },
    ] }],
  },
  {
    id: 'home-office', raridade: 'incomum', name: 'Home Office', cost: 3, kind: 'tarefa',
    text: '+2 produtividade, −1 estresse', starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'produtividade', quanto: 2 },
      { faz: 'recurso', qual: 'estresse', quanto: -1 },
    ] }],
  },
  {
    id: 'foco-total', raridade: 'incomum', name: 'Foco Total', cost: 4, kind: 'tarefa',
    text: '+4 produtividade, mas descarta o resto da mão', especial: true, starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'produtividade', quanto: 4 },
      { faz: 'descartar', quantas: 'tudo' },
      { faz: 'mensagem', texto: 'Foco Total: o resto da mão foi descartado.' },
    ] }],
  },
  {
    id: 'puxar-o-saco', raridade: 'rara', name: 'Puxar o Saco', cost: 2, kind: 'social',
    text: 'Cancela 1 advertência (uma vez por run)', especial: true, starter: false,
    // o "uma vez por run" e o "só serve se houver advertência" são RESTRIÇÃO,
    // não efeito: eles decidem se dá para jogar, não o que acontece depois
    restricao: { umaVezPorRun: true, exige: { se: 'advertencias', aoMenos: 1 } },
    efeitos: [{ acoes: [{ faz: 'advertencia', quanto: -1 }] }],
  },
  {
    id: 'freela-grande', raridade: 'incomum', name: 'Freela Grande', cost: 6, kind: 'grana',
    text: '+R$ 90, +2 estresse', starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'dinheiro', quanto: 90 },
      { faz: 'recurso', qual: 'estresse', quanto: 2 },
    ] }],
  },
  {
    id: 'soneca-no-banheiro', name: 'Soneca no Banheiro', cost: 1, kind: 'descanso',
    text: '+2 energia, −1 estresse', starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'energia', quanto: 2 },
      { faz: 'recurso', qual: 'estresse', quanto: -1 },
    ] }],
  },
  {
    id: 'automatizar', raridade: 'rara', name: 'Automatizar', cost: 5, kind: 'tarefa',
    text: '+2 produtividade agora e +1 produtividade em todos os dias seguintes',
    especial: true, starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'produtividade', quanto: 2 },
      { faz: 'recorrente', qual: 'produtividade', quanto: 1, cada: 'dia' },
    ] }],
  },
  {
    id: 'reorganizar-a-mesa', name: 'Reorganizar a Mesa', cost: 1,
    // A primeira carta NEUTRA: sem classe. Ela não entra em embalo nenhum e
    // quebra o que estiver em pé — é o preço de servir para tudo.
    kind: null,
    text: 'Descarte 1 carta à sua escolha e compre 1.',
    especial: true, starter: false,
    // e a primeira que PERGUNTA: `escolherDescarte` para o dia até o jogador
    // apontar a carta, e só então roda o `entao`. "Descarte 1 à sua escolha"
    // é uma decisão, e decisão precisa de mão à mostra — diferente do
    // descarte ao acaso da Fofoca de Corredor
    efeitos: [{ acoes: [{
      faz: 'escolherDescarte', quantas: 1, porque: 'Reorganizar a Mesa',
      entao: [{ faz: 'comprar', quantas: 1 }],
    }] }],
  },
  {
    id: 'pedir-aumento', raridade: 'rara', name: 'Pedir Aumento', cost: 3, kind: 'social',
    text: '50%: salário +R$ 100 pelo resto da run. 50%: +3 estresse.',
    especial: true, starter: false,
    efeitos: [{ acoes: [{
      faz: 'sorteio', chance: 0.5,
      entao: [
        { faz: 'recorrente', qual: 'dinheiro', quanto: 100, cada: 'semana' },
        { faz: 'mensagem', texto: 'Pedir Aumento: deu certo! Salário +R$ 100 pelo resto da run.' },
      ],
      senao: [
        { faz: 'recurso', qual: 'estresse', quanto: 3 },
        { faz: 'mensagem', texto: 'Pedir Aumento: "vamos ver no próximo ciclo". +3 estresse.' },
      ],
    }] }],
  },

  // --- v0.15: as que se pagam em R$, e as que faltavam ---
  // As pagas ligam grana a descanso: até aqui o dinheiro só virava pontuação.
  {
    id: 'delivery', name: 'Delivery', cost: 0, custos: [{ qual: 'dinheiro', quanto: 25 }], kind: 'descanso',
    text: '+2 energia', starter: false,
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'energia', quanto: 2 }] }],
  },
  {
    id: 'academia-no-almoco', raridade: 'incomum', name: 'Academia no Almoço', cost: 1, custos: [{ qual: 'dinheiro', quanto: 40 }],
    kind: 'descanso', text: '−2 estresse. Amanhã: +1 energia', starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'estresse', quanto: -2 },
      { faz: 'amanha', acoes: [{ faz: 'recurso', qual: 'energia', quanto: 1 }] },
    ] }],
  },
  {
    id: 'uber-pra-casa', name: 'Uber pra Casa', cost: 0, custos: [{ qual: 'dinheiro', quanto: 30 }], kind: 'descanso',
    text: 'Amanhã: +2 energia', starter: false,
    efeitos: [{ acoes: [{ faz: 'amanha', acoes: [{ faz: 'recurso', qual: 'energia', quanto: 2 }] }] }],
  },
  {
    id: 'checklist', name: 'Checklist', cost: 1, kind: 'tarefa',
    text: '+1 produtividade, compre 1', starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'produtividade', quanto: 1 },
      { faz: 'comprar', quantas: 1 },
    ] }],
  },
  {
    id: 'prazo-apertado', raridade: 'incomum', name: 'Prazo Apertado', cost: 2, kind: 'tarefa',
    text: '1ª do dia: +4 produtividade. Senão: +2 e +1 estresse',
    especial: true, starter: false,
    efeitos: [{ acoes: [{
      faz: 'se', condicao: { se: 'cartasJogadasHoje', noMaximo: 0 },
      entao: [{ faz: 'recurso', qual: 'produtividade', quanto: 4 }],
      senao: [
        { faz: 'recurso', qual: 'produtividade', quanto: 2 },
        { faz: 'recurso', qual: 'estresse', quanto: 1 },
      ],
    }] }],
  },
  {
    id: 'cafe-com-o-chefe', raridade: 'rara', name: 'Café com o Chefe', cost: 1, kind: 'social',
    text: 'Com advertência: tira 1, +2 estresse. Sem: +1 produtividade',
    especial: true, starter: false,
    efeitos: [{ acoes: [{
      faz: 'se', condicao: { se: 'advertencias', aoMenos: 1 },
      entao: [
        { faz: 'advertencia', quanto: -1 },
        { faz: 'recurso', qual: 'estresse', quanto: 2 },
      ],
      senao: [{ faz: 'recurso', qual: 'produtividade', quanto: 1 }],
    }] }],
  },
  {
    id: 'mentoria', raridade: 'incomum', name: 'Mentoria', cost: 2, kind: 'social',
    text: 'Compre 2', starter: false,
    efeitos: [{ acoes: [{ faz: 'comprar', quantas: 2 }] }],
  },
  {
    id: 'happy-hour', raridade: 'incomum', name: 'Happy Hour', cost: 0, custos: [{ qual: 'dinheiro', quanto: 50 }], kind: 'social',
    text: '−2 estresse. Amanhã: +1 carta na mão', starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'estresse', quanto: -2 },
      { faz: 'amanha', acoes: [{ faz: 'maoDoDia', quantas: 1, relativo: true }] },
    ] }],
  },
  {
    id: 'vender-as-ferias', raridade: 'incomum', name: 'Vender as Férias', cost: 0, kind: 'grana',
    text: '+R$ 120, +3 estresse', starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'dinheiro', quanto: 120 },
      { faz: 'recurso', qual: 'estresse', quanto: 3 },
    ] }],
  },
  {
    id: 'investimento', raridade: 'rara', name: 'Investimento', cost: 0, custos: [{ qual: 'dinheiro', quanto: 100 }], kind: 'grana',
    text: '+R$ 40 toda sexta, pelo resto da run', especial: true, starter: false,
    efeitos: [{ acoes: [{ faz: 'recorrente', qual: 'dinheiro', quanto: 40, cada: 'semana' }] }],
  },
  {
    id: 'bico-de-fim-de-semana', name: 'Bico de Fim de Semana', cost: 2, kind: 'grana',
    text: 'Nesta sexta: +R$ 60', starter: false,
    efeitos: [{ acoes: [{ faz: 'recorrente', qual: 'dinheiro', quanto: 60, cada: 'semana', duracao: 1 }] }],
  },
  {
    id: 'pausa-estrategica', raridade: 'incomum', name: 'Pausa Estratégica', cost: 0, kind: null,
    text: 'Descarte a mão e compre 3', especial: true, starter: false,
    efeitos: [{ acoes: [
      { faz: 'descartar', quantas: 'tudo', porque: 'Pausa Estratégica' },
      { faz: 'comprar', quantas: 3 },
    ] }],
  },

  // --- v0.18: o estresse como combustível ---
  // Só saem com o estresse ALTO, e jogar gasta esse estresse. É a primeira
  // saída da espiral que mata a run na semana 1: quanto pior o dia, mais
  // forte a mão. Não é um tipo de custo novo de propósito — "custo" que
  // baixa o estresse seria um custo que todo mundo quer pagar, e o foguinho
  // vermelho leria ao contrário. É a RESTRIÇÃO (precisa de N) mais o efeito
  // (−N), o mesmo par do Puxar o Saco.
  {
    id: 'canalizar-a-raiva', raridade: 'incomum', name: 'Canalizar a Raiva', cost: 1, kind: 'tarefa',
    text: 'Só com 4+ de estresse. −3 estresse, +4 produtividade', especial: true, starter: false,
    restricao: { exige: { se: 'recurso', qual: 'estresse', aoMenos: 4 } },
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'estresse', quanto: -3 },
      { faz: 'recurso', qual: 'produtividade', quanto: 4 },
    ] }],
  },
  {
    id: 'desabafo-no-cafe', name: 'Desabafo no Café', cost: 0, kind: 'social',
    text: 'Só com 6+ de estresse. −4 estresse, compre 1', especial: true, starter: false,
    restricao: { exige: { se: 'recurso', qual: 'estresse', aoMenos: 6 } },
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'estresse', quanto: -4 },
      { faz: 'comprar', quantas: 1 },
    ] }],
  },
  {
    id: 'grito-no-travesseiro', raridade: 'rara', name: 'Grito no Travesseiro', cost: 0, kind: 'descanso',
    text: 'Só com 8+ de estresse, uma vez por run. −5 estresse, +2 energia', especial: true, starter: false,
    restricao: { umaVezPorRun: true, exige: { se: 'recurso', qual: 'estresse', aoMenos: 8 } },
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'estresse', quanto: -5 },
      { faz: 'recurso', qual: 'energia', quanto: 2 },
    ] }],
  },
]

/**
 * A versão do baralho de referência. Quando o catálogo vem do banco quem
 * manda é `public.baralho.versao`; este número é o que vale enquanto o jogo
 * estiver rodando só com o código.
 *
 * Não é a versão do site (`changelog.ts`): duas entregas seguidas que não
 * tocam em carta nenhuma mantêm o mesmo número aqui, e é isso que o deixa
 * comparável entre runs.
 */
export const VERSAO_BARALHO_BASE = 4

/**
 * O PORQUÊ de cada carta que o código mudou e o banco talvez ainda não tenha.
 *
 * O banco semeado não é sobrescrito pelo código (é a regra que protege o que
 * o admin editou no /lab), e por isso o baralho v3 escrito aqui não chegou
 * sozinho a produção. Quem leva é o "Trazer do código" do /lab/cartas, e
 * como todo salvamento de carta ele exige um motivo: é este. O que mudou (o
 * número) a bancada escreve sozinha; o porquê é o que um diff não sabe.
 */
export const MOTIVOS_DO_CODIGO: Record<string, string> = {
  'canalizar-a-raiva': 'O estresse como combustível: a carta fica mais forte justamente quando a espiral do estresse aperta.',
  'desabafo-no-cafe': 'Uma saída para o dia ruim que não custa energia: só sai quando o estresse já está alto.',
  'grito-no-travesseiro': 'O último recurso perto do burnout, uma vez por run.',
  'atalho-no-sistema': 'Era a Tarefa melhor em tudo: mais produtividade pelo mesmo custo e sem preço nenhum.',
  'home-office': 'Rendia 1 de produtividade por energia e ainda tirava estresse; a régua (Tarefa Simples) é 0,67.',
  'planilha-infinita': 'A 0,5 de produtividade por energia só servia de enchimento.',
  terapia: 'Ideia do autor: tira estresse de verdade, mas com custo de verdade, em dinheiro.',
  'vale-refeicao': 'Era dinheiro de graça; agora também compra uma carta.',
  'hora-extra': 'Era a pior troca do jogo: energia demais por pouco dinheiro.',
  'cafe-duplo': 'Armadilha consciente: energia agora, estresse depois. Rara para não aparecer toda hora.',
  reuniao: 'O baralho inicial passou a ter pelo menos 3 cartas de cada naipe.',
  'tarefa-simples': 'Uma Tarefa Simples cedeu lugar à terceira Reunião (3 por naipe no inicial).',
}

/**
 * Os números do jogo (aluguel, cota, salário, energia base) NÃO moram mais
 * aqui: viraram modo de jogo, em `regras.ts`, e vêm do banco como as cartas.
 * Mexer no aluguel deixou de ser mexer no código.
 */
