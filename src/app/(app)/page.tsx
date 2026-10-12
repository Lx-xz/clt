'use client'

import { ChevronRight, Play, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { humorDoEstresse } from '@/components/Avatar'
import AvatarHero from '@/components/AvatarHero'
import Missoes from '@/components/Missoes'
import { useSessao } from '@/components/SessaoGuard'
import { carregarDoBanco, sincronizar } from '@/data/sync'
import { dayLabel } from '@/game/engine'
import { loadCollection, loadRun } from '@/game/storage'
import { hoje } from '@/game/missoes'
import { temporadaDeHalloween } from '@/game/tokens'
import { AboboraIcon } from '@/components/icons'
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
 * O botão é um só, e diz se há partida esperando: "Continuar" ou "Jogar".
 * Já houve um cartão com "Bom dia, nick" e o dia da run salva; o autor o
 * tirou — com a capa em cima, era a terceira coisa dizendo quem você é.
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
      {/* a capa, como a do perfil, mas de ponta a ponta: sem margem, sem
          canto, encostada no topo e nas duas bordas (pedido do autor). A
          cara é a da run salva, e por isso o estresse aparece ao chegar */}
      <AvatarHero
        avatar={sessao.avatar}
        className={styles.hero}
        humor={run ? humorDoEstresse(run.stress, run.modo.estresseMaximo) : undefined}
      />

      <div className={styles.coluna}>
        {/* só o botão, montado na borda de baixo da capa: o "Bom dia" e o
            nick saíram (pedido do autor) — o rosto em cima já diz quem é */}
        <h1 className="sr-only">Início</h1>
        <Link
          className={`${buttons.button} ${buttons.primary} ${styles.jogar}`}
          href="/jogar"
          aria-label={run ? `Continuar: ${dayLabel(run)}` : 'Jogar'}
        >
          {run ? <RotateCcw size={22} aria-hidden /> : <Play size={22} aria-hidden />}
          {run ? 'Continuar' : 'Jogar'}
        </Link>

        {/* o aviso da temporada: o banner inteiro é o botão para a máquina,
            onde a abóbora está à venda (e a primeira é grátis) */}
        {temporadaDeHalloween(hoje()) ? (
          <Link className={styles.banner} href="/maquina">
            <AboboraIcon size={34} />
            <span className={styles.bannerTexto}>
              <b>O Halloween chegou ao escritório</b>
              <span>{colecao && !colecao.aboboraGratis ? 'Pegue a sua abóbora grátis na máquina' : 'Abóboras na máquina de vendas'}</span>
            </span>
            <ChevronRight size={20} aria-hidden />
          </Link>
        ) : null}

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
      </div>
    </main>
  )
}
