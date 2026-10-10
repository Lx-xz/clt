'use client'

import { X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './Dialogo.module.sass'

/** Quantos popups estão abertos agora — é o que trava a página atrás. */
let abertos = 0

/** Quanto dura a saída, nos dois papéis. Tem que bater com `.saindo` no
 *  `Dialogo.module.sass`: é este número que diz quando desmontar. */
const SAIDA_MS = 280

function semMovimento(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * O popup do site inteiro: configurações, como jogar, confirmação de
 * reinício, relato de bug. Antes cada tela tinha o seu, e cada um errava uma
 * coisa diferente — este resolve os três de uma vez:
 *
 *  - **trava a página atrás.** Enquanto houver popup aberto, o conteúdo não
 *    rola (é o que a marca `data-popup` no <html> desliga, em
 *    `shell.module.sass`) e o gesto de arrastar o menu lateral é ignorado.
 *  - **fecha ao clicar fora**, e com Esc.
 *  - **largura previsível.** `largo` existe porque o diálogo de volume
 *    mudava de tamanho quando o número virava "100%".
 *
 * **Dois papéis, por assunto** (`estilo`): o que é dinheiro e resultado — a
 * sexta, a recompensa, o fim da run — é uma NOTA FISCAL, estreita, em fonte de
 * máquina e com a borda serrilhada; o resto é uma PRANCHETA, a folha presa
 * pela presilha. É o mesmo escritório da paleta: o jogador sabe se está
 * lendo uma conta ou um formulário antes de ler o título.
 *
 * **`semTravarNav`** é o popup que NÃO é do site, é da mesa. O painel de fim
 * de run cobria a barra lateral, e o único jeito de sair dele era começar
 * outra partida. Com ele a cortina começa depois da barra (no desktop), a
 * página não é marcada com `data-popup` e a gaveta do celular continua
 * abrindo com o arraste.
 *
 * Sem `onFechar`, o popup não fecha — nem no X, nem fora, nem no Esc: é a
 * sexta e a recompensa, que pedem uma decisão.
 *
 * **A saída também é animada**, e por isso o popup precisa de um instante
 * entre "fechar" e sumir. São dois caminhos:
 *
 *  - fechar por DENTRO (X, fora, Esc): o diálogo anima e só então chama
 *    `onFechar` — quem o renderiza continua com o `{x ? <Dialogo/> : null}`
 *    de sempre;
 *  - fechar por FORA (a sexta acabou, a run recomeçou): o pai passa
 *    `aberto={false}` em vez de desmontar. O diálogo **congela o conteúdo**
 *    do último render aberto enquanto sai — senão a nota da sexta sairia
 *    mostrando a segunda-feira, e o recibo de fim, a run nova.
 *
 * A nota fiscal sobe de baixo da tela, como papel saindo da maquininha, e
 * sai por cima, como quem arranca o recibo; a prancheta só aparece e some.
 */
export default function Dialogo({
  titulo,
  onFechar,
  largo = false,
  estilo = 'prancheta',
  semTravarNav = false,
  aberto = true,
  children,
  acoes,
}: {
  titulo: string
  aberto?: boolean
  onFechar?: () => void
  largo?: boolean
  estilo?: 'prancheta' | 'nota'
  semTravarNav?: boolean
  children: React.ReactNode
  acoes?: React.ReactNode
}) {
  const fundo = useRef<HTMLDivElement>(null)
  const comecouNoFundo = useRef(false)
  const [presente, setPresente] = useState(aberto)
  const [saindo, setSaindo] = useState(false)
  /** Já saiu pelo X: se o pai responder com `aberto={false}` em vez de
   *  desmontar, não há segunda saída para animar. */
  const jaSaiu = useRef(false)
  const congelado = useRef({ titulo, children, acoes })
  if (aberto && !saindo) congelado.current = { titulo, children, acoes }

  useEffect(() => {
    if (aberto) {
      jaSaiu.current = false
      setPresente(true)
      setSaindo(false)
      return
    }
    if (jaSaiu.current || semMovimento()) {
      setPresente(false)
      return
    }
    setSaindo(true)
    const t = setTimeout(() => {
      setPresente(false)
      setSaindo(false)
    }, SAIDA_MS)
    return () => clearTimeout(t)
  }, [aberto])

  const fechar = useCallback(() => {
    if (!onFechar || jaSaiu.current) return
    jaSaiu.current = true
    if (semMovimento()) return onFechar()
    setSaindo(true)
    setTimeout(onFechar, SAIDA_MS)
  }, [onFechar])

  // a trava vale enquanto o popup estiver na tela, saída incluída
  const visivel = presente || aberto
  useEffect(() => {
    if (!visivel) return
    // contagem, e não um booleano: um popup aberto por cima de outro não pode
    // destravar a página ao fechar só o de cima
    if (!semTravarNav) {
      abertos += 1
      document.documentElement.dataset.popup = 'aberto'
    }

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar()
    }
    window.addEventListener('keydown', aoTeclar)

    return () => {
      window.removeEventListener('keydown', aoTeclar)
      if (semTravarNav) return
      abertos -= 1
      if (abertos <= 0) {
        abertos = 0
        delete document.documentElement.dataset.popup
      }
    }
  }, [fechar, semTravarNav, visivel])

  if (!visivel) return null
  const { titulo: tituloVisto, children: corpo, acoes: rodape } = congelado.current

  return (
    <div
      ref={fundo}
      className={`${styles.fundo} ${semTravarNav ? styles.daMesa : ''} ${saindo ? styles.saindo : ''}`}
      // o clique de fora só conta quando começou E terminou no fundo: sem
      // isso, selecionar texto de dentro e soltar o dedo fora fechava tudo
      onMouseDown={(e) => {
        comecouNoFundo.current = e.target === fundo.current
      }}
      onClick={(e) => {
        if (comecouNoFundo.current && e.target === fundo.current) fechar()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={tituloVisto}
    >
      {/* a sombra mora num invólucro: a serrilha da nota é uma máscara, e
          máscara corta a box-shadow do próprio elemento junto */}
      <div className={`${styles.moldura} ${largo ? styles.largo : ''} ${estilo === 'nota' ? styles.molduraNota : ''}`}>
        <div className={`${styles.dialogo} ${styles[estilo]}`}>
          <div className={styles.cabecalho}>
            <h2 className={styles.titulo}>{tituloVisto}</h2>
            {onFechar ? (
              <button type="button" className={styles.fechar} onClick={fechar} aria-label="Fechar">
                <X size={18} aria-hidden />
              </button>
            ) : null}
          </div>
          <div className={styles.corpo}>{corpo}</div>
          {rodape ? <div className={styles.acoes}>{rodape}</div> : null}
        </div>
      </div>
    </div>
  )
}

/** A barra lateral consulta isto para não abrir com arraste por baixo do popup. */
export function popupAberto(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.popup === 'aberto'
}
