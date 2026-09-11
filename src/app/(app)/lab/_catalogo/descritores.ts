import {
  AlertTriangle, Ban, Banknote, Cog, Dices, Gauge, Gift, Hand, Layers,
  LayoutGrid, MessageSquare, Sunrise, Target, Trash2, Zap,
  type LucideIcon,
} from 'lucide-react'
import type { Acao, Condicao, Quando } from '@/game/acoes'

/**
 * A tabela que descreve o catálogo de ações para o EDITOR — o que cada ação
 * se chama em português, que campos ela tem, e de que tipo é cada um.
 *
 * É isto que permite um editor visual sem "um formulário por tipo de ação",
 * que era o argumento que mantinha a edição em JSON cru. O formulário é UM
 * só: ele lê esta tabela e desenha.
 *
 * **A armadilha que esta tabela cria, e o remédio.** Ela é uma segunda fonte
 * da verdade ao lado da união `Acao`: acrescentar uma ação e esquecer o
 * descritor deixaria o editor sem saber desenhá-la, em silêncio. Por isso o
 * `satisfies Record<Acao['faz'], Descritor>` no fim — sem o descritor novo, o
 * BUILD quebra, que é onde o erro custa menos.
 */

export type TipoDeCampo =
  | { tipo: 'numero'; min?: number; max?: number }
  /** Guardado de 0 a 1, digitado de 0 a 100: `chance: 0.4` é "40%". */
  | { tipo: 'porcento' }
  | { tipo: 'escolha'; opcoes: { valor: string; rotulo: string }[] }
  | { tipo: 'texto'; exemplo?: string }
  | { tipo: 'simNao' }
  /** Um id de carta, com a lista do catálogo como sugestão. */
  | { tipo: 'carta' }
  /** `descartar.quantas` aceita um número ou a palavra 'tudo'. */
  | { tipo: 'numeroOuTudo' }
  /** Uma lista de ações dentro da ação — os dois pontos de aninhamento que a
   *  linguagem tem: `sorteio.entao/senao` e `escolherDescarte.entao`. */
  | { tipo: 'acoes' }

export interface Campo {
  chave: string
  rotulo: string
  padrao: unknown
  campo: TipoDeCampo
  /** Campo que some do JSON quando fica vazio/falso, em vez de virar ruído. */
  opcional?: boolean
}

export type Grupo = 'recursos' | 'cartas' | 'chefe' | 'dia' | 'especiais'

export interface Descritor {
  rotulo: string
  grupo: Grupo
  Icone: LucideIcon
  campos: Campo[]
}

export const GRUPOS: { id: Grupo; rotulo: string }[] = [
  { id: 'recursos', rotulo: 'Recursos' },
  { id: 'cartas', rotulo: 'Cartas' },
  { id: 'chefe', rotulo: 'O chefe' },
  { id: 'dia', rotulo: 'O dia' },
  { id: 'especiais', rotulo: 'Especiais' },
]

const RECURSOS = [
  { valor: 'produtividade', rotulo: 'Produtividade' },
  { valor: 'energia', rotulo: 'Energia' },
  { valor: 'estresse', rotulo: 'Estresse' },
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
]

const CLASSES = [
  { valor: 'tarefa', rotulo: 'Tarefa' },
  { valor: 'descanso', rotulo: 'Descanso' },
  { valor: 'grana', rotulo: 'Grana' },
  { valor: 'social', rotulo: 'Social' },
]

export const DESCRITORES = {
  recurso: {
    rotulo: 'Mexer em recurso', grupo: 'recursos', Icone: Gauge,
    campos: [
      { chave: 'qual', rotulo: 'Qual', padrao: 'produtividade', campo: { tipo: 'escolha', opcoes: RECURSOS } },
      { chave: 'quanto', rotulo: 'Quanto', padrao: 1, campo: { tipo: 'numero', min: -20, max: 20 } },
    ],
  },
  amanha: {
    rotulo: 'Deixar para amanhã', grupo: 'dia', Icone: Sunrise,
    campos: [
      {
        chave: 'qual', rotulo: 'O quê', padrao: 'energia',
        campo: { tipo: 'escolha', opcoes: [{ valor: 'energia', rotulo: 'Energia' }, { valor: 'cota', rotulo: 'Cota' }] },
      },
      { chave: 'quanto', rotulo: 'Quanto', padrao: -1, campo: { tipo: 'numero', min: -20, max: 20 } },
    ],
  },
  comprar: {
    rotulo: 'Comprar carta', grupo: 'cartas', Icone: Layers,
    campos: [{ chave: 'quantas', rotulo: 'Quantas', padrao: 1, campo: { tipo: 'numero', min: 1, max: 10 } }],
  },
  descartar: {
    rotulo: 'Descartar', grupo: 'cartas', Icone: Trash2,
    campos: [
      { chave: 'quantas', rotulo: 'Quantas', padrao: 1, campo: { tipo: 'numeroOuTudo' } },
      { chave: 'aleatorio', rotulo: 'Sorteada', padrao: false, opcional: true, campo: { tipo: 'simNao' } },
      { chave: 'porque', rotulo: 'Motivo no histórico', padrao: '', opcional: true, campo: { tipo: 'texto', exemplo: 'Fofoca de Corredor' } },
    ],
  },
  escolherDescarte: {
    rotulo: 'Pedir descarte ao jogador', grupo: 'cartas', Icone: Hand,
    campos: [
      { chave: 'quantas', rotulo: 'Quantas', padrao: 1, campo: { tipo: 'numero', min: 1, max: 10 } },
      { chave: 'porque', rotulo: 'O que a mesa diz', padrao: '', opcional: true, campo: { tipo: 'texto', exemplo: 'Escolha o que sai da mesa' } },
      { chave: 'entao', rotulo: 'então', padrao: [], opcional: true, campo: { tipo: 'acoes' } },
    ],
  },
  ganharCarta: {
    rotulo: 'Ganhar carta', grupo: 'cartas', Icone: Gift,
    campos: [
      { chave: 'carta', rotulo: 'Qual carta', padrao: '', campo: { tipo: 'carta' } },
      {
        chave: 'onde', rotulo: 'Onde', padrao: 'mao',
        campo: { tipo: 'escolha', opcoes: [{ valor: 'mao', rotulo: 'Na mão' }, { valor: 'descarte', rotulo: 'No descarte' }] },
      },
    ],
  },
  custo: {
    rotulo: 'Mudar o custo do dia', grupo: 'dia', Icone: Zap,
    campos: [{ chave: 'quanto', rotulo: 'Quanto', padrao: 1, campo: { tipo: 'numero', min: -5, max: 5 } }],
  },
  bloquearClasse: {
    rotulo: 'Bloquear uma classe', grupo: 'dia', Icone: Ban,
    campos: [{ chave: 'classe', rotulo: 'Classe', padrao: 'tarefa', campo: { tipo: 'escolha', opcoes: CLASSES } }],
  },
  advertencia: {
    rotulo: 'Advertência', grupo: 'chefe', Icone: AlertTriangle,
    campos: [
      { chave: 'quanto', rotulo: 'Quantas', padrao: 1, campo: { tipo: 'numero', min: -3, max: 3 } },
      { chave: 'informal', rotulo: 'Informal (duas viram uma)', padrao: false, opcional: true, campo: { tipo: 'simNao' } },
    ],
  },
  cota: {
    rotulo: 'Mexer na cota', grupo: 'chefe', Icone: Target,
    campos: [
      { chave: 'quanto', rotulo: 'Quanto', padrao: 1, campo: { tipo: 'numero', min: -10, max: 20 } },
      { chave: 'absoluto', rotulo: 'Fixar neste valor', padrao: false, opcional: true, campo: { tipo: 'simNao' } },
    ],
  },
  salarioPermanente: {
    rotulo: 'Salário permanente', grupo: 'chefe', Icone: Banknote,
    campos: [{ chave: 'quanto', rotulo: 'Quanto', padrao: 50, campo: { tipo: 'numero', min: -500, max: 500 } }],
  },
  produtividadePassiva: {
    rotulo: 'Produtividade passiva', grupo: 'chefe', Icone: Cog,
    campos: [{ chave: 'quanto', rotulo: 'Por dia', padrao: 1, campo: { tipo: 'numero', min: -5, max: 5 } }],
  },
  maoDoDia: {
    rotulo: 'Tamanho da mão', grupo: 'dia', Icone: LayoutGrid,
    campos: [
      { chave: 'quantas', rotulo: 'Cartas', padrao: 2, campo: { tipo: 'numero', min: -5, max: 12 } },
      { chave: 'relativo', rotulo: 'A mais que o normal', padrao: false, opcional: true, campo: { tipo: 'simNao' } },
    ],
  },
  sorteio: {
    rotulo: 'Sorteio', grupo: 'especiais', Icone: Dices,
    campos: [
      { chave: 'chance', rotulo: 'Chance', padrao: 0.5, campo: { tipo: 'porcento' } },
      { chave: 'entao', rotulo: 'deu certo', padrao: [], campo: { tipo: 'acoes' } },
      { chave: 'senao', rotulo: 'deu errado', padrao: [], opcional: true, campo: { tipo: 'acoes' } },
    ],
  },
  aviso: {
    rotulo: 'Escrever no histórico', grupo: 'especiais', Icone: MessageSquare,
    campos: [{ chave: 'texto', rotulo: 'Texto', padrao: '', campo: { tipo: 'texto', exemplo: 'O chefe passou e não falou nada.' } }],
  },
} satisfies Record<Acao['faz'], Descritor>

export type NomeDeAcao = keyof typeof DESCRITORES

export function descritorDe(faz: string): Descritor | undefined {
  return (DESCRITORES as Record<string, Descritor>)[faz]
}

/** Uma ação novinha, com os padrões do descritor. */
export function novaAcao(faz: NomeDeAcao): Acao {
  const d = DESCRITORES[faz] as Descritor
  const obj: Record<string, unknown> = { faz }
  for (const c of d.campos) if (!c.opcional) obj[c.chave] = c.padrao
  return obj as Acao
}

// ------------------------------------------------------------- condições

/** A mesma ideia para o `se` de um bloco de efeito. */
export const CONDICOES = {
  jaJogadaHoje: {
    rotulo: 'Já jogada hoje', grupo: 'especiais', Icone: Layers,
    campos: [
      { chave: 'aoMenos', rotulo: 'Ao menos', padrao: 1, opcional: true, campo: { tipo: 'numero', min: 0, max: 10 } },
      { chave: 'noMaximo', rotulo: 'No máximo', padrao: 0, opcional: true, campo: { tipo: 'numero', min: 0, max: 10 } },
    ],
  },
  embalo: {
    rotulo: 'Embalo em pé', grupo: 'especiais', Icone: Gauge,
    campos: [{ chave: 'aoMenos', rotulo: 'Ao menos', padrao: 2, campo: { tipo: 'numero', min: 1, max: 10 } }],
  },
  recurso: {
    rotulo: 'Valor de um recurso', grupo: 'recursos', Icone: Gauge,
    campos: [
      { chave: 'qual', rotulo: 'Qual', padrao: 'estresse', campo: { tipo: 'escolha', opcoes: RECURSOS } },
      { chave: 'aoMenos', rotulo: 'Ao menos', padrao: 1, opcional: true, campo: { tipo: 'numero', min: -50, max: 999 } },
      { chave: 'noMaximo', rotulo: 'No máximo', padrao: 0, opcional: true, campo: { tipo: 'numero', min: -50, max: 999 } },
    ],
  },
  cotaBatida: {
    rotulo: 'Cota do dia', grupo: 'chefe', Icone: Target,
    campos: [{ chave: 'valor', rotulo: 'Batida', padrao: true, campo: { tipo: 'simNao' } }],
  },
  advertencias: {
    rotulo: 'Advertências', grupo: 'chefe', Icone: AlertTriangle,
    campos: [{ chave: 'aoMenos', rotulo: 'Ao menos', padrao: 1, campo: { tipo: 'numero', min: 0, max: 3 } }],
  },
  ineditaNaRun: {
    rotulo: 'Inédita nesta run', grupo: 'especiais', Icone: Gift,
    campos: [],
  },
} satisfies Record<Condicao['se'], Descritor>

export type NomeDeCondicao = keyof typeof CONDICOES

export function novaCondicao(se: NomeDeCondicao): Condicao {
  const d = CONDICOES[se] as Descritor
  const obj: Record<string, unknown> = { se }
  for (const c of d.campos) if (!c.opcional) obj[c.chave] = c.padrao
  return obj as Condicao
}

/** Os quatro gatilhos, com nome de gente. */
export const QUANDOS: { valor: Quando; rotulo: string; dica: string }[] = [
  { valor: 'aoJogar', rotulo: 'Ao jogar', dica: 'O padrão de uma carta.' },
  { valor: 'aoRevelar', rotulo: 'Ao revelar', dica: 'O padrão de um evento.' },
  { valor: 'aposComprar', rotulo: 'Depois da mão chegar', dica: 'Para mexer na mão do dia — ela só existe depois.' },
  { valor: 'fimDoDia', rotulo: 'No fim do dia', dica: 'Para cobrar no fechamento, com a cota já conhecida.' },
]
