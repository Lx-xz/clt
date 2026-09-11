'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  BookOpen,
  ChartColumn,
  Coffee,
  Droplet,
  Hammer,
  History,
  House,
  Layers,
  LogOut,
  MessageSquareWarning,
  Play,
  RotateCcw,
  Settings,
  Sparkles,
  TestTube,
  Trophy,
  User,
} from 'lucide-react'
import Check from './Check'
import ComoJogar from './ComoJogar'
import Slider from './Slider'
import Dialogo, { popupAberto } from './Dialogo'
import Segmentado from './Segmentado'
import { useSessao } from './SessaoGuard'
import { gravarVolumes, lerVolumes, VOLUMES_PADRAO, type Volumes } from '@/data/som'
import { gravarTema, lerTema, TEMAS, type Tema } from '@/data/tema'
import { souAdmin } from '@/data/feedback'
import { sair } from '@/data/conta'
import { cancelarSync } from '@/data/sync'
import { limparLocalDoJogo } from '@/game/storage'
import { marcarNotificacoesLidas, minhasNotificacoes, type Notificacao } from '@/data/notificacoes'
import buttons from '@/styles/buttons.module.sass'
import styles from './SideNav.module.sass'

const LINKS = [
  { href: '/', label: 'Início', Icon: House },
  { href: '/jogar', label: 'Jogar', Icon: Play },
  { href: '/baralho', label: 'Baralho', Icon: Layers },
  { href: '/meus-jogos', label: 'Meus jogos', Icon: History },
  { href: '/ranking', label: 'Ranking', Icon: Trophy },
  { href: '/analytics', label: 'Análise', Icon: ChartColumn },
  { href: '/feedback', label: 'Feedbacks', Icon: MessageSquareWarning },
  { href: '/changelog', label: 'Novidades', Icon: Sparkles },
]

/** Disparado ao confirmar o reinício; a mesa escuta e começa uma run nova. */
export const EVENTO_REINICIAR = 'clt:reiniciar-run'

export default function SideNav() {
  const pathname = usePathname()
  const [aberta, setAberta] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [configurando, setConfigurando] = useState(false)
  const [tutorial, setTutorial] = useState(false)
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
  const [confirmandoSaida, setConfirmandoSaida] = useState(false)
  // o laboratório do avatar é ferramenta de dono do jogo: quem diz se você é
  // admin é o banco, não o perfil espelhado no navegador
  const [admin, setAdmin] = useState(sessao.admin)
  const [abaAvisos, setAbaAvisos] = useState<'novos' | 'todos'>('novos')
  const [saindo, setSaindo] = useState(false)
  const painelRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // ao mudar de página o gaveteiro do celular se fecha sozinho
  useEffect(() => {
    setAberta(false)
    setConfirmando(false)
    setConfigurando(false)
    setTutorial(false)
    setAvisos(null)
    setConfirmandoSaida(false)
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

  function sairDaConta() {
    setSaindo(true)
    // o espelho local do jogo não pode sobrar para o próximo que entrar
    cancelarSync()
    limparLocalDoJogo()
    void sair().finally(() => router.replace('/'))
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

  const naMesa = pathname.startsWith('/jogar')

  function confirmarReinicio(guardar: boolean) {
    setConfirmando(false)
    setAberta(false)
    window.dispatchEvent(new CustomEvent(EVENTO_REINICIAR, { detail: { guardar } }))
  }

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
            <Link className={styles.marca} href="/">
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

            {LINKS.map(({ href, label, Icon }) => {
              const ativo = href === '/' ? pathname === '/' : pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  className={`${styles.link} ${ativo ? styles.ativo : ''}`}
                  href={href}
                  aria-current={ativo ? 'page' : undefined}
                >
                  <Icon size={18} aria-hidden />
                  <span className={styles.rotulo}>{label}</span>
                </Link>
              )
            })}

            <span className={styles.empurra} />

            {naMesa ? (
              <button type="button" className={styles.link} onClick={() => setConfirmando(true)}>
                <RotateCcw size={18} aria-hidden />
                <span className={styles.rotulo}>Reiniciar run</span>
              </button>
            ) : null}

            {admin ? (
              <Link
                className={`${styles.link} ${pathname.startsWith('/avatar-lab') ? styles.ativo : ''}`}
                href="/avatar-lab"
              >
                <TestTube size={18} aria-hidden />
                <span className={styles.rotulo}>Lab do avatar</span>
              </Link>
            ) : null}

            <button type="button" className={styles.link} onClick={() => setTutorial(true)}>
              <BookOpen size={18} aria-hidden />
              <span className={styles.rotulo}>Como jogar</span>
            </button>

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

            <Link
              className={`${styles.link} ${pathname.startsWith('/perfil') ? styles.ativo : ''}`}
              href="/perfil"
            >
              <User size={18} aria-hidden />
              <span className={styles.rotulo}>Perfil</span>
            </Link>

            <button type="button" className={styles.link} onClick={() => setConfigurando(true)}>
              <Settings size={18} aria-hidden />
              <span className={styles.rotulo}>Configurações</span>
            </button>

            <button
              type="button"
              className={`${styles.link} ${styles.sair}`}
              onClick={() => setConfirmandoSaida(true)}
            >
              <LogOut size={18} aria-hidden />
              <span className={styles.rotulo}>
                {sessao.convidado ? 'Sair (e criar conta)' : 'Sair'}
              </span>
            </button>

            <span className={styles.rodape}>4 semanas · 20 dias</span>
          </div>
        </div>
      </nav>

      {tutorial ? <ComoJogar onFechar={() => setTutorial(false)} /> : null}

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
              Mudo — desliga tudo de uma vez
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
        </Dialogo>
      ) : null}

      {confirmandoSaida ? (
        <Dialogo
          titulo={sessao.convidado ? 'Sair como convidado?' : 'Sair da conta?'}
          onFechar={() => setConfirmandoSaida(false)}
          acoes={
            <>
              <button
                type="button"
                className={`${buttons.button} ${buttons.primary}`}
                disabled={saindo}
                onClick={sairDaConta}
              >
                {saindo ? 'Saindo…' : 'Sair'}
              </button>
              <button
                type="button"
                className={buttons.button}
                onClick={() => setConfirmandoSaida(false)}
              >
                Ficar
              </button>
            </>
          }
        >
          <p className={styles.dialogoTexto}>
            {sessao.convidado
              ? 'Você está sem conta: a partida em andamento e as cartas ganhas ficam para trás, e não há como recuperá-las. Criar conta agora leva um minuto e guarda tudo daqui para a frente.'
              : 'Sua partida está salva no banco e volta quando você entrar de novo. Este navegador é que fica limpo.'}
          </p>
        </Dialogo>
      ) : null}

      {confirmando ? (
        <Dialogo
          titulo="Reiniciar a run?"
          onFechar={() => setConfirmando(false)}
          acoes={
            <>
              <button
                type="button"
                className={`${buttons.button} ${buttons.primary}`}
                onClick={() => confirmarReinicio(true)}
              >
                Guardar e reiniciar
              </button>
              <button
                type="button"
                className={buttons.button}
                onClick={() => confirmarReinicio(false)}
              >
                Reiniciar sem guardar
              </button>
              <button
                type="button"
                className={buttons.button}
                onClick={() => setConfirmando(false)}
              >
                Cancelar
              </button>
            </>
          }
        >
          <p className={styles.dialogoTexto}>
            O mês atual é descartado e um novo começa do dia 1. Não dá para desfazer. Quer guardar
            este mês no seu histórico antes?
          </p>
        </Dialogo>
      ) : null}
    </>
  )
}
