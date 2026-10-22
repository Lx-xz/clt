'use client'

import { useSyncExternalStore } from 'react'

/**
 * Como a carta se descreve (v0.44): `icones` é a descrição automática, com o
 * ícone do recurso antes do número e o texto escrito virando comentário;
 * `escrita` é o texto do lab, como era. A escolha é de cada um, em
 * Configurações › Aparência — é um teste, e dá para comparar.
 */
export type ModoDaDescricao = 'icones' | 'escrita'

// com hífen, e não `clt:`: é preferência do aparelho, e `limparLocalDoJogo`
// apaga o que começa com `clt:` a cada troca de conta
const CHAVE = 'clt-descricao:v1'
const EVENTO = 'clt:descricao'

function ler(): ModoDaDescricao {
  if (typeof window === 'undefined') return 'icones'
  try {
    return window.localStorage.getItem(CHAVE) === 'escrita' ? 'escrita' : 'icones'
  } catch {
    return 'icones'
  }
}

export function gravarModoDaDescricao(modo: ModoDaDescricao) {
  try {
    if (modo === 'icones') window.localStorage.removeItem(CHAVE)
    else window.localStorage.setItem(CHAVE, modo)
  } catch {
    // sem storage, a escolha só não é lembrada
  }
  window.dispatchEvent(new Event(EVENTO))
}

function assinar(avisar: () => void) {
  window.addEventListener(EVENTO, avisar)
  window.addEventListener('storage', avisar)
  return () => {
    window.removeEventListener(EVENTO, avisar)
    window.removeEventListener('storage', avisar)
  }
}

/** O modo de agora, e de novo a cada troca (em qualquer aba). No servidor
 *  (o build estático) é o padrão, para o HTML bater. */
export function useModoDaDescricao(): ModoDaDescricao {
  return useSyncExternalStore(assinar, ler, () => 'icones')
}
