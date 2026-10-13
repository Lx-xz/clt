'use client'

import { lerVolumes } from './som'
import type { Efeito } from './efeitos'

/**
 * A vibração que acompanha os efeitos sonoros (v0.38). Ela não é do som:
 * vale com o mudo ligado, e tem o próprio interruptor (`Volumes.vibrar`).
 *
 * **Dois caminhos, porque o iPhone não tem `navigator.vibrate`.** No
 * Android é o `navigator.vibrate`, com um ritmo por efeito. O Safari do iOS
 * nunca implementou a API; o que ele tem (do iOS 18 em diante) é o toque
 * háptico do `<input type="checkbox" switch>`, que treme ao ser alternado —
 * inclusive por um `click()` no rótulo dele, dentro de um gesto da pessoa.
 * Então lá é UMA batida curta, sem ritmo, e só no que nasce de um toque
 * (jogar a carta, abrir a recompensa, pagar as contas): a carta desvirando
 * sai de um `setTimeout`, fora do gesto, e não treme. Antes do iOS 18 o
 * clique não faz nada, e é isso mesmo.
 */

/** Em milissegundos: vibra, para, vibra… Curto de propósito — o celular
 *  tremendo a cada carta cansa se for mais que um toque. */
const RITMOS: Record<Efeito, number | number[]> = {
  carta: 12,
  salario: [18, 70, 18],
  contas: 25,
  semDinheiro: [60, 50, 60, 50, 140],
  abrir: 30,
  revelar: 14,
  revelarRara: [25, 60, 70],
}

let tocaNaTela: boolean | null = null

/** Só em aparelho de toque: no computador não há o que tremer, e o clique
 *  no rótulo não pode roubar nada da página. */
function ehDeToque(): boolean {
  if (tocaNaTela === null) tocaNaTela = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  return tocaNaTela
}

/** Se vale mostrar o interruptor: o aparelho tem como tremer. O Chrome do
 *  computador TEM `navigator.vibrate` (e não faz nada com ele), então o que
 *  decide é ser de toque. */
export function podeVibrar(): boolean {
  return ehDeToque()
}

/** O toque háptico do iOS: um interruptor nativo, fora da tela, alternado
 *  pelo rótulo. Montado e desmontado na hora, no `<head>`, onde não ocupa
 *  lugar nem recebe foco. */
function batidaDoIphone() {
  const rotulo = document.createElement('label')
  rotulo.ariaHidden = 'true'
  rotulo.style.display = 'none'
  const caixa = document.createElement('input')
  caixa.type = 'checkbox'
  caixa.setAttribute('switch', '')
  rotulo.appendChild(caixa)
  document.head.appendChild(rotulo)
  rotulo.click()
  document.head.removeChild(rotulo)
}

export function vibrar(nome: Efeito) {
  if (typeof window === 'undefined' || !lerVolumes().vibrar) return
  try {
    if (!ehDeToque()) return
    if (typeof navigator.vibrate === 'function') navigator.vibrate(RITMOS[nome])
    else batidaDoIphone()
  } catch {
    // vibrar é enfeite: falhar não pode levar a jogada junto
  }
}
