'use client'

import { ArrowLeft, Check, Lock } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import Avatar from '@/components/Avatar'
import BotaoConfirmar from '@/components/BotaoConfirmar'
import AberturaDeMaleta, { MaletaDesenhada } from '@/components/Maleta'
import { useDefinirSessao, useSessao } from '@/components/SessaoGuard'
import { avatarAleatorio, type Avatar as Receita } from '@/data/avatar'
import { trocarAvatar } from '@/data/conta'
import { carregarDoBanco, sincronizar } from '@/data/sync'
import { NOMES_DE_RARIDADE } from '@/game/colecao'
import { COSMETICOS, MALETAS, abrirMaleta, type Cosmetico, type TipoMaleta } from '@/game/cosmeticos'
import { loadCollection, loadRun, saveCollection } from '@/game/storage'
import type { Collection, GameState, Raridade } from '@/game/types'
import envelopes from '../envelopes/envelopes.module.sass'
import styles from './maletas.module.sass'

const TIPOS: TipoMaleta[] = ['bronze', 'prata', 'ouro']
const RARIDADES: Raridade[] = ['comum', 'incomum', 'rara', 'epica', 'lendaria']

/**
 * A bancada das maletas: a recompensa de COSMÉTICO, que por enquanto só
 * existe aqui. Diferente da bancada de envelopes, **esta mexe na sua conta**:
 * o que sai da maleta fica desbloqueado de verdade, e é assim que dá para
 * testar o caminho inteiro — abrir, vestir na hora, e achar a peça no editor
 * do avatar. "Trancar de novo" desfaz, para testar outra vez.
 */
export default function LabMaletasPage() {
  const sessao = useSessao()
  const definirSessao = useDefinirSessao()
  const [colecao, setColecao] = useState<Collection | null>(null)
  const [abrindo, setAbrindo] = useState<{ tipo: TipoMaleta; cosmetico: Cosmetico; nova: boolean } | null>(null)
  // o manequim não veste nada ("ainda não escolhi" não usa óculos): para
  // MOSTRAR a peça, a abertura veste um avatar sorteado no lugar dele
  const [modelo] = useState<Receita>(() => ({ ...avatarAleatorio(), oculos: 'nenhum', acessorio: 'nenhum' }))
  const base = sessao.avatar.rosto === 'manequim' ? modelo : sessao.avatar

  useEffect(() => {
    setColecao(loadCollection())
    let vivo = true
    void carregarDoBanco(sessao.id)
      .then(({ collection }) => {
        if (vivo) setColecao(collection)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [sessao.id])

  function guardar(c: Collection) {
    saveCollection(c)
    setColecao(c)
    sincronizar(sessao.id, loadRun<GameState>(), c, () => {})
  }

  function abrir(tipo: TipoMaleta) {
    if (!colecao) return
    const r = abrirMaleta(tipo, colecao.cosmeticos)
    if (!r) return
    // grava ANTES da animação, como o envelope: fechar no meio não perde a peça
    if (r.nova) guardar({ ...colecao, cosmeticos: [...colecao.cosmeticos, r.cosmetico.id] })
    setAbrindo({ tipo, ...r })
  }

  function equipar(c: Cosmetico) {
    const receita = { ...base, [c.campo]: c.valor } as Receita
    void trocarAvatar(sessao, receita).then(definirSessao)
    setAbrindo(null)
  }

  const tenho = colecao?.cosmeticos ?? []

  return (
    <main className="page">
      <Link href="/lab" className={envelopes.voltar}>
        <ArrowLeft size={14} aria-hidden /> Lab
      </Link>
      <h1 className={envelopes.titulo}>Maletas</h1>
      <p className={envelopes.intro}>
        A recompensa de cosmético, por enquanto só aqui. <b>Esta bancada mexe na sua conta</b>: o que sair
        fica desbloqueado de verdade, aparece no editor do avatar e dá para vestir na hora. Para quem não
        tem, as peças trancadas ficam escondidas no editor, atrás do “ver não desbloqueados”.
      </p>

      <div className={styles.maletas}>
        {TIPOS.map((tipo) => (
          <div key={tipo} className={styles.maleta}>
            <MaletaDesenhada
              tipo={tipo}
              largura={110}
              rotulo={`Abrir uma ${MALETAS[tipo].nome.toLowerCase()}`}
              onClick={() => abrir(tipo)}
            />
            <b>{MALETAS[tipo].nome}</b>
          </div>
        ))}
      </div>

      <h2 className={envelopes.secao}>Cosméticos · {tenho.length} de {COSMETICOS.length} na sua conta</h2>
      <ul className={styles.cosmeticos}>
        {COSMETICOS.map((c) => {
          const meu = tenho.includes(c.id)
          return (
            <li key={c.id} className={meu ? '' : styles.trancado}>
              <span className={styles.rosto}>
                <Avatar avatar={{ ...base, [c.campo]: c.valor } as Receita} tamanho={120} />
              </span>
              <span>
                <b>{c.nome}</b>
                <small className={envelopes[`r_${c.raridade}`]}>{NOMES_DE_RARIDADE[c.raridade]}</small>
              </span>
              {meu ? <Check size={18} aria-label="desbloqueado" /> : <Lock size={18} aria-label="trancado" />}
            </li>
          )
        })}
      </ul>
      {tenho.length > 0 && colecao ? (
        <BotaoConfirmar
          className={styles.trancar}
          armado="Trancar mesmo?"
          rotulo="Trancar de novo os cosméticos desta conta"
          onConfirmar={() => guardar({ ...colecao, cosmeticos: [] })}
        >
          Trancar de novo os meus cosméticos
        </BotaoConfirmar>
      ) : null}

      <h2 className={envelopes.secao}>Chances por maleta</h2>
      <div className={envelopes.tabelaRolavel}>
        <table className={envelopes.tabela}>
          <thead>
            <tr>
              <th>Maleta</th>
              {RARIDADES.map((r) => (
                <th key={r} className={envelopes[`r_${r}`]}>
                  {NOMES_DE_RARIDADE[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIPOS.map((t) => (
              <tr key={t}>
                <th>{MALETAS[t].nome}</th>
                {RARIDADES.map((r) => (
                  <td key={r}>{Math.round(MALETAS[t].chances[r] * 100)}%</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={envelopes.dica}>
        Raridade sem peça para dar cai para a de baixo, e só sem nenhuma para a de cima. Sem peça nova no
        jogo inteiro, a maleta dá uma repetida — com um cosmético só, é o que acontece da segunda vez.
      </p>

      {abrindo ? (
        <AberturaDeMaleta
          {...abrindo}
          avatar={{ ...base, [abrindo.cosmetico.campo]: abrindo.cosmetico.valor } as Receita}
          onEquipar={() => equipar(abrindo.cosmetico)}
          onFechar={() => setAbrindo(null)}
        />
      ) : null}
    </main>
  )
}
