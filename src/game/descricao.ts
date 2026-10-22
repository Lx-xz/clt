import { ehRolagem, textoDaRolagem, type Acao, type Condicao, type Efeito, type Quantia, type Restricao } from './acoes'
import { getCard } from './catalogo'

/**
 * A DESCRIÇÃO AUTOMÁTICA da carta (v0.44): o que ela faz, escrito a partir
 * das ações — e não à mão. É curta de propósito: o recurso vira o ícone dele
 * ANTES do número ("+{estresse}1" é o foguinho e o 1), que é como o HUD já
 * fala, e a frase some. O texto escrito no lab deixa de ser a descrição e
 * vira o COMENTÁRIO da carta (a piada, a sátira).
 *
 * Por que gerada: o texto escrito à mão era "a única coisa que pode mentir"
 * (o motor não o lê); com a descrição saindo do mesmo dado que o motor roda,
 * rebalancear a carta no lab já muda o que ela diz.
 *
 * A notação `{energia}`, `{estresse}`, `{produtividade}`, `{dinheiro}` e
 * `{advertencia}` é desenhada como ícone por `TextoComIcones`. Aqui não há
 * React: é texto, para servir também ao leitor de tela e ao simulador.
 *
 * Toda ação tem uma linha no `switch` sem `default`, e o tipo de retorno
 * obriga a devolver texto: ação nova sem descrição quebra o build.
 */

const ICONE: Record<string, string> = {
  energia: '{energia}',
  estresse: '{estresse}',
  produtividade: '{produtividade}',
  dinheiro: '{dinheiro}',
}

/** "+{energia}2", "−{estresse}1", "+{dinheiro}1d3". */
function recurso(qual: string, q: Quantia): string {
  const icone = ICONE[qual] ?? qual
  if (ehRolagem(q)) {
    const t = textoDaRolagem(q)
    return t.startsWith('−') ? `−${icone}${t.slice(1)}` : `+${icone}${t}`
  }
  return `${q < 0 ? '−' : '+'}${icone}${Math.abs(q)}`
}

function numero(q: Quantia): string {
  return ehRolagem(q) ? textoDaRolagem(q) : String(q)
}

function plural(n: number, um: string, varios: string) {
  return n === 1 ? um : varios
}

function lista(acoes: Acao[] | undefined): string {
  return (acoes ?? []).map(descreverAcao).filter(Boolean).join(', ')
}

function faixa(aoMenos?: number, noMaximo?: number): string {
  if (aoMenos !== undefined && noMaximo !== undefined) return aoMenos === noMaximo ? `= ${aoMenos}` : `${aoMenos}–${noMaximo}`
  if (aoMenos !== undefined) return `≥ ${aoMenos}`
  if (noMaximo !== undefined) return `≤ ${noMaximo}`
  return ''
}

export function descreverCondicao(c: Condicao): string {
  switch (c.se) {
    case 'jaJogadaHoje':
      if (c.noMaximo === 0) return '1ª vez hoje'
      return c.aoMenos && c.aoMenos > 1 ? `já jogada ${c.aoMenos}× hoje` : 'já jogada hoje'
    case 'embalo':
      return `embalo ${c.aoMenos}+`
    case 'recurso':
      return `${ICONE[c.qual] ?? c.qual} ${faixa(c.aoMenos, c.noMaximo)}`
    case 'cotaBatida':
      return c.valor ? 'cota batida' : 'cota não batida'
    case 'advertencias':
      return `{advertencia} ≥ ${c.aoMenos}`
    case 'ineditaNaRun':
      return '1ª vez na partida'
    case 'cartasJogadasHoje':
      if (c.noMaximo === 0) return '1ª carta do dia'
      return `${faixa(c.aoMenos, c.noMaximo)} cartas jogadas hoje`
    case 'classeJogadaHoje':
      if (c.noMaximo === 0) return `sem ${c.classe} hoje`
      return `já jogou ${c.classe} hoje`
    case 'cartasNaMao':
      return `mão ${faixa(c.aoMenos, c.noMaximo)}`
    case 'dia':
      return `dia ${faixa(c.aoMenos, c.noMaximo)}`
    case 'semana':
      return `semana ${faixa(c.aoMenos, c.noMaximo)}`
    case 'nao':
      return `não ${descreverCondicao(c.condicao)}`
    case 'todas':
      return c.condicoes.map(descreverCondicao).join(' e ')
    case 'alguma':
      return c.condicoes.map(descreverCondicao).join(' ou ')
  }
}

export function descreverAcao(a: Acao): string {
  switch (a.faz) {
    case 'recurso':
      return recurso(a.qual, a.quanto)
    case 'amanha':
      return `amanhã: ${lista(a.acoes)}`
    case 'comprar':
      return `compre ${numero(a.quantas)}`
    case 'descartar':
      if (a.quantas === 'tudo') return 'descarte a mão'
      return `descarte ${a.quantas}${a.aleatorio ? ' ao acaso' : ''}`
    case 'escolherDescarte': {
      const depois = lista(a.entao)
      return `descarte ${a.quantas} à escolha${depois ? `, depois ${depois}` : ''}`
    }
    case 'guardarParaAmanha': {
      const depois = lista(a.entao)
      return `guarde ${a.quantas} para amanhã${depois ? `, depois ${depois}` : ''}`
    }
    case 'ganharCarta':
      return `ganhe ${getCard(a.carta).name} ${a.onde === 'mao' ? 'na mão' : 'no descarte'}`
    case 'custo': {
      const icone = ICONE[a.qual ?? 'energia'] ?? '{energia}'
      return `cartas ${a.quanto < 0 ? '−' : '+'}${icone}${Math.abs(a.quanto)} hoje`
    }
    case 'bloquearClasse':
      return `sem ${a.classe} hoje`
    case 'advertencia':
      if (a.informal) return a.quanto < 0 ? `−${Math.abs(a.quanto)} verbal` : `+${a.quanto} ${plural(a.quanto, 'advertência verbal', 'advertências verbais')}`
      return `${a.quanto < 0 ? '−' : '+'}{advertencia}${Math.abs(a.quanto)}`
    case 'cota':
      if (a.absoluto) return `cota = ${numero(a.quanto)}`
      return ehRolagem(a.quanto)
        ? `cota +${textoDaRolagem(a.quanto)}`
        : `cota ${a.quanto < 0 ? '−' : '+'}${Math.abs(a.quanto)}`
    case 'recorrente': {
      // uma vez só, na próxima sexta (o Bico de Fim de Semana)
      if (a.cada === 'semana' && a.duracao === 1) return `${recurso(a.qual, a.quanto)} na sexta`
      const quando = a.cada === 'dia' ? 'todo dia' : 'toda sexta'
      const ate =
        a.duracao === undefined || a.duracao === 'run'
          ? ''
          : a.duracao === 'semana'
            ? ' nesta semana'
            : ` por ${a.duracao} ${a.cada === 'dia' ? plural(a.duracao, 'dia', 'dias') : plural(a.duracao, 'semana', 'semanas')}`
      return `${recurso(a.qual, a.quanto)} ${quando}${ate}`
    }
    case 'maoDoDia':
      return a.relativo ? `mão do dia ${a.quantas < 0 ? '−' : '+'}${Math.abs(a.quantas)}` : `mão do dia: ${a.quantas}`
    case 'sorteio': {
      const pct = Math.round(a.chance * 100)
      const senao = lista(a.senao)
      return `${pct}%: ${lista(a.entao) || 'nada'}${senao ? `; senão ${senao}` : ''}`
    }
    case 'rolar': {
      const lados = Number(a.lados) || 6
      return `role d${lados}: ${a.saidas
        .map((s) => `${s.de === s.ate ? s.de : `${s.de}–${s.ate}`} ${lista(s.acoes) || s.texto || 'nada'}`)
        .join('; ')}`
    }
    case 'se': {
      const senao = lista(a.senao)
      return `se ${descreverCondicao(a.condicao)}: ${lista(a.entao) || 'nada'}${senao ? `; senão ${senao}` : ''}`
    }
    case 'escolha':
      return `escolha: ${a.opcoes.map((o) => o.rotulo || lista(o.acoes)).join(' ou ')}`
    case 'mensagem':
      // a mensagem é fala da carta na mesa, não efeito: fica de fora
      return ''
  }
}

const QUANDO: Record<string, string> = {
  aoDescartar: 'Ao descartar',
  fimDaSemana: 'Na sexta',
  fimDoDia: 'No fim do dia',
  aposComprar: 'Ao comprar a mão',
}

/** A primeira letra em maiúscula, sem mexer no ícone que abre a frase. */
function frase(t: string): string {
  return t.charAt(0) === '{' || t.charAt(0) === '+' || t.charAt(0) === '−' ? t : t.charAt(0).toUpperCase() + t.slice(1)
}

/**
 * O que a carta faz, inteiro. `semRolar` tira a ação `rolar` do começo de
 * jogo — a carta de sorte a desenha como barra, e escrevê-la de novo em
 * cima seria dizer duas vezes.
 */
export function descreverCarta(
  carta: { efeitos?: Efeito[]; restricao?: Restricao },
  opcoes: { semRolar?: boolean } = {},
): string {
  const partes: string[] = []
  const r = carta.restricao
  if (r?.umaVezPorRun) partes.push('1× por partida')
  if (r?.exige) partes.push(`Só com ${descreverCondicao(r.exige)}`)
  for (const e of carta.efeitos ?? []) {
    const acoes = opcoes.semRolar && (!e.quando || e.quando === 'aoJogar') ? e.acoes.filter((a) => a.faz !== 'rolar') : e.acoes
    let t = lista(acoes)
    if (!t) continue
    if (e.se) t = `se ${descreverCondicao(e.se)}: ${t}`
    const quando = e.quando ? QUANDO[e.quando] : undefined
    partes.push(quando ? `${quando}: ${t}` : frase(t))
  }
  return partes.join('. ')
}

/**
 * O texto escrito da carta, se ele já é um COMENTÁRIO. Até a v0.43 ele era
 * a descrição do efeito ("+3 energia, +1 estresse"), e mostrado embaixo da
 * descrição automática diria tudo duas vezes. A regra da transição: texto
 * com número ou "R$" é descrição antiga e fica de fora; sem número, é o
 * comentário. Reescrever a carta no lab é o que a faz aparecer.
 */
export function comentarioDaCarta(texto: string | undefined): string | null {
  const t = texto?.trim()
  if (!t || /\d|R\$/.test(t)) return null
  return t
}
