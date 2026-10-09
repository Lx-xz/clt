'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { EVENTO_VOLUME, lerVolumes, volumeDaMusica, type Volumes } from '@/data/som'

/**
 * Música de fundo, em loop, no site inteiro — baixinha fora da mesa (é um
 * ajuste em Configurações; veja `volumeDaMusica`). O `src` vem de fora porque o Next não
 * prefixa o basePath em `src` de mídia — só nos links que ele mesmo gera —,
 * então quem monta o caminho é o layout, que roda no servidor e enxerga
 * DEPLOY_TARGET.
 *
 * Três regras do navegador moldam este componente:
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
 * 3. **Mudo tem que PARAR o áudio, não abaixá-lo a zero.** Um elemento de
 *    mídia tocando toma o foco de áudio do sistema: no celular ele vira a
 *    faixa dos controles do aparelho e PAUSA o YouTube (ou o Spotify) que
 *    estava tocando — em silêncio, porque o nosso ganho é zero, então o que a
 *    pessoa vê é o som dela travando sem motivo. Zero de volume é "não quero
 *    som nenhum daqui", e a única forma honesta de cumprir isso é `pause()`
 *    mais um `suspend()` no contexto, devolvendo o foco. Sair do mudo volta a
 *    tocar sozinho.
 */
export default function Musica({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null)
  const contexto = useRef<AudioContext | null>(null)
  const ganho = useRef<GainNode | null>(null)
  /** Já houve interação (ou uma tentativa bem-sucedida): sem isto, tirar o
   *  mudo numa aba recém-aberta tentaria um `play()` fadado à recusa. */
  const liberado = useRef(false)
  const pathname = usePathname()
  const naMesa = pathname.startsWith('/jogar')
  // o efeito de baixo roda uma vez só (trocar de página não pode reiniciar a
  // trilha), mas precisa saber onde estamos AGORA — daí o espelho
  const naMesaRef = useRef(naMesa)
  naMesaRef.current = naMesa

  // volume: vale para o ganho (quando já existe) e para o elemento. Depende
  // de `naMesa` porque a mesma trilha toca mais baixo fora do jogo — e a
  // transição é feita pelo próprio GainNode, para não haver salto de som ao
  // trocar de página.
  useEffect(() => {
    function aplicar(v: Volumes) {
      const alvo = volumeDaMusica(v, naMesa)
      const audio = ref.current

      // volume zero não é "tocar baixinho": é devolver o foco de áudio do
      // aparelho para quem mais estiver tocando
      if (alvo === 0) {
        audio?.pause()
        void contexto.current?.suspend()
        if (audio) audio.volume = 0
        return
      }

      const ctx = contexto.current
      if (ctx) void ctx.resume()
      if (ganho.current && ctx) {
        // rampa curta: cortar seco de um volume para o outro estala
        ganho.current.gain.cancelScheduledValues(ctx.currentTime)
        ganho.current.gain.setTargetAtTime(alvo, ctx.currentTime, 0.15)
      } else if (ganho.current) {
        ganho.current.gain.value = alvo
      }
      if (audio) audio.volume = alvo
      // saiu do mudo: volta a tocar, se já houve a interação que o navegador exige
      if (audio && audio.paused && liberado.current) void audio.play().catch(() => {})
    }
    aplicar(lerVolumes())
    const aoMudar = (e: Event) => aplicar((e as CustomEvent<Volumes>).detail ?? lerVolumes())
    window.addEventListener(EVENTO_VOLUME, aoMudar)
    return () => window.removeEventListener(EVENTO_VOLUME, aoMudar)
  }, [naMesa])

  useEffect(() => {
    const audio = ref.current
    if (!audio) return

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
        no.gain.value = volumeDaMusica(lerVolumes(), naMesaRef.current)
        ctx.createMediaElementSource(audio).connect(no)
        no.connect(ctx.destination)
        contexto.current = ctx
        ganho.current = no
      } catch {
        // sem Web Audio a música ainda toca; só o volume é que não obedece no iOS
      }
    }

    function comecar() {
      liberado.current = true
      // no mudo nem o AudioContext nasce: criá-lo já seria pedir o foco de
      // áudio de volta para não tocar nada
      if (volumeDaMusica(lerVolumes(), naMesaRef.current) === 0) return
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
    // de propósito sem `naMesa`: trocar de página não pode reiniciar a
    // trilha, só mudar o volume — quem faz isso é o efeito de cima
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // `preload="none"`: são 3,7 MB, e não vale baixar antes de a pessoa
  // interagir — sem interação o navegador nem deixa tocar
  return <audio ref={ref} src={src} loop preload="none" aria-hidden />
}
