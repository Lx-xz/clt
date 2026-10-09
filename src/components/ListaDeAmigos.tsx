'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Amigo, Pedido } from '@/data/amizades'
import { responderAmizade } from '@/data/amizades'
import buttons from '@/styles/buttons.module.sass'
import Avatar from './Avatar'
import styles from './ListaDeAmigos.module.sass'

const ROTULO: Record<string, string> = {
  vitoria: 'venceu',
  burnout: 'burnout',
  demissao: 'demitido',
  despejo: 'despejado',
}

/**
 * Os pedidos que chegaram, para responder ali mesmo, e os amigos com a
 * última partida de cada um — que abre o replay. É a mesma peça no início e
 * no perfil.
 */
export default function ListaDeAmigos({
  amigos,
  pedidos,
  aoMudar,
  limite,
}: {
  amigos: Amigo[]
  pedidos: Pedido[]
  /** Depois de aceitar ou recusar: quem chamou recarrega as duas listas. */
  aoMudar: () => void
  limite?: number
}) {
  const [ocupado, setOcupado] = useState<string | null>(null)

  function responder(nick: string, aceitar: boolean) {
    setOcupado(nick)
    void responderAmizade(nick, aceitar).finally(() => {
      setOcupado(null)
      aoMudar()
    })
  }

  const mostrar = limite ? amigos.slice(0, limite) : amigos

  return (
    <div className={styles.lista}>
      {pedidos.map((p) => (
        <div key={`p-${p.nick}`} className={`${styles.linha} ${styles.pedido}`}>
          <Avatar avatar={p.avatar} tamanho={36} />
          <span className={styles.quem}>
            <Link href={`/jogador?nick=${encodeURIComponent(p.nick)}`}>{p.nick}</Link>
            <span>quer ser seu amigo</span>
          </span>
          <span className={styles.botoes}>
            <button
              type="button"
              className={`${buttons.button} ${buttons.primary}`}
              disabled={ocupado === p.nick}
              onClick={() => responder(p.nick, true)}
            >
              Aceitar
            </button>
            <button
              type="button"
              className={buttons.button}
              disabled={ocupado === p.nick}
              onClick={() => responder(p.nick, false)}
            >
              Recusar
            </button>
          </span>
        </div>
      ))}

      {mostrar.map((a) => (
        <div key={a.nick} className={styles.linha}>
          <Avatar avatar={a.avatar} tamanho={36} />
          <span className={styles.quem}>
            <Link href={`/jogador?nick=${encodeURIComponent(a.nick)}`}>{a.nick}</Link>
            {a.ultima_id ? (
              <Link className={styles.ultima} href={`/meus-jogos/detalhe?id=${a.ultima_id}`}>
                última: {ROTULO[a.ultima_outcome ?? ''] ?? a.ultima_outcome} · R$ {a.ultima_money}
              </Link>
            ) : (
              <span>ainda não terminou um mês</span>
            )}
          </span>
        </div>
      ))}
    </div>
  )
}
