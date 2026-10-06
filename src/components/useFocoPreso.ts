'use client'

import { useEffect, type RefObject } from 'react'

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Prende o foco do teclado dentro de um popup enquanto ele estiver aberto.
 *
 * Os popups fechavam no Esc e no clique fora, mas o FOCO ficava onde estava:
 * quem abria pelo teclado continuava tabulando pelos botões da página atrás
 * do popup, invisíveis debaixo da cortina, e ao fechar o foco caía no topo da
 * página em vez de voltar para o botão que abriu. Três coisas, então:
 *
 *  1. ao abrir, o foco entra no painel (que precisa de `tabIndex={-1}`);
 *  2. Tab e Shift+Tab dão a volta dentro dele;
 *  3. ao fechar, o foco volta para quem estava com ele antes.
 *
 * Não é o `<dialog>` nativo porque o nativo traria a camada de topo e o
 * `::backdrop` junto, e os três popups do site já têm cortina, animação e a
 * trava de rolagem em `data-popup` — trocar tudo isso por uma regra de foco
 * seria mexer em muito para ganhar pouco.
 */
export function useFocoPreso(painel: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = painel.current
    if (!el) return
    const anterior = document.activeElement as HTMLElement | null
    // só entra se o foco ainda não estiver lá dentro (um campo com autoFocus)
    if (!el.contains(document.activeElement)) el.focus({ preventScroll: true })

    function aoTeclar(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !el) return
      const itens = [...el.querySelectorAll<HTMLElement>(FOCAVEIS)].filter((i) => i.offsetParent !== null)
      if (itens.length === 0) {
        e.preventDefault()
        return
      }
      const primeiro = itens[0]
      const ultimo = itens[itens.length - 1]
      const atual = document.activeElement
      if (e.shiftKey && (atual === primeiro || atual === el)) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && atual === ultimo) {
        e.preventDefault()
        primeiro.focus()
      }
    }
    el.addEventListener('keydown', aoTeclar)
    return () => {
      el.removeEventListener('keydown', aoTeclar)
      // devolver o foco só se ele ainda estiver dentro do popup ou perdido no
      // body: se outra coisa já o pegou (um popup em cima do outro), não roubar
      const agora = document.activeElement
      if (anterior?.isConnected && (agora === document.body || el.contains(agora))) {
        anterior.focus({ preventScroll: true })
      }
    }
  }, [painel])
}
