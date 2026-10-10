'use client'

import { Play, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import Avatar, { humorDoEstresse } from '@/components/Avatar'
import Missoes from '@/components/Missoes'
import { useSessao } from '@/components/SessaoGuard'
import { carregarDoBanco, sincronizar } from '@/data/sync'
import { dayLabel } from '@/game/engine'
import { loadCollection, loadRun } from '@/game/storage'
import type { Collection, GameState } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import styles from './inicio.module.sass'

/**
 * O início de quem já entrou: quem você é, onde parou, e as missões do dia.
 *
 * Já foi um saguão com tudo — última partida, amigos, conquistas, atalhos
 * —, e o autor o quis limpo: o que se faz ao chegar é jogar ou abrir
 * envelope. O resto continua a um toque, na barra lateral (o perfil tem a
 * última partida, as conquistas e os amigos; o ranking e a comunidade têm
 * a sua entrada) e "como jogar" mora na mesa, onde a dúvida aparece.
 *
 * O botão grande diz ONDE se para: "Continuar — semana 2, quarta" é um
 * convite; "Jogar" não diz se há uma partida esperando.
 */
export default function InicioPage() {
  const sessao = useSessao()
  const [run, setRun] = useState<GameState | null>(null)
  const [colecao, setColecao] = useState<Collection | null>(null)

  // o save e a coleção moram no espelho local; ler na montagem evita a
  // divergência entre o HTML do build e o primeiro render no navegador
  useEffect(() => {
    const salva = loadRun<GameState>()
    setRun(salva && salva.outcome === 'jogando' ? salva : null)
    setColecao(loadCollection())
  }, [])

  // a coleção do espelho local abre a página; a do banco a substitui quando
  // chegar. Sem isso, abrir um envelope aqui subiria uma coleção velha por
  // cima da de outro aparelho
  useEffect(() => {
    let vivo = true
    void carregarDoBanco(sessao.id)
      .then(({ run: salva, collection }) => {
        if (!vivo) return
        setColecao(collection)
        setRun(salva && salva.outcome === 'jogando' ? salva : null)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [sessao.id])

  /** Abrir envelope aqui muda a coleção sem run nenhuma em jogo: sobe a run
   *  salva como está (ou nenhuma), junto com a coleção nova. */
  function mudarColecao(c: Collection) {
    setColecao(c)
    sincronizar(sessao.id, loadRun<GameState>(), c, () => {})
  }

  return (
    <main className={`page ${styles.inicio}`}>
      <section className={styles.cartao}>
        <Avatar
          avatar={sessao.avatar}
          tamanho={112}
          className={styles.avatar}
          humor={run ? humorDoEstresse(run.stress, run.modo.estresseMaximo) : undefined}
        />
        <div className={styles.quem}>
          <span className={styles.ola}>Bom dia,</span>
          <h1 className={styles.nick}>{sessao.nick}</h1>
        </div>

        <Link className={`${buttons.button} ${buttons.primary} ${styles.jogar}`} href="/jogar">
          {run ? <RotateCcw size={20} aria-hidden /> : <Play size={20} aria-hidden />}
          <span className={styles.jogarTexto}>
            <b>{run ? 'Continuar' : 'Começar o mês'}</b>
            <span>{run ? dayLabel(run) : 'Quatro semanas, sem surtar'}</span>
          </span>
        </Link>
      </section>

      {sessao.convidado ? (
        <p className={styles.aviso}>
          Você está como <b>convidado</b>: as partidas e as cartas ficam só neste navegador e se
          perdem ao sair. <Link href="/auth">Criar uma conta</Link> guarda tudo daqui para a frente.
        </p>
      ) : null}

      <section className={styles.missoes}>
        <h2 className={styles.titulo}>Missões do dia</h2>
        {colecao ? <Missoes colecao={colecao} onMudar={mudarColecao} /> : null}
      </section>
    </main>
  )
}
