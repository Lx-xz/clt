'use client'

import { EVENTO_VOLUME, lerVolumes, volumeDosEfeitos, type Volumes } from './som'
import { vibrar } from './vibrar'

/**
 * Os efeitos sonoros: a carta jogada, o salário, as contas, o envelope.
 *
 * **Por que não `new Audio(arquivo).play()`.** É o jeito óbvio, e foi o que
 * deixou os sons atrasados da outra vez: a tag de áudio é feita para música,
 * e baixa e decodifica o arquivo NA HORA de tocar — no celular são 100 a
 * 300 ms, e o primeiro toque de cada som é o pior. Aqui cada som vira um
 * `AudioBuffer` UMA vez, na primeira interação da pessoa, e tocar é só soltar
 * um pedaço de memória já decodificado: atraso de alguns milissegundos, e o
 * mesmo som pode tocar por cima de si mesmo.
 *
 * **Cada som é um ARQUIVO ou uma SÍNTESE** (`SONS`). A síntese é o próprio
 * navegador gerando o som com osciladores e ruído, num `OfflineAudioContext`
 * — vira o mesmo tipo de buffer que um arquivo, e toca pelo mesmo caminho.
 * Ela é o som provisório: quando o arquivo de verdade chegar (em
 * `public/som/efeitos/`), é preencher o `arquivo` da linha. Arquivo que não
 * carrega cai na síntese, em vez de deixar o jogo mudo.
 *
 * O `volume` de cada linha foi acertado medindo o volume médio de cada som
 * gravado em WAV, para nenhum gritar mais que os outros. Arquivo novo pede
 * a mesma conferência.
 *
 * **O contexto é separado do da música** e é SUSPENSO depois de uns
 * segundos sem uso: um contexto de áudio rodando segura o som do aparelho
 * no celular, a mesma armadilha da música (veja `Musica.tsx`). Todo toque
 * na tela o acorda antes de o som ser pedido — o gesto que joga a carta
 * começa no `pointerdown`, e o som só sai no fim dele.
 */

export type Efeito = 'carta' | 'salario' | 'contas' | 'semDinheiro' | 'abrir' | 'revelar' | 'revelarRara'

interface Receita {
  /** Caminho a partir de `public/`, sem barra no começo. */
  arquivo?: string
  /** O som provisório, e a rede quando o arquivo falha. */
  sintese: (ctx: OfflineAudioContext) => void
  /** Duração da síntese, em segundos. */
  duracao: number
  /** Volume desta linha, para os sons conversarem entre si. */
  volume?: number
  /** Quanto o tom varia a cada vez (0,04 = ±4%): o mesmo som em sequência
   *  não soa como metralhadora. */
  variacao?: number
}

// --------------------------------------------------------------- síntese

function ruido(ctx: BaseAudioContext, segundos: number): AudioBufferSourceNode {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * segundos), ctx.sampleRate)
  const dados = buffer.getChannelData(0)
  for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1
  const fonte = ctx.createBufferSource()
  fonte.buffer = buffer
  return fonte
}

/** Um envelope de volume: sobe em `ataque`, cai exponencialmente até `fim`. */
function envelope(ctx: BaseAudioContext, inicio: number, ataque: number, fim: number, pico = 1): GainNode {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, inicio)
  g.gain.exponentialRampToValueAtTime(pico, inicio + ataque)
  g.gain.exponentialRampToValueAtTime(0.0001, fim)
  return g
}

function tom(ctx: BaseAudioContext, tipo: OscillatorType, freq: number, inicio: number, dur: number, pico: number, ate?: number) {
  const o = ctx.createOscillator()
  o.type = tipo
  o.frequency.setValueAtTime(freq, inicio)
  if (ate) o.frequency.exponentialRampToValueAtTime(ate, inicio + dur)
  const g = envelope(ctx, inicio, 0.005, inicio + dur, pico)
  o.connect(g).connect(ctx.destination)
  o.start(inicio)
  o.stop(inicio + dur + 0.02)
}

/** Ruído filtrado: papel, carta deslizando, o clique de uma trava. */
function chiado(ctx: BaseAudioContext, inicio: number, dur: number, pico: number, de: number, para: number, q = 0.9) {
  const n = ruido(ctx, dur + 0.05)
  const f = ctx.createBiquadFilter()
  f.type = 'bandpass'
  f.Q.value = q
  f.frequency.setValueAtTime(de, inicio)
  f.frequency.exponentialRampToValueAtTime(para, inicio + dur)
  const g = envelope(ctx, inicio, 0.004, inicio + dur, pico)
  n.connect(f).connect(g).connect(ctx.destination)
  n.start(inicio)
  n.stop(inicio + dur + 0.05)
}

// ----------------------------------------------------------------- a tabela

const SONS: Record<Efeito, Receita> = {
  // a carta deslizando no feltro e batendo na mesa
  carta: {
    duracao: 0.22,
    variacao: 0.06,
    volume: 0.8,
    sintese: (ctx) => {
      chiado(ctx, 0, 0.13, 0.9, 4200, 1300, 0.7)
      tom(ctx, 'sine', 140, 0.1, 0.09, 0.35, 70)
    },
  },
  // o "ka-ching": a gaveta da caixa e o sino
  salario: {
    duracao: 0.9,
    volume: 0.7,
    sintese: (ctx) => {
      chiado(ctx, 0, 0.05, 0.6, 2500, 1800, 2)
      chiado(ctx, 0.07, 0.04, 0.5, 3000, 2600, 3)
      for (const [f, t] of [[2093, 0.12], [2637, 0.12], [3136, 0.16]] as const) tom(ctx, 'sine', f, t, 0.7, 0.28)
      tom(ctx, 'triangle', 4186, 0.12, 0.35, 0.08)
    },
  },
  // a impressora do recibo: rajada de batidinhas e o corte do papel
  contas: {
    duracao: 0.55,
    volume: 1,
    sintese: (ctx) => {
      for (let i = 0; i < 9; i++) chiado(ctx, i * 0.038, 0.025, 0.9, 2400, 2100, 4)
      chiado(ctx, 0.38, 0.12, 0.7, 5000, 1500, 0.8)
    },
  },
  // o cartão recusado: dois bipes descendo
  semDinheiro: {
    duracao: 0.45,
    volume: 0.6,
    sintese: (ctx) => {
      tom(ctx, 'square', 330, 0, 0.16, 0.32)
      tom(ctx, 'square', 247, 0.19, 0.24, 0.32)
    },
  },
  // abrir a recompensa: o papel rasgando, ou a trava cedendo
  abrir: {
    duracao: 0.5,
    volume: 1,
    sintese: (ctx) => {
      chiado(ctx, 0, 0.03, 0.7, 2000, 1800, 3)
      for (let i = 0; i < 6; i++) chiado(ctx, 0.05 + i * 0.045, 0.06, 0.5 + Math.random() * 0.3, 3500, 1200, 0.8)
      tom(ctx, 'sine', 500, 0.08, 0.35, 0.12, 900)
    },
  },
  // a carta desvirando
  revelar: {
    duracao: 0.4,
    variacao: 0.03,
    volume: 0.8,
    sintese: (ctx) => {
      chiado(ctx, 0, 0.08, 0.5, 2500, 5000, 0.8)
      tom(ctx, 'sine', 1320, 0.04, 0.3, 0.18)
      tom(ctx, 'sine', 1760, 0.08, 0.3, 0.12)
    },
  },
  // a épica e a lendária: o brilho maior, como os raios na tela
  revelarRara: {
    duracao: 1.1,
    volume: 0.7,
    sintese: (ctx) => {
      chiado(ctx, 0, 0.1, 0.5, 2500, 6000, 0.8)
      ;[1047, 1319, 1568, 2093].forEach((f, i) => tom(ctx, 'sine', f, 0.05 + i * 0.07, 0.8, 0.16))
      tom(ctx, 'triangle', 4186, 0.33, 0.6, 0.05)
    },
  },
}

// ------------------------------------------------------------ o motor

/** O `/clt` do GitHub Pages: o Next não prefixa o caminho de um `fetch`. */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
const OCIOSO_MS = 6000

let contexto: AudioContext | null = null
let mestre: GainNode | null = null
let buffers: Partial<Record<Efeito, AudioBuffer>> = {}
let preparando: Promise<void> | null = null
let ocioso: ReturnType<typeof setTimeout> | null = null
let ligado = false

function volumeAtual(): number {
  return volumeDosEfeitos(lerVolumes())
}

async function sintetizar(r: Receita): Promise<AudioBuffer> {
  const taxa = 44100
  const ctx = new OfflineAudioContext(1, Math.ceil(taxa * r.duracao), taxa)
  r.sintese(ctx)
  return ctx.startRendering()
}

async function carregar(nome: Efeito, r: Receita, ctx: AudioContext): Promise<void> {
  if (r.arquivo) {
    try {
      const resposta = await fetch(`${BASE}/${r.arquivo}`)
      if (resposta.ok) {
        buffers[nome] = await ctx.decodeAudioData(await resposta.arrayBuffer())
        return
      }
    } catch {
      // cai na síntese, logo abaixo
    }
  }
  buffers[nome] = await sintetizar(r)
}

/** Cria o contexto e prepara todos os sons. Só depois de uma interação: o
 *  navegador não deixa o áudio nascer antes. */
function preparar(): Promise<void> | null {
  if (preparando) return preparando
  if (typeof window === 'undefined' || volumeAtual() === 0) return null
  const Contexto: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Contexto || typeof OfflineAudioContext === 'undefined') return null
  try {
    contexto = new Contexto()
    mestre = contexto.createGain()
    mestre.gain.value = volumeAtual()
    mestre.connect(contexto.destination)
  } catch {
    contexto = null
    return null
  }
  const ctx = contexto
  preparando = Promise.all(
    (Object.entries(SONS) as [Efeito, Receita][]).map(([nome, r]) => carregar(nome, r, ctx).catch(() => {})),
  ).then(() => {})
  return preparando
}

function adormecerDepois() {
  if (ocioso) clearTimeout(ocioso)
  ocioso = setTimeout(() => {
    // parado, o contexto devolve o som do aparelho para quem mais tocar
    void contexto?.suspend()
  }, OCIOSO_MS)
}

/** Acorda o contexto: chamado em todo toque e toda tecla, ANTES de o som do
 *  gesto ser pedido, para o `resume` já ter acontecido quando ele vier. */
function acordar() {
  if (volumeAtual() === 0) return
  if (!contexto) void preparar()
  else if (contexto.state === 'suspended') void contexto.resume()
  adormecerDepois()
}

/** Liga os ouvintes uma vez por página. Quem chama é o layout do jogo. */
export function ligarEfeitos() {
  if (ligado || typeof window === 'undefined') return
  ligado = true
  // na CAPTURA: o som de uma jogada sai do handler do próprio clique, e o
  // contexto tem que estar acordado antes dele
  window.addEventListener('pointerdown', acordar, true)
  window.addEventListener('keydown', acordar, true)
  window.addEventListener('touchstart', acordar, { capture: true, passive: true })
  window.addEventListener(EVENTO_VOLUME, (e) => {
    const v = volumeDosEfeitos((e as CustomEvent<Volumes>).detail ?? lerVolumes())
    if (mestre && contexto) mestre.gain.setTargetAtTime(v, contexto.currentTime, 0.05)
    if (v === 0) void contexto?.suspend()
  })
}

/** Toca um efeito, e vibra junto. Sem som ligado, sem interação ainda ou com o som ainda
 *  sendo preparado, não toca nada — e não espera: som atrasado é pior que
 *  som nenhum. */
export function tocar(nome: Efeito) {
  // a vibração vem antes de tudo: ela não depende do som estar ligado
  vibrar(nome)
  if (!contexto || !mestre || volumeAtual() === 0) return
  const buffer = buffers[nome]
  if (!buffer) return
  if (contexto.state === 'suspended') void contexto.resume()
  const r = SONS[nome]
  const fonte = contexto.createBufferSource()
  fonte.buffer = buffer
  if (r.variacao) fonte.playbackRate.value = 1 + (Math.random() * 2 - 1) * r.variacao
  const g = contexto.createGain()
  g.gain.value = r.volume ?? 1
  fonte.connect(g).connect(mestre)
  fonte.start()
  adormecerDepois()
}
