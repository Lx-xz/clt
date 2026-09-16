import type { Condicao, Recurso } from './acoes'

/**
 * A condição de uma carta, em português.
 *
 * Existe uma função só porque os dois lugares que precisam dela são o mesmo
 * problema visto de dois ângulos: a MESA precisa explicar por que uma carta
 * está travada, e o LAB precisa mostrar o que a condição que está sendo
 * montada quer dizer, antes de ela ir para o banco. Escrever a frase à mão nos
 * dois lados era garantir que um dia elas discordassem.
 *
 * O texto é uma ORAÇÃO SUBORDINADA, sem maiúscula e sem ponto — "o estresse
 * estiver em 5 ou mais". Quem monta a frase inteira é quem chama: a mesa diz
 * "Esta carta pede: …" e o lab diz "Só se …".
 */

const RECURSOS: Record<Recurso, string> = {
  produtividade: 'a produtividade',
  energia: 'a energia',
  estresse: 'o estresse',
  dinheiro: 'o dinheiro',
}

const CLASSES: Record<string, string> = {
  tarefa: 'tarefa',
  descanso: 'descanso',
  grana: 'grana',
  social: 'social',
}

/** "X for 3 ou mais" / "X for 2 ou menos" / "X estiver entre 1 e 4". */
function faixa(o_que: string, aoMenos?: number, noMaximo?: number): string {
  if (aoMenos !== undefined && noMaximo !== undefined) {
    return `${o_que} estiver entre ${aoMenos} e ${noMaximo}`
  }
  if (aoMenos !== undefined) return `${o_que} for ${aoMenos} ou mais`
  if (noMaximo !== undefined) return `${o_que} for ${noMaximo} ou menos`
  // sem limite nenhum a condição é verdadeira sempre, e dizer isso em voz alta
  // é o que faz o erro aparecer no editor em vez de na mesa
  return `${o_que} for qualquer coisa`
}

/** Combinatória dentro de combinatória ganha parênteses, senão "a e b ou c"
 *  não diz de quem é o "ou". */
function comParenteses(cond: Condicao): string {
  const composta = cond.se === 'todas' || cond.se === 'alguma' || cond.se === 'nao'
  return composta ? `(${textoDaCondicao(cond)})` : textoDaCondicao(cond)
}

export function textoDaCondicao(cond: Condicao): string {
  switch (cond.se) {
    case 'jaJogadaHoje':
      if (cond.noMaximo === 0) return 'esta carta ainda não tiver saído hoje'
      return faixa('o número de vezes que esta carta já saiu hoje', cond.aoMenos, cond.noMaximo)
    case 'embalo':
      return `o embalo estiver em ${cond.aoMenos} ou mais`
    case 'recurso':
      return faixa(RECURSOS[cond.qual], cond.aoMenos, cond.noMaximo)
    case 'cotaBatida':
      return cond.valor ? 'a cota do dia já estiver batida' : 'a cota do dia ainda não estiver batida'
    case 'advertencias':
      return `você tiver ${cond.aoMenos} advertência${cond.aoMenos === 1 ? '' : 's'} ou mais`
    case 'ineditaNaRun':
      return 'esta carta ainda não tiver saído nesta run'
    case 'cartasJogadasHoje':
      // a fórmula genérica diria "o número de cartas jogadas hoje for 0 ou
      // menos", que é verdade e não é português
      if (cond.noMaximo === 0 && cond.aoMenos === undefined) return 'esta for a primeira carta do dia'
      return faixa('o número de cartas jogadas hoje', cond.aoMenos, cond.noMaximo)
    case 'classeJogadaHoje':
      return faixa(
        `o número de cartas de ${CLASSES[cond.classe] ?? cond.classe} jogadas hoje`,
        cond.aoMenos,
        cond.noMaximo,
      )
    case 'cartasNaMao':
      // contando esta: `canPlay` roda com a carta ainda na mão, então "só com
      // a mão cheia" numa restrição é 5, e não 4
      return faixa('a sua mão, contando esta carta', cond.aoMenos, cond.noMaximo)
    case 'dia':
      return faixa('o dia', cond.aoMenos, cond.noMaximo)
    case 'semana':
      return faixa('a semana', cond.aoMenos, cond.noMaximo)
    case 'nao':
      return `não ${comParenteses(cond.condicao)}`
    case 'todas':
      // `every` de lista vazia é verdadeiro e `some` é falso: dizer "sempre" e
      // "nunca" é o que faz uma lista esquecida vazia aparecer no editor
      if (cond.condicoes.length === 0) return 'sempre'
      return cond.condicoes.map(comParenteses).join(' e ')
    case 'alguma':
      if (cond.condicoes.length === 0) return 'nunca'
      return cond.condicoes.map(comParenteses).join(' ou ')
  }
}
