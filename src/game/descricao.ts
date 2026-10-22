import { ehRolagem, textoDaRolagem, type Acao, type Condicao, type Efeito, type Quantia, type Restricao } from './acoes'
import { getCard } from './catalogo'

/**
 * A DESCRIÇÃO AUTOMÁTICA da carta (v0.44): o que ela faz, escrito a partir
 * das ações — e não à mão. É curta de propósito: o recurso vira o ícone dele
 * DEPOIS do número ("+1{estresse}" é o 1 e o foguinho), que é como o HUD já
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

/** "+2{energia}", "−1{estresse}", "+1d3{dinheiro}": o ícone DEPOIS do
 *  número (v0.44, segunda leitura do autor: "+1🔥" lê melhor que "+🔥1"). */
function recurso(qual: string, q: Quantia): string {
  const icone = ICONE[qual] ?? qual
  if (ehRolagem(q)) {
    const t = textoDaRolagem(q)
    return t.startsWith('−') ? `${t}${icone}` : `+${t}${icone}`
  }
  return `${q < 0 ? '−' : '+'}${Math.abs(q)}${icone}`
}

/** "4+{estresse}", "até 3{estresse}", "2–5{estresse}". */
function limite(icone: string, aoMenos?: number, noMaximo?: number): string {
  if (aoMenos !== undefined && noMaximo !== undefined) return aoMenos === noMaximo ? `${aoMenos}${icone}` : `${aoMenos}–${noMaximo}${icone}`
  if (aoMenos !== undefined) return `${aoMenos}+${icone}`
  if (noMaximo !== undefined) return `até ${noMaximo}${icone}`
  return icone
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
      return limite(ICONE[c.qual] ?? c.qual, c.aoMenos, c.noMaximo)
    case 'cotaBatida':
      return c.valor ? 'cota batida' : 'cota não batida'
    case 'advertencias':
      return limite('{advertencia}', c.aoMenos)
    case 'ineditaNaRun':
      return '1ª vez na partida'
    case 'efeitoAtivo':
      return 'ativa'
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
      return `cartas ${a.quanto < 0 ? '−' : '+'}${Math.abs(a.quanto)}${icone} hoje`
    }
    case 'bloquearClasse':
      return `sem ${a.classe} hoje`
    case 'advertencia':
      if (a.informal) return a.quanto < 0 ? `−${Math.abs(a.quanto)} verbal` : `+${a.quanto} ${plural(a.quanto, 'advertência verbal', 'advertências verbais')}`
      return `${a.quanto < 0 ? '−' : '+'}${Math.abs(a.quanto)}{advertencia}`
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
      return a.relativo
        ? `${a.quantas < 0 ? '−' : '+'}${Math.abs(a.quantas)} ${plural(Math.abs(a.quantas), 'carta', 'cartas')} na mão`
        : `mão de ${a.quantas} ${plural(a.quantas, 'carta', 'cartas')}`
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

/** A primeira letra em maiúscula (sinal e número ficam como estão). */
function frase(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1)
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

/** Uma linha da descrição: o que a carta faz e, se houver, a condição (ou o
 *  gatilho) que vai em cima dela. */
export interface Linha {
  quando?: string
  texto: string
}

/**
 * A descrição em LINHAS (v0.44, pedido do autor): a condição sai da frase e
 * vai em cima do que ela libera, como o rótulo das faixas da barra — "Só
 * com 4+🔥" em cima de "−3🔥, +4↗", "já jogou social hoje" em cima de
 * "−2🔥". É o mesmo conteúdo de `descreverCarta`, que continua servindo onde
 * só cabe texto corrido (o detalhe, o leitor de tela, o lab).
 *
 * A restrição (1× por partida, "só com") vale para a carta inteira: é o
 * rótulo da primeira linha sem condição, ou uma linha só dela. Um `se` sem
 * `senao` no meio das ações vira uma linha à parte, com a condição em cima.
 */
export function linhasDaCarta(
  carta: { efeitos?: Efeito[]; restricao?: Restricao },
  opcoes: { semRolar?: boolean } = {},
): Linha[] {
  const linhas: Linha[] = []
  for (const e of carta.efeitos ?? []) {
    const doJogar = !e.quando || e.quando === 'aoJogar'
    const acoes = opcoes.semRolar && doJogar ? e.acoes.filter((a) => a.faz !== 'rolar') : e.acoes
    const gatilho = e.quando ? QUANDO[e.quando] : undefined
    const cond = e.se ? descreverCondicao(e.se) : undefined
    const quando = [gatilho, cond].filter(Boolean).join(', ') || undefined
    // os `se` sem `senao` de um bloco sem condição saem em linhas próprias
    const soltos = !cond ? acoes.filter((a) => a.faz === 'se' && !(a.senao && a.senao.length)) : []
    const t = lista(acoes.filter((a) => !soltos.includes(a)))
    if (t) linhas.push({ quando, texto: frase(t) })
    for (const a of soltos) {
      if (a.faz !== 'se') continue
      const dentro = lista(a.entao)
      if (dentro) linhas.push({ quando: [gatilho, descreverCondicao(a.condicao)].filter(Boolean).join(', '), texto: frase(dentro) })
    }
  }
  const r = carta.restricao
  const restricao = [r?.umaVezPorRun ? '1× por partida' : '', r?.exige ? `só com ${descreverCondicao(r.exige)}` : '']
    .filter(Boolean)
    .join(' · ')
  if (restricao) {
    const livre = linhas.find((l) => !l.quando)
    if (livre) livre.quando = restricao
    else linhas.unshift({ quando: restricao, texto: '' })
  }
  return linhas
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

/** Um caminho da carta que escolhe pelo estado: quando vale e o que faz. */
export interface Caminho {
  quando: string
  texto: string
  /** No `sorteio`, a chance do caminho (0 a 1): vira a altura da faixa. */
  chance?: number
  /** A condição do caminho, para a mesa acender o que vale agora; o
   *  "senão" não tem (vale quando nenhum outro vale). */
  cond?: Condicao
}

/**
 * Junta duas listas de ações somando os recursos fixos do mesmo tipo: "−2🔥"
 * mais "−2🔥" é "−4🔥". É o que deixa a carta que faz uma coisa SEMPRE e
 * mais uma COM condição dizer o total de cada caminho (a Meditação no
 * Banheiro dizia "6+🔥: −2🔥" e, embaixo, "−2🔥", e ninguém lia "−4").
 */
function mesclar(base: Acao[], extra: Acao[]): Acao[] {
  const saida = base.map((a) => ({ ...a })) as Acao[]
  for (const a of extra) {
    const igual = a.faz === 'recurso' && typeof a.quanto === 'number'
      ? saida.find((b): b is Extract<Acao, { faz: 'recurso' }> => b.faz === 'recurso' && b.qual === a.qual && typeof b.quanto === 'number')
      : undefined
    if (igual && a.faz === 'recurso') igual.quanto = (igual.quanto as number) + (a.quanto as number)
    else saida.push(a)
  }
  return saida.filter((a) => !(a.faz === 'recurso' && a.quanto === 0))
}

/**
 * A carta que tem DOIS (ou mais) caminhos pelo estado da partida — "se for a
 * 1ª do dia: isto; senão: aquilo" — desenhada como a barra dividida da carta
 * de sorte, só que com a condição no lugar das faces (v0.44, pedido do
 * autor). Vale para dois formatos que o editor produz:
 *
 * - dois ou mais BLOCOS com condição (a Reunião: um bloco para a primeira do
 *   dia, outro para a segunda);
 * - uma ação `se` com `senao` (o Prazo Apertado).
 *
 * O resto da carta (o que ela faz sempre, a restrição, os gatilhos) vira o
 * `antes`, a linha por cima da barra. `se` sem `senao` não é caminho: é "e,
 * se tal, mais isto", e continua no texto. Nulo quando não há caminhos.
 */
export function caminhosDaCarta(carta: { efeitos?: Efeito[]; restricao?: Restricao }): { antes: string; caminhos: Caminho[] } | null {
  const efeitos = carta.efeitos ?? []
  const ehDoJogar = (e: Efeito) => !e.quando || e.quando === 'aoJogar'
  const condicionais = efeitos.filter((e) => ehDoJogar(e) && e.se)
  if (condicionais.length >= 2) {
    return {
      antes: descreverCarta({ ...carta, efeitos: efeitos.filter((e) => !condicionais.includes(e)) }),
      caminhos: condicionais.map((e) => ({ quando: descreverCondicao(e.se!), texto: frase(lista(e.acoes) || 'nada'), cond: e.se })),
    }
  }
  // um bloco com condição MAIS o que a carta faz sempre (a Meditação no
  // Banheiro): cada caminho diz o TOTAL — "6+🔥: −4🔥", "senão: −2🔥"
  const sempre = efeitos.filter((e) => ehDoJogar(e) && !e.se)
  const base = sempre.flatMap((e) => e.acoes)
  if (condicionais.length === 1 && base.length > 0 && !base.some((a) => a.faz === 'se' || a.faz === 'sorteio' || a.faz === 'rolar')) {
    const c = condicionais[0]
    return {
      antes: descreverCarta({ ...carta, efeitos: efeitos.filter((e) => e !== c && !sempre.includes(e)) }),
      caminhos: [
        { quando: descreverCondicao(c.se!), texto: frase(lista(mesclar(base, c.acoes)) || 'nada'), cond: c.se },
        { quando: 'senão', texto: frase(lista(base) || 'nada') },
      ],
    }
  }
  for (const e of efeitos) {
    if (!ehDoJogar(e) || e.se) continue
    // um `se` com `senao`, ou o `sorteio` de duas saídas (o "50%: isto;
    // senão aquilo" que quem testou achava difícil de ler)
    const ses = e.acoes.filter((a) => (a.faz === 'se' || a.faz === 'sorteio') && a.senao && a.senao.length > 0)
    if (ses.length !== 1) continue
    const se = ses[0] as Extract<Acao, { faz: 'se' | 'sorteio' }>
    const antes = descreverCarta({ ...carta, efeitos: efeitos.map((x) => (x === e ? { ...x, acoes: x.acoes.filter((a) => a !== se) } : x)) })
    if (se.faz === 'sorteio') {
      const pct = Math.round(se.chance * 100)
      return {
        antes,
        caminhos: [
          { quando: `${pct}%`, texto: frase(lista(se.entao) || 'nada'), chance: se.chance },
          { quando: `${100 - pct}%`, texto: frase(lista(se.senao) || 'nada'), chance: 1 - se.chance },
        ],
      }
    }
    return {
      antes,
      caminhos: [
        { quando: descreverCondicao(se.condicao), texto: frase(lista(se.entao) || 'nada'), cond: se.condicao },
        { quando: 'senão', texto: frase(lista(se.senao) || 'nada') },
      ],
    }
  }
  // um `se` SEM `senao` no meio do que a carta faz sempre (a Reunião que
  // Podia Ser E-mail: "+1↗ e, se já jogou social, −2🔥"): os dois caminhos
  // com o total de cada um
  for (const e of efeitos) {
    if (!ehDoJogar(e) || e.se) continue
    const ses = e.acoes.filter((a) => a.faz === 'se')
    const resto = e.acoes.filter((a) => a.faz !== 'se')
    if (ses.length !== 1 || resto.length === 0 || resto.some((a) => a.faz === 'sorteio' || a.faz === 'rolar')) continue
    const se = ses[0] as Extract<Acao, { faz: 'se' }>
    return {
      antes: descreverCarta({ ...carta, efeitos: efeitos.filter((x) => x !== e) }),
      caminhos: [
        { quando: descreverCondicao(se.condicao), texto: frase(lista(mesclar(resto, se.entao)) || 'nada'), cond: se.condicao },
        { quando: 'senão', texto: frase(lista(resto) || 'nada') },
      ],
    }
  }
  return null
}
