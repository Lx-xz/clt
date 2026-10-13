'use client'

import { lerVolumes } from './som'
import type { Efeito } from './efeitos'

/**
 * A vibração que acompanha os efeitos sonoros (v0.38). Ela não é do som:
 * vale com o mudo ligado, e tem o próprio interruptor (`Volumes.vibrar`).
 *
 * **Dois caminhos, porque o iPhone não tem `navigator.vibrate`.** No
 * Android é o `navigator.vibrate`, chamado por `tocar()` com um ritmo por
 * efeito. No iPhone a ÚNICA coisa que treme é o háptico do interruptor
 * nativo (`<input type="checkbox" switch>`, iOS 18 em diante) — e só quando
 * o DEDO o alterna. Medido no aparelho do autor (bancada que existiu no
 * lab): alternar por `click()` de código não treme, nem no `<head>`, nem no
 * `<body>`, nem no `pointerdown`/`touchend`; o interruptor invisível
 * (opacidade 0, esticado por cima, ou fora da tela apontado por um rótulo)
 * treme, desde que o toque de verdade caia nele ou no rótulo.
 *
 * Por isso, no iPhone, a vibração mora no ALVO do toque, e não no efeito:
 *   - botão: `BotaoQueTreme` vira um rótulo com o interruptor transparente
 *     por cima, e a ação sai do `change` dele (uma vez por toque);
 *   - o que não é botão (a carta, o palco da recompensa): fica dentro de um
 *     rótulo que só APONTA para o interruptor fora da tela (`for`) no toque
 *     que deve tremer — o segundo do toque duplo, na carta. Interruptor por
 *     cima da carta não serve: ela captura o ponteiro para o arraste, e o
 *     clique vai para ela.
 * O que acontece sem toque (a carta desvirando sozinha) não treme lá.
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

/** O iPhone: aparelho de toque sem `navigator.vibrate`. É onde a
 *  vibração precisa do interruptor nativo debaixo do dedo. */
export function tremePorInterruptor(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate !== 'function' && ehDeToque()
}

/** O iPhone com a vibração ligada: o toque de agora deve tremer? */
export function deveTremerNoToque(): boolean {
  return tremePorInterruptor() && lerVolumes().vibrar
}

/** O id do interruptor fora da tela que os rótulos apontam. */
export const ID_DO_TREMOR = 'clt-tremor'

/** Cria (uma vez) o interruptor nativo fora da tela. Fora da tela, e não
 *  escondido com `display: none`: escondido assim ele não treme. */
export function garantirInterruptor() {
  if (typeof document === 'undefined' || document.getElementById(ID_DO_TREMOR)) return
  const caixa = document.createElement('input')
  caixa.type = 'checkbox'
  caixa.id = ID_DO_TREMOR
  caixa.setAttribute('switch', '')
  caixa.tabIndex = -1
  caixa.setAttribute('aria-hidden', 'true')
  caixa.style.cssText = 'position:fixed;left:-200px;top:0;width:1px;height:1px;opacity:0;pointer-events:none'
  document.body.appendChild(caixa)
}

/** Aponta (ou não) o rótulo para o interruptor, ANTES de o clique sair: o
 *  navegador decide se o rótulo alterna alguma coisa na hora do clique. */
export function apontarParaTremer(rotulo: HTMLLabelElement | null, tremer: boolean) {
  if (!rotulo) return
  if (tremer && deveTremerNoToque()) {
    garantirInterruptor()
    rotulo.htmlFor = ID_DO_TREMOR
  } else {
    rotulo.removeAttribute('for')
  }
}

export function vibrar(nome: Efeito) {
  if (typeof window === 'undefined' || !lerVolumes().vibrar) return
  try {
    // o iPhone treme pelo interruptor debaixo do dedo, não por aqui
    if (ehDeToque() && typeof navigator.vibrate === 'function') navigator.vibrate(RITMOS[nome])
  } catch {
    // vibrar é enfeite: falhar não pode levar a jogada junto
  }
}
