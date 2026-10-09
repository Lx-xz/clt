'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  Coffee,
  Droplet,
  Hammer,
  House,
  Layers,
  LogOut,
  MessageSquareWarning,
  Play,
  Settings,
  TestTube,
  Trophy,
} from 'lucide-react'
import Avatar from './Avatar'
import BotaoConfirmar from './BotaoConfirmar'
import Check from './Check'
import Slider from './Slider'
import Dialogo, { popupAberto } from './Dialogo'
import Segmentado from './Segmentado'
import { useSessao } from './SessaoGuard'
import { gravarVolumes, lerVolumes, VOLUMES_PADRAO, type Volumes } from '@/data/som'
import { gravarTema, lerTema, TEMAS, type Tema } from '@/data/tema'
import { souAdmin } from '@/data/feedback'
import { sair } from '@/data/conta'
import { cancelarSync } from '@/data/sync'
import { limparLocalDoJogo, loadRun } from '@/game/storage'
import type { GameState } from '@/game/types'
import { marcarPendencia, pendencia } from '@/data/pendencias'
import { marcarNotificacoesLidas, minhasNotificacoes, type Notificacao } from '@/data/notificacoes'
import buttons from '@/styles/buttons.module.sass'
import styles from './SideNav.module.sass'

// "Meus jogos" saiu daqui e virou parte do perfil (o seu e o dos outros).
// Análise, Feedbacks e Novidades viraram abas de /comunidade: eram três
// entradas para o mesmo assunto — o que está acontecendo com o jogo.
//
// Em dois grupos, separados por um fio: o JOGO (o que você faz sozinho) e a
// GENTE (o que os outros fazem). Recolhida, a barra não tem espaço para o nome
// do grupo, e o fio basta para o olho agrupar os ícones.
const GRUPOS = [
  [
    { href: '/', label: 'Início', Icon: House },
    { href: '/jogar', label: 'Jogar', Icon: Play },
    { href: '/baralho', label: 'Baralho', Icon: Layers },
  ],
  [
    { href: '/ranking', label: 'Ranking', Icon: Trophy },
    { href: '/comunidade', label: 'Comunidade', Icon: MessageSquareWarning },
  ],
]

export default function SideNav() {
  const pathname = usePathname()
  const [aberta, setAberta] = useState(false)
  const [configurando, setConfigurando] = useState(false)
  const [avisos, setAvisos] = useState<(Notificacao & { novo: boolean })[] | null>(null)
  const [naoLidosNaAbertura, setNaoLidosNaAbertura] = useState(0)
  const [naoLidas, setNaoLidas] = useState(0)
  const sessao = useSessao()
  // o padrão é o do servidor: ler o localStorage na montagem evita a
  // divergência entre o HTML gerado no build e o primeiro render no navegador
  const [volumes, setVolumes] = useState<Volumes>(VOLUMES_PADRAO)
  // mesmo motivo do volume: ler o localStorage só depois de montar evita a
  // divergência entre o HTML do build e o primeiro render do navegador
  const [tema, setTema] = useState<Tema>('sistema')
  /** Há uma run no meio: o "Jogar" ganha um ponto, como uma aba com algo
   *  por terminar. */
  const [runEmAndamento, setRunEmAndamento] = useState(false)
  // o laboratório do avatar é ferramenta de dono do jogo: quem diz se você é
  // admin é o banco, não o perfil espelhado no navegador
  const [admin, setAdmin] = useState(sessao.admin)
  const [abaAvisos, setAbaAvisos] = useState<'novos' | 'todos'>('novos')
  const [saindo, setSaindo] = useState(false)
  const painelRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  /** Para onde ia o clique que esbarrou numa alteração por salvar. */
  const [destinoPendente, setDestinoPendente] = useState<{ href: string; aviso: string } | null>(null)

  /** Antes de trocar de página, pergunta se há algo por salvar na atual. */
  function navegar(e: React.MouseEvent, href: string) {
    const aviso = pendencia()
    if (!aviso) return
    e.preventDefault()
    setDestinoPendente({ href, aviso })
  }

  // ao mudar de página o gaveteiro do celular se fecha sozinho
  useEffect(() => {
    setAberta(false)
    setConfigurando(false)
    setAvisos(null)
    const run = loadRun<GameState>()
    setRunEmAndamento(Boolean(run && run.outcome === 'jogando'))
  }, [pathname])

  useEffect(() => {
    setVolumes(lerVolumes())
    setTema(lerTema())
  }, [])

  useEffect(() => {
    if (sessao.convidado) return
    void souAdmin().then(setAdmin)
  }, [sessao.convidado])

  // o sininho: quantas respostas e mudanças de estado chegaram desde a
  // última olhada. Convidado não tem notificação, e a função devolve vazio
  useEffect(() => {
    if (sessao.convidado) return
    void minhasNotificacoes().then((lista) =>
      setNaoLidas(lista.filter((n) => n.lida_em === null).length),
    )
  }, [sessao.convidado, pathname])

  function abrirAvisos() {
    void minhasNotificacoes().then((lista) => {
      // congela "novo" no momento da abertura: logo abaixo tudo vira lido no
      // banco, e sem essa cópia a aba "Novos" esvaziaria na frente do jogador
      const marcados = lista.map((n) => ({ ...n, novo: n.lida_em === null }))
      setNaoLidosNaAbertura(marcados.filter((n) => n.novo).length)
      setAbaAvisos(marcados.some((n) => n.novo) ? 'novos' : 'todos')
      setAvisos(marcados)
      setNaoLidas(0)
      if (marcados.some((n) => n.novo)) void marcarNotificacoesLidas()
    })
  }

  function mudarVolume<C extends keyof Volumes>(campo: C, valor: Volumes[C]) {
    const novo = { ...volumes, [campo]: valor }
    setVolumes(novo)
    gravarVolumes(novo)
  }

  function mudarTema(novo: Tema) {
    setTema(novo)
    gravarTema(novo)
  }

  // Sair mora nas Configurações, com dois cliques. Estava na barra, ao alcance
  // de um clique errado ao passar o mouse, e repetido no fim do perfil
  function sairDaConta() {
    setSaindo(true)
    // o espelho local do jogo não pode sobrar para o próximo que entrar
    cancelarSync()
    limparLocalDoJogo()
    void sair().finally(() => router.replace('/auth'))
  }

  // no celular a barra fica escondida: arrastar da esquerda para a direita em
  // qualquer ponto da tela abre, e o painel acompanha o dedo em tempo real —
  // arrastar de volta para a esquerda fecha. Um arraste que começa numa carta
  // é ignorado, porque a carta já usa o mesmo gesto para ser jogada.
  useEffect(() => {
    let x0 = 0
    let y0 = 0
    let larguraPainel = 216
    // 'esperando': ainda decidindo se é um arraste do menu; 'seguindo': é, e
    // o painel já está sendo movido; 'ignorando': gesto de outra coisa.
    let fase: 'esperando' | 'seguindo' | 'ignorando' = 'ignorando'

    function progresso(dx: number) {
      const base = aberta ? larguraPainel : 0
      return Math.min(larguraPainel, Math.max(0, base + dx))
    }

    function inicio(e: TouchEvent) {
      const alvo = e.target as Element | null
      // com popup aberto o arraste é do popup (ou de ninguém): abrir o menu
      // por baixo dele deixava as duas coisas empilhadas na tela
      if (popupAberto() || alvo?.closest('[data-carta]')) {
        fase = 'ignorando'
        return
      }
      const t = e.touches[0]
      x0 = t.clientX
      y0 = t.clientY
      larguraPainel = painelRef.current?.getBoundingClientRect().width || larguraPainel
      fase = 'esperando'
    }

    function mover(e: TouchEvent) {
      if (fase === 'ignorando') return
      const t = e.touches[0]
      const dx = t.clientX - x0
      const dy = t.clientY - y0

      if (fase === 'esperando') {
        if (Math.abs(dy) > Math.abs(dx) + 8) {
          fase = 'ignorando'
          return
        }
        if (Math.abs(dx) < 10) return
        // fechado só abre arrastando pra direita; aberto só fecha pra esquerda
        const direcaoValida = aberta ? dx < 0 : dx > 0
        if (!direcaoValida) {
          fase = 'ignorando'
          return
        }
        fase = 'seguindo'
        painelRef.current?.classList.add(styles.arrastando)
      }

      painelRef.current?.style.setProperty('--arraste', `${progresso(dx)}px`)
    }

    function fim(e: TouchEvent) {
      if (fase === 'seguindo') {
        const t = e.changedTouches[0]
        const posicao = progresso(t.clientX - x0)
        painelRef.current?.classList.remove(styles.arrastando)
        painelRef.current?.style.removeProperty('--arraste')
        setAberta(posicao > larguraPainel / 2)
      }
      fase = 'ignorando'
    }

    window.addEventListener('touchstart', inicio, { passive: true })
    window.addEventListener('touchmove', mover, { passive: true })
    window.addEventListener('touchend', fim, { passive: true })
    return () => {
      window.removeEventListener('touchstart', inicio)
      window.removeEventListener('touchmove', mover)
      window.removeEventListener('touchend', fim)
    }
  }, [aberta])

  return (
    <>
      <button
        type="button"
        className={styles.puxador}
        aria-label="Abrir menu"
        onClick={() => setAberta(true)}
      />

      <div
        className={`${styles.backdrop} ${aberta ? styles.backdropVisivel : ''}`}
        onClick={() => setAberta(false)}
        aria-hidden
      />

      <nav className={`${styles.nav} ${aberta ? styles.aberta : ''}`} aria-label="Navegação principal">
        <div ref={painelRef} className={styles.painel}>
          <div className={styles.corpo}>
            <Link className={styles.marca} href="/" onClick={(e) => navegar(e, '/')}>
              <span className={styles.logo} aria-hidden>
                <Coffee size={15} />
                <Hammer size={15} />
                <Droplet size={15} />
              </span>
              <span className={styles.texto}>
                <span className={styles.sigla}>CLT</span>
                <span className={styles.sub}>Coffee, Labor and Tears</span>
              </span>
            </Link>

            {GRUPOS.map((grupo, g) => (
              <div key={g} className={styles.grupoNav}>
                {grupo.map(({ href, label, Icon }) => {
                  const ativo = href === '/' ? pathname === '/' : pathname.startsWith(href)
                  const ponto = href === '/jogar' && runEmAndamento && !ativo
                  return (
                    <Link
                      key={href}
                      className={`${styles.link} ${ativo ? styles.ativo : ''}`}
                      href={href}
                      aria-current={ativo ? 'page' : undefined}
                      onClick={(e) => navegar(e, href)}
                    >
                      <span className={styles.comSino}>
                        <Icon size={18} aria-hidden />
                        {ponto ? <span className={styles.ponto} aria-label="run em andamento" /> : null}
                      </span>
                      <span className={styles.rotulo}>{label}</span>
                    </Link>
                  )
                })}
              </div>
            ))}

            <span className={styles.empurra} />

            {admin ? (
              <Link
                className={`${styles.link} ${pathname.startsWith('/lab') ? styles.ativo : ''}`}
                href="/lab"
                onClick={(e) => navegar(e, '/lab')}
              >
                <TestTube size={18} aria-hidden />
                <span className={styles.rotulo}>Lab</span>
              </Link>
            ) : null}

            <Link
              className={`${styles.link} ${pathname.startsWith('/perfil') ? styles.ativo : ''}`}
              href="/perfil"
              onClick={(e) => navegar(e, '/perfil')}
            >
              {/* o "você" da barra é o seu rosto, não um bonequinho genérico */}
              <Avatar avatar={sessao.avatar} tamanho={22} className={styles.avatarNav} />
              <span className={styles.rotulo}>Perfil</span>
            </Link>

            {sessao.convidado ? null : (
              <button type="button" className={styles.link} onClick={abrirAvisos}>
                <span className={styles.comSino}>
                  <Bell size={18} aria-hidden />
                  {naoLidas > 0 ? <span className={styles.bolinha}>{naoLidas}</span> : null}
                </span>
                <span className={styles.rotulo}>
                  Avisos{naoLidas > 0 ? ` (${naoLidas})` : ''}
                </span>
              </button>
            )}

            <button type="button" className={styles.link} onClick={() => setConfigurando(true)}>
              <Settings size={18} aria-hidden />
              <span className={styles.rotulo}>Configurações</span>
            </button>

          </div>
        </div>
      </nav>

      {avisos ? (
        <Dialogo titulo="Avisos" onFechar={() => setAvisos(null)}>
          <Segmentado
            rotulo="Quais avisos"
            valor={abaAvisos}
            onChange={setAbaAvisos}
            opcoes={[
              { valor: 'novos', rotulo: `Novos${naoLidosNaAbertura > 0 ? ` (${naoLidosNaAbertura})` : ''}` },
              { valor: 'todos', rotulo: 'Todos' },
            ]}
          />
          {(() => {
            // "novos" é o que estava por ler QUANDO o painel abriu: marcar
            // como lido na abertura é o certo (você acabou de ver), mas se a
            // aba lesse `lida_em` agora ela esvaziaria na frente do jogador
            const lista = abaAvisos === 'novos' ? avisos.filter((n) => n.novo) : avisos
            if (lista.length === 0) {
              return (
                <p className={styles.dialogoTexto}>
                  {abaAvisos === 'novos'
                    ? 'Nada novo desde a última vez.'
                    : 'Nada ainda. Aqui aparece quando responderem o seu relato ou quando ele mudar de estado.'}
                </p>
              )
            }
            return (
              <ul className={styles.avisos}>
                {lista.map((n) => (
                  <li key={n.id} className={n.novo ? styles.avisoNovo : ''}>
                    <b>{n.titulo}</b>
                    {n.corpo ? <p className={styles.dialogoTexto}>{n.corpo}</p> : null}
                    <span className={styles.avisoData}>
                      {new Date(n.criado_em).toLocaleDateString('pt-BR')}
                    </span>
                  </li>
                ))}
              </ul>
            )
          })()}
        </Dialogo>
      ) : null}

      {configurando ? (
        <Dialogo
          titulo="Configurações"
          largo
          onFechar={() => setConfigurando(false)}
          acoes={
            <button
              type="button"
              className={`${buttons.button} ${buttons.primary}`}
              onClick={() => setConfigurando(false)}
            >
              Fechar
            </button>
          }
        >
          <div className={styles.grupo}>
            <span className={styles.grupoTitulo}>Tema</span>
            <Segmentado rotulo="Tema" valor={tema} onChange={mudarTema} opcoes={TEMAS} />
            <span className={styles.grupoDica}>
              &ldquo;Sistema&rdquo; acompanha o aparelho, inclusive quando ele troca sozinho de
              noite.
            </span>
          </div>

          <div className={styles.grupo}>
            <span className={styles.grupoTitulo}>Som</span>
            <Check marcado={volumes.mudo} onChange={(v) => mudarVolume('mudo', v)}>
              Mudo — desliga tudo, e solta o som do aparelho
            </Check>
            <Check
              marcado={volumes.baixaFora}
              desabilitado={volumes.mudo}
              onChange={(v) => mudarVolume('baixaFora', v)}
            >
              Música baixa fora do jogo
            </Check>
            <label className={`${styles.controle} ${volumes.mudo ? styles.desligado : ''}`}>
              <span className={styles.controleRotulo}>
                Volume geral <b>{Math.round(volumes.geral * 100)}%</b>
              </span>
              <Slider
                rotulo="Volume geral"
                valor={Math.round(volumes.geral * 100)}
                desabilitado={volumes.mudo}
                onChange={(v) => mudarVolume('geral', v / 100)}
              />
            </label>
            <label className={`${styles.controle} ${volumes.mudo ? styles.desligado : ''}`}>
              <span className={styles.controleRotulo}>
                Volume da música <b>{Math.round(volumes.musica * 100)}%</b>
              </span>
              <Slider
                rotulo="Volume da música"
                valor={Math.round(volumes.musica * 100)}
                desabilitado={volumes.mudo}
                onChange={(v) => mudarVolume('musica', v / 100)}
              />
            </label>
          </div>

          <div className={styles.grupo}>
            <span className={styles.grupoTitulo}>Conta</span>
            <span className={styles.grupoDica}>
              {sessao.convidado
                ? 'Você está sem conta: ao sair, a partida em andamento e as cartas ganhas ficam para trás, e não há como recuperá-las.'
                : 'Sua partida está salva no banco e volta quando você entrar de novo. Este navegador é que fica limpo.'}
            </span>
            <BotaoConfirmar
              className={`${buttons.button} ${styles.botaoSair}`}
              armado={sessao.convidado ? 'Confirmar: perder tudo e sair' : 'Confirmar saída'}
              desabilitado={saindo}
              onConfirmar={sairDaConta}
            >
              <LogOut size={15} aria-hidden />
              {saindo ? 'Saindo…' : sessao.convidado ? 'Sair (e criar conta)' : 'Sair da conta'}
            </BotaoConfirmar>
          </div>
        </Dialogo>
      ) : null}

      {destinoPendente ? (
        <Dialogo
          titulo="Sair sem salvar?"
          onFechar={() => setDestinoPendente(null)}
          acoes={
            <>
              <button
                type="button"
                className={`${buttons.button} ${styles.botaoSair}`}
                onClick={() => {
                  marcarPendencia(null)
                  const { href } = destinoPendente
                  setDestinoPendente(null)
                  router.push(href)
                }}
              >
                Descartar e sair
              </button>
              <button
                type="button"
                className={`${buttons.button} ${buttons.primary}`}
                onClick={() => setDestinoPendente(null)}
              >
                Continuar editando
              </button>
            </>
          }
        >
          <p className={styles.dialogoTexto}>{destinoPendente.aviso}</p>
        </Dialogo>
      ) : null}
    </>
  )
}
