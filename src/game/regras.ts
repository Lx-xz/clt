import type { WeekConfig } from './types'

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
  semanas: [
    { week: 1, dailyQuota: 3, weeklyGoal: 16, fullSalary: 400, reducedSalary: 250 },
    { week: 2, dailyQuota: 3, weeklyGoal: 18, fullSalary: 400, reducedSalary: 250 },
    { week: 3, dailyQuota: 4, weeklyGoal: 22, fullSalary: 450, reducedSalary: 280 },
    { week: 4, dailyQuota: 4, weeklyGoal: 25, fullSalary: 450, reducedSalary: 280 },
  ],
  versao: 1,
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
