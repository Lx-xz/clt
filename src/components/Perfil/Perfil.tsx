'use client'

import { Check, Copy, Layers, Lock, Pencil, Plus, Trophy, UserCheck, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import AvatarHero from '../AvatarHero'
import BotaoConfirmar from '../BotaoConfirmar'
import Card from '../Card'
import CardDetail from '../CardDetail'
import Conquistas from '../Conquistas'
import Dinheiro from '../Dinheiro'
// direto do arquivo, e não do índice: veja a armadilha "Página que é a
// ÚNICA a importar um componente pelo index.ts" no CLAUDE.md
import ListaDeAmigos from '../ListaDeAmigos/ListaDeAmigos'
import { ReciboResumido, dadosDaLinha } from '../Recibo'
import Segmentado from '../Segmentado'
import { useSessao } from '../SessaoGuard'
import { iconeDaClasse } from '../icons'
import { buscarMeusJogos, buscarRanking } from '@/data/analytics'
import {
  amizadeCom,
  colecaoDeAmigo,
  desfazerAmizade,
  meusAmigos,
  pedidosDeAmizade,
  pedirAmizade,
  responderAmizade,
  type Amigo,
  type EstadoDaAmizade,
  type Pedido,
} from '@/data/amizades'
import { conquistasPublicas, minhasConquistas, pagarConquistas, type Conquista } from '@/data/conquistas'
import { jogosDoJogador, perfilPublico, type JogoResumo, type PerfilPublico } from '@/data/jogadores'
import { carregarDoBanco, sincronizar } from '@/data/sync'
import { NAIPES, contarBaralho } from '@/game/baralho'
import { cartasDoJogo, getCard } from '@/game/catalogo'
import { MAXIMO_DE_BARALHOS, NOMES_DE_RARIDADE, copiarBaralho, copiasMaximas } from '@/game/colecao'
import { loadCollection, loadRun, saveCollection } from '@/game/storage'
import type { BaralhoMontado, CardId, Collection, GameState, Raridade } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import styles from './Perfil.module.sass'

type Aba = 'resumo' | 'conquistas' | 'baralhos' | 'colecao'

interface Posto {
  posicao: number
  total: number
}

const RARIDADES: Raridade[] = ['lendaria', 'epica', 'rara', 'incomum', 'comum']

/**
 * O perfil — o SEU e o de outra pessoa são a mesma página (v0.34). Eram
 * duas, e cada uma tinha o que a outra não tinha: o seu mostrava o rank, o
 * dos outros o placar e o "desde". Agora o cabeçalho é um só (avatar, nick,
 * desde quando, posição, vitórias, derrotas, melhor saldo), e o resto mora
 * em abas:
 *
 * - **Resumo**: a última partida, os selos das conquistas e, no seu, os amigos.
 * - **Conquistas**: a lista inteira, com os níveis e as ocultas. Era um popup.
 * - **Baralhos** e **Coleção**: o seu, e o de quem é seu AMIGO — com o
 *   baralho dele dá para copiar para o seu, ou criar um novo com ele.
 *
 * Quem não é amigo vê só o resumo. Quem decide o que sai do banco é o banco
 * (`colecao_de_amigo` confere a amizade); esconder as abas aqui é só para
 * não oferecer o que não vai abrir.
 */
export default function Perfil({ nick, meu }: { nick: string; meu: boolean }) {
  const sessao = useSessao()
  const [perfil, setPerfil] = useState<PerfilPublico | null | 'nao-achou'>(null)
  const [jogos, setJogos] = useState<JogoResumo[] | null>(null)
  const [posto, setPosto] = useState<Posto | null>(null)
  const [conquistas, setConquistas] = useState<Conquista[] | null>(null)
  const [estado, setEstado] = useState<EstadoDaAmizade | null>(null)
  const [colecao, setColecao] = useState<Collection | null>(null)
  const [aba, setAba] = useState<Aba>('resumo')
  const [amigos, setAmigos] = useState<Amigo[] | null>(null)
  const [pedidos, setPedidos] = useState<Pedido[]>([])

  const amigo = estado === 'amigos'
  const veTudo = meu || amigo

  function carregarAmigos() {
    if (!meu || sessao.convidado) return
    void meusAmigos().then(setAmigos).catch(() => setAmigos(null))
    void pedidosDeAmizade().then(setPedidos).catch(() => {})
  }

  useEffect(() => {
    let vivo = true
    setAba('resumo')
    void perfilPublico(nick)
      .then((p) => vivo && setPerfil(p ?? 'nao-achou'))
      .catch(() => vivo && setPerfil('nao-achou'))
    const jogosDe = meu ? buscarMeusJogos(sessao.id).then((l) => l as JogoResumo[]) : jogosDoJogador(nick)
    void jogosDe.then((l) => vivo && setJogos(l)).catch(() => vivo && setJogos([]))
    void buscarRanking()
      .then((linhas) => {
        const i = linhas.findIndex((l) => l.nick === nick)
        if (vivo && i >= 0) setPosto({ posicao: i + 1, total: linhas.length })
      })
      .catch(() => {})
    if (meu) {
      void minhasConquistas(sessao.id)
        .then((l) => {
          if (!vivo || !l) return
          setConquistas(l)
          // as conquistas pagam tokens (v0.34): quem ganhou antes de elas
          // valerem recebe aqui, na primeira vez que a lista abre
          const antes = loadCollection()
          const depois = pagarConquistas(antes, l)
          if (depois !== antes) {
            saveCollection(depois)
            sincronizar(sessao.id, loadRun<GameState>(), depois, () => {})
          }
        })
        .catch(() => {})
      setColecao(loadCollection())
      void carregarDoBanco(sessao.id)
        .then(({ collection }) => vivo && setColecao(collection))
        .catch(() => {})
      carregarAmigos()
    } else {
      void conquistasPublicas(nick).then((l) => vivo && setConquistas(l)).catch(() => {})
      void amizadeCom(nick).then((e) => vivo && setEstado(e)).catch(() => {})
    }
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nick, meu, sessao.id])

  // a coleção do amigo só é pedida depois que se sabe que são amigos
  useEffect(() => {
    if (meu || !amigo) return
    let vivo = true
    void colecaoDeAmigo(nick).then((c) => vivo && setColecao(c)).catch(() => {})
    return () => {
      vivo = false
    }
  }, [nick, meu, amigo])

  if (perfil === null) return <p className={styles.nota}>Carregando…</p>
  if (perfil === 'nao-achou' && !meu) return <p className={styles.nota}>Não existe ninguém com o nick “{nick}”.</p>
  const dados = perfil === 'nao-achou' ? null : perfil
  const avatar = meu ? sessao.avatar : dados!.avatar
  const desde = dados ? new Date(dados.desde).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : null

  const abas: { valor: Aba; rotulo: string }[] = [
    { valor: 'resumo', rotulo: 'Resumo' },
    { valor: 'conquistas', rotulo: 'Conquistas' },
    ...(colecao ? [{ valor: 'baralhos' as const, rotulo: 'Baralhos' }, { valor: 'colecao' as const, rotulo: 'Cartas' }] : []),
  ]

  return (
    <>
      <AvatarHero avatar={avatar} className={styles.hero}>
        {meu ? (
          <Link className={styles.editar} href="/perfil/editar" aria-label="Editar avatar" title="Editar avatar">
            <Pencil size={18} aria-hidden />
          </Link>
        ) : null}
      </AvatarHero>

      <header className={styles.cabeca}>
        <div className={styles.quem}>
          <h1 className={styles.nick}>{nick}</h1>
          {desde ? <span className={styles.desde}>por aqui desde {desde}</span> : null}
        </div>
        {meu ? null : <BotaoAmizade nick={nick} estado={estado} aoMudar={setEstado} />}
      </header>

      {/* o placar: o MESMO no seu e no dos outros */}
      <div className={styles.placar}>
        <Link className={styles.tijolo} href="/ranking">
          <b>
            <Trophy size={18} aria-hidden /> {posto ? `#${posto.posicao}` : '—'}
          </b>
          <span>{posto ? `de ${posto.total}` : 'fora do ranking'}</span>
        </Link>
        <div className={styles.tijolo}>
          <b className={styles.v}>{dados?.vitorias ?? 0}</b>
          <span>vitórias</span>
        </div>
        <div className={styles.tijolo}>
          <b>{dados?.derrotas ?? 0}</b>
          <span>derrotas</span>
        </div>
        <div className={styles.tijolo}>
          <b>{dados?.melhor_dinheiro == null ? '—' : <Dinheiro valor={dados.melhor_dinheiro} />}</b>
          <span>melhor saldo</span>
        </div>
      </div>

      {veTudo ? (
        <div className={styles.abas}>
          <Segmentado rotulo="Seções do perfil" valor={aba} onChange={(v) => setAba(v as Aba)} opcoes={abas} />
        </div>
      ) : null}

      {aba === 'resumo' || !veTudo ? (
        <Resumo
          nick={nick}
          meu={meu}
          jogos={jogos}
          conquistas={conquistas}
          aoVerConquistas={veTudo ? () => setAba('conquistas') : undefined}
        />
      ) : null}

      {!veTudo && !meu && estado !== null && estado !== 'sem_conta' && !sessao.convidado ? (
        <p className={styles.nota}>Sendo amigos, vocês veem os baralhos e as cartas um do outro.</p>
      ) : null}

      {aba === 'resumo' && meu && !sessao.convidado && amigos !== null ? (
        <section className={styles.secao}>
          <h2 className={styles.titulo}>Amigos</h2>
          {amigos.length === 0 && pedidos.length === 0 ? (
            <p className={styles.nota}>
              Ninguém ainda. Abra o perfil de alguém pelo <Link href="/ranking">ranking</Link> e peça amizade.
            </p>
          ) : (
            <ListaDeAmigos amigos={amigos} pedidos={pedidos} aoMudar={carregarAmigos} />
          )}
        </section>
      ) : null}

      {veTudo && aba === 'conquistas' && conquistas ? (
        <section className={styles.secao}>
          <Conquistas lista={conquistas} vazio="Nenhuma conquista ainda." />
        </section>
      ) : null}

      {veTudo && aba === 'baralhos' && colecao ? <Baralhos colecao={colecao} meu={meu} dono={nick} /> : null}
      {veTudo && aba === 'colecao' && colecao ? <Colecao colecao={colecao} /> : null}
    </>
  )
}

function Resumo({ nick, meu, jogos, conquistas, aoVerConquistas }: {
  nick: string
  meu: boolean
  jogos: JogoResumo[] | null
  conquistas: Conquista[] | null
  aoVerConquistas?: () => void
}) {
  const todas = meu ? '/meus-jogos' : `/meus-jogos?nick=${encodeURIComponent(nick)}`
  const ganhas = conquistas?.filter((c) => c.ganha_em) ?? []
  return (
    <>
      <section className={styles.secao}>
        <div className={styles.cabecaSecao}>
          <h2 className={styles.titulo}>Última partida</h2>
          {jogos && jogos.length > 1 ? (
            <Link className={styles.verTodas} href={todas}>
              Ver todas ({jogos.length})
            </Link>
          ) : null}
        </div>
        {jogos === null ? (
          <p className={styles.nota}>Carregando…</p>
        ) : jogos[0] ? (
          <ReciboResumido id={jogos[0].id} dados={dadosDaLinha(jogos[0])} className={styles.ultima} />
        ) : (
          <p className={styles.nota}>Nenhuma partida terminada ainda.</p>
        )}
      </section>

      {conquistas && conquistas.length > 0 ? (
        <section className={styles.secao}>
          <div className={styles.cabecaSecao}>
            <h2 className={styles.titulo}>
              Conquistas · {ganhas.length}
              {meu ? ` de ${conquistas.length}` : ''}
            </h2>
            {aoVerConquistas ? (
              <button type="button" className={styles.verTodas} onClick={aoVerConquistas}>
                Ver todas
              </button>
            ) : null}
          </div>
          <Conquistas lista={meu ? conquistas : ganhas} selos />
        </section>
      ) : null}
    </>
  )
}

/** Os baralhos montados: o seu, com o atalho para a página de montar, e o do
 *  amigo, com os botões de copiar. */
function Baralhos({ colecao, meu, dono }: { colecao: Collection; meu: boolean; dono: string }) {
  const sessao = useSessao()
  const [recado, setRecado] = useState<string | null>(null)
  const [aberta, setAberta] = useState<CardId | null>(null)
  const [meus, setMeus] = useState(() => loadCollection().baralhos.length)

  async function copiar(b: BaralhoMontado, novo: boolean) {
    const minha = await carregarDoBanco(sessao.id).then((d) => d.collection).catch(() => loadCollection())
    const r = copiarBaralho(minha, b.cartas, `${b.nome} (${dono})`, novo)
    if (r.colecao === minha) return setRecado(`Você já tem ${MAXIMO_DE_BARALHOS} baralhos: apague um para criar outro.`)
    saveCollection(r.colecao)
    sincronizar(sessao.id, loadRun<GameState>(), r.colecao, () => {})
    setMeus(r.colecao.baralhos.length)
    setRecado(
      `${novo ? 'Baralho novo criado e equipado' : 'Copiado para o seu baralho equipado'}.` +
        (r.faltaram > 0 ? ` ${r.faltaram} ${r.faltaram === 1 ? 'cópia ficou' : 'cópias ficaram'} de fora: você ainda não as tem.` : ''),
    )
  }

  return (
    <section className={styles.secao}>
      {meu ? (
        <p className={styles.nota}>
          <Link href="/baralho">Montar os baralhos</Link>
        </p>
      ) : null}
      {recado ? <p className={styles.recado}>{recado}</p> : null}
      <div className={styles.baralhos}>
        {colecao.baralhos.map((b) => {
          const conta = contarBaralho(b)
          const cartas = Object.entries(b.cartas).sort(([a], [x]) => getCard(a).cost - getCard(x).cost || a.localeCompare(x))
          return (
            <article key={b.id} className={styles.baralho}>
              <header className={styles.baralhoCabeca}>
                <Layers size={16} aria-hidden />
                <h3>{b.nome}</h3>
                {b.id === colecao.ativo ? (
                  <span className={styles.equipado}>
                    <Check size={12} aria-hidden /> equipado
                  </span>
                ) : null}
                <span className={styles.qtd}>{conta.total} cartas</span>
              </header>
              <ul className={styles.naipes}>
                {NAIPES.map((n) => {
                  const Icone = iconeDaClasse(n)
                  return (
                    <li key={n} title={n}>
                      <Icone size={14} aria-hidden /> {conta.porNaipe[n]}
                    </li>
                  )
                })}
              </ul>
              <div className={styles.miniGrade}>
                {cartas.map(([id, n]) => (
                  <div key={id} className={styles.mini}>
                    <Card card={getCard(id)} copies={n} onOpen={() => setAberta(id)} />
                  </div>
                ))}
              </div>
              {meu ? null : (
                <div className={styles.copiar}>
                  <button
                    type="button"
                    className={`${buttons.button} ${buttons.primary}`}
                    disabled={meus >= MAXIMO_DE_BARALHOS}
                    title={meus >= MAXIMO_DE_BARALHOS ? `Você já tem ${MAXIMO_DE_BARALHOS} baralhos` : undefined}
                    onClick={() => void copiar(b, true)}
                  >
                    <Plus size={15} aria-hidden /> Criar um baralho com ele
                  </button>
                  <BotaoConfirmar className={buttons.button} armado="Trocar o meu equipado?" onConfirmar={() => void copiar(b, false)}>
                    <Copy size={15} aria-hidden /> Copiar para o meu
                  </BotaoConfirmar>
                </div>
              )}
            </article>
          )
        })}
      </div>
      {aberta ? <CardDetail card={getCard(aberta)} onClose={() => setAberta(null)} /> : null}
    </section>
  )
}

/** As cartas que a pessoa tem, de todas as que existem, por raridade. */
function Colecao({ colecao }: { colecao: Collection }) {
  const [aberta, setAberta] = useState<CardId | null>(null)
  const todas = cartasDoJogo()
  const tem = todas.filter((c) => (colecao.tenho[c.id] ?? 0) > 0).length
  const copias = todas.reduce((t, c) => t + Math.min(colecao.tenho[c.id] ?? 0, copiasMaximas(c)), 0)
  const maximo = todas.reduce((t, c) => t + copiasMaximas(c), 0)
  return (
    <section className={styles.secao}>
      <p className={styles.resumoColecao}>
        <b>{tem}</b> de {todas.length} cartas · {copias} de {maximo} cópias
      </p>
      {RARIDADES.map((r) => {
        const daRaridade = todas
          .filter((c) => (c.raridade ?? 'comum') === r)
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
        if (!daRaridade.length) return null
        return (
          <div key={r} className={styles.raridade}>
            <h3 className={styles.raridadeTitulo}>{NOMES_DE_RARIDADE[r]}</h3>
            <div className={styles.miniGrade}>
              {daRaridade.map((c) => {
                const n = colecao.tenho[c.id] ?? 0
                return (
                  <div key={c.id} className={styles.mini}>
                    {n > 0 ? (
                      <Card card={c} onOpen={() => setAberta(c.id)} />
                    ) : (
                      <Card card={c} locked onOpen={() => setAberta(c.id)} />
                    )}
                    <span className={styles.copias}>
                      {n > 0 ? null : <Lock size={11} aria-hidden />} {n}/{copiasMaximas(c)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
      {aberta ? <CardDetail card={getCard(aberta)} onClose={() => setAberta(null)} /> : null}
    </section>
  )
}

/**
 * O botão de amizade. Um só, que muda de papel conforme o estado: pedir,
 * aceitar o pedido que ela mandou, ou desfazer — com o segundo clique, como
 * toda ação que não se desfaz sozinha. Some no próprio perfil, no banco
 * antigo e no convidado, que ganha a explicação em vez do botão.
 */
function BotaoAmizade({ nick, estado, aoMudar }: {
  nick: string
  estado: EstadoDaAmizade | null
  aoMudar: (e: EstadoDaAmizade) => void
}) {
  const sessao = useSessao()
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  if (sessao.convidado) return <span className={styles.amizadeNota}>Crie uma conta para adicionar amigos.</span>
  if (estado === null || estado === 'eu' || estado === 'sem_conta') return null

  function agir(acao: () => Promise<EstadoDaAmizade>) {
    setOcupado(true)
    setErro(null)
    acao()
      .then(aoMudar)
      .catch((e: unknown) => setErro(e instanceof Error ? e.message : 'Não deu certo.'))
      .finally(() => setOcupado(false))
  }

  return (
    <span className={styles.amizade}>
      {estado === 'nenhuma' ? (
        <button type="button" className={`${buttons.button} ${buttons.primary}`} disabled={ocupado} onClick={() => agir(() => pedirAmizade(nick))}>
          <UserPlus size={15} aria-hidden /> Pedir amizade
        </button>
      ) : null}
      {estado === 'recebido' ? (
        <button
          type="button"
          className={`${buttons.button} ${buttons.primary}`}
          disabled={ocupado}
          onClick={() => agir(async () => (await responderAmizade(nick, true), 'amigos'))}
        >
          <UserCheck size={15} aria-hidden /> Aceitar pedido
        </button>
      ) : null}
      {estado === 'enviado' || estado === 'amigos' ? (
        <>
          <span className={styles.amizadeEstado}>
            {estado === 'amigos' ? (
              <>
                <UserCheck size={15} aria-hidden /> Amigos
              </>
            ) : (
              'Pedido enviado'
            )}
          </span>
          <BotaoConfirmar
            className={`${buttons.button} ${styles.desfazer}`}
            armado={estado === 'amigos' ? 'Confirmar: desfazer' : 'Confirmar: cancelar'}
            desabilitado={ocupado}
            onConfirmar={() => agir(async () => (await desfazerAmizade(nick), 'nenhuma'))}
          >
            {estado === 'amigos' ? 'Desfazer' : 'Cancelar'}
          </BotaoConfirmar>
        </>
      ) : null}
      {erro ? <span className={styles.amizadeNota}>{erro}</span> : null}
    </span>
  )
}
