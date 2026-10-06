'use client'

import { getCard } from '@/game/catalogo'
import type { CardId, CardInstance } from '@/game/types'
import Card from './Card'
import Dialogo from './Dialogo'
import styles from './CartasDaRun.module.sass'

/**
 * O que está no baralho e no descarte, agrupado por carta.
 *
 * As pilhas eram só um número. Isso bastava enquanto nada dependia delas, mas
 * saber que sobraram duas Tarefas Simples no baralho é saber se vale guardar
 * energia para amanhã — informação que o jogo tem e o jogador não via.
 *
 * **A ordem do baralho NÃO aparece**, de propósito: a lista é agrupada e
 * ordenada pelo nome. Mostrar a ordem seria mostrar o futuro.
 */
export default function CartasDaRun({ baralho, descarte, onFechar }: {
  baralho: CardInstance[]
  descarte: CardInstance[]
  onFechar: () => void
}) {
  return (
    <Dialogo titulo="Suas cartas" onFechar={onFechar} largo>
      <Grupo
        titulo="No baralho"
        nota="Em ordem alfabética — a ordem de compra é segredo."
        cartas={baralho}
        vazio="O baralho acabou: amanhã o descarte é embaralhado e vira o baralho."
      />
      <Grupo
        titulo="No descarte"
        nota="Voltam para o baralho quando ele acabar."
        cartas={descarte}
        vazio="Nada no descarte ainda."
      />
    </Dialogo>
  )
}

function Grupo({ titulo, nota, cartas, vazio }: {
  titulo: string
  nota: string
  cartas: CardInstance[]
  vazio: string
}) {
  const contagem = new Map<CardId, number>()
  for (const c of cartas) contagem.set(c.cardId, (contagem.get(c.cardId) ?? 0) + 1)
  const ids = [...contagem.keys()].sort((a, b) => getCard(a).name.localeCompare(getCard(b).name, 'pt-BR'))

  return (
    <section className={styles.grupo}>
      <h3 className={styles.titulo}>
        {titulo} <span className={styles.qtd}>{cartas.length}</span>
      </h3>
      {ids.length === 0 ? (
        <p className={styles.vazio}>{vazio}</p>
      ) : (
        <>
          <p className={styles.nota}>{nota}</p>
          <div className={styles.grade}>
            {ids.map((id) => (
              <Card key={id} card={getCard(id)} copies={contagem.get(id)} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
