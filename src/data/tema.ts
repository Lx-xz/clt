'use client'

/**
 * Tema: claro, escuro ou o do aparelho. A escolha vira um `data-tema` no
 * <html>, e quem faz o resto é o CSS (`src/styles/_tokens.sass`) — nenhum
 * componente precisa saber de cor.
 *
 * `sistema` não escreve atributo nenhum: é a ausência da marca que deixa o
 * `prefers-color-scheme` mandar.
 */
export type Tema = 'claro' | 'escuro' | 'sistema'

export const TEMAS: { valor: Tema; rotulo: string }[] = [
  { valor: 'claro', rotulo: 'Claro' },
  { valor: 'escuro', rotulo: 'Escuro' },
  { valor: 'sistema', rotulo: 'Sistema' },
]

const CHAVE = 'clt:tema:v1'
export const EVENTO_TEMA = 'clt:tema'

export function lerTema(): Tema {
  if (typeof window === 'undefined') return 'sistema'
  try {
    const bruto = window.localStorage.getItem(CHAVE)
    return bruto === 'claro' || bruto === 'escuro' ? bruto : 'sistema'
  } catch {
    return 'sistema'
  }
}

export function aplicarTema(tema: Tema) {
  if (typeof document === 'undefined') return
  if (tema === 'sistema') delete document.documentElement.dataset.tema
  else document.documentElement.dataset.tema = tema
}

export function gravarTema(tema: Tema) {
  aplicarTema(tema)
  if (typeof window === 'undefined') return
  try {
    if (tema === 'sistema') window.localStorage.removeItem(CHAVE)
    else window.localStorage.setItem(CHAVE, tema)
  } catch {
    // sem storage o tema só não é lembrado na próxima visita
  }
  window.dispatchEvent(new CustomEvent(EVENTO_TEMA, { detail: tema }))
}

/**
 * O mesmo que `lerTema` + `aplicarTema`, mas em texto, para rodar ANTES de a
 * página pintar. Sem isto o site abre claro e pisca para escuro depois que o
 * React monta — e o piscar é justamente no tema que a pessoa não quer ver.
 */
export const SCRIPT_TEMA = `try{var t=localStorage.getItem('${CHAVE}');if(t==='claro'||t==='escuro')document.documentElement.dataset.tema=t}catch(e){}`
