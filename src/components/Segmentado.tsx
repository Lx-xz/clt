'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import styles from './Segmentado.module.sass'

/**
 * Escolha de três ou quatro opções lado a lado — o controle do seletor de
 * tema, virado componente porque ele vale para toda escolha curta e
 * excludente: abas de entrar/criar, gênero, novos/todos.
 *
 * O fundo do selecionado é UM elemento só que desliza, em vez de acender e
 * apagar em cada botão. Ele é posicionado por medição (`getBoundingClientRect`
 * do botão ativo) e não por fração da largura: as opções têm textos de
 * tamanhos diferentes, e dividir o espaço igualmente deixaria o retângulo
 * fora do texto em metade dos casos.
 */
export default function Segmentado<T extends string>({
  valor,
  onChange,
  opcoes,
  rotulo,
  className,
}: {
  valor: T
  onChange: (v: T) => void
  opcoes: { valor: T; rotulo: string }[]
  /** Para leitor de tela: o que este grupo escolhe. */
  rotulo: string
  className?: string
}) {
  const caixa = useRef<HTMLDivElement>(null)
  const [marca, setMarca] = useState<{ x: number; w: number } | null>(null)

  useLayoutEffect(() => {
    function medir() {
      const pai = caixa.current
      const ativo = pai?.querySelector<HTMLElement>('[data-ativo="sim"]')
      if (!pai || !ativo) return
      setMarca({ x: ativo.offsetLeft, w: ativo.offsetWidth })
    }
    medir()
    // a largura dos botões muda quando a fonte carrega ou a janela encolhe
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [valor, opcoes])

  return (
    <div ref={caixa} className={`${styles.caixa} ${className ?? ''}`} role="radiogroup" aria-label={rotulo}>
      {marca ? (
        <span
          className={styles.marca}
          style={{ transform: `translateX(${marca.x}px)`, width: marca.w }}
          aria-hidden
        />
      ) : null}
      {opcoes.map((o) => {
        const ativo = o.valor === valor
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            data-ativo={ativo ? 'sim' : 'nao'}
            className={`${styles.opcao} ${ativo ? styles.opcaoAtiva : ''}`}
            onClick={() => onChange(o.valor)}
          >
            {o.rotulo}
          </button>
        )
      })}
    </div>
  )
}
