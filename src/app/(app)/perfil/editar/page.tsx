'use client'

import { ArrowLeft, Dices } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import Avatar, {
  TONS_DE_CABELO,
  TONS_DE_FUNDO,
  TONS_DE_PELE,
  TONS_DE_ROUPA,
} from '@/components/Avatar'
import BotaoConfirmar from '@/components/BotaoConfirmar'
import { PenteIcon } from '@/components/icons'
import { useDefinirSessao, useSessao } from '@/components/SessaoGuard'
import {
  ACESSORIOS,
  BARBAS,
  CORES,
  CORES_DE_BARBA,
  CORTES,
  FUNDOS,
  OCULOS,
  OLHOS,
  PELES,
  ROSTOS,
  ROUPAS,
  TRONCOS,
  avatarAleatorio,
  type Avatar as Receita,
  type Opcao,
} from '@/data/avatar'
import { trocarAvatar } from '@/data/conta'
import { marcarPendencia } from '@/data/pendencias'
import buttons from '@/styles/buttons.module.sass'
import styles from './editar.module.sass'

/**
 * O editor do avatar, em abas — como o do Duolingo.
 *
 * Eram seis fileiras empilhadas numa página só, e isso funcionava com 23
 * opções. Com dez cortes, oito olhos, cinco barbas e seis roupas, a mesma
 * página virava um muro que se atravessa rolando. Em abas, cada decisão cabe
 * numa tela, e a prévia fica FIXA no topo — mexer num botão lá embaixo sem
 * ver o desenho é escolher no escuro.
 *
 * Duas formas de mostrar opção, de propósito:
 *  - **forma** (corte, olho, barba, roupa) é uma miniatura do próprio avatar
 *    com a peça trocada. Ninguém escolhe "topete" lendo a palavra.
 *  - **cor** é uma amostra redonda. Uma miniatura de 72 px para mudar só a
 *    cor do cabelo era desenhar o avatar inteiro para mostrar um pingo de tinta.
 */

type Aba = 'rosto' | 'olhos' | 'cabelo' | 'barba' | 'roupa' | 'extras' | 'fundo'

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'rosto', rotulo: 'Rosto' },
  { id: 'olhos', rotulo: 'Olhos' },
  { id: 'cabelo', rotulo: 'Cabelo' },
  { id: 'barba', rotulo: 'Barba' },
  { id: 'roupa', rotulo: 'Roupa' },
  { id: 'extras', rotulo: 'Extras' },
  { id: 'fundo', rotulo: 'Fundo' },
]

/** O manequim não tem rosto, cabelo nem roupa para escolher: oferecer essas
 *  abas seria oferecer botão que não muda nada. */
const ABAS_DO_MANEQUIM: Aba[] = ['rosto', 'fundo']

/**
 * Onde a miniatura enquadra. Cada peça tem um lugar no desenho, e a miniatura
 * mostra esse lugar: a cabeça para o corte, o rosto de perto para olho e
 * barba — que no enquadramento da cabeça inteira viram dois pontinhos —, e o
 * corpo inteiro para a roupa, que o recorte da cabeça cortaria fora.
 */
type Enquadramento = 'cabeca' | 'rosto' | 'inteiro'

export default function EditarAvatarPage() {
  const sessao = useSessao()
  const definirSessao = useDefinirSessao()
  const router = useRouter()
  const [receita, setReceita] = useState<Receita>(sessao.avatar)
  const [aba, setAba] = useState<Aba>('rosto')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const mudou = JSON.stringify(receita) !== JSON.stringify(sessao.avatar)

  // sair com coisa por salvar avisa — pela barra lateral (que lê a
  // pendência), pelo "voltar" (que pede o segundo clique) e fechando a aba
  // (o `beforeunload`, que é o navegador quem desenha)
  useEffect(() => {
    if (!mudou) return
    marcarPendencia('As alterações no seu avatar ainda não foram salvas e vão se perder.')
    const aoFechar = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', aoFechar)
    return () => {
      marcarPendencia(null)
      window.removeEventListener('beforeunload', aoFechar)
    }
  }, [mudou])
  const manequim = receita.rosto === 'manequim'
  const abas = manequim ? ABAS.filter((a) => ABAS_DO_MANEQUIM.includes(a.id)) : ABAS
  const abaAtual = abas.some((a) => a.id === aba) ? aba : 'rosto'

  function mudar<C extends keyof Receita>(campo: C, valor: Receita[C]) {
    setReceita({ ...receita, [campo]: valor })
  }

  function salvar() {
    setSalvando(true)
    setErro(null)
    trocarAvatar(sessao, receita)
      .then((nova) => {
        marcarPendencia(null)
        definirSessao(nova)
        router.push('/perfil')
      })
      .catch((e: unknown) => {
        setErro(e instanceof Error ? e.message : 'Não deu para salvar.')
        setSalvando(false)
      })
  }

  return (
    <main className="page">
      {/* TUDO o que se usa enquanto se escolhe fica preso no topo: voltar,
          a prévia, sortear, salvar e as abas. Eram só a prévia e o sortear —
          e no celular, rolando até a última fileira de cores, o salvar
          estava no fim da página e as abas tinham ido embora com o topo */}
      <h1 className={styles.escondido}>Seu avatar</h1>
      <div className={styles.topo}>
        <div className={styles.barra}>
          {mudou ? (
            <BotaoConfirmar
              className={styles.voltar}
              armado="Descartar?"
              rotulo="Voltar ao perfil sem salvar"
              onConfirmar={() => {
                marcarPendencia(null)
                router.push('/perfil')
              }}
            >
              <ArrowLeft size={16} aria-hidden />
              <span className={styles.voltarTexto}>perfil</span>
            </BotaoConfirmar>
          ) : (
            <Link className={styles.voltar} href="/perfil" aria-label="Voltar ao perfil">
              <ArrowLeft size={16} aria-hidden />
              <span className={styles.voltarTexto}>perfil</span>
            </Link>
          )}

          <Avatar avatar={receita} tamanho={120} className={styles.previa} />

          <div className={styles.botoesTopo}>
            <button
              type="button"
              className={`${buttons.button} ${styles.sortear}`}
              onClick={() => setReceita(avatarAleatorio())}
              aria-label="Sortear"
              title="Sortear"
            >
              <Dices size={18} aria-hidden />
            </button>
            <button
              type="button"
              className={`${buttons.button} ${buttons.primary}`}
              disabled={!mudou || salvando}
              onClick={salvar}
            >
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* as abas rolam de lado no celular: sete não cabem em 390 px, e
            quebrar em duas linhas esconderia qual está ativa */}
        <div className={styles.rolaLado}>
          <div className={styles.abas} role="tablist" aria-label="Partes do avatar">
            {abas.map((a) => (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={abaAtual === a.id}
                className={`${styles.aba} ${abaAtual === a.id ? styles.abaAtiva : ''}`}
                onClick={() => setAba(a.id)}
              >
                {a.rotulo}
              </button>
            ))}
          </div>
        </div>
      </div>

      {erro ? <p className={styles.erro}>{erro}</p> : null}
      {sessao.convidado ? (
        <p className={styles.aviso}>
          Você está como convidado: este avatar fica só neste navegador e se perde ao sair.
        </p>
      ) : null}

      <section className={styles.painel} role="tabpanel">
        {abaAtual === 'rosto' ? (
          <>
            <Formas titulo="Formato" campo="rosto" opcoes={ROSTOS} receita={receita} aoMudar={mudar} />
            {manequim ? (
              <p className={styles.nota}>
                O manequim é o avatar de quem ainda não escolheu — de propósito ele não tem rosto
                nem cabelo. Escolha um formato acima para abrir o resto das opções.
              </p>
            ) : (
              <Cores titulo="Pele" campo="pele" opcoes={PELES} tons={(v) => TONS_DE_PELE[v][0]} receita={receita} aoMudar={mudar} />
            )}
          </>
        ) : null}

        {abaAtual === 'olhos' ? (
          <Formas titulo="Olhos" campo="olhos" opcoes={OLHOS} receita={receita} aoMudar={mudar} enquadrar="rosto" />
        ) : null}

        {abaAtual === 'cabelo' ? (
          <>
            <Formas titulo="Corte" campo="cabelo" opcoes={CORTES} receita={receita} aoMudar={mudar} />
            <Cores titulo="Cor" campo="cor" opcoes={CORES} tons={(v) => TONS_DE_CABELO[v][0]} receita={receita} aoMudar={mudar} />
          </>
        ) : null}

        {abaAtual === 'barba' ? (
          <>
            <Formas titulo="Barba" campo="barba" opcoes={BARBAS} receita={receita} aoMudar={mudar} enquadrar="rosto" />
            {receita.barba !== 'nenhuma' ? (
              <Cores
                titulo="Cor"
                campo="corBarba"
                opcoes={CORES_DE_BARBA}
                tons={(v) => TONS_DE_CABELO[v === 'cabelo' ? receita.cor : v][0]}
                conteudo={(v) => (v === 'cabelo' ? <PenteIcon size={18} className={styles.pente} /> : null)}
                receita={receita}
                aoMudar={mudar}
              />
            ) : null}
          </>
        ) : null}

        {abaAtual === 'roupa' ? (
          <>
            <Formas titulo="Modelo" campo="tronco" opcoes={TRONCOS} receita={receita} aoMudar={mudar} enquadrar="inteiro" />
            <Cores titulo="Cor" campo="roupa" opcoes={ROUPAS} tons={(v) => TONS_DE_ROUPA[v]} receita={receita} aoMudar={mudar} />
          </>
        ) : null}

        {abaAtual === 'extras' ? (
          <>
            <Formas titulo="Óculos" campo="oculos" opcoes={OCULOS} receita={receita} aoMudar={mudar} enquadrar="rosto" />
            <Formas titulo="Na cabeça" campo="acessorio" opcoes={ACESSORIOS} receita={receita} aoMudar={mudar} />
            <p className={styles.dica}>O chapéu e o boné vêm na cor da roupa.</p>
          </>
        ) : null}

        {abaAtual === 'fundo' ? (
          <Cores titulo="Fundo" campo="fundo" opcoes={FUNDOS} tons={(v) => TONS_DE_FUNDO[v]} receita={receita} aoMudar={mudar} />
        ) : null}
      </section>

      <p className={styles.intro}>
        Ele aparece no seu perfil, na sua página pública e na mesa — e na mesa ele sente o
        estresse junto com você.
      </p>
    </main>
  )
}

/**
 * Uma fileira de FORMAS, cada uma desenhada com a peça já trocada.
 *
 * Mora fora da página de propósito: declarada lá dentro, ela era um
 * componente NOVO a cada render, e o React desmontava e remontava todas as
 * miniaturas a cada clique.
 */
function Formas<C extends keyof Receita>({ titulo, campo, opcoes, receita, aoMudar, enquadrar = 'cabeca' }: {
  titulo: string
  campo: C
  opcoes: Opcao<Receita[C]>[]
  receita: Receita
  aoMudar: (campo: C, valor: Receita[C]) => void
  enquadrar?: Enquadramento
}) {
  return (
    <div className={styles.grupo}>
      <h2 className={styles.grupoTitulo}>{titulo}</h2>
      <div className={styles.opcoes}>
        {opcoes.map((o) => {
          const ativo = receita[campo] === o.valor
          return (
            <button
              key={String(o.valor)}
              type="button"
              className={`${styles.opcao} ${ativo ? styles.opcaoAtiva : ''}`}
              aria-pressed={ativo}
              onClick={() => aoMudar(campo, o.valor)}
            >
              <span className={`${styles.recorte} ${styles[enquadrar]}`}>
                <Avatar avatar={{ ...receita, [campo]: o.valor }} tamanho={enquadrar === 'rosto' ? 120 : 72} />
              </span>
              <span className={styles.opcaoRotulo}>{o.rotulo}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Uma fileira de CORES, em amostras. O nome aparece no toque e no leitor de
 *  tela — escrito embaixo de cada bolinha, ele ocuparia mais do que a cor. */
function Cores<C extends keyof Receita>({ titulo, campo, opcoes, tons, conteudo, receita, aoMudar }: {
  titulo: string
  campo: C
  opcoes: Opcao<Receita[C]>[]
  tons: (valor: Receita[C]) => string
  /** Algo desenhado DENTRO da amostra — o pente do "igual ao cabelo". */
  conteudo?: (valor: Receita[C]) => ReactNode
  receita: Receita
  aoMudar: (campo: C, valor: Receita[C]) => void
}) {
  const atual = opcoes.find((o) => o.valor === receita[campo])
  return (
    <div className={styles.grupo}>
      <h2 className={styles.grupoTitulo}>
        {titulo}
        {atual ? <span className={styles.corAtual}> · {atual.rotulo}</span> : null}
      </h2>
      <div className={styles.amostras}>
        {opcoes.map((o) => {
          const ativo = receita[campo] === o.valor
          return (
            <button
              key={String(o.valor)}
              type="button"
              className={`${styles.amostra} ${ativo ? styles.amostraAtiva : ''}`}
              style={{ background: tons(o.valor) }}
              aria-pressed={ativo}
              aria-label={o.rotulo}
              title={o.rotulo}
              onClick={() => aoMudar(campo, o.valor)}
            >
              {conteudo?.(o.valor)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
