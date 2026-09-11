import type { ActionCard, WeekConfig } from './types'

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
    text: '+2 produtividade', starter: true, copies: 4,
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'produtividade', quanto: 2 }] }],
  },
  {
    id: 'planilha-infinita', name: 'Planilha Infinita', cost: 2, kind: 'tarefa',
    text: '+1 produtividade', starter: true, copies: 2,
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'produtividade', quanto: 1 }] }],
  },
  {
    id: 'reuniao', name: 'Reunião', cost: 2, kind: 'social',
    text: '+1 produtividade. Se for a 2ª reunião do dia: +1 estresse e nenhuma produtividade.',
    especial: true, starter: true, copies: 2,
    // a carta que muda de poder ao se repetir: duas linhas excludentes,
    // separadas pela quantidade de vezes que ELA já saiu hoje
    efeitos: [
      { se: { se: 'jaJogadaHoje', noMaximo: 0 }, acoes: [{ faz: 'recurso', qual: 'produtividade', quanto: 1 }] },
      {
        se: { se: 'jaJogadaHoje', aoMenos: 1 },
        acoes: [
          { faz: 'recurso', qual: 'estresse', quanto: 1 },
          { faz: 'aviso', texto: 'Segunda reunião do dia: só estresse, nenhuma produtividade.' },
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
    id: 'hora-extra', name: 'Hora Extra', cost: 4, kind: 'grana',
    text: '+R$ 30, +2 estresse', starter: true, copies: 2,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'dinheiro', quanto: 30 },
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

  // --- desbloqueáveis (recompensa semanal) ---
  {
    id: 'atalho-no-sistema', name: 'Atalho no Sistema', cost: 3, kind: 'tarefa',
    text: '+3 produtividade', starter: false,
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'produtividade', quanto: 3 }] }],
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
    id: 'cafe-duplo', name: 'Café Duplo', cost: 0, kind: 'descanso',
    text: '+5 energia, +2 estresse', starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'energia', quanto: 5 },
      { faz: 'recurso', qual: 'estresse', quanto: 2 },
    ] }],
  },
  {
    id: 'terapia', name: 'Terapia', cost: 2, kind: 'descanso',
    text: '−3 estresse', starter: false,
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'estresse', quanto: -3 }] }],
  },
  {
    id: 'vale-refeicao', name: 'Vale-Refeição', cost: 0, kind: 'grana',
    text: '+R$ 20', starter: false,
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'dinheiro', quanto: 20 }] }],
  },
  {
    id: 'home-office', name: 'Home Office', cost: 2, kind: 'tarefa',
    text: '+2 produtividade, −1 estresse', starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'produtividade', quanto: 2 },
      { faz: 'recurso', qual: 'estresse', quanto: -1 },
    ] }],
  },
  {
    id: 'foco-total', name: 'Foco Total', cost: 4, kind: 'tarefa',
    text: '+4 produtividade, mas descarta o resto da mão', especial: true, starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'produtividade', quanto: 4 },
      { faz: 'descartar', quantas: 'tudo' },
      { faz: 'aviso', texto: 'Foco Total: o resto da mão foi descartado.' },
    ] }],
  },
  {
    id: 'puxar-o-saco', name: 'Puxar o Saco', cost: 2, kind: 'social',
    text: 'Cancela 1 advertência (uma vez por run)', especial: true, starter: false,
    // o "uma vez por run" e o "só serve se houver advertência" são RESTRIÇÃO,
    // não efeito: eles decidem se dá para jogar, não o que acontece depois
    restricao: { umaVezPorRun: true, exige: { se: 'advertencias', aoMenos: 1 } },
    efeitos: [{ acoes: [{ faz: 'advertencia', quanto: -1 }] }],
  },
  {
    id: 'freela-grande', name: 'Freela Grande', cost: 6, kind: 'grana',
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
    id: 'automatizar', name: 'Automatizar', cost: 5, kind: 'tarefa',
    text: '+2 produtividade agora e +1 produtividade em todos os dias seguintes',
    especial: true, starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'produtividade', quanto: 2 },
      { faz: 'produtividadePassiva', quanto: 1 },
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
    id: 'pedir-aumento', name: 'Pedir Aumento', cost: 3, kind: 'social',
    text: '50%: salário +R$ 100 pelo resto da run. 50%: +3 estresse.',
    especial: true, starter: false,
    efeitos: [{ acoes: [{
      faz: 'sorteio', chance: 0.5,
      entao: [
        { faz: 'salarioPermanente', quanto: 100 },
        { faz: 'aviso', texto: 'Pedir Aumento: deu certo! Salário +R$ 100 pelo resto da run.' },
      ],
      senao: [
        { faz: 'recurso', qual: 'estresse', quanto: 3 },
        { faz: 'aviso', texto: 'Pedir Aumento: "vamos ver no próximo ciclo". +3 estresse.' },
      ],
    }] }],
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
export const VERSAO_BARALHO_BASE = 2

export const WEEKS: WeekConfig[] = [
  { week: 1, dailyQuota: 3, weeklyGoal: 16, fullSalary: 400, reducedSalary: 250 },
  { week: 2, dailyQuota: 3, weeklyGoal: 18, fullSalary: 400, reducedSalary: 250 },
  { week: 3, dailyQuota: 4, weeklyGoal: 22, fullSalary: 450, reducedSalary: 280 },
  { week: 4, dailyQuota: 4, weeklyGoal: 25, fullSalary: 450, reducedSalary: 280 },
]

export const DAYS_PER_WEEK = 5
export const TOTAL_DAYS = WEEKS.length * DAYS_PER_WEEK
export const WEEKLY_BILLS = 300
export const STARTING_MONEY = 100
export const MAX_STRESS = 10
export const MAX_WARNINGS = 3
export const BASE_ENERGY = 10
export const HAND_SIZE = 5

export const WEEKDAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']

export function weekOfDay(day: number): WeekConfig {
  const index = Math.min(Math.floor((day - 1) / DAYS_PER_WEEK), WEEKS.length - 1)
  return WEEKS[index]
}

export function weekdayOf(day: number): string {
  return WEEKDAY_NAMES[(day - 1) % DAYS_PER_WEEK]
}

export function isFriday(day: number): boolean {
  return day % DAYS_PER_WEEK === 0
}
