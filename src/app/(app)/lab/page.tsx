'use client'

import { Layers, RotateCcw, Shuffle, SlidersHorizontal, Sparkles, TestTube, Unlock } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import Dialogo from '@/components/Dialogo'
import { useSessao } from '@/components/SessaoGuard'
import { cartasDoJogo } from '@/game/catalogo'
import { clearRun, defaultCollection, loadCollection, saveCollection } from '@/game/storage'
import { sincronizar } from '@/data/sync'
import buttons from '@/styles/buttons.module.sass'
import styles from './lab.module.sass'

const BANCADAS = [
  {
    href: '/lab/avatar',
    titulo: 'Avatar',
    texto: 'Medidas do rosto, cores de teste e peças novas de cabelo. Devolve código para colar.',
    Icon: TestTube,
  },
  {
    href: '/lab/cartas',
    titulo: 'Cartas de ação',
    texto: 'Criar, editar e remover carta — direto no banco, com o motivo da mudança obrigatório.',
    Icon: Layers,
  },
  {
    href: '/lab/regras',
    titulo: 'Regras do jogo',
    texto: 'Aluguel, cota, salário e energia base. Quem já está jogando termina com as regras antigas.',
    Icon: SlidersHorizontal,
  },
  {
    href: '/lab/eventos',
    titulo: 'Cartas de evento',
    texto: 'O mesmo para os eventos do dia, escolhas dos ambíguos inclusas.',
    Icon: Shuffle,
  },
]

/**
 * A porta do lab. As bancadas ficam nas rotas de dentro; aqui em cima moram
 * os dois atalhos de teste que **mudam o SEU jogo** — e é por isso que eles
 * são de admin: com a coleção inteira desbloqueada, um relato de "o jogo está
 * fácil" não diz mais nada, e num ranking com todo mundo junto isso seria
 * vantagem.
 */
export default function LabPage() {
  const sessao = useSessao()
  const [confirmando, setConfirmando] = useState<'desbloquear' | 'resetar' | null>(null)
  const [recado, setRecado] = useState<string | null>(null)

  function desbloquearTudo() {
    const colecao = loadCollection()
    const todas = cartasDoJogo().map((c) => c.id)
    const nova = {
      equipped: colecao.equipped,
      unequipped: todas.filter((id) => !colecao.equipped.includes(id)),
    }
    saveCollection(nova)
    sincronizar(sessao.id, null, nova, () => {})
    setConfirmando(null)
    setRecado(`Coleção com as ${todas.length} cartas. O baralho equipado não mudou.`)
  }

  function resetar() {
    // a run em andamento e a coleção voltam ao começo. O histórico de partidas
    // NÃO é apagado: ele é append-only no banco de propósito, e some daqui
    // seria mentir sobre o balanceamento.
    clearRun()
    const nova = defaultCollection()
    saveCollection(nova)
    sincronizar(sessao.id, null, nova, () => {})
    setConfirmando(null)
    setRecado('Run e coleção zeradas. As partidas já terminadas continuam no histórico.')
  }

  return (
    <main className="page">
      <h1 className={styles.titulo}>Lab</h1>
      <p className={styles.intro}>
        A oficina. As bancadas não salvam nada no banco — elas devolvem código para colar no
        repositório, que continua sendo a fonte da verdade do jogo.
      </p>

      <div className={styles.bancadas}>
        {BANCADAS.map(({ href, titulo, texto, Icon }) => (
          <Link key={href} className={styles.bancada} href={href}>
            <Icon size={20} aria-hidden />
            <b>{titulo}</b>
            <span>{texto}</span>
          </Link>
        ))}
      </div>

      <h2 className={styles.secao}>Atalhos de teste</h2>
      <p className={styles.aviso}>
        Estes dois mexem na <b>sua</b> conta de verdade, agora. Só admin os vê justamente por isso.
      </p>
      <div className={styles.acoes}>
        <button
          type="button"
          className={buttons.button}
          onClick={() => setConfirmando('desbloquear')}
        >
          <Unlock size={15} aria-hidden />
          Desbloquear todas as cartas
        </button>
        <button type="button" className={buttons.button} onClick={() => setConfirmando('resetar')}>
          <RotateCcw size={15} aria-hidden />
          Resetar run e coleção
        </button>
      </div>
      {recado ? (
        <p className={styles.recado}>
          <Sparkles size={14} aria-hidden />
          {recado}
        </p>
      ) : null}

      {confirmando ? (
        <Dialogo
          titulo={confirmando === 'desbloquear' ? 'Desbloquear tudo?' : 'Resetar?'}
          onFechar={() => setConfirmando(null)}
          acoes={
            <>
              <button
                type="button"
                className={`${buttons.button} ${buttons.primary}`}
                onClick={confirmando === 'desbloquear' ? desbloquearTudo : resetar}
              >
                {confirmando === 'desbloquear' ? 'Desbloquear' : 'Resetar'}
              </button>
              <button type="button" className={buttons.button} onClick={() => setConfirmando(null)}>
                Cancelar
              </button>
            </>
          }
        >
          <p className={styles.dialogoTexto}>
            {confirmando === 'desbloquear'
              ? 'As 20 cartas entram na sua coleção, fora do baralho. Serve para testar carta nova sem jogar quatro semanas — e estraga qualquer leitura de dificuldade que venha da sua conta.'
              : 'A run em andamento é descartada e a coleção volta às cartas iniciais. As partidas já terminadas continuam no histórico: elas são append-only de propósito, e apagá-las seria mentir sobre o balanceamento.'}
          </p>
        </Dialogo>
      ) : null}
    </main>
  )
}
