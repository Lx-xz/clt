'use client'

import { useId } from 'react'
import styles from './chapados.module.sass'

/**
 * A segunda proposta da escada: os mesmos quatro objetos, CHAPADOS, no jeito
 * dos baús do Duolingo. Não há 3D nenhum: é SVG de cor lisa, e quem dá o
 * volume é a vista um pouco de cima (a tampa aparece como uma faixa mais
 * clara) e dois ou três tons por peça. A abertura também é de mentira: a
 * peça que "gira" encolhe até a dobradiça e a do outro lado cresce dela, e
 * o olho completa o giro.
 *
 * Tudo é desenhado num quadro de 160×160, com o chão em y 146.
 */
export type TipoChapado = 'envelope' | 'pacote' | 'maleta' | 'cofre'

// a estrelinha de quatro pontas do brilho
const ESTRELA = 'M0 -7 Q1.2 -1.2 7 0 Q1.2 1.2 0 7 Q-1.2 1.2 -7 0 Q-1.2 -1.2 0 -7 Z'

/** A luz que sai de dentro e as estrelinhas em volta: aparecem ao abrir. */
function Brilho({ x, y, cor, estrelas }: { x: number; y: number; cor: string; estrelas: [number, number, number][] }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <g className={styles.brilho}>
      <defs>
        <radialGradient id={`luz${id}`}>
          <stop offset="0" stopColor={cor} stopOpacity=".95" />
          <stop offset=".45" stopColor={cor} stopOpacity=".45" />
          <stop offset="1" stopColor={cor} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`raio${id}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={cor} stopOpacity=".7" />
          <stop offset="1" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* o facho que sobe da boca, em leque */}
      <path d={`M ${x - 22} ${y} L ${x - 60} ${y - 120} L ${x + 60} ${y - 120} L ${x + 22} ${y} Z`} fill={`url(#raio${id})`} className={styles.facho} />
      <circle cx={x} cy={y - 8} r="46" fill={`url(#luz${id})`} className={styles.luz} />
      {estrelas.map(([ex, ey, t], i) => (
        <path
          key={i}
          d={ESTRELA}
          fill="#fff"
          className={styles.estrela}
          style={{ '--x': `${ex}px`, '--y': `${ey}px`, '--t': t, animationDelay: `${0.35 + i * 0.12}s` } as React.CSSProperties}
        />
      ))}
    </g>
  )
}

/** A carta que sobe de dentro: papel com o topo na cor da raridade. */
function Premio({ x, y, cor }: { x: number; y: number; cor: string }) {
  return (
    <g className={styles.premio}>
      <rect x={x - 15} y={y} width="30" height="42" rx="4" fill="#fbf7ec" />
      <rect x={x - 15} y={y} width="30" height="14" rx="4" fill={cor} />
      <rect x={x - 15} y={y + 9} width="30" height="5" fill={cor} />
      <rect x={x - 9} y={y + 20} width="18" height="3" rx="1.5" fill="#d8cfbb" />
      <rect x={x - 9} y={y + 27} width="13" height="3" rx="1.5" fill="#d8cfbb" />
    </g>
  )
}

/** A borda da cera: ondas alternando para fora e para dentro, ligadas por
 *  curvas — a cera que escorreu antes de o carimbo descer. */
function gotas(cx: number, cy: number, fora: number, dentro: number, n: number): string {
  const p = Array.from({ length: n * 2 }, (_, i) => {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 ? dentro : fora
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
  })
  const meio = (a: number[], b: number[]) => `${((a[0] + b[0]) / 2).toFixed(2)} ${((a[1] + b[1]) / 2).toFixed(2)}`
  let d = `M ${meio(p[p.length - 1], p[0])}`
  p.forEach((q, i) => {
    d += ` Q ${q[0].toFixed(2)} ${q[1].toFixed(2)} ${meio(q, p[(i + 1) % p.length])}`
  })
  return `${d} Z`
}

/** O chão: a sombra achatada embaixo de tudo. */
function Chao({ largura = 56 }: { largura?: number }) {
  return <ellipse cx="80" cy="146" rx={largura} ry="7" fill="rgba(0,0,0,.13)" />
}

// ------------------------------------------------------------- envelope
// de frente, como o do jogo, e com espessura: a borda escura embaixo. A aba
// vira para cima, e a cera racha: a metade de cima vai
// com a aba e some do lado de fora dela; a de baixo fica e entorta
function Envelope() {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const cera = (
    <>
      <path d={gotas(80.6, 92.2, 13.4, 11.8, 11)} fill="rgba(0,0,0,.25)" />
      <path d={gotas(80, 91, 13.4, 11.8, 11)} fill="#8f8a84" />
      <circle cx="80" cy="91" r="9.4" fill="#aaa59e" />
      <circle cx="80" cy="91" r="8" fill="#7d7872" />
      <rect x="76" y="85.5" width="8" height="11" rx="1.6" fill="none" stroke="#fff" strokeWidth="1.6" />
      <path d="M80 87.8 l2 3.2 -2 3.2 -2 -3.2z" fill="#fff" />
      <path d="M71.5 86 A10 10 0 0 1 79 81.2" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="1.6" strokeLinecap="round" />
    </>
  )
  return (
    <>
      <defs>
        <clipPath id={`cima${id}`}>
          <path d="M60 60 H100 V92 l-4 -3 -4 4 -4 -4 -4 4 -4 -4 -4 4 -4 -4 -4 4 -4 -3z" />
        </clipPath>
        <clipPath id={`baixo${id}`}>
          <path d="M60 93 l4 -3 4 4 4 -4 4 4 4 -4 4 4 4 -4 4 4 4 -4 4 3 V120 H60z" />
        </clipPath>
      </defs>
      <Chao largura={60} />
      <Brilho x={80} y={56} cor="#ffe9a8" estrelas={[[34, 30, 1], [126, 22, 0.8], [112, 64, 0.6], [48, 72, 0.7]]} />
      {/* a borda do papel, embaixo: é ela que dá a grossura */}
      <rect x="22" y="50" width="116" height="88" rx="6" fill="#8d6a3c" />
      {/* o lado de dentro, que só aparece com a aba aberta */}
      <rect x="22" y="44" width="116" height="88" rx="6" fill="#7a5a30" />
      {/* a aba aberta mora ATRÁS da carta, e a fechada na frente do bolso:
          SVG não tem z-index, e a mesma aba não pode estar nos dois lugares.
          A fechada encolhe até a dobra, e a aberta cresce dela para cima */}
      <path d="M22 44 H138 L85 8 Q80 5 75 8 Z" fill="#a98049" stroke="#a98049" strokeWidth="2" strokeLinejoin="round" className={styles.abaAbertaEnv} />
      <Premio x={80} y={56} cor="#5b8fd6" />
      {/* o bolso: as laterais, e a dobra de baixo por cima delas */}
      <path d="M22 50 Q22 44 27 47 L80 88 L133 47 Q138 44 138 50 V126 Q138 132 132 132 H28 Q22 132 22 126 Z" fill="#c99d61" />
      <path d="M138 50 V126 Q138 132 132 132 L80 90 Z" fill="#bf935a" />
      <path d="M22 132 Q22 128 26 125 L78 86 Q80 84.6 82 86 L134 125 Q138 128 138 132 Z" fill="#dcb47a" />
      <path d="M30 129 L80 92 L130 129" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="2" strokeLinejoin="round" />
      {/* a sombra da aba no bolso, que some ao abrir */}
      <path d="M22 48 H138 L84 96 Q80 99 76 96 Z" fill="rgba(0,0,0,.14)" className={styles.someAoAbrir} />
      <g className={styles.abaEnvelope}>
        <path d="M22 50 Q22 44 28 44 H132 Q138 44 138 50 L84 92 Q80 95 76 92 Z" fill="#e6c38a" />
        <path d="M28 47.5 H132" stroke="rgba(255,255,255,.35)" strokeWidth="3" strokeLinecap="round" className={styles.someAoAbrir} />
        <g clipPath={`url(#cima${id})`} className={styles.someAoAbrir}>
          {cera}
        </g>
      </g>
      <g clipPath={`url(#baixo${id})`}>
        <g className={styles.ceraQueFica}>{cera}</g>
      </g>
    </>
  )
}

// --------------------------------------------------------------- pacote
// caixa de papelão vista um pouco de cima: a frente e a faixa da tampa. Ao
// abrir, cada aba encolhe até a dobra de fora e renasce do outro lado dela,
// já aberta, levando a sua metade do laço
function Pacote() {
  const barbante = '#f3e6c4'
  return (
    <>
      <Chao />
      <Brilho x={80} y={60} cor="#ffe9a8" estrelas={[[26, 24, 0.8], [134, 30, 1], [118, 70, 0.6], [40, 66, 0.6]]} />
      {/* a boca: a parede de trás por dentro, mais escura, e o fundo */}
      <path d="M34 44 H126 L136 70 H24 Z" fill="#6b4a28" stroke="#6b4a28" strokeWidth="4" strokeLinejoin="round" />
      <path d="M34 44 H126 L130 56 H30 Z" fill="#4e341b" />
      <Premio x={80} y={74} cor="#a35bd6" />
      {/* a frente */}
      <path d="M24 72 Q24 70 26 70 H134 Q136 70 136 72 V128 Q136 136 128 136 H32 Q24 136 24 128 Z" fill="#c8955a" />
      <path d="M24 71 H136" stroke="#e7bf87" strokeWidth="2.4" />
      <rect x="77" y="70" width="6" height="66" fill={barbante} />
      <rect x="24" y="99" width="112" height="6" fill={barbante} />
      <rect x="34" y="111" width="28" height="17" rx="2" fill="#f7f2e4" transform="rotate(-4 48 119)" />
      <path d="M38 116 h18 M38 120 h14 M38 124 h17" stroke="#cfc3a6" strokeWidth="1.4" transform="rotate(-4 48 119)" />
      {/* fechado: as duas abas deitadas, com o barbante em cruz e o laço */}
      <g className={`${styles.abaFechada} ${styles.abaFechadaE}`}>
        <path d="M34 44 H80 V70 H24 Z" fill="#dcae74" stroke="#dcae74" strokeWidth="4" strokeLinejoin="round" />
        <path d="M78 44 H80 V70 H76 Z" fill={barbante} />
        <path d="M29 55 H80 V59 H28 Z" fill={barbante} />
      </g>
      <g className={`${styles.abaFechada} ${styles.abaFechadaD}`}>
        <path d="M80 44 H126 L136 70 H80 Z" fill="#d6a76b" stroke="#d6a76b" strokeWidth="4" strokeLinejoin="round" />
        <path d="M80 44 H82 L84 70 H80 Z" fill={barbante} />
        <path d="M80 55 H131 L132 59 H80 Z" fill={barbante} />
      </g>
      <g className={styles.lacoFechado}>
        <ellipse cx="70" cy="49" rx="9" ry="5.5" transform="rotate(-18 70 49)" fill="none" stroke={barbante} strokeWidth="4" />
        <ellipse cx="90" cy="49" rx="9" ry="5.5" transform="rotate(18 90 49)" fill="none" stroke={barbante} strokeWidth="4" />
        <path d="M78 58 l-6 9 M82 58 l6 9" stroke={barbante} strokeWidth="3.4" strokeLinecap="round" />
        <circle cx="80" cy="56" r="4.6" fill="#e6d4ac" />
      </g>
      {/* aberto: as abas em pé, inclinadas para fora, mostrando o avesso,
          cada uma com meio laço na ponta */}
      <g className={`${styles.abaAberta} ${styles.abaAbertaE}`}>
        <path d="M34 44 L24 70 L6 46 L17 20 Z" fill="#a8753f" stroke="#a8753f" strokeWidth="4" strokeLinejoin="round" />
        <ellipse cx="9" cy="30" rx="7" ry="4.5" transform="rotate(-60 9 30)" fill="none" stroke={barbante} strokeWidth="3.6" />
        <circle cx="12" cy="34" r="3" fill="#e6d4ac" />
      </g>
      <g className={`${styles.abaAberta} ${styles.abaAbertaD}`}>
        <path d="M126 44 L136 70 L154 46 L143 20 Z" fill="#9c6c38" stroke="#9c6c38" strokeWidth="4" strokeLinejoin="round" />
        <ellipse cx="151" cy="30" rx="7" ry="4.5" transform="rotate(60 151 30)" fill="none" stroke={barbante} strokeWidth="3.6" />
        <circle cx="148" cy="34" r="3" fill="#e6d4ac" />
      </g>
    </>
  )
}

// --------------------------------------------------------------- maleta
// couro liso, pesponto, cantoneiras e ferrolhos de FERRO em cima. Ao
// abrir, a metade de trás sobe e mostra o forro, levando a alça; os
// ferrolhos ficam na borda da metade da frente
function Maleta() {
  const ferro = '#8a9097'
  const ferroClaro = '#b4bac1'
  const ferrolho = (x: number, y: number) => (
    <g key={x}>
      <rect x={x} y={y} width="16" height="10" rx="2.5" fill={ferro} />
      <rect x={x} y={y} width="16" height="3.4" rx="1.7" fill={ferroClaro} />
      <circle cx={x + 8} cy={y + 6.4} r="1.6" fill="#3a3f45" />
    </g>
  )
  return (
    <>
      <Chao largura={64} />
      <Brilho x={80} y={60} cor="#ffe9a8" estrelas={[[24, 26, 0.8], [136, 22, 1], [128, 70, 0.6], [32, 70, 0.6]]} />
      {/* aberto: a metade de trás em pé, com o forro para quem olha */}
      <g className={styles.costasDaMaleta}>
        <path d="M30 60 L36 18 Q37 13 42 13 H118 Q123 13 124 18 L130 60 Z" fill="#8a5636" />
        <path d="M38 58 L42 23 Q42.6 20 46 20 H114 Q117.4 20 118 23 L122 58 Z" fill="#3e261a" />
        <path d="M44 56 L47 27 H113 L116 56" fill="none" stroke="#5a3a28" strokeWidth="1.4" strokeDasharray="3 3" />
        <path d="M66 14 V7 Q66 3 70 3 H90 Q94 3 94 7 V14" fill="none" stroke="#5f3a24" strokeWidth="6" strokeLinecap="round" />
        <rect x="40" y="9" width="12" height="6" rx="2" fill={ferro} />
        <rect x="108" y="9" width="12" height="6" rx="2" fill={ferro} />
      </g>
      <Premio x={80} y={64} cor="#e0a92a" />
      {/* a frente */}
      <rect x="18" y="58" width="124" height="78" rx="12" fill="#9a6440" />
      <rect x="27" y="67" width="106" height="60" rx="8" fill="none" stroke="#d6a47a" strokeOpacity=".65" strokeWidth="1.6" strokeDasharray="4 3" />
      {/* as cantoneiras de ferro nos cantos de baixo */}
      <path d="M18 120 V124 Q18 136 30 136 H34 V130 H30 Q24 130 24 124 V120 Z" fill={ferro} />
      <path d="M142 120 V124 Q142 136 130 136 H126 V130 H130 Q136 130 136 124 V120 Z" fill={ferro} />
      <path d="M22 60 H138" stroke="#b47b55" strokeWidth="3" strokeLinecap="round" />
      {/* fechado: a faixa de cima, as duas metades, a alça e os ferrolhos */}
      <g className={styles.topoDaMaleta}>
        <path d="M27 46 H133 L142 59 H18 Z" fill="#b57b52" stroke="#b57b52" strokeWidth="4" strokeLinejoin="round" />
        <path d="M23 53 H137" stroke="#7e4f31" strokeWidth="1.6" />
        <path d="M64 49 V37 Q64 31 70 31 H90 Q96 31 96 37 V49" fill="none" stroke="#5f3a24" strokeWidth="7" strokeLinecap="round" />
        <path d="M67 36 Q68 34 71 34" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="2" strokeLinecap="round" />
        <rect x="58" y="46" width="12" height="5" rx="2" fill={ferro} />
        <rect x="90" y="46" width="12" height="5" rx="2" fill={ferro} />
        {ferrolho(34, 48)}
        {ferrolho(110, 48)}
      </g>
      {/* aberto: só a beirada da metade da frente, com os ferrolhos soltos */}
      <g className={styles.beiradaDaMaleta}>
        {ferrolho(34, 52)}
        {ferrolho(110, 52)}
      </g>
    </>
  )
}

// ---------------------------------------------------------------- cofre
// aço de três quartos: frente, lateral e topo, pés escuros, o segredo e a
// manivela. A porta encolhe até a dobradiça e renasce aberta do outro lado,
// mostrando o avesso com os pinos das trancas; dentro, prateleira, ouro e
// dinheiro
function Cofre() {
  const ouro = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <path d={`M${x} ${y + 8} L${x + 3} ${y} H${x + 17} L${x + 20} ${y + 8} Z`} fill="#e5ad25" />
      <path d={`M${x + 3} ${y} H${x + 17} L${x + 18} ${y + 3} H${x + 2} Z`} fill="#ffd660" />
    </g>
  )
  const maco = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="22" height="9" rx="1.5" fill="#5f9a4c" />
      <rect x={x} y={y} width="22" height="3" rx="1.5" fill="#7fbf69" />
      <rect x={x + 8} y={y} width="6" height="9" fill="#f1ead6" />
    </g>
  )
  return (
    <>
      <Chao largura={62} />
      <Brilho x={74} y={86} cor="#ffe39a" estrelas={[[30, 26, 0.8], [140, 22, 1], [146, 74, 0.6], [16, 60, 0.6]]} />
      {/* os pés */}
      <rect x="32" y="126" width="16" height="13" rx="3" fill="#2f3338" />
      <rect x="100" y="126" width="16" height="13" rx="3" fill="#2f3338" />
      <rect x="124" y="118" width="11" height="12" rx="3" fill="#24272b" />
      {/* o corpo: topo, lateral e frente */}
      <path d="M26 40 L42 28 H138 L122 40 Z" fill="#9aa2ac" stroke="#9aa2ac" strokeWidth="4" strokeLinejoin="round" />
      <path d="M122 40 L138 28 V118 L122 130 Z" fill="#535a63" stroke="#535a63" strokeWidth="4" strokeLinejoin="round" />
      <rect x="24" y="38" width="100" height="94" rx="8" fill="#747c87" />
      {/* a boca: o que aparece com a porta aberta */}
      <g className={styles.dentroDoCofre}>
        <rect x="33" y="47" width="82" height="76" rx="5" fill="#2c3035" />
        <path d="M33 52 Q33 47 38 47 H110 Q115 47 115 52 V56 H33 Z" fill="#1f2226" />
        <rect x="33" y="84" width="82" height="6" fill="#4b5159" />
        <rect x="33" y="84" width="82" height="2" fill="#6a717a" />
        {ouro(48, 76)}
        {ouro(72, 76)}
        {ouro(60, 68)}
        {maco(42, 112)}
        {maco(70, 112)}
        {maco(56, 103)}
      </g>
      {/* fechado: a porta, com dobradiças, rebites, o segredo e a manivela */}
      <g className={styles.portaFechada}>
        <rect x="33" y="47" width="82" height="76" rx="5" fill="#808995" stroke="#646c77" strokeWidth="2.4" />
        <rect x="29" y="56" width="6" height="13" rx="2" fill="#4a5058" />
        <rect x="29" y="101" width="6" height="13" rx="2" fill="#4a5058" />
        {[
          [40, 54],
          [108, 54],
          [40, 116],
          [108, 116],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill="#a3abb5" />
        ))}
        <circle cx="68" cy="85" r="20" fill="#a9b0b8" />
        <circle cx="68" cy="85" r="16.5" fill="#3a3f46" className={styles.segredo} />
        <circle cx="68" cy="85" r="16.5" fill="none" stroke="#c9ced4" strokeWidth="2.4" strokeDasharray="1.4 4.4" className={styles.segredo} />
        <rect x="66.5" y="66.5" width="3" height="6" rx="1.5" fill="#e5ad25" />
        <circle cx="68" cy="85" r="5" fill="#a9b0b8" />
        <rect x="98" y="70" width="7" height="30" rx="3.5" fill="#cfd4da" className={styles.manivela} />
      </g>
      {/* aberto: a porta para fora, vista pelo avesso */}
      <g className={styles.portaAberta}>
        <path d="M33 47 L10 38 Q7 37 7 40 V131 Q7 134 10 133 L33 123 Z" fill="#8b939d" />
        <path d="M7 40 V131 Q7 134 10 133 L13 132 V39 Z" fill="#646c77" />
        {[54, 70, 86, 102, 118].map((y) => (
          <circle key={y} cx="17" cy={y + 1} r="2.6" fill="#c9ced4" />
        ))}
        <path d="M22 58 L29 55 V114 L22 117 Z" fill="none" stroke="#a5adb7" strokeWidth="1.6" />
      </g>
    </>
  )
}

const DESENHOS: Record<TipoChapado, () => React.JSX.Element> = {
  envelope: Envelope,
  pacote: Pacote,
  maleta: Maleta,
  cofre: Cofre,
}

export function Chapado({ tipo, aberto }: { tipo: TipoChapado; aberto: boolean }) {
  const Desenho = DESENHOS[tipo]
  return (
    <svg viewBox="0 0 160 160" className={`${styles.chapado} ${styles[tipo]} ${aberto ? styles.aberto : ''}`} aria-hidden>
      <Desenho />
    </svg>
  )
}
