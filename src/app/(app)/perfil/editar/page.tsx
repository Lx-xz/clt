'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Avatar from '@/components/Avatar'
import { useDefinirSessao, useSessao } from '@/components/SessaoGuard'
import {
  CORES,
  CORPOS,
  CORTES,
  PELES,
  type Avatar as Receita,
} from '@/data/avatar'
import { trocarAvatar } from '@/data/conta'
import buttons from '@/styles/buttons.module.sass'
import styles from './editar.module.sass'

/**
 * O editor. Cada opção é um botão que mostra o próprio avatar com aquela
 * peça trocada — ninguém escolhe "castanho" lendo a palavra, escolhe vendo.
 * Só a cabeça aparece nos botões (`recorte`), porque é ali que a diferença
 * está e o ombro só ocuparia espaço.
 */
export default function EditarAvatarPage() {
  const sessao = useSessao()
  const definirSessao = useDefinirSessao()
  const router = useRouter()
  const [receita, setReceita] = useState<Receita>(sessao.avatar)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const mudou = JSON.stringify(receita) !== JSON.stringify(sessao.avatar)

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

  /** Uma fileira de opções, cada uma desenhada com a peça já trocada. */
  function Grupo<C extends keyof Receita>({
    titulo,
    campo,
    opcoes,
  }: {
    titulo: string
    campo: C
    opcoes: { valor: Receita[C]; rotulo: string }[]
  }) {
    return (
      <section className={styles.grupo}>
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
                onClick={() => setReceita({ ...receita, [campo]: o.valor })}
              >
                <span className={styles.recorte}>
                  <Avatar avatar={{ ...receita, [campo]: o.valor }} tamanho={72} />
                </span>
                <span className={styles.opcaoRotulo}>{o.rotulo}</span>
              </button>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <main className="page">
      <Link className={styles.voltar} href="/perfil">
        <ArrowLeft size={14} aria-hidden />
        voltar ao perfil
      </Link>

      <div className={styles.topo}>
        <Avatar avatar={receita} tamanho={132} className={styles.previa} />
        <div>
          <h1 className={styles.titulo}>Seu avatar</h1>
          <p className={styles.intro}>
            Por enquanto ele só aparece aqui no perfil. As escolhas são guardadas como texto, não
            como imagem — por isso o desenho é sempre nítido, em qualquer tamanho.
          </p>
          {sessao.convidado ? (
            <p className={styles.aviso}>
              Você está como convidado: este avatar fica só neste navegador e se perde ao sair.
            </p>
          ) : null}
        </div>
      </div>

      <Grupo titulo="Corpo" campo="corpo" opcoes={CORPOS} />
      <Grupo titulo="Cabelo" campo="cabelo" opcoes={CORTES} />
      <Grupo titulo="Pele" campo="pele" opcoes={PELES} />
      <Grupo titulo="Cor do cabelo" campo="cor" opcoes={CORES} />

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
