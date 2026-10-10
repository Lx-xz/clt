'use client'

import { Coffee, Droplet, Hammer, Sparkles, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Avatar as Receita } from '@/data/avatar'
import { NOMES_DE_RARIDADE } from '@/game/colecao'
import { MALETAS, type Cosmetico, type TipoMaleta } from '@/game/cosmeticos'
import buttons from '@/styles/buttons.module.sass'
import Avatar from '../Avatar'
import { BarbaIcon, CabeloIcon, ExpressaoIcon, ExtrasIcon, FundoIcon, RostoIcon, RoupaIcon } from '../icons'
import styles from './Maleta.module.sass'

const METAIS: Record<TipoMaleta, string> = {
  bronze: styles.bronze,
  prata: styles.prata,
  ouro: styles.ouro,
}

/**
 * A maleta desenhada, de frente. Só CSS e chapada, como o envelope: couro
 * de cor lisa, a alça e os dois fechos — e os FECHOS são a única parte de
 * metal. Cada fecho tem duas peças: a PRESILHA, grande, que sai do topo e
 * desce pela frente, e o ENCAIXE, pequeno, preso na frente, onde ela trava. É o metal deles que diz bronze, prata ou ouro; o resto é a mesma
 * maleta. (A primeira versão era toda de metal, com degradê, plaqueta e
 * tampa, e destoava do resto do jogo, que é papel e cor lisa.)
 *
 * Ela abre PELO MEIO, como uma maleta de verdade em pé: a metade da frente
 * inclina um pouco para a frente e a de trás um pouco para trás. Como a
 * vemos de frente, a abertura é pequena — aparece uma faixa do forro em
 * cima, e é dela que o prêmio sobe.
 */
export function MaletaDesenhada({ tipo, aberta = false, largura = 96, className, rotulo, onClick }: {
  tipo: TipoMaleta
  aberta?: boolean
  largura?: number
  className?: string
  rotulo?: string
  onClick?: () => void
}) {
  const corpo = (
    <>
      {/* a alça é da metade de TRÁS: na da frente ela afundava no vão ao
          abrir; atrás, ela sobe junto e fica por cima da abertura */}
      <span className={styles.costas} aria-hidden>
        <span className={styles.alca} />
      </span>
      <span className={styles.frente} aria-hidden>
        <span className={`${styles.encaixe} ${styles.esq}`} />
        <span className={`${styles.encaixe} ${styles.dir}`} />
      </span>
      {/* as presilhas: a parte grande do fecho, presa no TOPO, que desce
          por cima da frente até o encaixe. Ficam fora das duas metades
          porque passam por cima da frente fechada e, abertas, vão para
          trás das costas */}
      <span className={`${styles.presilha} ${styles.esq}`} aria-hidden />
      <span className={`${styles.presilha} ${styles.dir}`} aria-hidden />
    </>
  )
  const props = {
    className: `${styles.maleta} ${METAIS[tipo]} ${aberta ? styles.aberta : ''} ${className ?? ''}`,
    style: { '--mal-w': `${largura}px` } as React.CSSProperties,
  }
  return onClick ? (
    <button type="button" {...props} onClick={onClick} aria-label={rotulo ?? MALETAS[tipo].nome}>
      {corpo}
    </button>
  ) : (
    <span {...props} role="img" aria-label={rotulo ?? MALETAS[tipo].nome}>
      {corpo}
    </span>
  )
}

type Fase = 'chegando' | 'esperando' | 'abrindo' | 'revelando'

/** Os tempos da abertura; cada um bate com uma animação do sass. */
const T = { chegada: 600, abrir: 1000, subir: 900 }

/** O ícone da aba do editor onde a peça mora: é ele que diz o TIPO do
 *  cosmético — o mesmo desenho que a pessoa vai procurar no editor. */
const ICONE_DA_ABA: Record<Cosmetico['aba'], (p: { size?: number; className?: string }) => React.ReactNode> = {
  rosto: RostoIcon,
  olhos: ExpressaoIcon,
  cabelo: CabeloIcon,
  barba: BarbaIcon,
  roupa: RoupaIcon,
  extras: ExtrasIcon,
  fundo: FundoIcon,
}

const ICONES_VERSO = [Coffee, Hammer, Droplet, Droplet, Coffee, Hammer, Hammer, Droplet, Coffee]

function semMovimento(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * A abertura de uma maleta, em tela cheia, no ritmo do envelope: ela chega,
 * espera o toque, os fechos soltam e ela abre pelo meio, e o prêmio sobe
 * de dentro VIRADO, como a carta do envelope — e só desvira lá em cima. A
 * luz vem depois de virar, com a mesma regra das cartas: épica e lendária
 * ganham os raios, as outras só o brilho.
 *
 * Dentro da caixa vai o avatar INTEIRO vestindo a peça (um cosmético se
 * entende vendo no corpo, e o recorte do rosto cortava metade dele); o
 * nome, o ícone do tipo e a raridade ficam FORA, embaixo. `onEquipar` põe o
 * botão de vestir agora.
 *
 * O cosmético já está na coleção quando isto aparece (quem chama grava
 * antes): fechar no meio não perde nada. Vai por portal, como o envelope, e
 * ouve as teclas na captura para o Esc não fechar o que estiver atrás.
 */
export default function AberturaDeMaleta({ tipo, cosmetico, nova, avatar, onEquipar, onFechar }: {
  tipo: TipoMaleta
  cosmetico: Cosmetico
  nova: boolean
  /** O avatar de quem abre, com a peça já trocada. */
  avatar: Receita
  onEquipar?: () => void
  onFechar: () => void
}) {
  const [fase, setFase] = useState<Fase>(semMovimento() ? 'esperando' : 'chegando')
  const [virado, setVirado] = useState(false)
  const [escala, setEscala] = useState(1)
  const ocupado = useRef(false)

  useLayoutEffect(() => {
    const medir = () => setEscala(Math.min(1, (window.innerHeight - 120) / 560, (window.innerWidth - 24) / 360))
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [])

  useEffect(() => {
    const html = document.documentElement
    const jaEstava = html.dataset.popup === 'aberto'
    html.dataset.popup = 'aberto'
    return () => {
      if (!jaEstava) delete html.dataset.popup
    }
  }, [])

  useEffect(() => {
    if (fase !== 'chegando') return
    const t = setTimeout(() => setFase('esperando'), T.chegada)
    return () => clearTimeout(t)
  }, [fase])

  // o prêmio sobe virado e só desvira quando chega — o "o que será?" da
  // carta do envelope, igual
  useEffect(() => {
    if (fase !== 'revelando') return
    const t = setTimeout(() => setVirado(true), semMovimento() ? 0 : T.subir)
    return () => clearTimeout(t)
  }, [fase])

  function abrir() {
    if (fase !== 'esperando' || ocupado.current) return
    ocupado.current = true
    setFase('abrindo')
    setTimeout(() => setFase('revelando'), semMovimento() ? 0 : T.abrir)
  }

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && e.key !== 'Enter' && e.key !== ' ') return
      // revelada, Enter e espaço são dos botões (Equipar, Continuar)
      if (virado && e.key !== 'Escape') return
      e.stopPropagation()
      e.preventDefault()
      if (e.key === 'Escape') onFechar()
      else abrir()
    }
    window.addEventListener('keydown', tecla, true)
    return () => window.removeEventListener('keydown', tecla, true)
  })

  const aberta = fase === 'abrindo' || fase === 'revelando'
  const raios = cosmetico.raridade === 'epica' || cosmetico.raridade === 'lendaria'
  const IconeDoTipo = ICONE_DA_ABA[cosmetico.aba]
  const tela = (
    <div className={styles.cortina} role="dialog" aria-modal="true" aria-label={MALETAS[tipo].nome}>
      <button type="button" className={styles.pular} onClick={onFechar}>
        Fechar <X size={14} aria-hidden />
      </button>
      <div className={styles.titulo}>{MALETAS[tipo].nome}</div>
      <div className={styles.areaToque} onClick={abrir} style={{ '--escala': escala } as React.CSSProperties}>
        <div className={styles.palco}>
          <div className={`${styles.maletaNoPalco} ${styles[`fase_${fase}`]}`}>
            <MaletaDesenhada tipo={tipo} aberta={aberta} largura={250} />
          </div>
          {fase === 'revelando' ? (
            <div className={`${styles.premio} ${virado ? styles.revelado : ''} ${styles[`premio_${cosmetico.raridade}`]}`}>
              <span className={styles.brilho} aria-hidden />
              {raios ? <span className={styles.raios} aria-hidden /> : null}
              <div className={styles.giro}>
                <div className={`${styles.face} ${styles.faceFrente}`}>
                  <Avatar avatar={avatar} tamanho={176} />
                </div>
                <div className={`${styles.face} ${styles.faceVerso}`} aria-hidden>
                  {ICONES_VERSO.map((Icone, i) => (
                    <Icone key={i} strokeWidth={1.5} />
                  ))}
                </div>
              </div>
              <div className={styles.legenda} aria-live="polite">
                {virado ? (
                  <>
                    <b className={styles.premioNome}>
                      <IconeDoTipo size={20} />
                      {cosmetico.nome}
                    </b>
                    <span className={styles.premioRaridade}>
                      {nova ? (
                        <i className={styles.nova}>
                          <Sparkles size={11} aria-hidden /> nova
                        </i>
                      ) : (
                        <i className={styles.repetida}>repetida</i>
                      )}
                      {NOMES_DE_RARIDADE[cosmetico.raridade]}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <p className={styles.dica}>{fase === 'esperando' ? 'Toque na maleta para abrir' : ' '}</p>
      {virado ? (
        <div className={styles.acoes}>
          {onEquipar ? (
            <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={onEquipar} autoFocus>
              Equipar agora
            </button>
          ) : null}
          <button type="button" className={buttons.button} onClick={onFechar} autoFocus={!onEquipar}>
            Continuar
          </button>
        </div>
      ) : null}
    </div>
  )
  return typeof document === 'undefined' ? null : createPortal(tela, document.body)
}
