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
 * 2. **O baralho é o do ARQUIVO.** Desde a v0.39 as cartas só moram no
 *    banco, e o simulador mede o jogo como está no ar: o arquivo que o
 *    Lab › Simulador exporta (as cartas, os eventos e as regras do banco, e
 *    o baralho equipado de quem exportou). Para comparar duas versões do
 *    motor, rode as duas com o MESMO arquivo.
 *
 * Uso:
 *   npm run simular -- --de jogo.json             500 runs, semente 1, com o
 *                                                 baralho equipado do arquivo
 *   npm run simular -- --de jogo.json --inicial   o baralho inicial
 *   npm run simular -- --de jogo.json --tudo      o inicial + 1 cópia de cada
 *                                                 desbloqueável
 *   npm run simular -- --de jogo.json --runs 2000 mais runs
 *   npm run simular -- --de jogo.json --hash      só o hash de cada run, para
 *                                                 comparar duas versões do motor
 */

import { readFileSync } from 'node:fs'
import { carregarCatalogo, cartasDoJogo, catalogoJogavel, eventosDoJogo, getEvent } from '../src/game/catalogo'
import { mediaDe } from '../src/game/acoes'
import { idAtual } from '../src/game/ids'
import { custosDe, estresseViraEfeito } from '../src/game/custos'
import * as engine from '../src/game/engine'
import { baralhoAtivo, cartasDoBaralho, colecaoInicial } from '../src/game/colecao'
import { carregarModos, regras, totalDeDias, type Regras } from '../src/game/regras'
import type { ActionCard, CardId, EventCard, GameState } from '../src/game/types'

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
const TUDO = args.includes('--tudo')
const INICIAL = args.includes('--inicial')
const ARQUIVO = (() => {
  const i = args.indexOf('--de')
  return i >= 0 ? args[i + 1] : null
})()

/** O que o Lab › Simulador exporta. */
interface Exportado {
  geradoEm: string
  versao: number
  modo: Regras
  baralho: { nome: string; cartas: CardId[] }
  cartas: ActionCard[]
  eventos: EventCard[]
}

// o motor lê o catálogo e as regras pelas mesmas portas que o navegador usa
if (!ARQUIVO) {
  console.error('Falta o arquivo: npm run simular -- --de jogo.json (Lab › Simulador › Baixar arquivo).')
  process.exit(1)
}
const dados = JSON.parse(readFileSync(ARQUIVO, 'utf8')) as Exportado
// o arquivo exportado antes da v0.47 ainda traz custo de estresse: ele vira
// efeito, como na leitura do banco
carregarCatalogo({ cartas: dados.cartas.map(estresseViraEfeito), eventos: dados.eventos, versao: dados.versao, mudancas: [], removidas: [] })
carregarModos([dados.modo])
if (!catalogoJogavel()) {
  console.error(`${ARQUIVO} não tem baralho inicial ou eventos: não dá para jogar.`)
  process.exit(1)
}
const BARALHO_DO_ARQUIVO: CardId[] | null = INICIAL || TUDO ? null : dados.baralho.cartas.map((id) => idAtual(id))
const DE_ONDE = `${ARQUIVO} (exportado em ${dados.geradoEm.slice(0, 10)}${BARALHO_DO_ARQUIVO ? `, baralho "${dados.baralho.nome}"` : ''})`

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
      if (acao.faz === 'recurso' && acao.qual === qual) total += mediaDe(acao.quanto ?? 0)
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
    // carta paga em R$: o bot paga se o saldo continuar cobrindo as contas
    // da sexta. Abaixo disso, o despejo é certo e nenhum descanso vale isso
    const preco = custosDe(carta).find((c) => c.qual === 'dinheiro')?.quanto ?? 0
    if (preco > 0 && state.money - preco < state.modo.contasSemanais) return -30
    // estresse pago como CUSTO sobe do mesmo jeito que o de efeito
    const estresse = mexeEm(carta, 'estresse') + (custosDe(carta).find((c) => c.qual === 'estresse')?.quanto ?? 0)
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

interface Relatorio {
  outcome: GameState['outcome']
  dia: number
  dinheiro: number
  diasComCotaBatida: number
  diasJogados: number
  estresseFinal: number
  cartas: string[]
  eventos: string[]
  /** O evento do último dia, quando a run acabou mal. */
  eventoFatal: string | null
  recorrentes: number
  escolhas: number
  descartesReagidos: number
}

function jogarUmaRun(semente: number): Relatorio {
  Math.random = lcg(semente)
  const inicial = BARALHO_DO_ARQUIVO ?? cartasDoBaralho(baralhoAtivo(colecaoInicial()))
  const extras = TUDO ? cartasDoJogo().filter((c) => !c.starter).map((c) => c.id) : []
  let state = engine.createRun([...inicial, ...extras])
  let escolhas = 0
  // trava de segurança: com as pausas novas (escolha de descarte, pergunta de
  // carta), um caminho que não limpe a pausa travaria o script para sempre.
  // Melhor falhar alto do que rodar sem fim
  let passos = 0

  while (state.outcome === 'jogando' && passos < 4000) {
    passos += 1
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
    eventos: state.history.map((d) => d.eventId).filter((e): e is string => Boolean(e)),
    eventoFatal: state.outcome !== 'vitoria' ? state.history[state.history.length - 1]?.eventId ?? null : null,
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
console.log(`\nCLT — ${QUANTAS} runs, semente ${SEMENTE}, modo "${m.nome}"`)
console.log(`Jogo: ${DE_ONDE}`)
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
const vitoriaGeral = relatorios.filter((r) => r.outcome === 'vitoria').length / QUANTAS
/** A vitória nas runs em que a carta foi jogada, contra a geral: a carta que
 *  puxa muito para cima é a candidata a ficar mais cara. É correlação, não
 *  causa — carta boa aparece em run boa também porque a run durou mais. */
function vitoriaCom(eh: (r: Relatorio) => boolean): string {
  const com = relatorios.filter(eh)
  if (com.length === 0) return '   —'
  const v = com.filter((r) => r.outcome === 'vitoria').length / com.length
  const d = (v - vitoriaGeral) * 100
  return `${(v * 100).toFixed(0).padStart(3)}% (${d >= 0 ? '+' : ''}${d.toFixed(0)})`
}
console.log(`\nCARTAS (vezes jogadas por run · vitória nas runs em que foi jogada)`)
for (const [id, n] of [...usos].sort((a, b) => b[1] - a[1])) {
  // pelo NOME: o id virou uuid (v0.35), e uuid não diz qual carta é
  const nome = cartasDoJogo().find((c) => c.id === id)?.name ?? id
  console.log(`  ${nome.padEnd(30)} ${(n / QUANTAS).toFixed(2).padStart(5)}  ${vitoriaCom((r) => r.cartas.includes(id))}`)
}

// o evento é sorteado entre todos, então quem decide se ele pesa é o
// estrago: quantas runs ACABARAM no dia em que ele saiu
const vezes = new Map<string, number>()
const fatais = new Map<string, number>()
for (const r of relatorios) {
  for (const id of r.eventos) vezes.set(id, (vezes.get(id) ?? 0) + 1)
  if (r.eventoFatal) fatais.set(r.eventoFatal, (fatais.get(r.eventoFatal) ?? 0) + 1)
}
console.log(`\nEVENTOS (saídas · runs que acabaram mal no dia dele)`)
for (const e of [...eventosDoJogo()].sort((a, b) => (fatais.get(b.id) ?? 0) / (vezes.get(b.id) ?? 1) - (fatais.get(a.id) ?? 0) / (vezes.get(a.id) ?? 1))) {
  const n = vezes.get(e.id) ?? 0
  const f = fatais.get(e.id) ?? 0
  console.log(`  ${getEvent(e.id).name.padEnd(30)} ${String(n).padStart(5)}  ${n ? ((f / n) * 100).toFixed(1).padStart(5) : '    —'}%`)
}

// o vocabulário novo tem que EXECUTAR, e não só compilar: zero aqui quer
// dizer que um caminho inteiro está morto e ninguém percebeu
const comRecorrente = relatorios.filter((r) => r.recorrentes > 0).length
const comEscolha = relatorios.reduce((s, r) => s + r.escolhas, 0)
console.log(`\nVOCABULÁRIO`)
console.log(`  runs que terminaram com efeito recorrente em pé: ${comRecorrente}`)
console.log(`  perguntas de carta respondidas: ${comEscolha}`)
console.log()
