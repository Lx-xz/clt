'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import Avatar from '@/components/Avatar'
import { buscarDetalheDoJogo, buscarJogoPublico, type DetalheDoJogo } from '@/data/analytics'
import { lerAvatar, type Avatar as Receita } from '@/data/avatar'
import LinhaDoTempo from '@/components/LinhaDoTempo'
import { useSessao } from '@/components/SessaoGuard'
import buttons from '@/styles/buttons.module.sass'
import styles from './detalhe.module.sass'

/**
 * Rota estática (sem [id] dinâmico): o site é export estático, e um segmento
 * dinâmico exigiria listar todo run_id possível em build time. O id vem por
 * query string (?id=), lido no cliente — por isso o useSearchParams precisa
 * do Suspense por fora.
 */
export default function DetalheDoJogoPage() {
  return (
    <Suspense fallback={<main className="page" />}>
      <Detalhe />
    </Suspense>
  )
}

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'nao-encontrado' }
  | { tipo: 'pronto'; jogo: DetalheDoJogo; dono: { nick: string; avatar: Receita } | null }

const ROTULO: Record<DetalheDoJogo['outcome'], string> = {
  vitoria: 'Vitória',
  burnout: 'Burnout',
  demissao: 'Demissão',
  despejo: 'Despejo',
  abandono: 'Pediu demissão',
}

function formatarData(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso))
}

function Detalhe() {
  const params = useSearchParams()
  const idBruto = params.get('id')
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' })
  const sessao = useSessao()

  function carregar() {
    const id = Number(idBruto)
    if (!idBruto || !Number.isFinite(id)) {
      setEstado({ tipo: 'nao-encontrado' })
      return
    }
    setEstado({ tipo: 'carregando' })
    // primeiro como SUA (é o caso comum, e o único que abre a run que você
    // largou no meio); não sendo, como partida pública de outra pessoa
    buscarDetalheDoJogo(id, sessao.id)
      .then(async (jogo) => {
        if (jogo) return setEstado({ tipo: 'pronto', jogo, dono: null })
        const alheio = await buscarJogoPublico(id)
        if (!alheio) return setEstado({ tipo: 'nao-encontrado' })
        setEstado({ tipo: 'pronto', jogo: alheio, dono: { nick: alheio.nick, avatar: lerAvatar(alheio.avatar) } })
      })
      .catch((e: unknown) =>
        setEstado({ tipo: 'erro', mensagem: e instanceof Error ? e.message : 'Não deu para falar com o banco.' }),
      )
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(carregar, [idBruto, sessao.id])

  return (
    <main className="page">
      <div className={styles.top}>
        {estado.tipo === 'pronto' && estado.dono ? (
          <Link className={styles.voltar} href={`/jogador?nick=${encodeURIComponent(estado.dono.nick)}`}>
            ← Perfil de {estado.dono.nick}
          </Link>
        ) : (
          <Link className={styles.voltar} href="/perfil">
            ← Meu perfil
          </Link>
        )}
      </div>
      <h1 className={styles.title}>
        {estado.tipo === 'pronto' && estado.dono ? (
          <span className={styles.dono}>
            <Avatar avatar={estado.dono.avatar} tamanho={40} />
            A partida de {estado.dono.nick}
          </span>
        ) : (
          'Replay da partida'
        )}
      </h1>

      {estado.tipo === 'carregando' ? <p className={styles.empty}>Carregando…</p> : null}

      {estado.tipo === 'nao-encontrado' ? (
        <p className={styles.empty}>Essa partida não existe, ou não está aberta.</p>
      ) : null}

      {estado.tipo === 'erro' ? (
        <div className={styles.erro}>
          <span>{estado.mensagem}</span>
          <button type="button" className={buttons.button} onClick={carregar}>
            Tentar de novo
          </button>
        </div>
      ) : null}

      {estado.tipo === 'pronto' ? <Conteudo jogo={estado.jogo} /> : null}
    </main>
  )
}

function Conteudo({ jogo }: { jogo: DetalheDoJogo }) {
  const historico = jogo.details?.history ?? []
  // as cartas como elas eram NAQUELE dia. Sem isto, mudar o custo de uma
  // carta reescreveria todas as partidas já jogadas
  const retrato = jogo.details?.baralho?.cartas

  return (
    <>
      <div className={styles.resumo}>
        <span className={`${styles.selo} ${styles[jogo.outcome]}`}>{ROTULO[jogo.outcome]}</span>
        <span className={styles.resumoTexto}>
          Semana {jogo.week_reached} · dia {jogo.day} · R$ {jogo.money} · {formatarData(jogo.ended_at)}
          {jogo.details?.baralho ? ` · baralho v${jogo.details.baralho.versao}` : ''}
        </span>
      </div>

      {/* as regras daquele dia, e não as de hoje: esta partida pagou este
          aluguel, e mudar o número agora não pode reescrever o que ela foi */}
      {jogo.details?.modo ? (
        <p className={styles.regrasDaRun}>
          Jogada no modo <b>{jogo.details.modo.nome}</b>: contas de R${' '}
          {jogo.details.modo.contasSemanais} por sexta, energia base{' '}
          {jogo.details.modo.energiaBase}, burnout em {jogo.details.modo.estresseMaximo}.
        </p>
      ) : null}

      {historico.length === 0 ? (
        <p className={styles.empty}>
          Essa run é de antes de o replay existir — só o resumo acima foi guardado.
        </p>
      ) : (
        <LinhaDoTempo
          dias={historico}
          retrato={retrato}
          modo={jogo.details?.modo}
          log={jogo.details?.log}
        />
      )}
    </>
  )
}
