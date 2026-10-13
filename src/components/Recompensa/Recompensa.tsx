'use client'

import { createContext, useContext, useEffect, useId, useRef, useState } from 'react'
import type { FormaDaRecompensa } from '@/game/missoes'

/**
 * As recompensas do jogo, CHAPADAS: envelope,
 * pacote, maleta e cofre — cor lisa, dois ou três tons por peça, nada de
 * gradiente de luz. Nasceram numa bancada do lab (v0.23); as versões de antes
 * (o envelope de CSS, a escada em 3D) estão no /lab/museu.
 *
 * Isto é GEOMETRIA, e não um desenho por estado: cada objeto é um punhado
 * de faces planas no espaço, cada face é desenhada no próprio plano (um
 * retângulo, um triângulo, com os enfeites dele) e projetada na tela por
 * uma matriz. A primeira versão desenhava o fechado e o aberto à mão e
 * trocava um pelo outro: as peças não encaixavam, e a tampa que abria não
 * era a que estava fechada. A projeção é OBLÍQUA, sem perspectiva — é ela
 * que dá o chapado: a frente fica de frente, sem encolher, e o topo vira
 * uma faixa em cima. Abrir é girar as faces da tampa em volta da
 * dobradiça, quadro a quadro, e quem decide qual lado da tampa aparece (o
 * de fora ou o avesso) é para onde a face aponta, não um `if`.
 *
 * Cada desenho se divide em duas CAMADAS, a de trás e a da frente, para a
 * abertura em tela cheia pôr a carta entre elas: ela nasce DENTRO do
 * objeto (na frente do fundo, atrás da parede da frente), como saía do
 * envelope de antes.
 *
 * Tudo no quadro de 160×160, com y para BAIXO (como no SVG) e z para TRÁS.
 */
export type Forma = FormaDaRecompensa
export type Camada = 'tudo' | 'tras' | 'frente'

const CamadaAtual = createContext<Camada>('tudo')

/** O que mora numa camada só aparece quando ela é desenhada. */
function Em({ c, children }: { c: Exclude<Camada, 'tudo'>; children: React.ReactNode }) {
  const atual = useContext(CamadaAtual)
  return atual === 'tudo' || atual === c ? <>{children}</> : null
}

type V3 = [number, number, number]
type Transf = (p: V3) => V3

/** Quanto um passo para trás anda na tela: `ox` para a direita, `oy` para cima. */
interface Vista {
  ox: number
  oy: number
}

const soma = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const menos = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cruz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const parado: Transf = (p) => p

/** Gira em volta de uma reta paralela a x, y ou z que passa por `centro`. */
function giro(eixo: 'x' | 'y' | 'z', centro: V3, graus: number): Transf {
  const r = (graus * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return (p) => {
    const [x, y, z] = menos(p, centro)
    const q: V3 = eixo === 'x' ? [x, y * c - z * s, y * s + z * c] : eixo === 'y' ? [x * c + z * s, y, -x * s + z * c] : [x * c - y * s, x * s + y * c, z]
    return soma(q, centro)
  }
}

/**
 * Uma face plana: `o` é o canto de cima à esquerda, `u` e `v` são os passos
 * de uma unidade para a direita e para baixo DENTRO da face, como quem olha
 * para ela de fora. O que vai dentro é desenhado nessas coordenadas locais.
 * A face só aparece se estiver virada para quem olha: `u × v` aponta para
 * dentro do objeto, e é isso que se compara com a direção da vista.
 */
function Face({ vista, t = parado, o, u, v, children }: { vista: Vista; t?: Transf; o: V3; u: V3; v: V3; children: React.ReactNode }) {
  const O = t(o)
  const U = menos(t(soma(o, u)), O)
  const V = menos(t(soma(o, v)), O)
  const n = cruz(U, V)
  if (-n[0] * vista.ox + n[1] * vista.oy + n[2] <= 1e-4) return null
  const tela = (w: V3) => [w[0] + w[2] * vista.ox, w[1] - w[2] * vista.oy]
  const m = [...tela(U), ...tela(V), ...tela(O)].map((x) => +x.toFixed(4)).join(' ')
  return <g transform={`matrix(${m})`}>{children}</g>
}

/**
 * O contorno da mesma cor que cobre a fresta que o antisserrilhado deixa
 * entre duas faces vizinhas — é o mesmo remendo do 3D de CSS, e pelo mesmo
 * motivo. Ele é medido na TELA (`non-scaling-stroke`) e tem a quina
 * redonda: medido na face, a matriz o entortava junto, e a quina em
 * ponta, num paralelogramo fechado, espetava para fora da aresta — eram os
 * pixels sobrando nos lados direitos.
 */
const EMENDA = { strokeWidth: 0.7, strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke' } as const

/** O fundo de uma face, com a emenda. */
function Chapa({ w, h, cor }: { w: number; h: number; cor: string }) {
  return <rect width={w} height={h} fill={cor} stroke={cor} {...EMENDA} />
}

/** Uma caixa reta (que pode girar junto com uma tampa): frente, topo e os
 *  lados que a vista mostrar. */
function Caixa({
  vista,
  t,
  p,
  tam,
  cores,
  frente,
}: {
  vista: Vista
  t?: Transf
  p: V3
  tam: V3
  cores: { frente: string; topo: string; lado: string }
  frente?: React.ReactNode
}) {
  const [x, y, z] = p
  const [w, h, d] = tam
  return (
    <>
      <Face vista={vista} t={t} o={[x, y, z + d]} u={[1, 0, 0]} v={[0, 0, -1]}>
        <Chapa w={w} h={d} cor={cores.topo} />
      </Face>
      <Face vista={vista} t={t} o={[x + w, y, z]} u={[0, 0, 1]} v={[0, 1, 0]}>
        <Chapa w={d} h={h} cor={cores.lado} />
      </Face>
      <Face vista={vista} t={t} o={[x, y, z + d]} u={[0, 0, -1]} v={[0, 1, 0]}>
        <Chapa w={d} h={h} cor={cores.lado} />
      </Face>
      <Face vista={vista} t={t} o={p} u={[1, 0, 0]} v={[0, 1, 0]}>
        <Chapa w={w} h={h} cor={cores.frente} />
        {frente}
      </Face>
    </>
  )
}

// ----------------------------------------------------------- o tempo
const limita = (x: number) => Math.min(1, Math.max(0, x))
/** O trecho [a, b] do tempo, levado para [0, 1]. */
const trecho = (t: number, a: number, b: number) => limita((t - a) / (b - a))
/** Passa um pouco do ponto e volta: é o que faz a tampa "bater" ao abrir. */
const comVolta = (x: number) => {
  const c = 1.5
  return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2
}
const suave = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2)

function semMovimento(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** O andamento da abertura, de 0 (fechado) a 1 (aberto), num laço de quadros. */
export function useAndamento(aberto: boolean, ms: number): number {
  const [t, setT] = useState(aberto ? 1 : 0)
  const atual = useRef(t)
  useEffect(() => {
    const alvo = aberto ? 1 : 0
    if (semMovimento()) {
      atual.current = alvo
      setT(alvo)
      return
    }
    let quadro = 0
    // o relógio é o do PRÓPRIO quadro, desde o primeiro: misturar o
    // `performance.now()` de agora com o horário do quadro (que é o do início
    // dele, e anda mais devagar quando o navegador desacelera as animações)
    // dava um passo negativo, e o andamento saía de [0, 1] — a maleta dava
    // uma cambalhota
    let antes: number | null = null
    const passo = (agora: number) => {
      const dt = antes === null ? 0 : Math.max(0, (agora - antes) / ms)
      antes = agora
      const x = alvo > atual.current ? Math.min(alvo, atual.current + dt) : Math.max(alvo, atual.current - dt)
      atual.current = x
      setT(x)
      if (x !== alvo) quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [aberto, ms])
  return t
}

// ----------------------------------------------------------- a cera
/** A borda da cera: ondas para fora e para dentro, ligadas por curvas. */
function gotas(fora: number, dentro: number, n: number): string {
  const p = Array.from({ length: n * 2 }, (_, i) => {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 ? dentro : fora
    return [Math.cos(a) * r, Math.sin(a) * r]
  })
  const meio = (a: number[], b: number[]) => `${((a[0] + b[0]) / 2).toFixed(2)} ${((a[1] + b[1]) / 2).toFixed(2)}`
  let d = `M ${meio(p[p.length - 1], p[0])}`
  p.forEach((q, i) => {
    d += ` Q ${q[0].toFixed(2)} ${q[1].toFixed(2)} ${meio(q, p[(i + 1) % p.length])}`
  })
  return `${d} Z`
}
const BORDA_DA_CERA = gotas(13.4, 11.8, 11)
// onde a cera do envelope fica: a ponta da aba está em 92
const CERA_Y = 95.5

/** O selo, centrado na origem: sombra, cera vermelha, o anel afundado e a carta. */
function Cera() {
  return (
    <>
      <path d={BORDA_DA_CERA} transform="translate(.6 1.2)" fill="rgba(0,0,0,.25)" />
      <path d={BORDA_DA_CERA} fill="#b8322f" />
      <circle r="9.4" fill="#d0504a" />
      <circle r="8" fill="#9f2724" />
      <rect x="-4" y="-5.5" width="8" height="11" rx="1.6" fill="none" stroke="#fff" strokeWidth="1.6" />
      <path d="M0 -3.2 l2 3.2 -2 3.2 -2 -3.2z" fill="#fff" />
      <path d="M-8.5 -5 A10 10 0 0 1 -1 -9.8" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="1.6" strokeLinecap="round" />
    </>
  )
}

// ---------------------------------------------------------- envelope
// de pé e de frente, com uma borda embaixo de grossura. A aba gira em volta
// da borda de cima: vem para a frente, deita e sobe, mostrando o avesso. Os
// cantos são retos, os de cima e os de baixo: é ali que a aba encosta. A
// cera racha em zigue-zague: a metade de cima vai com a aba
function Envelope({ t }: { t: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const vista = { ox: 0, oy: 0.5 }
  const aba = giro('x', [0, 44, 0], -180 * comVolta(t))
  return (
    <>
      <defs>
        <clipPath id={`cima${id}`}>
          <path d="M-20 -20 H20 V1 l-4 -3 -4 4 -4 -4 -4 4 -4 -4 -4 4 -4 -4 -4 4 -4 -4 -4 3 Z" />
        </clipPath>
        <clipPath id={`baixo${id}`}>
          <path d="M-20 1 l4 -3 4 4 4 -4 4 4 4 -4 4 4 4 -4 4 4 4 -4 4 3 V20 H-20 Z" />
        </clipPath>
      </defs>
      <Em c="tras">
        {/* o lado de dentro, que aparece com a aba aberta */}
        <rect x="22" y="44" width="116" height="88" fill="#7a5a30" />
      </Em>
      <Em c="frente">
        <rect x="22" y="130" width="116" height="6" fill="#8d6a3c" />
        {/* o bolso: as laterais, e a dobra de baixo por cima delas */}
        <path d="M22 44 L80 88 L138 44 V132 H22 Z" fill="#c99d61" />
        <path d="M138 44 V132 L80 89 Z" fill="#bf935a" />
        <path d="M22 132 L80 86 L138 132 Z" fill="#dcb47a" />
        <path d="M31 128 L80 90 L129 128" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="2" strokeLinejoin="round" />
        {/* a sombra da aba no bolso */}
        <path d="M22 44 H138 L80 95 Z" fill="rgba(0,0,0,.14)" opacity={1 - trecho(t, 0, 0.25)} />
        {/* a metade de baixo da cera fica no bolso, parada. O centro da cera
          fica um pouco ABAIXO da ponta da aba: com a racha passando acima
          da ponta, a ponta cobria o pedaço de baixo e abria um buraco no
          meio do selo */}
        <g transform={`translate(80 ${CERA_Y})`}>
          <g clipPath={`url(#baixo${id})`}>
            <Cera />
          </g>
        </g>
        {/* a aba: o lado de fora, com a outra metade da cera, e o avesso */}
        <Face vista={vista} t={aba} o={[22, 44, 0]} u={[1, 0, 0]} v={[0, 1, 0]}>
          <path d="M0 0 H116 L58 48 Z" fill="#e6c38a" stroke="#e6c38a" {...EMENDA} />
          <path d="M6 3 H110" stroke="rgba(255,255,255,.35)" strokeWidth="3" strokeLinecap="round" />
          <g transform={`translate(58 ${CERA_Y - 44})`}>
            <g clipPath={`url(#cima${id})`}>
              <Cera />
            </g>
          </g>
        </Face>
      </Em>
      <Em c="tras">
        {/* o avesso. A meia cera continua presa do lado de fora, e com a aba
          lá em cima, virada para trás, ela aparece atrás da ponta: é o
          verso da cera, liso, e o triângulo vem por cima dele */}
        <Face vista={vista} t={aba} o={[138, 44, 0]} u={[-1, 0, 0]} v={[0, 1, 0]}>
          <g transform={`translate(58 ${CERA_Y - 44})`}>
            <g clipPath={`url(#cima${id})`}>
              <path d={BORDA_DA_CERA} fill="#8c2220" />
            </g>
          </g>
          <path d="M0 0 H116 L58 48 Z" fill="#a98049" stroke="#a98049" {...EMENDA} />
        </Face>
      </Em>
    </>
  )
}

// ------------------------------------------------------------ pacote
// caixa de papelão com o barbante em cruz, e só as faixas: o laço saiu. As
// duas abas giram em volta das bordas de fora da tampa, uma logo depois da
// outra, e caem para fora
function Pacote({ t }: { t: number }) {
  // vista só um pouco da direita: mais de lado, a aba da direita aberta
  // fica de quina para quem olha e vira uma linha
  const vista = { ox: 0.15, oy: 0.5 }
  const barbante = '#f3e6c4'
  const ABERTA = 125
  const abaE = giro('z', [24, 70, 0], -ABERTA * comVolta(trecho(t, 0, 0.85)))
  const abaD = giro('z', [136, 70, 0], ABERTA * comVolta(trecho(t, 0.15, 1)))
  // a aba, como ela é de fora: o barbante cruza no meio da profundidade, e a
  // perna de frente para trás corre na borda de dentro
  const abaDeFora = (cor: string) => (
    <>
      <Chapa w={56} h={48} cor={cor} />
      <rect x="0" y="22" width="56" height="5" fill={barbante} />
      <rect x="53" y="0" width="3" height="48" fill={barbante} />
    </>
  )
  // um pouco para a esquerda: a vista de lado empurra o fundo para a direita
  return (
    <g transform="translate(-4 0)">
      <Em c="tras">
        {/* por dentro: a parede de trás, escurecendo para o fundo, e a da
          esquerda, que a vista de lado mostra */}
        <Face vista={vista} o={[24, 70, 48]} u={[1, 0, 0]} v={[0, 1, 0]}>
          <Chapa w={112} h={66} cor="#5a3d20" />
          <rect width="112" height="9" fill="#46301a" />
        </Face>
        <Face vista={vista} o={[24, 70, 0]} u={[0, 0, 1]} v={[0, 1, 0]}>
          <Chapa w={48} h={66} cor="#6b4a28" />
        </Face>
        {/* as abas: de fora com o barbante, e o avesso liso. A da esquerda
          mora atrás da carta que sai: aberta, fica para o lado, e fechada
          não há carta nenhuma */}
        <Face vista={vista} t={abaE} o={[24, 70, 48]} u={[1, 0, 0]} v={[0, 0, -1]}>
          {abaDeFora('#dcae74')}
        </Face>
        <Face vista={vista} t={abaE} o={[80, 70, 48]} u={[-1, 0, 0]} v={[0, 0, -1]}>
          <Chapa w={56} h={48} cor="#a8753f" />
        </Face>
      </Em>
      <Em c="frente">
        {/* a lateral, com as duas faixas que dão a volta */}
        <Face vista={vista} o={[136, 70, 0]} u={[0, 0, 1]} v={[0, 1, 0]}>
          <Chapa w={48} h={66} cor="#a8763f" />
          <rect x="21.5" y="0" width="5" height="66" fill="#e0d2ae" />
          <rect x="0" y="29" width="48" height="6" fill="#e0d2ae" />
        </Face>
        {/* a aba da direita vem DEPOIS da lateral: a vista é da direita, e
          aberta ela cai para fora, na frente da lateral. Na camada de trás,
          a lateral a cobria. A carta sai pelo meio, longe dela */}
        <Face vista={vista} t={abaD} o={[136, 70, 0]} u={[-1, 0, 0]} v={[0, 0, 1]}>
          {abaDeFora('#d8a96f')}
        </Face>
        <Face vista={vista} t={abaD} o={[80, 70, 0]} u={[1, 0, 0]} v={[0, 0, 1]}>
          <Chapa w={56} h={48} cor="#9c6c38" />
        </Face>
        {/* a frente */}
        <Face vista={vista} o={[24, 70, 0]} u={[1, 0, 0]} v={[0, 1, 0]}>
          <Chapa w={112} h={66} cor="#c8955a" />
          <rect x="0" y="0" width="112" height="2" fill="#dcae74" />
          <rect x="53" y="0" width="6" height="66" fill={barbante} />
          <rect x="0" y="29" width="112" height="6" fill={barbante} />
          <g transform="rotate(-4 24 49)">
            <rect x="10" y="41" width="28" height="17" rx="2" fill="#f7f2e4" />
            <path d="M14 46 h18 M14 50 h14 M14 54 h17" stroke="#cfc3a6" strokeWidth="1.4" />
          </g>
        </Face>
      </Em>
    </g>
  )
}

// ------------------------------------------------------------ maleta
// duas metades de couro, uma atrás da outra, presas pela emenda de baixo.
// Ao abrir, cada uma tomba POUCO para o seu lado — o bastante para ver o
// forro pela fresta de cima. Sem trancas por enquanto: as que foram
// tentadas (com volume, placa larga, tira fina) estão no /lab/museu
function Maleta({ t }: { t: number }) {
  const vista = { ox: 0.3, oy: 0.5 }
  const a = 15 * comVolta(t)
  const frente = giro('x', [0, 136, 12], a)
  const tras = giro('x', [0, 136, 12], -a)
  // a alça é uma fatia desenhada várias vezes, de trás para a frente, para
  // ter grossura sem vão: com só duas camadas, o topo da maleta aparecia
  // entre elas
  const alca = [20, 19.5, 19, 18.5, 18, 17.5, 17, 16.5, 16].map((z, i, todas) => (
    <Face key={z} vista={vista} t={tras} o={[18, 58, z]} u={[1, 0, 0]} v={[0, 1, 0]}>
      <path d="M48 0.5 V-11 Q48 -17 54 -17 H70 Q76 -17 76 -11 V0.5" fill="none" stroke={i === todas.length - 1 ? '#6a4128' : '#4c2e1b'} strokeWidth="6.5" />
    </Face>
  ))
  return (
    <>
      <Em c="tras">
        {/* a metade de trás: o topo, a alça e o forro, que só aparece na
          fresta */}
        <Face vista={vista} t={tras} o={[18, 58, 24]} u={[1, 0, 0]} v={[0, 0, -1]}>
          <Chapa w={124} h={12} cor="#b57b52" />
        </Face>
        {alca}
        <Face vista={vista} t={tras} o={[142, 58, 12]} u={[0, 0, 1]} v={[0, 1, 0]}>
          <Chapa w={12} h={78} cor="#74482d" />
        </Face>
        <Face vista={vista} t={tras} o={[18, 58, 12]} u={[1, 0, 0]} v={[0, 1, 0]}>
          <Chapa w={124} h={78} cor="#8a5636" />
          <rect x="5" y="5" width="114" height="68" rx="6" fill="#3e261a" />
        </Face>
      </Em>
      <Em c="frente">
        {/* a metade da frente */}
        <Face vista={vista} t={frente} o={[142, 58, 12]} u={[-1, 0, 0]} v={[0, 1, 0]}>
          <Chapa w={124} h={78} cor="#8a5636" />
          <rect x="5" y="5" width="114" height="68" rx="6" fill="#4a2e20" />
        </Face>
        <Face vista={vista} t={frente} o={[18, 58, 12]} u={[1, 0, 0]} v={[0, 0, -1]}>
          <Chapa w={124} h={12} cor="#bf855b" />
        </Face>
        <Face vista={vista} t={frente} o={[142, 58, 0]} u={[0, 0, 1]} v={[0, 1, 0]}>
          <Chapa w={12} h={78} cor="#7c4d30" />
        </Face>
        <Face vista={vista} t={frente} o={[18, 58, 0]} u={[1, 0, 0]} v={[0, 1, 0]}>
          <Chapa w={124} h={78} cor="#9a6440" />
          <rect x="9" y="9" width="106" height="60" rx="6" fill="none" stroke="#d6a47a" strokeOpacity=".65" strokeWidth="1.6" strokeDasharray="4 3" />
        </Face>
      </Em>
    </>
  )
}

// ------------------------------------------------------------- cofre
// aço visto um pouco da direita: frente, lateral e topo, com cantos retos
// onde as faces se encontram. A porta é uma chapa grossa saltada da frente,
// presa pela borda esquerda. Antes de abrir, o segredo gira e a manivela
// vira; aí a porta gira para fora e mostra o avesso, liso. Tudo de canto
// reto: a porta arredondada não encaixava nas bordas retas da chapa
function Cofre({ t }: { t: number }) {
  const vista = { ox: 0.35, oy: 0.45 }
  const porta = giro('y', [33, 0, 0], 95 * comVolta(trecho(t, 0.45, 1)))
  const segredo = -540 * suave(trecho(t, 0, 0.36))
  const manivela = 90 * suave(trecho(t, 0.3, 0.44))
  const ouro = { frente: '#e5ad25', topo: '#ffd660', lado: '#b8861a' }
  const maco = { frente: '#5f9a4c', topo: '#7fbf69', lado: '#4a7a3b' }
  const cinta = <rect x="8" y="0" width="6" height="9" fill="#f1ead6" />
  const pe = { frente: '#2f3338', topo: '#3b4046', lado: '#24272b' }
  // o cofre vai um pouco para a direita: a porta aberta precisa de lugar
  return (
    <g transform="translate(8 0)">
      <Em c="tras">
        {/* os pés, os de trás antes */}
        <Caixa vista={vista} p={[32, 130, 28]} tam={[16, 9, 12]} cores={pe} />
        <Caixa vista={vista} p={[100, 130, 28]} tam={[16, 9, 12]} cores={pe} />
        <Caixa vista={vista} p={[32, 130, 4]} tam={[16, 9, 12]} cores={pe} />
        <Caixa vista={vista} p={[100, 130, 4]} tam={[16, 9, 12]} cores={pe} />
        {/* por dentro: o fundo, a parede da esquerda, o chão e o que se guarda */}
        <Face vista={vista} o={[33, 47, 40]} u={[1, 0, 0]} v={[0, 1, 0]}>
          <Chapa w={82} h={76} cor="#24282d" />
        </Face>
        <Face vista={vista} o={[33, 47, 0]} u={[0, 0, 1]} v={[0, 1, 0]}>
          <Chapa w={40} h={76} cor="#33383e" />
        </Face>
        <Face vista={vista} o={[33, 123, 40]} u={[1, 0, 0]} v={[0, 0, -1]}>
          <Chapa w={82} h={40} cor="#454b53" />
        </Face>
        <Caixa vista={vista} p={[33, 84, 6]} tam={[82, 5, 34]} cores={{ frente: '#4b5159', topo: '#6a717a', lado: '#3c4148' }} />
        <Caixa vista={vista} p={[50, 70, 20]} tam={[20, 7, 11]} cores={ouro} />
        <Caixa vista={vista} p={[44, 77, 18]} tam={[20, 7, 11]} cores={ouro} />
        <Caixa vista={vista} p={[68, 77, 18]} tam={[20, 7, 11]} cores={ouro} />
        <Caixa vista={vista} p={[56, 105, 16]} tam={[22, 9, 14]} cores={maco} frente={cinta} />
        <Caixa vista={vista} p={[42, 114, 10]} tam={[22, 9, 14]} cores={maco} frente={cinta} />
        <Caixa vista={vista} p={[70, 114, 10]} tam={[22, 9, 14]} cores={maco} frente={cinta} />
      </Em>
      <Em c="frente">
        {/* o corpo: topo, lateral, e a frente com a boca vazada */}
        <Face vista={vista} o={[26, 40, 44]} u={[1, 0, 0]} v={[0, 0, -1]}>
          <Chapa w={96} h={44} cor="#9aa2ac" />
        </Face>
        <Face vista={vista} o={[122, 40, 0]} u={[0, 0, 1]} v={[0, 1, 0]}>
          <Chapa w={44} h={90} cor="#555c65" />
        </Face>
        <Face vista={vista} o={[26, 40, 0]} u={[1, 0, 0]} v={[0, 1, 0]}>
          <path d="M0 0 H96 V90 H0 Z M7 7 V83 H89 V7 Z" fill="#747c87" fillRule="evenodd" stroke="#747c87" {...EMENDA} />
          {/* as dobradiças, no batente da esquerda */}
          <rect x="2" y="16" width="5" height="13" rx="2" fill="#4a5058" />
          <rect x="2" y="61" width="5" height="13" rx="2" fill="#4a5058" />
        </Face>
        {/* a porta: as bordas da chapa, a frente com o segredo e o avesso */}
        <Face vista={vista} t={porta} o={[33, 47, 0]} u={[1, 0, 0]} v={[0, 0, -1]}>
          <Chapa w={82} h={6} cor="#a3abb5" />
        </Face>
        <Face vista={vista} t={porta} o={[115, 47, -6]} u={[0, 0, 1]} v={[0, 1, 0]}>
          <Chapa w={6} h={76} cor="#5d646d" />
        </Face>
        <Face vista={vista} t={porta} o={[33, 47, 0]} u={[0, 0, -1]} v={[0, 1, 0]}>
          <Chapa w={6} h={76} cor="#5d646d" />
        </Face>
        <Face vista={vista} t={porta} o={[33, 47, -6]} u={[1, 0, 0]} v={[0, 1, 0]}>
          <Chapa w={82} h={76} cor="#808995" />
          <rect x="4" y="4" width="74" height="68" fill="none" stroke="#6b737e" strokeWidth="2" />
          {[
            [9, 9],
            [73, 9],
            [9, 67],
            [73, 67],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill="#a3abb5" />
          ))}
          <circle cx="35" cy="38" r="19" fill="#a9b0b8" />
          <g transform={`rotate(${segredo} 35 38)`}>
            <circle cx="35" cy="38" r="15.5" fill="#3a3f46" />
            <circle cx="35" cy="38" r="15.5" fill="none" stroke="#c9ced4" strokeWidth="2.4" strokeDasharray="1.4 4.4" />
            <rect x="33.5" y="23.5" width="3" height="5.5" rx="1.5" fill="#e5ad25" />
          </g>
          <circle cx="35" cy="38" r="4.6" fill="#a9b0b8" />
          <rect x="64" y="23" width="7" height="30" rx="3.5" fill="#cfd4da" transform={`rotate(${manivela} 67.5 38)`} />
        </Face>
        <Face vista={vista} t={porta} o={[115, 47, 0]} u={[-1, 0, 0]} v={[0, 1, 0]}>
          <Chapa w={82} h={76} cor="#8d959f" />
          <rect x="8" y="8" width="66" height="60" fill="none" stroke="#a5adb7" strokeWidth="1.6" />
        </Face>
      </Em>
    </g>
  )
}

// ----------------------------------------------------------- abóbora
// a recompensa da temporada de Halloween (v0.30): a abóbora de lanterna,
// chapada, em gomos. A TAMPA é o topo cortado em zigue-zague, com o cabo: ao
// abrir ela sobe e tomba para a esquerda, e o rosto acende por dentro. A
// carta sai do buraco de cima — o buraco (o escuro e a borda de trás) mora na
// camada de trás, e o corpo na da frente, cortado na linha da tampa
const GOMOS: { cx: number; rx: number; cor: string }[] = [
  { cx: 50, rx: 28, cor: '#c9611c' },
  { cx: 110, rx: 28, cor: '#c9611c' },
  { cx: 64, rx: 26, cor: '#dc6f22' },
  { cx: 96, rx: 26, cor: '#dc6f22' },
  { cx: 80, rx: 22, cor: '#ec8433' },
]

/** A beirada da frente do corte: a metade de baixo de uma elipse, em dentes. */
function corteDaTampa(): string {
  const n = 12
  let d = 'M48 74'
  for (let i = 1; i <= n; i += 1) {
    const a = Math.PI - (Math.PI * i) / n
    const k = i % 2 ? 0.55 : 1
    d += ` L${(80 + Math.cos(a) * 32).toFixed(2)} ${(74 + Math.sin(a) * 9 * k).toFixed(2)}`
  }
  return d
}

function Abobora({ t }: { t: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const e = suave(trecho(t, 0, 0.85))
  const luz = trecho(t, 0.2, 0.7)
  const gomos = GOMOS.map((g) => <ellipse key={g.cx} cx={g.cx} cy="104" rx={g.rx} ry="40" fill={g.cor} />)
  const rosto = (cor: string, opacidade = 1) => (
    <g fill={cor} opacity={opacidade}>
      <path d="M58 96 L68 84 L74 98 Z" />
      <path d="M102 96 L92 84 L86 98 Z" />
      <path d="M77 104 L80 98 L83 104 Z" />
      <path d="M56 114 Q80 132 104 114 L99 116 L95 112 L90 118 L85 113 L80 119 L75 113 L70 118 L65 112 L61 116 Z" />
    </g>
  )
  return (
    <>
      <defs>
        {/* o corpo sem a tampa (evenodd: o retângulo menos a tampa), e a
            tampa sozinha */}
        <clipPath id={`corpo${id}`}>
          <path d={`M0 0 H160 V160 H0 Z ${corteDaTampa()} L112 40 L48 40 Z`} clipRule="evenodd" />
        </clipPath>
        <clipPath id={`tampa${id}`}>
          <path d={`${corteDaTampa()} L112 40 L48 40 Z`} />
        </clipPath>
      </defs>
      <Em c="tras">
        {/* o buraco, de fora para dentro: a casca da borda de trás, a POLPA
            do corte (a faixa clara), a parede de dentro, alaranjada e funda,
            e o escuro do fundo. A carta sai dali, entre esta camada e a da
            frente, então a borda da frente a cobre na hora de sair */}
        <ellipse cx="80" cy="73" rx="33" ry="10.5" fill="#c9611c" />
        <ellipse cx="80" cy="73.6" rx="31" ry="9.2" fill="#f6c477" />
        <ellipse cx="80" cy="74.6" rx="28.6" ry="7.8" fill="#b4541a" />
        <ellipse cx="80" cy="76.4" rx="24" ry="5.4" fill="#4a210b" />
        <ellipse cx="80" cy="77.4" rx="17" ry="3.4" fill="#2a1206" />
      </Em>
      <Em c="frente">
        <g clipPath={`url(#corpo${id})`}>
          {gomos}
          {/* a polpa na beirada do corte, por dentro da casca */}
          <path d={corteDaTampa()} fill="none" stroke="#f6c477" strokeWidth="2.6" strokeLinejoin="round" transform="translate(0 1.2)" />
          {rosto('#3a2410')}
          {/* acesa: a vela de dentro aparecendo pelos furos */}
          {rosto('#ffcf4a', luz)}
        </g>
        {/* a tampa sobe um pouco, tomba para a esquerda e CAI no chão, do
            lado da abóbora (v0.31): parada no alto, ela batia na carta que
            sai. O salto é um arco: sobe primeiro, desce depois */}
        <g transform={`translate(${-64 * e} ${62 * e - 30 * Math.sin(Math.PI * e)}) rotate(${-78 * e} 80 66)`}>
          <g clipPath={`url(#tampa${id})`}>{gomos}</g>
          <path d={corteDaTampa()} fill="none" stroke="#f6c477" strokeWidth="2" strokeLinejoin="round" />
          <path d="M78 66 C77 58 79 52 85 49 L88 52 C84 55 83 60 84 66 Z" fill="#5b7a2e" />
        </g>
      </Em>
    </>
  )
}

const DESENHOS: Record<Forma, (p: { t: number }) => React.JSX.Element> = {
  envelope: Envelope,
  pacote: Pacote,
  maleta: Maleta,
  cofre: Cofre,
  abobora: Abobora,
}

/** Quanto dura a abertura de cada um. O cofre é o mais lento: antes de a
 *  porta abrir, o segredo gira e a manivela vira. */
export const DURACAO: Record<Forma, number> = { envelope: 750, pacote: 950, maleta: 650, cofre: 1700, abobora: 900 }

/**
 * O desenho de uma recompensa, de 0 (fechado) a 1 (aberto). Sem animação
 * própria: quem anda com o `t` é quem chama (`useAndamento`), e é assim que
 * as duas camadas da abertura giram juntas.
 */
export function DesenhoDaRecompensa({
  forma,
  t,
  camada = 'tudo',
  className,
  viewBox = '0 0 160 160',
}: {
  forma: Forma
  t: number
  camada?: Camada
  className?: string
  viewBox?: string
}) {
  const Desenho = DESENHOS[forma]
  return (
    <svg viewBox={viewBox} className={className} overflow="visible" aria-hidden>
      <CamadaAtual.Provider value={camada}>
        <Desenho t={t} />
      </CamadaAtual.Provider>
    </svg>
  )
}
