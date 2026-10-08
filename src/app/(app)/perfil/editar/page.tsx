'use client'

import { ArrowLeft, Dices } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Avatar, {
  TONS_DE_CABELO,
  TONS_DE_FUNDO,
  TONS_DE_PELE,
  TONS_DE_ROUPA,
  corDoChapeu,
} from '@/components/Avatar'
import { useDefinirSessao, useSessao } from '@/components/SessaoGuard'
import {
  ACESSORIOS,
  BARBAS,
  CORES,
  CORES_DA_BARRA,
  CORES_DO_CHAPEU,
  CORTES,
  CRACHAS,
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
  { id: 'olhos', rotulo: 'Expressão' },
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
      <Link className={styles.voltar} href="/perfil">
        <ArrowLeft size={14} aria-hidden />
        voltar ao perfil
      </Link>

      <div className={styles.topo}>
        <Avatar avatar={receita} tamanho={132} className={styles.previa} />
        <div className={styles.topoTexto}>
          <h1 className={styles.titulo}>Seu avatar</h1>
          <p className={styles.intro}>
            Ele aparece no seu perfil, na sua página pública e na mesa — e na mesa ele sente o
            estresse junto com você.
          </p>
          {sessao.convidado ? (
            <p className={styles.aviso}>
              Você está como convidado: este avatar fica só neste navegador e se perde ao sair.
            </p>
          ) : null}
          <button
            type="button"
            className={`${buttons.button} ${styles.sortear}`}
            onClick={() => setReceita(avatarAleatorio())}
          >
            <Dices size={15} aria-hidden />
            Sortear
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
          <Formas titulo="Expressão" campo="olhos" opcoes={OLHOS} receita={receita} aoMudar={mudar} enquadrar="rosto" />
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
                titulo="Cor da barba"
                campo="corBarba"
                opcoes={CORES_DA_BARRA}
                tons={(v) => TONS_DE_CABELO[v === 'cabelo' ? receita.cor : v][0]}
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
            {receita.acessorio === 'bone' || receita.acessorio === 'chapeu' ? (
              <Cores
                titulo={receita.acessorio === 'bone' ? 'Cor do boné' : 'Cor do chapéu'}
                campo="corChapeu"
                opcoes={CORES_DO_CHAPEU}
                tons={(v) => corDoChapeu(v, receita.roupa)}
                receita={receita}
                aoMudar={mudar}
              />
            ) : null}
            <Formas titulo="No pescoço" campo="cracha" opcoes={CRACHAS} receita={receita} aoMudar={mudar} enquadrar="inteiro" />
          </>
        ) : null}

        {abaAtual === 'fundo' ? (
          <Cores titulo="Fundo" campo="fundo" opcoes={FUNDOS} tons={(v) => TONS_DE_FUNDO[v]} receita={receita} aoMudar={mudar} />
        ) : null}
      </section>

      {erro ? <p className={styles.erro}>{erro}</p> : null}

      <div className={styles.acoes}>
        <button
          type="button"
          className={`${buttons.button} ${buttons.primary}`}
          disabled={!mudou || salvando}
          onClick={salvar}
        >
          {salvando ? 'Salvando…' : mudou ? 'Salvar' : 'Nada mudou'}
        </button>
        <Link className={buttons.button} href="/perfil">
          Cancelar
        </Link>
      </div>
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
function Cores<C extends keyof Receita>({ titulo, campo, opcoes, tons, receita, aoMudar }: {
  titulo: string
  campo: C
  opcoes: Opcao<Receita[C]>[]
  tons: (valor: Receita[C]) => string
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
            />
          )
        })}
      </div>
    </div>
  )
}
