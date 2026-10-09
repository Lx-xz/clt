'use client'

import { BookOpen, ChevronRight, Layers, MessageSquareWarning, Play, RotateCcw, Trophy } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import Avatar, { humorDoEstresse } from '@/components/Avatar'
import ComoJogar from '@/components/ComoJogar'
import Conquistas from '@/components/Conquistas'
import ListaDeAmigos from '@/components/ListaDeAmigos'
import { useSessao } from '@/components/SessaoGuard'
import { meusAmigos, pedidosDeAmizade, type Amigo, type Pedido } from '@/data/amizades'
import { buscarMeusJogos, buscarRanking } from '@/data/analytics'
import { minhasConquistas, type Conquista } from '@/data/conquistas'
import type { JogoResumo } from '@/data/jogadores'
import { dayLabel } from '@/game/engine'
import { loadCollection, loadRun } from '@/game/storage'
import type { GameState } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import styles from './inicio.module.sass'

const ROTULO: Record<string, string> = {
  vitoria: 'Vitória',
  burnout: 'Burnout',
  demissao: 'Demissão',
  despejo: 'Despejo',
  abandono: 'Pediu demissão',
}

/**
 * O início de quem já entrou.
 *
 * Antes, entrar levava a uma página com dois botões e nenhuma saída: sem a
 * barra lateral, sem o avatar, sem lembrar a partida de ontem. A porta de
 * entrada mora em `/auth` agora, e esta página é o saguão — o que se quer
 * fazer ao chegar está a um toque: continuar o mês (ou começar um), ver como
 * terminou a última partida e ir para as outras partes do jogo.
 *
 * O botão grande diz ONDE se para: "Continuar — semana 2, quarta" é um
 * convite; "Jogar" não diz se há uma partida esperando.
 */
export default function InicioPage() {
  const sessao = useSessao()
  const [run, setRun] = useState<GameState | null>(null)
  const [ultimo, setUltimo] = useState<JogoResumo | null | undefined>(undefined)
  const [posicao, setPosicao] = useState<{ lugar: number; total: number } | null>(null)
  const [novas, setNovas] = useState(0)
  const [tutorial, setTutorial] = useState(false)
  const [amigos, setAmigos] = useState<Amigo[] | null>(null)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [recentes, setRecentes] = useState<Conquista[]>([])

  function carregarAmigos() {
    if (sessao.convidado) return
    void meusAmigos().then(setAmigos).catch(() => setAmigos(null))
    void pedidosDeAmizade().then(setPedidos).catch(() => {})
  }

  useEffect(carregarAmigos, [sessao.convidado])
  // as três últimas ganhas — a lista inteira, com as que faltam, é do perfil
  useEffect(() => {
    void minhasConquistas(sessao.id)
      .then((lista) =>
        setRecentes(
          (lista ?? [])
            .filter((c) => c.ganha_em)
            .sort((a, b) => (b.ganha_em ?? '').localeCompare(a.ganha_em ?? ''))
            .slice(0, 3),
        ),
      )
      .catch(() => {})
  }, [sessao.id])

  // o save e a coleção moram no espelho local; ler na montagem evita a
  // divergência entre o HTML do build e o primeiro render no navegador
  useEffect(() => {
    const salva = loadRun<GameState>()
    setRun(salva && salva.outcome === 'jogando' ? salva : null)
    setNovas(loadCollection().unequipped.length)
  }, [])

  useEffect(() => {
    void buscarMeusJogos(sessao.id)
      .then((jogos) => setUltimo(jogos[0] ?? null))
      .catch(() => setUltimo(null))
    void buscarRanking()
      .then((linhas) => {
        const i = linhas.findIndex((l) => l.nick === sessao.nick)
        if (i >= 0) setPosicao({ lugar: i + 1, total: linhas.length })
      })
      .catch(() => {})
  }, [sessao.id, sessao.nick])

  const nunca = ultimo === null && !run

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
          <span className={styles.posto}>
            {posicao ? (
              <Link href="/ranking">
                <Trophy size={13} aria-hidden /> {posicao.lugar}º de {posicao.total} no ranking
              </Link>
            ) : sessao.convidado ? (
              'Jogando como convidado'
            ) : (
              'Ainda fora do ranking — termine um mês'
            )}
          </span>
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

      {nunca ? (
        <button type="button" className={styles.comoJogar} onClick={() => setTutorial(true)}>
          <BookOpen size={22} aria-hidden />
          <span>
            <b>Primeira vez? Veja como jogar</b>
            Regras, cartas e o que faz perder — em um minuto
          </span>
          <ChevronRight size={18} aria-hidden />
        </button>
      ) : null}

      <div className={styles.grade}>
        <section className={styles.bloco}>
          <h2 className={styles.titulo}>Última partida</h2>
          {ultimo === undefined ? <p className={styles.nota}>Carregando…</p> : null}
          {ultimo === null ? <p className={styles.nota}>Nenhuma partida terminada ainda.</p> : null}
          {ultimo ? (
            // um bilhete: o resultado em cima, os números embaixo, e o
            // replay inteiro a um toque
            <Link className={styles.bilhete} href={`/meus-jogos/detalhe?id=${ultimo.id}`}>
              <span className={`${styles.selo} ${styles[ultimo.outcome] ?? ''}`}>
                {ROTULO[ultimo.outcome] ?? ultimo.outcome}
              </span>
              <span className={styles.bilheteLinha}>
                <span>Semana {ultimo.week_reached} · dia {ultimo.day}</span>
                <b>R$ {ultimo.money}</b>
              </span>
              <span className={styles.verReplay}>
                Ver o replay <ChevronRight size={14} aria-hidden />
              </span>
            </Link>
          ) : null}
        </section>

        {amigos !== null && (amigos.length > 0 || pedidos.length > 0) ? (
          <section className={styles.bloco}>
            <h2 className={styles.titulo}>Amigos</h2>
            <ListaDeAmigos amigos={amigos} pedidos={pedidos} aoMudar={carregarAmigos} limite={4} />
          </section>
        ) : null}

        {recentes.length > 0 ? (
          <section className={styles.bloco}>
            <h2 className={styles.titulo}>
              Conquistas · <Link href="/perfil">ver todas</Link>
            </h2>
            <Conquistas lista={recentes} />
          </section>
        ) : null}

        <nav className={styles.atalhos} aria-label="Atalhos">
          <Link className={styles.atalho} href="/baralho">
            <Layers size={20} aria-hidden />
            <span>
              <b>Baralho</b>
              {novas > 0 ? `${novas} ${novas === 1 ? 'carta fora' : 'cartas fora'} do baralho` : 'Monte o seu'}
            </span>
          </Link>
          <Link className={styles.atalho} href="/ranking">
            <Trophy size={20} aria-hidden />
            <span>
              <b>Ranking</b>
              Quem fechou o mês
            </span>
          </Link>
          <Link className={styles.atalho} href="/comunidade">
            <MessageSquareWarning size={20} aria-hidden />
            <span>
              <b>Comunidade</b>
              Novidades e relatos
            </span>
          </Link>
          {nunca ? null : (
            <button type="button" className={styles.atalho} onClick={() => setTutorial(true)}>
              <BookOpen size={20} aria-hidden />
              <span>
                <b>Como jogar</b>
                As regras de novo
              </span>
            </button>
          )}
        </nav>
      </div>

      {tutorial ? <ComoJogar onFechar={() => setTutorial(false)} /> : null}
    </main>
  )
}
