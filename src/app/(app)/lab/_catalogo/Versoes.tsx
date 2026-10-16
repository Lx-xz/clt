'use client'

import { History } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { VersaoAntiga } from '@/data/cartas'
import buttons from '@/styles/buttons.module.sass'
import styles from '../cartas/cartas.module.sass'

/**
 * O histórico de versões de cada carta, no /lab.
 *
 * Até a v0.38 o código tinha uma cópia das cartas, e o "Trazer do código"
 * gravava a versão dela no banco — uma vez, por cima do balanceamento do
 * autor. Desde a v0.39 o banco é a única fonte e essa ponte não existe mais;
 * o que sobrou dela é saber, no histórico, qual versão antiga VEIO do código.
 */

/**
 * Os motivos que o "Trazer do código" gravava. É por eles que o histórico
 * diz "do código" e não "feita no lab": motivo digitado à mão nunca é igual
 * a uma destas frases. A lista está congelada — nada novo vem do código.
 */
const MOTIVOS_DO_CODIGO = new Set([
  'O último recurso perto do burnout, uma vez por run.',
  'O tudo ou nada: muita produtividade hoje, paga em estresse agora e em energia amanhã.',
  'Ajuste do baralho de referência do código.',
  'Carta nova do baralho de referência do código.',
  'Evento novo do baralho de referência do código.',
  'Virou lendária: é a carta que muda o resto da run, e agora vem uma cópia só.',
  'Virou lendária: um salário maior pelo resto da run é a maior virada do jogo.',
  'Virou épica: uma das cartas que decidem uma semana.',
  'Virou épica: a renda de toda sexta é um prêmio de envelope bom.',
  'Primeira carta que se paga em estresse: troca saúde por meta, para quem tem energia de sobra e cota faltando.',
  'O tudo ou nada: muita produtividade hoje, paga em estresse agora e em energia amanhã. Épica: decide um dia inteiro.',
  'Primeira carta que se paga em produtividade: parar de trabalhar para respirar.',
  'Uma saída para a demissão que se paga em dinheiro, e não em puxar o saco.',
  'O café que custa dinheiro em vez de estresse: o de sempre cansa, este pesa no bolso.',
  'Comprar produtividade: para quem tem dinheiro e não tem energia.',
  'Dinheiro pago em estresse, sem gastar energia nenhuma.',
  'Recompensa quem monta o naipe social.',
  'Trocar carta da mão por mais cartas, que quase não existia no jogo.',
  'Mais forte na hora do aperto, que é quando o estresse mata.',
  'Uma renda que entra semana a semana, paga em estresse. Épica: é prêmio de envelope bom.',
  'Empurrar o problema para amanhã, que é o assunto do jogo.',
  'O estresse como combustível: a carta fica mais forte justamente quando a espiral do estresse aperta.',
  'Uma saída para o dia ruim que não custa energia: só sai quando o estresse já está alto.',
  'O último recurso perto do burnout, uma vez por run. Épica: tira a run do buraco.',
  'Era a Tarefa melhor em tudo: mais produtividade pelo mesmo custo e sem preço nenhum.',
  'Rendia 1 de produtividade por energia e ainda tirava estresse; a régua (Tarefa Simples) é 0,67.',
  'A 0,5 de produtividade por energia só servia de enchimento.',
  'Ideia do autor: tira estresse de verdade, mas com custo de verdade, em dinheiro.',
  'Era dinheiro de graça; agora também compra uma carta.',
  'Era a pior troca do jogo: energia demais por pouco dinheiro.',
  'Armadilha consciente: energia agora, estresse depois. Rara para não aparecer toda hora.',
  'O baralho inicial passou a ter pelo menos 3 cartas de cada naipe.',
  'Uma Tarefa Simples cedeu lugar à terceira Reunião (3 por naipe no inicial).',
  'Com cartas pagas em dinheiro, o dia também pode baratear o preço delas.',
  'O outro lado da Black Friday: o dia em que tudo que se paga em dinheiro encarece.',
  'Um alívio para as cartas pagas em estresse.',
  'O dia em que as cartas pagas em estresse pesam mais.',
  'O primeiro evento que mexe no custo em produtividade.',
])

function veioDoCodigo(porque: string): boolean {
  return MOTIVOS_DO_CODIGO.has(porque.trim())
}

/**
 * As versões de UMA carta, dentro da edição. "Usar esta" só carrega a versão
 * no editor: para valer, ainda é o Salvar de sempre, com motivo.
 */
export function VersoesDaCarta<T>({ id, carregar, aoUsar, descrever }: {
  id: string
  carregar: () => Promise<VersaoAntiga<T>[] | string>
  aoUsar: (dados: T) => void
  descrever: (dados: T) => string
}) {
  const [versoes, setVersoes] = useState<VersaoAntiga<T>[] | string | null>(null)
  const [aberta, setAberta] = useState(false)

  useEffect(() => {
    if (!aberta || versoes) return
    let vivo = true
    carregar().then((r) => { if (vivo) setVersoes(r) })
    return () => { vivo = false }
  }, [aberta, versoes, carregar])

  const daCarta = Array.isArray(versoes) ? versoes.filter((v) => v.carta === id) : []

  return (
    <details className={styles.versoes} onToggle={(e) => setAberta((e.target as HTMLDetailsElement).open)}>
      <summary>
        <History size={14} aria-hidden /> Versões anteriores
      </summary>
      {typeof versoes === 'string' ? <p className={styles.erroTopo}>{versoes}</p> : null}
      {Array.isArray(versoes) && daCarta.length === 0 ? (
        <p className={styles.dicaSecao}>Nenhuma: esta é a versão da semente.</p>
      ) : null}
      <ol className={styles.listaVersoes}>
        {daCarta.map((v, i) => {
          // o motivo da linha é o da mudança que TIROU esta versão; quem a
          // fez é a linha seguinte (mais velha)
          const autora = daCarta[i + 1]
          return (
            <li key={v.id}>
              <div>
                <b>v{v.versao}</b>
                {autora ? (veioDoCodigo(autora.porque) ? ' · do código' : ' · feita no lab') : ' · semente'}
                {autora ? ` · ${autora.data}` : ''}
                <span className={styles.motivoAntigo}>{descrever(v.dados)}</span>
                {autora && !veioDoCodigo(autora.porque) ? (
                  <span className={styles.motivoAntigo}>“{autora.porque}”</span>
                ) : null}
              </div>
              <button type="button" className={buttons.button} onClick={() => aoUsar(v.dados)}>
                Usar esta
              </button>
            </li>
          )
        })}
      </ol>
    </details>
  )
}
