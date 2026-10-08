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
  TONS_DOS_OCULOS,
  corDoChapeu,
} from '@/components/Avatar'
import AvatarHero from '@/components/AvatarHero'
import { useDefinirSessao, useSessao } from '@/components/SessaoGuard'
import {
  ACESSORIOS,
  BARBAS,
  BARBAS_COM_LADO,
  CORES,
  CORES_DA_BARRA,
  CORES_DO_CHAPEU,
  CORES_DO_HEADSET,
  CORES_DOS_OCULOS,
  CORTES,
  CRACHAS,
  FUNDOS,
  LADOS_DA_BARBA,
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
 * No computador a figura fica GRANDE à esquerda, parada, e as opções à
 * direita: mexer num botão sem ver o desenho é escolher no escuro, e a
 * prévia de 132 px no topo mostrava o avatar menor que a própria miniatura
 * da opção. No celular a figura vai para cima, presa enquanto as opções rolam.
 *
 * Duas formas de mostrar opção, de propósito, e nenhuma com nome escrito
 * (o nome vai no `title` e no leitor de tela):
 *  - **forma** (corte, expressão, barba, roupa) é uma miniatura do próprio
 *    avatar com a peça trocada. Ninguém escolhe "topete" lendo a palavra.
 *  - **cor** é uma amostra quadrada.
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
 * mostra esse lugar: a cabeça para o corte, o rosto de perto para expressão e
 * barba — que no enquadramento da cabeça inteira viram dois pontinhos —, e o
 * corpo inteiro para a roupa, que o recorte da cabeça cortaria fora.
 */
type Enquadramento = 'cabeca' | 'rosto' | 'inteiro'

/** O tamanho em que o avatar é desenhado dentro da janela de 104 px de cada
 *  enquadramento; o deslocamento mora no CSS (`.cabeca`, `.rosto`). */
const TAMANHO_NA_MINIATURA: Record<Enquadramento, number> = { cabeca: 128, rosto: 200, inteiro: 104 }

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

  const props = { receita, aoMudar: mudar }

  return (
    <main className={`page ${styles.pagina}`}>
      <div className={styles.cabecalho}>
        <Link className={styles.voltar} href="/perfil" aria-label="Voltar ao perfil" title="Voltar ao perfil">
          <ArrowLeft size={20} aria-hidden />
        </Link>
        <h1 className={styles.titulo}>Edite o seu avatar</h1>
        <button type="button" className={`${buttons.button} ${styles.sortear}`} onClick={() => setReceita(avatarAleatorio())}>
          <Dices size={15} aria-hidden />
          Sortear
        </button>
      </div>

      {sessao.convidado ? (
        <p className={styles.aviso}>
          Você está como convidado: este avatar fica só neste navegador e se perde ao sair.
        </p>
      ) : null}

      <div className={styles.editor}>
        <div className={styles.palco}>
          <AvatarHero avatar={receita} className={styles.previa} />
        </div>

        <div className={styles.lado}>
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
                <Formas titulo="Formato" campo="rosto" opcoes={ROSTOS} {...props} />
                {manequim ? (
                  <p className={styles.nota}>
                    O manequim é o avatar de quem ainda não escolheu — de propósito ele não tem rosto
                    nem cabelo. Escolha um formato acima para abrir o resto das opções.
                  </p>
                ) : (
                  <Cores titulo="Tom da pele" campo="pele" opcoes={PELES} tons={(v) => TONS_DE_PELE[v][0]} {...props} />
                )}
              </>
            ) : null}

            {abaAtual === 'olhos' ? (
              <>
                <Formas titulo="Expressão" campo="olhos" opcoes={OLHOS} enquadrar="rosto" {...props} />
                <p className={styles.nota}>
                  É a cara do seu perfil. Na mesa ela muda com o estresse — e toda run começa tranquila.
                </p>
              </>
            ) : null}

            {abaAtual === 'cabelo' ? (
              <>
                <Cores titulo="Cor do cabelo" campo="cor" opcoes={CORES} tons={(v) => TONS_DE_CABELO[v][0]} {...props} />
                <Formas titulo="Corte" campo="cabelo" opcoes={CORTES} {...props} />
              </>
            ) : null}

            {abaAtual === 'barba' ? (
              <>
                {receita.barba !== 'nenhuma' ? (
                  <Cores
                    titulo="Cor da barba"
                    campo="corBarba"
                    opcoes={CORES_DA_BARRA}
                    tons={(v) => TONS_DE_CABELO[v === 'cabelo' ? receita.cor : v][0]}
                    {...props}
                  />
                ) : null}
                <Formas titulo="Barba" campo="barba" opcoes={BARBAS} enquadrar="rosto" {...props} />
                {BARBAS_COM_LADO.includes(receita.barba) ? (
                  <Formas titulo="Até o cabelo" campo="ladoBarba" opcoes={LADOS_DA_BARBA} {...props} />
                ) : null}
              </>
            ) : null}

            {abaAtual === 'roupa' ? (
              <>
                <Cores titulo="Cor da roupa" campo="roupa" opcoes={ROUPAS} tons={(v) => TONS_DE_ROUPA[v]} {...props} />
                <Formas titulo="Modelo" campo="tronco" opcoes={TRONCOS} enquadrar="inteiro" {...props} />
              </>
            ) : null}

            {abaAtual === 'extras' ? (
              <>
                {receita.oculos !== 'nenhum' ? (
                  <Cores titulo="Cor dos óculos" campo="corOculos" opcoes={CORES_DOS_OCULOS} tons={(v) => TONS_DOS_OCULOS[v]} {...props} />
                ) : null}
                <Formas titulo="Óculos" campo="oculos" opcoes={OCULOS} enquadrar="rosto" {...props} />
                {receita.acessorio === 'bone' || receita.acessorio === 'chapeu' ? (
                  <Cores
                    titulo={receita.acessorio === 'bone' ? 'Cor do boné' : 'Cor do chapéu'}
                    campo="corChapeu"
                    opcoes={CORES_DO_CHAPEU}
                    tons={(v) => corDoChapeu(v, receita.roupa)}
                    {...props}
                  />
                ) : null}
                {receita.acessorio === 'headset' ? (
                  <Cores
                    titulo="Cor do headset"
                    campo="corHeadset"
                    opcoes={CORES_DO_HEADSET}
                    tons={(v) => (v === 'branco' ? '#ece8df' : '#33302b')}
                    {...props}
                  />
                ) : null}
                <Formas titulo="Na cabeça" campo="acessorio" opcoes={ACESSORIOS} {...props} />
                <Formas titulo="No pescoço" campo="cracha" opcoes={CRACHAS} enquadrar="inteiro" {...props} />
              </>
            ) : null}

            {abaAtual === 'fundo' ? (
              <Cores titulo="Fundo" campo="fundo" opcoes={FUNDOS} tons={(v) => TONS_DE_FUNDO[v]} {...props} />
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
        </div>
      </div>
    </main>
  )
}

/**
 * Uma grade de FORMAS, cada uma desenhada com a peça já trocada.
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
              aria-label={o.rotulo}
              title={o.rotulo}
              onClick={() => aoMudar(campo, o.valor)}
            >
              <span className={`${styles.recorte} ${styles[enquadrar]}`}>
                <Avatar avatar={{ ...receita, [campo]: o.valor }} tamanho={TAMANHO_NA_MINIATURA[enquadrar]} />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Uma fileira de CORES, em amostras quadradas. O nome vai no `title` e no
 *  leitor de tela — escrito embaixo de cada amostra, ele ocuparia mais do que
 *  a cor. */
function Cores<C extends keyof Receita>({ titulo, campo, opcoes, tons, receita, aoMudar }: {
  titulo: string
  campo: C
  opcoes: Opcao<Receita[C]>[]
  tons: (valor: Receita[C]) => string
  receita: Receita
  aoMudar: (campo: C, valor: Receita[C]) => void
}) {
  return (
    <div className={styles.grupo}>
      <h2 className={styles.grupoTitulo}>{titulo}</h2>
      <div className={styles.amostras}>
        {opcoes.map((o) => {
          const ativo = receita[campo] === o.valor
          return (
            <button
              key={String(o.valor)}
              type="button"
              className={`${styles.amostra} ${ativo ? styles.amostraAtiva : ''}`}
              aria-pressed={ativo}
              aria-label={o.rotulo}
              title={o.rotulo}
              onClick={() => aoMudar(campo, o.valor)}
            >
              <span style={{ background: tons(o.valor) }} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
