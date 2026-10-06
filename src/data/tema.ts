'use client'

import { COR_DA_BARRA } from './coresDoTema'

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


/**
 * As `<meta name="theme-color">` saem do layout com `media`, e por isso
 * obedecem o tema do APARELHO. Quem escolheu claro ou escuro explicitamente
 * precisa que as duas digam a cor escolhida; voltar ao sistema devolve a cor
 * de cada `media`.
 */
function pintarBarra(tema: Tema) {
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    const doAparelho = (meta.getAttribute('media') ?? '').includes('dark')
      ? COR_DA_BARRA.escuro
      : COR_DA_BARRA.claro
    meta.setAttribute('content', tema === 'sistema' ? doAparelho : COR_DA_BARRA[tema])
  }
}

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
  pintarBarra(tema)
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
// as <meta> de cor ainda não existem quando este script roda (ele vem antes
// delas no <head>), então a cor da barra espera o documento terminar de chegar
export const SCRIPT_TEMA = `try{var t=localStorage.getItem('${CHAVE}');if(t==='claro'||t==='escuro'){document.documentElement.dataset.tema=t;var c=t==='claro'?'${COR_DA_BARRA.claro}':'${COR_DA_BARRA.escuro}';document.addEventListener('DOMContentLoaded',function(){document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute('content',c)})})}}catch(e){}`
