'use client'

import { useState } from 'react'
import { AlertTriangle, Database, Trash2, WifiOff } from 'lucide-react'
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

/** Onde as cartas estão vindo agora. Aparece no topo das bancadas porque
 *  editar achando que se está no banco, e estar numa cópia, é o erro mais
 *  caro que estas telas permitem cometer. Desde a v0.39 não há mais cartas
 *  no código: quando não é o banco, é a última cópia que ele deixou neste
 *  navegador, e aí nada se grava. */
export function Origem({ doBanco }: { doBanco: boolean }) {
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
    <p className={`${styles.origem} ${styles.semCopia}`}>
      <WifiOff size={14} aria-hidden />
      Sem conexão com o banco: isto é a última cópia guardada neste navegador. Editar fica
      desligado até a conexão voltar.
    </p>
  )
}

/**
 * A janela que pergunta o motivo antes de gravar.
 *
 * É a peça central da tela, e não uma formalidade: o histórico de uma carta
 * nasce AQUI, no momento da mudança. Escrito depois ele não seria escrito, e
 * o jogador veria o custo da carta mudar sem nunca saber por quê.
 *
 * `opcional` (v0.47, pedido do autor): ao criar ou ajustar carta e evento o
 * motivo pode ficar em branco — o "o que mudou" já entra no histórico. Para
 * remover e para as regras do jogo ele continua obrigatório, e o banco
 * repete a mesma regra.
 */
export function PedirMotivo({ titulo, oQueSugerido, exemplo, aoConfirmar, aoFechar, erro, salvando, opcional }: {
  titulo: string
  oQueSugerido: string
  exemplo: string
  aoConfirmar: (oQue: string, porque: string) => void
  aoFechar: () => void
  erro: string | null
  salvando: boolean
  opcional?: boolean
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
        {opcional ? 'Por que mudou (opcional)' : 'Por que mudou'}
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
          disabled={(!opcional && porque.trim().length < 3) || salvando}
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

/** O id na edição: só de leitura, porque não muda nunca. */
export function IdInterno({ id }: { id: string }) {
  return (
    <div className={styles.rotulo}>
      Código interno
      <code className={styles.idInterno}>{id}</code>
      <span className={styles.dica}>
        Ninguém vê, e não muda nunca: é ele que liga a carta às coleções e às partidas jogadas. O nome, mude à vontade.
      </span>
    </div>
  )
}
