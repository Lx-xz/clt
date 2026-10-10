'use client'

import { ArrowLeft, Dices, EyeOff, Lock } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import Avatar, {
  TONS_DE_CABELO,
  TONS_DE_FUNDO,
  TONS_DE_PELE,
  TONS_DE_ROUPA,
  TONS_DOS_OCULOS,
  corDoChapeu,
} from '@/components/Avatar'
import AvatarHero from '@/components/AvatarHero'
import BotaoConfirmar from '@/components/BotaoConfirmar'
import { PenteIcon } from '@/components/icons'
import { useDefinirSessao, useSessao } from '@/components/SessaoGuard'
import {
  BarbaIcon,
  CabeloIcon,
  ExpressaoIcon,
  ExtrasIcon,
  FundoIcon,
  RostoIcon,
  RoupaIcon,
} from './IconesDasAbas'
import {
  ACESSORIOS,
  BARBAS,
  BARBAS_COM_LADO,
  CORES,
  CORES_DA_BARRA,
  CORES_DO_CHAPEU,
  CORES_DO_HEADSET,
  BRINCOS,
  CORES_DO_BRINCO,
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
import { carregarDoBanco } from '@/data/sync'
import { trancado } from '@/game/cosmeticos'
import { loadCollection } from '@/game/storage'
import { marcarPendencia } from '@/data/pendencias'
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

// as abas são ÍCONES, como no Duolingo: com sete nomes escritos a fileira
// não cabia e rolava de lado. O nome continua no `title` e no leitor de tela
const ABAS: { id: Aba; rotulo: string; Icone: (p: { size?: number }) => ReactNode }[] = [
  { id: 'rosto', rotulo: 'Rosto', Icone: RostoIcon },
  { id: 'olhos', rotulo: 'Expressão', Icone: ExpressaoIcon },
  { id: 'cabelo', rotulo: 'Cabelo', Icone: CabeloIcon },
  { id: 'barba', rotulo: 'Barba', Icone: BarbaIcon },
  { id: 'roupa', rotulo: 'Roupa', Icone: RoupaIcon },
  { id: 'extras', rotulo: 'Acessórios', Icone: ExtrasIcon },
  { id: 'fundo', rotulo: 'Fundo', Icone: FundoIcon },
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
  // os cosméticos que a pessoa tem: o resto das peças trancadas fica
  // escondido. O espelho local abre a página e o banco confirma depois
  const [tenho, setTenho] = useState<string[]>([])

  useEffect(() => {
    setTenho(loadCollection().cosmeticos)
    let vivo = true
    void carregarDoBanco(sessao.id)
      .then(({ collection }) => {
        if (vivo) setTenho(collection.cosmeticos)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [sessao.id])

  const mudou = JSON.stringify(receita) !== JSON.stringify(sessao.avatar)
  const manequim = receita.rosto === 'manequim'
  const abas = manequim ? ABAS.filter((a) => ABAS_DO_MANEQUIM.includes(a.id)) : ABAS
  const abaAtual = abas.some((a) => a.id === aba) ? aba : 'rosto'

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

  const props = { receita, aoMudar: mudar, tenho }

  return (
    <main className={`page ${styles.pagina}`}>
      {/* o cabeçalho fica PRESO no topo, com tudo o que se usa enquanto se
          escolhe: voltar, sortear e salvar. No fim da página, o Salvar
          sumia junto com as abas assim que se rolava até a última cor */}
      <div className={styles.cabecalho}>
        {mudou ? (
          <BotaoConfirmar
            className={styles.voltar}
            classeArmado={styles.voltarArmado}
            armado="Descartar?"
            rotulo="Voltar ao perfil sem salvar"
            onConfirmar={() => {
              marcarPendencia(null)
              router.push('/perfil')
            }}
          >
            <ArrowLeft size={20} aria-hidden />
          </BotaoConfirmar>
        ) : (
          <Link className={styles.voltar} href="/perfil" aria-label="Voltar ao perfil" title="Voltar ao perfil">
            <ArrowLeft size={20} aria-hidden />
          </Link>
        )}
        <h1 className={styles.titulo}>Edite o seu avatar</h1>
        {/* só o ícone: o dado já diz "sorteio", e o espaço do topo é do Salvar */}
        <button
          type="button"
          className={`${buttons.button} ${styles.sortear}`}
          onClick={() => setReceita(avatarAleatorio(tenho))}
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
      {erro ? <p className={styles.erro}>{erro}</p> : null}

      {sessao.convidado ? (
        <p className={styles.aviso}>
          Você está como convidado: este avatar fica só neste navegador e se perde ao sair.
        </p>
      ) : null}

      <div className={styles.editor}>
        <div className={styles.palco}>
          <AvatarHero avatar={receita} className={styles.previa} classeDaFigura={styles.figura} />
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
                  aria-label={a.rotulo}
                  title={a.rotulo}
                  onClick={() => setAba(a.id)}
                >
                  <a.Icone size={26} />
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
                    conteudo={(v) => (v === 'cabelo' ? <PenteIcon size={20} className={styles.pente} /> : null)}
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
                {receita.brinco !== 'nenhum' ? (
                  <Cores
                    titulo="Cor dos brincos"
                    campo="corBrinco"
                    opcoes={CORES_DO_BRINCO}
                    tons={(v) => (v === 'prateado' ? '#c8ccd2' : '#d8a93c')}
                    {...props}
                  />
                ) : null}
                <Formas titulo="Brincos" campo="brinco" opcoes={BRINCOS} {...props} />
                <Formas titulo="No pescoço" campo="cracha" opcoes={CRACHAS} enquadrar="inteiro" {...props} />
              </>
            ) : null}

            {abaAtual === 'fundo' ? (
              <Cores titulo="Fundo" campo="fundo" opcoes={FUNDOS} tons={(v) => TONS_DE_FUNDO[v]} {...props} />
            ) : null}
          </section>

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
function Formas<C extends keyof Receita>({ titulo, campo, opcoes, receita, aoMudar, tenho, enquadrar = 'cabeca' }: {
  titulo: string
  campo: C
  opcoes: Opcao<Receita[C]>[]
  receita: Receita
  aoMudar: (campo: C, valor: Receita[C]) => void
  tenho: string[]
  enquadrar?: Enquadramento
}) {
  const [verTrancadas, setVerTrancadas] = useState(false)
  // a peça trancada fica ESCONDIDA, e não apagada no meio das outras: a
  // grade de quem não tem nada continua sendo só do que dá para usar. A que
  // já está vestida aparece sempre, senão a escolha atual sumiria da tela
  const eTrancada = (o: Opcao<Receita[C]>) => trancado(String(campo), String(o.valor), tenho) && receita[campo] !== o.valor
  const livres = opcoes.filter((o) => !eTrancada(o))
  const trancadas = opcoes.filter(eTrancada)

  const miniatura = (o: Opcao<Receita[C]>) => (
    <span className={`${styles.recorte} ${styles[enquadrar]}`}>
      <Avatar avatar={{ ...receita, [campo]: o.valor }} tamanho={TAMANHO_NA_MINIATURA[enquadrar]} />
    </span>
  )

  return (
    <div className={styles.grupo}>
      <h2 className={styles.grupoTitulo}>{titulo}</h2>
      <div className={styles.opcoes}>
        {livres.map((o) => {
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
              {miniatura(o)}
            </button>
          )
        })}
        {/* as trancadas, só desta categoria, e só quando pedidas — e a
            entrada para elas é a ÚLTIMA peça da grade, e não um botão em
            cima: é mais uma coisa da categoria, não uma ação da página */}
        {verTrancadas
          ? trancadas.map((o) => (
              <span
                key={String(o.valor)}
                className={`${styles.opcao} ${styles.opcaoTrancada}`}
                role="img"
                aria-label={`${o.rotulo}: ainda não desbloqueado`}
                title={`${o.rotulo} · sai de maleta`}
              >
                {miniatura(o)}
                <Lock size={16} className={styles.cadeado} aria-hidden />
              </span>
            ))
          : null}
        {trancadas.length > 0 ? (
          <button
            type="button"
            className={`${styles.opcao} ${styles.verTrancadas}`}
            aria-expanded={verTrancadas}
            onClick={() => setVerTrancadas((v) => !v)}
          >
            <span className={styles.recorte}>
              {verTrancadas ? <EyeOff size={22} aria-hidden /> : <Lock size={22} aria-hidden />}
              <span>{verTrancadas ? 'Esconder' : `Ver não desbloqueados (${trancadas.length})`}</span>
            </span>
          </button>
        ) : null}
      </div>
    </div>
  )
}

/** Uma fileira de CORES, em amostras quadradas. O nome vai no `title` e no
 *  leitor de tela — escrito embaixo de cada amostra, ele ocuparia mais do que
 *  a cor. */
function Cores<C extends keyof Receita>({ titulo, campo, opcoes, tons, conteudo, receita, aoMudar }: {
  titulo: string
  campo: C
  opcoes: Opcao<Receita[C]>[]
  tons: (valor: Receita[C]) => string
  /** Algo desenhado DENTRO da amostra — o pente do "igual ao cabelo": ela
   *  não é uma cor, é "a mesma do cabelo", e uma amostra lisa seria lida
   *  como mais uma cor para escolher. */
  conteudo?: (valor: Receita[C]) => ReactNode
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
              <span style={{ background: tons(o.valor) }}>{conteudo?.(o.valor)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
