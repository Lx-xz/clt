import type { Acao } from './acoes'
import type { WeekConfig } from './types'

/**
 * Um item da lojinha de fim de semana.
 *
 * Ela existe porque o dinheiro não tinha uso: em todas as simulações o
 * despejo deu 0%, e a classe `grana` servia só para a pontuação. Com a loja,
 * dinheiro vira estresse a menos — e cada real gasto sai da pontuação final,
 * que é a troca que dá sentido a juntar.
 *
 * O que o item faz é lista de ações, a mesma linguagem das cartas. A exceção
 * é `cortarCarta`: tirar uma carta do baralho da run não é coisa que carta
 * nenhuma deveria poder fazer, então não virou ação — é um poder da loja.
 */
export interface ItemDaLoja {
  id: string
  nome: string
  texto: string
  preco: number
  acoes: Acao[]
  cortarCarta?: boolean
}

/**
 * As regras do jogo — os números que não pertencem a carta nenhuma.
 *
 * Elas moravam soltas em `cards.ts` como `const`, o que queria dizer que
 * mexer no aluguel era mexer no código e publicar o site. Agora são um
 * **modo de jogo**: uma linha na tabela `modos`, carregada junto com o
 * catálogo. Hoje existe só o `normal`; a estrutura é a mesma se um dia
 * houver um "difícil" ou um "sem dinheiro".
 *
 * O mesmo par de sempre vale aqui: este arquivo é a SEMENTE (o que
 * `admin_semear_catalogo` leva para o banco) e a REDE (o que vale sem banco,
 * sem rede, ou com a tabela ainda vazia).
 */

export interface Regras {
  id: string
  nome: string
  descricao: string
  /** Quantos dias úteis tem a semana. */
  diasPorSemana: number
  /** A energia do dia é `energiaBase − estresse`. É a regra que faz um dia
   *  ruim encolher todos os dias seguintes, e mexer nela mexe no jogo todo. */
  energiaBase: number
  estresseMaximo: number
  advertenciasMaximas: number
  dinheiroInicial: number
  /** O aluguel e as contas, cobrados toda sexta. */
  contasSemanais: number
  cartasNaMao: number
  /** Quanto estresse o fim de semana tira. */
  descansoDoFimDeSemana: number
  /** Quanto estresse custa fechar o dia sem bater a cota. Morava escrito
   *  como `+2` dentro do `endDay`, e é o número que mais mata no jogo. */
  penalidadeDaCota: number
  /** O bônus do embalo: o que a 2ª carta seguida da mesma classe rende, o
   *  que a 3ª em diante rende, e quantos reais vale um ponto na classe
   *  `grana`. Eram três números soltos no motor. */
  embaloSegunda: number
  embaloTerceira: number
  embaloReaisPorPonto: number
  /** Quantas cartas a recompensa de fim de semana oferece. */
  opcoesDeRecompensa: number
  /** O menor baralho com que dá para começar uma run. Sem ele, tirar as
   *  cartas ruins até sobrar só o que presta dava 100% de vitória nas
   *  simulações — e um baralho de 5 cartas compra a mesma mão todo dia. */
  baralhoMinimo: number
  /** A lojinha de fim de semana. Lista vazia desliga a loja. */
  loja: ItemDaLoja[]
  semanas: WeekConfig[]
  versao: number
}

/** O modo de referência: o jogo como ele é hoje. */
export const MODO_NORMAL: Regras = {
  id: 'normal',
  nome: 'Normal',
  descricao: 'Um mês de trabalho formal. Quatro semanas, vinte dias úteis.',
  diasPorSemana: 5,
  energiaBase: 10,
  estresseMaximo: 10,
  advertenciasMaximas: 3,
  dinheiroInicial: 100,
  contasSemanais: 300,
  cartasNaMao: 5,
  descansoDoFimDeSemana: 3,
  penalidadeDaCota: 2,
  embaloSegunda: 1,
  embaloTerceira: 2,
  embaloReaisPorPonto: 10,
  opcoesDeRecompensa: 3,
  // o tamanho do baralho inicial: até desbloquear alguma coisa, não dá para
  // tirar carta nenhuma — só trocar
  baralhoMinimo: 15,
  // preços pensados contra a sobra da semana: o salário cheio deixa R$ 100
  // depois do aluguel, então o alívio maior pede ter juntado com cartas de
  // grana — e cada compra sai da pontuação final
  loja: [
    {
      id: 'happy-hour',
      nome: 'Happy hour com a turma',
      texto: '−1 de estresse',
      preco: 60,
      acoes: [{ faz: 'recurso', qual: 'estresse', quanto: -1 }],
    },
    {
      id: 'massagem',
      nome: 'Massagem',
      texto: '−2 de estresse',
      preco: 140,
      acoes: [{ faz: 'recurso', qual: 'estresse', quanto: -2 }],
    },
    {
      id: 'faxina',
      nome: 'Pagar a faxina',
      texto: 'Segunda começa com +2 de energia',
      preco: 70,
      acoes: [{ faz: 'amanha', acoes: [{ faz: 'recurso', qual: 'energia', quanto: 2 }] }],
    },
    {
      id: 'largar-tarefa',
      nome: 'Largar uma tarefa',
      texto: 'Tira 1 carta do baralho desta run',
      preco: 50,
      acoes: [],
      cortarCarta: true,
    },
  ],
  semanas: [
    { week: 1, dailyQuota: 3, weeklyGoal: 16, fullSalary: 400, reducedSalary: 250 },
    { week: 2, dailyQuota: 3, weeklyGoal: 18, fullSalary: 400, reducedSalary: 250 },
    { week: 3, dailyQuota: 4, weeklyGoal: 22, fullSalary: 450, reducedSalary: 280 },
    { week: 4, dailyQuota: 4, weeklyGoal: 25, fullSalary: 450, reducedSalary: 280 },
  ],
  versao: 1,
}

/**
 * Um modo incompleto completado com o normal, campo a campo.
 *
 * É quem deixa um número NOVO entrar no modo sem migração: o modo gravado no
 * banco por uma versão anterior não tem o campo, e a run em andamento também
 * não — ela copiou as regras antes de ele existir. Os dois passam por aqui
 * (`paraRegras` na leitura do banco, `migrarRun` na leitura do save), e o que
 * falta vem do normal. Para os números que já existiam escondidos no motor
 * (a penalidade da cota, o embalo, as três recompensas) isso é exato: o
 * padrão é o valor que o motor usava.
 */
export function completarRegras(bruto: Partial<Regras> | null | undefined): Regras {
  const b = bruto ?? {}
  return {
    ...MODO_NORMAL,
    ...b,
    id: b.id ?? MODO_NORMAL.id,
    semanas: b.semanas?.length ? b.semanas : MODO_NORMAL.semanas,
    loja: Array.isArray(b.loja) ? b.loja : MODO_NORMAL.loja,
  }
}

let modos: Regras[] = [MODO_NORMAL]
let atual: Regras = MODO_NORMAL

/** Instala os modos vindos do banco. Lista vazia é ignorada: trocar as regras
 *  por nada deixaria o jogo sem como ser jogado. */
export function carregarModos(lista: Regras[]): boolean {
  const usaveis = lista.filter((m) => m.semanas?.length > 0)
  if (usaveis.length === 0) return false
  modos = usaveis
  atual = usaveis.find((m) => m.id === atual.id) ?? usaveis[0]
  return true
}

export function reiniciarModos() {
  modos = [MODO_NORMAL]
  atual = MODO_NORMAL
}

export function modosDisponiveis(): Regras[] {
  return modos
}

/** As regras de AGORA. Quem está no meio de uma run não usa esta função: a
 *  run carrega a própria cópia (veja `GameState.modo`). */
export function regras(): Regras {
  return atual
}

export function escolherModo(id: string) {
  atual = modos.find((m) => m.id === id) ?? atual
}

// ---------------------------------------------------------- contas do mês
// Derivadas: recebem as regras em vez de lerem a global, porque quem está
// jogando lê as regras que a RUN guardou, e não as de hoje.

export function totalDeDias(r: Regras): number {
  return r.semanas.length * r.diasPorSemana
}

export function semanaDoDia(r: Regras, day: number): WeekConfig {
  const i = Math.min(Math.floor((day - 1) / r.diasPorSemana), r.semanas.length - 1)
  return r.semanas[i]
}

export function numeroDaSemana(r: Regras, day: number): number {
  return Math.min(Math.floor((day - 1) / r.diasPorSemana) + 1, r.semanas.length)
}

export const NOMES_DOS_DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']

export function diaDaSemana(r: Regras, day: number): string {
  return NOMES_DOS_DIAS[(day - 1) % r.diasPorSemana] ?? `Dia ${day}`
}

export function ehSexta(r: Regras, day: number): boolean {
  return day % r.diasPorSemana === 0
}
