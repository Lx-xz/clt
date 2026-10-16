'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { catalogoPronto, recarregarCatalogo } from '@/data/cartas'
import { aoMudarConta, lerConta } from '@/data/conta'
import { lerSessao, type Sessao } from '@/game/session'
import buttons from '@/styles/buttons.module.sass'
import styles from './SessaoGuard.module.sass'

const Contexto = createContext<Sessao | null>(null)
const ContextoDefinir = createContext<((s: Sessao) => void) | null>(null)

/** Quem está jogando. Só pode ser chamado dentro do guarda. */
export function useSessao(): Sessao {
  const sessao = useContext(Contexto)
  if (!sessao) throw new Error('useSessao precisa estar dentro de SessaoGuard.')
  return sessao
}

/** A sessão, se houver guarda em volta; fora dela, `null` em vez de erro.
 *  É para o que aparece dentro e fora do jogo, como a abertura das
 *  recompensas (que veste o item no avatar de quem abre). */
export function useSessaoSeHouver(): Sessao | null {
  return useContext(Contexto)
}

/**
 * Troca a sessão em memória sem ida ao banco. A guarda vive no layout, que
 * não remonta ao navegar entre páginas — sem isto, trocar o avatar só
 * apareceria depois de recarregar o site inteiro.
 */
export function useDefinirSessao(): (s: Sessao) => void {
  const definir = useContext(ContextoDefinir)
  if (!definir) throw new Error('useDefinirSessao precisa estar dentro de SessaoGuard.')
  return definir
}

/**
 * Sem conta (ou sem convidado) não há save: manda voltar para a entrada.
 *
 * O espelho local do perfil serve para a mesa abrir sem piscar "carregando" a
 * cada navegação; a confirmação com o banco vem logo atrás e corrige o que
 * estiver velho — inclusive mandar embora quem saiu da conta em outra aba.
 */
export default function SessaoGuard({ children }: { children: React.ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(() => lerSessao())
  const [pronto, setPronto] = useState(false)
  const [semCartas, setSemCartas] = useState(false)
  const [tentando, setTentando] = useState(false)
  const router = useRouter()
  // o /lab abre mesmo sem cartas: é lá que nascem as primeiras de um banco
  // vazio, e sem esta exceção ninguém conseguiria criá-las
  const noLab = usePathname().startsWith('/lab')

  const conferir = useCallback(() => {
    // o catálogo entra junto com a conta, em paralelo: as duas são uma ida ao
    // banco cada, e esperar as duas custa o mesmo que esperar a mais lenta.
    // A mesa não pode abrir antes do catálogo — começar a run com o baralho
    // de referência e terminá-la com o do banco seria trocar as cartas no
    // meio do jogo
    Promise.all([lerConta(), catalogoPronto()])
      .then(([conta, jogavel]) => {
        setSemCartas(!jogavel)
        if (conta.tipo === 'conta' || conta.tipo === 'convidado') {
          setSessao(conta.perfil)
          setPronto(true)
          return
        }
        // fora, ou cadastro pela metade: as duas coisas se resolvem na entrada
        setSessao(null)
        router.replace('/auth')
      })
      .catch(() => {
        // banco fora do ar: quem já tem espelho local continua jogando (o
        // save local segura a run), quem não tem volta para a entrada
        if (!lerSessao()) return router.replace('/auth')
        // o catálogo nunca falha (sem rede ele cai na cópia local), então
        // esperá-lo aqui é só ler o que ele já decidiu
        void catalogoPronto().then((jogavel) => {
          setSemCartas(!jogavel)
          setPronto(true)
        })
      })
  }, [router])

  useEffect(() => {
    conferir()
    return aoMudarConta(conferir)
  }, [conferir])

  if (!pronto || !sessao) {
    return <div className={styles.espera}>Batendo o ponto…</div>
  }

  // as cartas moram só no banco: sem ele, e sem a cópia que ele deixou neste
  // navegador, não há com o que jogar — e abrir a mesa vazia seria pior do
  // que dizer isso
  if (semCartas && !noLab) {
    return (
      <div className={styles.semCartas}>
        <p>Não consegui carregar as cartas.</p>
        <p className={styles.dica}>Confira a conexão e tente de novo.</p>
        <button
          type="button"
          className={`${buttons.button} ${buttons.primary}`}
          disabled={tentando}
          onClick={() => {
            setTentando(true)
            void recarregarCatalogo().then((jogavel) => {
              setSemCartas(!jogavel)
              setTentando(false)
            })
          }}
        >
          {tentando ? 'Tentando…' : 'Tentar de novo'}
        </button>
      </div>
    )
  }

  return (
    <Contexto.Provider value={sessao}>
      <ContextoDefinir.Provider value={setSessao}>{children}</ContextoDefinir.Provider>
    </Contexto.Provider>
  )
}
