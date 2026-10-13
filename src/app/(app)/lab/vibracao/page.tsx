'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import buttons from '@/styles/buttons.module.sass'
import styles from './vibracao.module.sass'

/**
 * Bancada de vibração, para achar no APARELHO qual jeito de tremer o iPhone
 * funciona. O Safari não tem `navigator.vibrate`; o que existe é o háptico do
 * `<input type="checkbox" switch>` (iOS 18 em diante), e o jeito de disparar
 * esse háptico por código varia — e não dá para testar fora de um iPhone de
 * verdade. Cada botão tenta de um jeito; o de cima é o interruptor nativo,
 * tocado com o dedo: se ELE não tremer, o aparelho está sem háptico (iOS
 * antigo, ou Ajustes › Sons e Tato › Tato do Sistema desligado) e nenhum
 * dos outros vai tremer.
 */

type Onde = 'head' | 'body'
type Quem = 'rotulo' | 'caixa'

function disparar(onde: Onde, quem: Quem, escondido: 'none' | 'invisivel') {
  const rotulo = document.createElement('label')
  rotulo.ariaHidden = 'true'
  if (escondido === 'none') rotulo.style.display = 'none'
  else rotulo.style.cssText = 'position:fixed;left:-100px;top:0;width:1px;height:1px;opacity:0;pointer-events:none'
  const caixa = document.createElement('input')
  caixa.type = 'checkbox'
  caixa.setAttribute('switch', '')
  rotulo.appendChild(caixa)
  const pai = onde === 'head' ? document.head : document.body
  pai.appendChild(rotulo)
  if (quem === 'rotulo') rotulo.click()
  else caixa.click()
  pai.removeChild(rotulo)
}

const JEITOS: { id: string; nome: string; gesto: 'click' | 'pointerdown' | 'touchend'; f: () => void }[] = [
  { id: 'A', nome: 'Rótulo no <head>, escondido (o do jogo hoje)', gesto: 'click', f: () => disparar('head', 'rotulo', 'none') },
  { id: 'B', nome: 'Rótulo no <body>, invisível', gesto: 'click', f: () => disparar('body', 'rotulo', 'invisivel') },
  { id: 'C', nome: 'Caixa no <body>, invisível, clique na caixa', gesto: 'click', f: () => disparar('body', 'caixa', 'invisivel') },
  { id: 'D', nome: 'Como o B, mas no pointerdown', gesto: 'pointerdown', f: () => disparar('body', 'rotulo', 'invisivel') },
  { id: 'E', nome: 'Como o B, mas no touchend', gesto: 'touchend', f: () => disparar('body', 'rotulo', 'invisivel') },
  { id: 'F', nome: 'navigator.vibrate (Android)', gesto: 'click', f: () => navigator.vibrate?.(40) },
]

export default function VibracaoPage() {
  const [ultimo, setUltimo] = useState<string | null>(null)
  const temVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

  return (
    <main className={styles.pagina}>
      <Link href="/lab" className={styles.voltar}>
        <ArrowLeft size={16} aria-hidden /> Lab
      </Link>
      <h1>Vibração</h1>
      <p className={styles.dica}>
        Toque em cada um no iPhone e anote quais tremem. navigator.vibrate: {temVibrate ? 'existe' : 'não existe'}.
      </p>

      <label className={styles.nativo}>
        <input type="checkbox" {...{ switch: '' }} /> Interruptor nativo — toque com o dedo
      </label>

      {/* A–F falharam no iPhone do autor (só o nativo tremeu): o iOS não
          treme por clique de CÓDIGO. O que sobra é o dedo de verdade cair
          num interruptor nativo escondido. G–I testam se ele ainda treme
          escondido, que é o que deixaria pôr um por baixo de um botão */}
      <h2 className={styles.titulo}>Toque com o dedo, em cima do texto</h2>
      <label className={styles.nativo}>
        <input type="checkbox" {...{ switch: '' }} /> G — o mesmo nativo, mas toque no TEXTO, não no interruptor
      </label>
      <label className={`${styles.nativo} ${styles.comEscondido}`}>
        <input type="checkbox" className={styles.transparente} {...{ switch: '' }} />
        H — interruptor transparente (opacidade 0) dentro do rótulo
      </label>
      <label className={`${styles.nativo} ${styles.comEscondido}`}>
        <input type="checkbox" className={styles.cobrindo} {...{ switch: '' }} />
        I — interruptor transparente esticado por cima do botão inteiro
      </label>
      <label className={`${styles.nativo} ${styles.comEscondido}`}>
        <input type="checkbox" className={styles.foraDaTela} {...{ switch: '' }} />
        J — interruptor fora da tela, só o rótulo à vista
      </label>

      <h2 className={styles.titulo}>Por código (não tremeram)</h2>
      <div className={styles.lista}>
        {JEITOS.map((j) => (
          <button
            key={j.id}
            type="button"
            className={buttons.button}
            onClick={j.gesto === 'click' ? () => (j.f(), setUltimo(j.id)) : undefined}
            onPointerDown={j.gesto === 'pointerdown' ? () => (j.f(), setUltimo(j.id)) : undefined}
            onTouchEnd={j.gesto === 'touchend' ? () => (j.f(), setUltimo(j.id)) : undefined}
          >
            <b>{j.id}</b> {j.nome}
          </button>
        ))}
      </div>
      {ultimo ? <p className={styles.dica}>Último tocado: {ultimo}</p> : null}
    </main>
  )
}
