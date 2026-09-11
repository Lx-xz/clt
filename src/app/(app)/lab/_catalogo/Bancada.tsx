'use client'

import { useState } from 'react'
import { AlertTriangle, Database, FileCode2, Trash2 } from 'lucide-react'
import Dialogo from '@/components/Dialogo'
import buttons from '@/styles/buttons.module.sass'
import styles from './bancada.module.sass'

/**
 * As peças que as duas bancadas do catálogo (cartas e eventos) usam igual.
 *
 * O que elas têm em comum não é layout, é REGRA: toda gravação passa por um
 * motivo escrito à mão, toda exclusão é reversível, e nenhuma das duas
 * consegue fazer nada se o banco disser que quem está ali não é admin.
 */

/** Onde as cartas estão vindo agora. Aparece no topo das duas bancadas
 *  porque editar achando que se está no banco, e estar no código, é o erro
 *  mais caro que esta tela permite cometer. */
export function Origem({ doBanco, aoSemear, semeando }: {
  doBanco: boolean
  aoSemear: () => void
  semeando: boolean
}) {
  if (doBanco) {
    return (
      <p className={`${styles.origem} ${styles.viva}`}>
        <Database size={14} aria-hidden />
        As cartas vêm do <b>banco</b>. O que você salvar aqui vale para todo mundo na próxima
        vez que abrirem o site.
      </p>
    )
  }
  return (
    <div className={`${styles.origem} ${styles.semente}`}>
      <p>
        <FileCode2 size={14} aria-hidden />
        As cartas estão vindo do <b>código</b> — o banco ainda não tem catálogo. Semeie uma vez
        para poder editar; nada existente é sobrescrito.
      </p>
      <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={aoSemear} disabled={semeando}>
        {semeando ? 'Semeando…' : 'Semear o banco com o baralho do código'}
      </button>
    </div>
  )
}

/**
 * A janela que pergunta o motivo antes de gravar.
 *
 * É a peça central da tela, e não uma formalidade: o histórico de uma carta
 * nasce AQUI, no momento da mudança. Escrito depois ele não seria escrito, e
 * o jogador veria o custo da carta mudar sem nunca saber por quê. A função do
 * banco recusa `porque` vazio — a tela só está repetindo a regra mais cedo.
 */
export function PedirMotivo({ titulo, oQueSugerido, exemplo, aoConfirmar, aoFechar, erro, salvando }: {
  titulo: string
  oQueSugerido: string
  exemplo: string
  aoConfirmar: (oQue: string, porque: string) => void
  aoFechar: () => void
  erro: string | null
  salvando: boolean
}) {
  const [oQue, setOQue] = useState(oQueSugerido)
  const [porque, setPorque] = useState('')

  return (
    <Dialogo titulo={titulo} onFechar={aoFechar}>
      <label className={styles.rotulo}>
        O que mudou
        <input
          className={styles.campo}
          value={oQue}
          onChange={(e) => setOQue(e.target.value)}
          placeholder="Custo 4 → 6"
        />
      </label>
      <label className={styles.rotulo}>
        Por que mudou
        <textarea
          className={styles.campoTexto}
          value={porque}
          onChange={(e) => setPorque(e.target.value)}
          rows={3}
          placeholder={exemplo}
        />
      </label>
      <p className={styles.aviso}>
        Isto vai para o histórico da carta, que o jogador lê no baralho. O número um diff
        consegue descobrir sozinho; o motivo, não.
      </p>
      {erro ? (
        <p className={styles.erro}>
          <AlertTriangle size={14} aria-hidden />
          {erro}
        </p>
      ) : null}
      <div className={styles.acoesDialogo}>
        <button type="button" className={buttons.button} onClick={aoFechar}>
          Cancelar
        </button>
        <button
          type="button"
          className={`${buttons.button} ${buttons.primary}`}
          disabled={porque.trim().length < 3 || salvando}
          onClick={() => aoConfirmar(oQue.trim(), porque.trim())}
        >
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </Dialogo>
  )
}

/** O botão de remover, com a mesma exigência de motivo. */
export function BotaoExcluir({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className={`${buttons.button} ${styles.excluir}`} onClick={onClick}>
      <Trash2 size={14} aria-hidden />
      Remover do jogo
    </button>
  )
}

export { styles as estilosDaBancada }
