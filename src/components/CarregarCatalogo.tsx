'use client'

import { useEffect } from 'react'
import { catalogoPronto } from '@/data/cartas'

/**
 * Puxa o catálogo de cartas assim que o site abre.
 *
 * Fica na raiz e não desenha nada: a ideia é só disparar cedo, para a
 * resposta já ter chegado quando alguém abrir o tutorial na home ou entrar
 * na mesa. Quem realmente ESPERA é o `SessaoGuard`, que aguarda a mesma
 * promessa junto com a leitura da conta — então o jogo nunca começa com um
 * baralho e termina com outro.
 *
 * Não trava nada e não mostra erro: sem banco, ou com a rede fora, o jogo
 * segue com as cartas do código. Veja `@/game/catalogo`.
 */
export default function CarregarCatalogo() {
  useEffect(() => {
    void catalogoPronto()
  }, [])
  return null
}
