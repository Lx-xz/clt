'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { EVENTO_VOLUME, lerVolumes, volumeDaMusica, type Volumes } from '@/data/som'

/**
 * Música de fundo, em loop, só na mesa. O `src` vem de fora porque o Next não
 * prefixa o basePath em `src` de mídia — só nos links que ele mesmo gera —,
 * então quem monta o caminho é o layout, que roda no servidor e enxerga
 * DEPLOY_TARGET.
 *
 * Duas regras do navegador moldam este componente:
 *
 * 1. Áudio não toca antes de o visitante interagir com a página. O `play()`
 *    da montagem é tentado assim mesmo (quem chegou navegando por dentro do
 *    site traz a interação junto) e, se for recusado, os ouvintes de primeiro
 *    clique/tecla/toque cobrem o resto.
 * 2. **No iOS o `volume` de um elemento de mídia é somente leitura.** Escrever
 *    nele não dá erro e não muda nada — só os botões do aparelho mexem no som.
 *    Por isso o áudio passa por um GainNode da Web Audio, que o iPhone
 *    respeita, e é o ganho que os controles de volume mexem. O `audio.volume`
 *    continua sendo escrito para o caso de a Web Audio não existir.
 */
export default function Musica({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null)
  const contexto = useRef<AudioContext | null>(null)
  const ganho = useRef<GainNode | null>(null)
  const pathname = usePathname()
  const naMesa = pathname.startsWith('/jogar')

  // volume: vale para o ganho (quando já existe) e para o elemento
  useEffect(() => {
    function aplicar(v: Volumes) {
      const alvo = volumeDaMusica(v)
      if (ganho.current) ganho.current.gain.value = alvo
      if (ref.current) ref.current.volume = alvo
    }
    aplicar(lerVolumes())
    const aoMudar = (e: Event) => aplicar((e as CustomEvent<Volumes>).detail ?? lerVolumes())
    window.addEventListener(EVENTO_VOLUME, aoMudar)
    return () => window.removeEventListener(EVENTO_VOLUME, aoMudar)
  }, [])

  useEffect(() => {
    const audio = ref.current
    if (!audio) return
    if (!naMesa) {
      audio.pause()
      return
    }

    // o contexto só pode nascer depois de uma interação, e `createMediaElement
    // Source` só pode ser chamado uma vez por elemento — daí a preguiça e a
    // guarda
    function ligarGanho() {
      if (ganho.current || !audio) return
      const Contexto: typeof AudioContext | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Contexto) return
      try {
        const ctx = new Contexto()
        const no = ctx.createGain()
        no.gain.value = volumeDaMusica(lerVolumes())
        ctx.createMediaElementSource(audio).connect(no)
        no.connect(ctx.destination)
        contexto.current = ctx
        ganho.current = no
      } catch {
        // sem Web Audio a música ainda toca; só o volume é que não obedece no iOS
      }
    }

    function comecar() {
      ligarGanho()
      void contexto.current?.resume()
      void audio?.play().catch(() => {
        // ainda recusado (aba silenciada, política mais dura): sem música
      })
    }

    comecar()
    window.addEventListener('pointerdown', comecar)
    window.addEventListener('keydown', comecar)
    window.addEventListener('touchstart', comecar)
    return () => {
      window.removeEventListener('pointerdown', comecar)
      window.removeEventListener('keydown', comecar)
      window.removeEventListener('touchstart', comecar)
    }
  }, [naMesa])

  // `preload="none"`: são 3,7 MB, e fora da mesa a música nem toca
  return <audio ref={ref} src={src} loop preload="none" aria-hidden />
}
