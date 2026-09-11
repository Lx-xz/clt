'use client'

import { useEffect, useRef } from 'react'
import { EVENTO_VOLUME, lerVolumes, volumeDaMusica, type Volumes } from '@/data/som'

/**
 * Música de fundo, em loop. O `src` vem de fora porque o Next não prefixa o
 * basePath em `src` de mídia — só nos links que ele mesmo gera —, então quem
 * monta o caminho é o layout, que roda no servidor e enxerga DEPLOY_TARGET.
 *
 * Navegador nenhum deixa tocar áudio antes de o visitante interagir com a
 * página: a primeira tentativa é silenciosamente recusada. Por isso a música
 * só começa no primeiro clique/tecla/toque, e não na montagem.
 */
export default function Musica({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = ref.current
    if (!audio) return
    audio.volume = volumeDaMusica(lerVolumes())

    function aoMudarVolume(e: Event) {
      const v = (e as CustomEvent<Volumes>).detail
      if (audio && v) audio.volume = volumeDaMusica(v)
    }

    function comecar() {
      void audio?.play().catch(() => {
        // ainda assim recusado (aba silenciada, política mais dura): sem música
      })
      remover()
    }

    function remover() {
      window.removeEventListener('pointerdown', comecar)
      window.removeEventListener('keydown', comecar)
      window.removeEventListener('touchstart', comecar)
    }

    window.addEventListener(EVENTO_VOLUME, aoMudarVolume)
    // tenta já: quem chegou aqui clicando dentro do site (navegação do Next,
    // sem recarregar a página) traz a interação junto, e o navegador libera.
    // Quem abriu a aba direto nesta URL cai nos ouvintes abaixo.
    void audio.play().catch(() => {})
    window.addEventListener('pointerdown', comecar)
    window.addEventListener('keydown', comecar)
    window.addEventListener('touchstart', comecar)
    return () => {
      window.removeEventListener(EVENTO_VOLUME, aoMudarVolume)
      remover()
    }
  }, [])

  return <audio ref={ref} src={src} loop preload="auto" aria-hidden />
}
