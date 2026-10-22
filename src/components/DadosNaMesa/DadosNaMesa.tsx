'use client'

import { useEffect, useRef, useState } from 'react'
import { Dices } from 'lucide-react'
import { RolagemNaMesa, dadosDaRolagem, dadosDoValor, valoresDosNumeros, type DadoNaMesa } from '../Dado3D'
import { textoDaRolagem } from '@/game/acoes'
import type { GameState } from '@/game/types'
import styles from './DadosNaMesa.module.sass'

/**
 * Os dados de uma carta no tapete. Dois casos:
 *
 * - **A carta pediu dados** (`pedido`, o `rolagemAberta` do motor, v0.42):
 *   eles esperam no canto, a pessoa pega e joga com o dedo ou o mouse (ou
 *   toca em "Jogar" e a mesa joga), e o número é o da face que ficar para
 *   CIMA quando eles assentarem — não um sorteio feito antes. Parados, a
 *   soma fica um instante à vista, e só então a resposta vai ao motor
 *   (`onJogou`), que segue com o resto da carta.
 * - **Os dados já saíram** (`rolagem`, rolados pelo motor: um evento, um
 *   começo de dia): a mesa os joga sozinha até a face que saiu. Quem diz
 *   que é uma rolagem NOVA é o `selo`, como na `MensagemNaMesa`; a que veio
 *   da mão (`naMao`) já foi mostrada e não rola de novo.
 */
// parados: a soma à vista, depois esmaecem (`.saindo`, 1 s + .4 s), e só
// então o motor segue — senão sumiriam de repente no meio da leitura
const MOSTRAR_SOMA = 1450
const DEPOIS_DE_PARAR = 1400

type Rolagem = NonNullable<GameState['ultimaRolagem']>
type Pedido = NonNullable<GameState['rolagemAberta']>

function soma(valores: number[], mais: number) {
  return valores.reduce((a, b) => a + b, 0) + mais
}

function Conta({ valores, mais }: { valores: number[]; mais: number }) {
  return (
    <span className={styles.total}>
      {valores.length > 1 || mais ? `${valores.join(' + ')}${mais ? ` ${mais > 0 ? '+' : '−'} ${Math.abs(mais)}` : ''} = ` : ''}
      <b>{soma(valores, mais)}</b>
    </span>
  )
}

export default function DadosNaMesa({ rolagem, pedido, nomeDaCarta, onJogou }: {
  rolagem: GameState['ultimaRolagem']
  pedido?: GameState['rolagemAberta']
  nomeDaCarta?: string
  onJogou?: (valores: number[]) => void
}) {
  if (pedido) return <DadosPedidos pedido={pedido} nomeDaCarta={nomeDaCarta} onJogou={onJogou} />
  return <DadosQueSairam rolagem={rolagem} />
}

function DadosPedidos({ pedido, nomeDaCarta, onJogou }: {
  pedido: Pedido
  nomeDaCarta?: string
  onJogou?: (valores: number[]) => void
}) {
  const { rolagem } = pedido
  const lados = Math.max(2, Math.round(rolagem.lados))
  const quantos = Math.max(1, Math.round(rolagem.dados))
  const [auto, setAuto] = useState(false)
  const [jogou, setJogou] = useState(false)
  const [valores, setValores] = useState<number[] | null>(null)
  const responder = useRef(onJogou)
  responder.current = onJogou
  const dados = dadosDaRolagem(lados, quantos)

  // um dado que não existe de verdade (um d5 escrito à mão) não tem desenho:
  // a resposta vai na hora, pela sorte, em vez de travar o dia
  useEffect(() => {
    if (dados) return
    responder.current?.(Array.from({ length: quantos }, () => 1 + Math.floor(Math.random() * lados)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!valores) return
    const t = setTimeout(() => responder.current?.(valores), MOSTRAR_SOMA)
    return () => clearTimeout(t)
  }, [valores])

  if (!dados) return null
  return (
    // `data-carta`: o arraste do dado não pode abrir a barra lateral no celular
    <div className={`${styles.camada} ${styles.pegando} ${valores ? styles.saindo : ''}`} data-carta>
      <RolagemNaMesa
        key={auto ? 'auto' : 'mao'}
        dados={dados}
        modo={auto ? 'auto' : 'mao'}
        tamanho={64}
        semDica
        onJogar={() => setJogou(true)}
        onParar={(numeros) => setValores(valoresDosNumeros(lados, numeros))}
      />
      {valores ? (
        <Conta valores={valores} mais={rolagem.mais ?? 0} />
      ) : (
        <div className={styles.pedido}>
          <span className={styles.oQue}>
            {nomeDaCarta ? <b>{nomeDaCarta}</b> : null} rola {textoDaRolagem(rolagem).replace('−', '')}
          </span>
          {!jogou && !auto ? (
            <>
              <button type="button" onClick={() => setAuto(true)}>
                <Dices size={15} aria-hidden /> Jogar
              </button>
              <small>ou arraste o dado e solte</small>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}

function DadosQueSairam({ rolagem }: { rolagem: GameState['ultimaRolagem'] }) {
  const vista = useRef(rolagem?.selo ?? 0)
  const [ativa, setAtiva] = useState<Rolagem | null>(null)
  const [parou, setParou] = useState(false)

  useEffect(() => {
    if (!rolagem || rolagem.selo === vista.current) return
    vista.current = rolagem.selo
    if (rolagem.naMao) return
    setAtiva(rolagem)
    setParou(false)
  }, [rolagem])

  useEffect(() => {
    if (!parou) return
    const t = setTimeout(() => setAtiva(null), DEPOIS_DE_PARAR)
    return () => clearTimeout(t)
  }, [parou])

  if (!ativa) return null
  const dados: DadoNaMesa[] = ativa.valores.flatMap((v) => dadosDoValor(ativa.lados, v) ?? [])
  if (dados.length === 0) return null

  return (
    <div className={`${styles.camada} ${parou ? styles.saindo : ''}`} aria-hidden>
      <RolagemNaMesa key={ativa.selo} dados={dados} jogada={ativa.selo} tamanho={64} onParar={() => setParou(true)} />
      {parou ? <Conta valores={ativa.valores} mais={ativa.mais} /> : null}
    </div>
  )
}
