/**
 * O simulador de runs — `npm run simular`.
 *
 * Ele existe porque `src/game/` não importa React nem Supabase: o motor é um
 * monte de funções puras sobre `GameState`, e isso permite jogar o jogo
 * milhares de vezes fora do navegador. Os números de balanceamento do
 * CLAUDE.md saíram assim.
 *
 * **Desta vez ele está no repositório.** As medições anteriores foram feitas
 * por um script escrito na conversa e jogado fora, e o resultado é que elas
 * envelheceram sem ninguém conseguir refazê-las.
 *
 * Duas coisas que ele garante, e que valem mais do que os números:
 *
 * 1. **Determinismo.** `Math.random` é trocado por um LCG semeado no começo de
 *    cada run. Nenhum import do motor sorteia nada na carga — quem sorteia é
 *    `createRun` em diante. O embaralhamento, o sorteio do evento e
 *    o `ctx.sorte` passam todos por lá, então a mesma semente dá exatamente a
 *    mesma partida. É o que permite comparar duas versões do motor jogada por
 *    jogada — foi assim que a migração das cartas para dado foi conferida.
 * 2. **O baralho é o do CÓDIGO.** Sem navegador ninguém chama
 *    `carregarCatalogo`, então `catalogo.ts` fica na semente de `cards.ts`.
 *    O script confere isso em voz alta em vez de supor.
 *
 * Uso:
 *   npm run simular                    500 runs, semente 1
 *   npm run simular -- --runs 2000     mais runs
 *   npm run simular -- --hash          imprime só o hash de cada run, para
 *                                      comparar duas versões do motor
 */

import { cartasDoJogo, cartasIniciais, catalogoVeioDoBanco } from '../src/game/catalogo'
import * as engine from '../src/game/engine'
import { regras, totalDeDias } from '../src/game/regras'
import type { GameState } from '../src/game/types'

// o LCG entra antes de tudo: `engine.ts` guarda referências a `Math.random`
// dentro de funções, mas quem chama é sempre `Math.random` na hora — ainda
// assim, trocar antes evita qualquer surpresa de ordem de import
function lcg(semente: number): () => number {
  let s = semente >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

const args = process.argv.slice(2)
function arg(nome: string, padrao: number): number {
  const i = args.indexOf(`--${nome}`)
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : padrao
}
const QUANTAS = arg('runs', 500)
const SEMENTE = arg('semente', 1)
const SO_HASH = args.includes('--hash')
/** `ingenuo` (o padrão, e o do --hash) ou `cuidadoso`. */
const BOT = args.includes('--bot') ? args[args.indexOf('--bot') + 1] : 'ingenuo'
/** Equipa todas as cartas do jogo, em vez do baralho inicial. */
const TUDO = args.includes('--tudo')
// fecha a loja, para medir o que ela muda: as runs copiam as regras na
// criação, então basta esvaziar a lista antes da primeira
if (args.includes('--sem-loja')) regras().loja = []


if (catalogoVeioDoBanco()) {
  throw new Error('O catálogo veio do banco: a medição não seria reproduzível.')
}

// ---------------------------------------------------------------------- bot

/**
 * O bot mediano: bate a cota, descansa quando o estresse aperta, e gasta o
 * resto da energia no que couber. Ele não joga BEM — joga como alguém que
 * entendeu o jogo e não está otimizando. Serve para comparar versões, não
 * para descobrir o teto do jogo.
 */
/**
 * Quanto uma carta mexe num recurso, olhando só os blocos SEM condição — o
 * bot não simula a carta, ele lê a parte previsível dela. É o que um jogador
 * faz ao bater o olho.
 */
function mexeEm(carta: { efeitos?: { se?: unknown; quando?: string; acoes: unknown[] }[] }, qual: string): number {
  let total = 0
  for (const efeito of carta.efeitos ?? []) {
    if (efeito.se || (efeito.quando && efeito.quando !== 'aoJogar')) continue
    for (const acao of efeito.acoes as { faz: string; qual?: string; quanto?: number }[]) {
      if (acao.faz === 'recurso' && acao.qual === qual) total += acao.quanto ?? 0
    }
  }
  return total
}

function melhorJogada(state: GameState): string | null {
  const jogaveis = state.hand.filter((c) => engine.canPlay(state, c))
  if (jogaveis.length === 0) return null
  const nota = (uid: string) => {
    const id = state.hand.find((h) => h.uid === uid)?.cardId
    const carta = cartasDoJogo().find((c) => c.id === id)
    if (!carta) return -99
    const estresse = mexeEm(carta, 'estresse')
    // a regra que sustenta o jogo: Energia = 10 − Estresse, então chegar
    // perto do teto encolhe todos os dias seguintes. Um jogador mediano
    // percebe isso e recua
    if (state.stress + estresse >= state.modo.estresseMaximo - 1) return -50
    if (state.stress >= 6 && estresse > 0) return -20
    const faltaCota = state.productivity < state.dailyQuota
    if (state.stress >= 4 && estresse < 0) return 12
    if (faltaCota && mexeEm(carta, 'produtividade') > 0) return 10 - estresse
    if (estresse < 0) return 6
    if (mexeEm(carta, 'dinheiro') > 0) return 5 - estresse
    // carta cara sem motivo fica para depois: energia gasta não volta
    return 3 - engine.effectiveCost(state, carta.id) - estresse
  }
  const ordenadas = [...jogaveis].sort((a, b) => nota(b.uid) - nota(a.uid))
  // jogar carta ruim é pior do que não jogar: o dia acaba com energia sobrando
  return nota(ordenadas[0].uid) <= -20 ? null : ordenadas[0].uid
}

// ------------------------------------------------------- o bot cuidadoso

/**
 * O bot CUIDADOSO: a cada passo ele procura, em profundidade, a melhor
 * sequência de jogadas do dia e joga a primeira. Ele existe porque o
 * ingênuo — que joga tudo que cabe na energia, Café e Hora Extra inclusos —
 * morre no dia 5 em 98% das runs, e isso dizia mais sobre o bot do que sobre
 * o jogo: com o mesmo baralho, planejar o dia vence perto de 80%.
 *
 * Os dois juntos são a régua. O ingênuo é o jogador que ainda não entendeu
 * que estresse de hoje é energia a menos amanhã; o cuidadoso é o teto
 * prático. Um ajuste que mexe só num deles está mexendo na DISTÂNCIA entre
 * aprender e não aprender o jogo.
 *
 * A nota de um estado é uma heurística, não a verdade: estresse custa caro
 * (e cada vez mais caro perto do teto), produtividade vale enquanto a meta
 * da semana pede, advertência é quase morte, e dinheiro vale pouco — ele é
 * pontuação, a não ser que a próxima sexta esteja em risco.
 */
function nota(s: GameState): number {
  if (s.outcome === 'vitoria') return 1e6 + s.money
  if (s.outcome !== 'jogando') return -1e6 + s.day * 1000
  const r = s.modo
  let st = s.stress + (s.productivity < s.dailyQuota ? r.penalidadeDaCota : 0)
  if (s.currentEvent === 'cobranca-no-zap' && s.productivity < s.dailyQuota) st += 2
  if (st >= r.estresseMaximo) return -1e5 + s.day * 100 + s.productivity
  let v = -8 * st - 2.5 * Math.max(0, st - 5) ** 2
  const semana = r.semanas[Math.min(Math.floor((s.day - 1) / r.diasPorSemana), r.semanas.length - 1)]
  const diaDaSemana = ((s.day - 1) % r.diasPorSemana) + 1
  const faltam = r.diasPorSemana - diaDaSemana
  const precisa = semana.weeklyGoal - (s.weekProductivity + s.productivity)
  v += precisa > 0 ? 2.2 * s.productivity : 0.3 * s.productivity
  v -= 7 * Math.max(0, precisa - faltam * 4)
  // abaixo do aluguel, dinheiro vale muito; acima dele, é só pontuação
  v += s.money < r.contasSemanais ? s.money / 6 : r.contasSemanais / 6 + (s.money - r.contasSemanais) / 15
  v -= 45 * s.warnings + 20 * s.informalWarnings
  for (const rec of s.recorrentes) {
    if (rec.qual === 'produtividade') v += rec.quanto * 1.6 * (totalDeDias(r) - s.day)
    if (rec.qual === 'dinheiro') v += rec.quanto / 15
  }
  return v
}

function busca(s: GameState, prof: number): { v: number; uid: string | null; descartar: boolean } {
  let melhor = { v: nota(s), uid: null as string | null, descartar: false }
  if (prof === 0 || s.phase !== 'dia' || s.outcome !== 'jogando') return melhor
  const vistos = new Set<string>()
  if (s.escolhaDeDescarte) {
    melhor = { v: -Infinity, uid: null, descartar: true }
    for (const c of s.hand) {
      if (vistos.has(c.cardId)) continue
      vistos.add(c.cardId)
      const b = busca(engine.escolherParaDescartar(s, c.uid), prof - 1)
      if (b.v > melhor.v) melhor = { v: b.v, uid: c.uid, descartar: true }
    }
    return melhor
  }
  for (const c of s.hand) {
    if (vistos.has(c.cardId) || !engine.canPlay(s, c)) continue
    vistos.add(c.cardId)
    const b = busca(engine.playCard(s, c.uid), prof - 1)
    if (b.v > melhor.v + 1e-9) melhor = { v: b.v, uid: c.uid, descartar: false }
  }
  return melhor
}

/** As desbloqueáveis na ordem em que o cuidadoso as quer. */
const PREFERIDAS = [
  'home-office', 'soneca-no-banheiro', 'terapia', 'atalho-no-sistema', 'automatizar', 'delegar',
  'puxar-o-saco', 'foco-total', 'vale-refeicao', 'pedir-aumento', 'reorganizar-a-mesa',
  'cafe-duplo', 'freela-grande',
]
const RUINS = ['hora-extra', 'cafe', 'reuniao']

let comprasNaLoja = 0

function passoCuidadoso(state: GameState): GameState {
  if (state.escolhaAberta) return engine.escolherOpcao(state, 0)
  if (state.phase === 'evento') {
    if (!state.pendingEventChoice) return engine.revealEvent(state)
    const a = busca(engine.chooseEventOption(state, 0), 3).v
    const b = busca(engine.chooseEventOption(state, 1), 3).v
    return engine.chooseEventOption(state, a >= b ? 0 : 1)
  }
  if (state.phase === 'dia') {
    const b = busca(state, 4)
    if (!b.uid) return engine.endDay(state)
    return b.descartar ? engine.escolherParaDescartar(state, b.uid) : engine.playCard(state, b.uid)
  }
  if (state.phase === 'sexta') {
    if (state.fridayStep === 'salario') return engine.paySalary(state)
    if (state.fridayStep === 'contas') return engine.payBills(state)
    // a loja: compra alívio enquanto sobra um colchão para a próxima sexta, e
    // corta a pior carta que ainda estiver no baralho
    if (engine.lojaAberta(state)) {
      const colchao = state.modo.contasSemanais - Math.min(...state.modo.semanas.map((w) => w.reducedSalary))
      for (const item of state.modo.loja) {
        if (engine.motivoDaLoja(state, item.id)) continue
        if (state.money - item.preco < colchao + 40) continue
        if (item.cortarCarta) {
          const alvo = RUINS.find((id) => [...state.deck, ...state.discard].some((c) => c.cardId === id))
          if (!alvo) continue
          comprasNaLoja += 1
          return engine.comprarNaLoja(state, item.id, alvo)
        }
        const alivia = item.acoes.some((a) => a.faz === 'recurso' && a.qual === 'estresse' && a.quanto < 0)
        if (alivia && state.stress >= 2) {
          comprasNaLoja += 1
          return engine.comprarNaLoja(state, item.id)
        }
      }
    }
    return engine.restWeekend(state)
  }
  if (state.phase === 'recompensa') {
    const op = [...state.rewardOptions].sort((x, y) => PREFERIDAS.indexOf(x) - PREFERIDAS.indexOf(y))
    return engine.chooseReward(state, op[0])
  }
  return state
}

interface Relatorio {
  outcome: GameState['outcome']
  dia: number
  dinheiro: number
  diasComCotaBatida: number
  diasJogados: number
  estresseFinal: number
  cartas: string[]
  recorrentes: number
  escolhas: number
  descartesReagidos: number
}

function jogarUmaRun(semente: number): Relatorio {
  Math.random = lcg(semente)
  const equipadas = TUDO ? cartasDoJogo().map((c) => c.id) : cartasIniciais().map((c) => c.id)
  let state = engine.createRun(equipadas)
  let escolhas = 0
  // trava de segurança: com as pausas novas (escolha de descarte, pergunta de
  // carta), um caminho que não limpe a pausa travaria o script para sempre.
  // Melhor falhar alto do que rodar sem fim
  let passos = 0

  while (state.outcome === 'jogando' && passos < 4000) {
    passos += 1
    if (BOT === 'cuidadoso') {
      state = passoCuidadoso(state)
      continue
    }
    if (state.escolhaAberta) {
      state = engine.escolherOpcao(state, 0)
      escolhas += 1
      continue
    }
    if (state.escolhaDeDescarte) {
      const alvo = state.hand[state.hand.length - 1]
      if (!alvo) break
      state = engine.escolherParaDescartar(state, alvo.uid)
      continue
    }
    if (state.phase === 'evento') {
      state = state.pendingEventChoice
        ? engine.chooseEventOption(state, 0)
        : engine.revealEvent(state)
      continue
    }
    if (state.phase === 'dia') {
      const uid = melhorJogada(state)
      state = uid ? engine.playCard(state, uid) : engine.endDay(state)
      continue
    }
    if (state.phase === 'sexta') {
      if (state.fridayStep === 'salario') state = engine.paySalary(state)
      else if (state.fridayStep === 'contas') state = engine.payBills(state)
      else state = engine.restWeekend(state)
      continue
    }
    if (state.phase === 'recompensa') {
      state = engine.chooseReward(state, state.rewardOptions[0])
      continue
    }
    break
  }
  if (passos >= 4000) throw new Error(`A run ${semente} não terminou: alguma pausa não foi limpa.`)

  return {
    outcome: state.outcome,
    dia: state.day,
    dinheiro: state.money,
    diasComCotaBatida: state.history.filter((d) => d.metQuota).length,
    diasJogados: state.history.length,
    estresseFinal: state.stress,
    cartas: state.history.flatMap((d) => d.cardsPlayed),
    recorrentes: state.recorrentes?.length ?? 0,
    escolhas,
    descartesReagidos: 0,
  }
}

/** O estado final resumido, para comparar duas versões do motor. O `log` fica
 *  de fora: ele é narrativa, e mudar uma frase não é mudar o jogo. */
function hashDaRun(r: Relatorio): string {
  return [r.outcome, r.dia, r.dinheiro, r.diasComCotaBatida, r.estresseFinal, r.cartas.join('|')].join('·')
}

// ------------------------------------------------------------------ medição

const relatorios: Relatorio[] = []
for (let i = 0; i < QUANTAS; i += 1) relatorios.push(jogarUmaRun(SEMENTE + i))

if (SO_HASH) {
  for (const r of relatorios) console.log(hashDaRun(r))
  process.exit(0)
}

function pct(n: number): string {
  return `${((n / QUANTAS) * 100).toFixed(1)}%`
}
function mediana(ns: number[]): number {
  if (ns.length === 0) return 0
  const s = [...ns].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

const m = regras()
console.log(`\nCLT — ${QUANTAS} runs, semente ${SEMENTE}, modo "${m.nome}", bot ${BOT}${TUDO ? ', tudo equipado' : ''}`)
console.log(`Aluguel ${m.contasSemanais} · energia base ${m.energiaBase} · ${totalDeDias(m)} dias · mão de ${m.cartasNaMao}\n`)

console.log('DESFECHOS')
for (const o of ['vitoria', 'burnout', 'demissao', 'despejo'] as const) {
  const dela = relatorios.filter((r) => r.outcome === o)
  const dias = dela.map((r) => r.dia)
  const extra = dela.length ? ` · dia mediano ${mediana(dias)}` : ''
  console.log(`  ${o.padEnd(10)} ${pct(dela.length).padStart(6)}  (${String(dela.length).padStart(4)})${extra}`)
}

const vitorias = relatorios.filter((r) => r.outcome === 'vitoria')
if (vitorias.length) {
  const grana = vitorias.map((r) => r.dinheiro).sort((a, b) => a - b)
  console.log(`\nPONTUAÇÃO (dinheiro no fim das vitórias)`)
  console.log(`  mínimo R$ ${grana[0]} · mediana R$ ${mediana(grana)} · máximo R$ ${grana[grana.length - 1]}`)
}

const diasTotais = relatorios.reduce((s, r) => s + r.diasJogados, 0)
const cotasBatidas = relatorios.reduce((s, r) => s + r.diasComCotaBatida, 0)
console.log(`\nO DIA A DIA`)
console.log(`  dias jogados: ${diasTotais} · cota batida em ${((cotasBatidas / diasTotais) * 100).toFixed(1)}% deles`)
console.log(`  dias por run: ${(diasTotais / QUANTAS).toFixed(1)}`)

const usos = new Map<string, number>()
for (const r of relatorios) for (const id of r.cartas) usos.set(id, (usos.get(id) ?? 0) + 1)
console.log(`\nCARTAS (vezes jogadas por run)`)
for (const [id, n] of [...usos].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${id.padEnd(22)} ${(n / QUANTAS).toFixed(2)}`)
}

// o vocabulário novo tem que EXECUTAR, e não só compilar: zero aqui quer
// dizer que um caminho inteiro está morto e ninguém percebeu
const comRecorrente = relatorios.filter((r) => r.recorrentes > 0).length
const comEscolha = relatorios.reduce((s, r) => s + r.escolhas, 0)
console.log(`\nVOCABULÁRIO`)
console.log(`  runs que terminaram com efeito recorrente em pé: ${comRecorrente}`)
console.log(`  perguntas de carta respondidas: ${comEscolha}`)
if (BOT === 'cuidadoso') console.log(`  compras na loja: ${comprasNaLoja} (${(comprasNaLoja / QUANTAS).toFixed(2)} por run)`)
console.log()
