'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import Avatar, { MEDIDAS, type Ajustes, type Medidas } from '@/components/Avatar'
import Segmentado from '@/components/Segmentado'
import {
  CORES,
  CORPOS,
  CORTES,
  FUNDOS,
  PELES,
  ROUPAS,
  AVATAR_PADRAO,
  type Avatar as Receita,
  type Corpo,
} from '@/data/avatar'
import buttons from '@/styles/buttons.module.sass'
import styles from './lab.module.sass'

/**
 * O laboratório do avatar. Ferramenta de dono do jogo, não do jogador: ela
 * não grava nada no banco e não muda o avatar de ninguém — ela **produz
 * código para colar** em `Avatar.tsx`, porque o site é export estático e não
 * tem servidor para escrever arquivo.
 *
 * Ela desenha com o MESMO componente `Avatar` (via a prop `ajustes`), e não
 * com uma cópia. Um laboratório que desenha diferente do jogo mente sobre o
 * resultado, e aí não serve para nada.
 */

const LIMITES: Record<keyof Medidas, [number, number, string]> = {
  larg: [12, 32, 'meia-largura do rosto'],
  topo: [6, 28, 'topo da cabeça'],
  queixo: [56, 86, 'linha do queixo'],
  cantoY: [0, 30, 'canto do rosto, vertical'],
  cantoX: [0, 32, 'canto do rosto, horizontal'],
  rx: [16, 40, 'raio horizontal do cabelo'],
  ry: [16, 40, 'raio vertical do cabelo'],
  cy: [20, 50, 'centro do cabelo'],
  ombro: [64, 92, 'onde o ombro começa'],
  meioOmbro: [0, 34, 'recuo do ombro'],
}

const CHAVE = 'clt:avatar-lab:v1'

interface Estado {
  receita: Receita
  medidas: Medidas
  cores: { cabelo: string; roupa: string; fundo: string }
  pecas: { silhueta: string; franja: string; mecha: string }
}

function inicial(corpo: Corpo): Estado {
  return {
    receita: { ...AVATAR_PADRAO, corpo, cabelo: 'longo', pele: 'media', cor: 'castanho' },
    medidas: { ...MEDIDAS[corpo] },
    cores: { cabelo: '#6b4326', roupa: '#6f7f8c', fundo: '#d8cfba' },
    pecas: { silhueta: '', franja: '', mecha: '' },
  }
}

export default function AvatarLabPage() {
  const [e, setE] = useState<Estado>(() => inicial('homem'))
  const [copiado, setCopiado] = useState(false)

  // o trabalho do lab sobrevive a recarregar a página: mexer em oito números
  // e perder tudo num F5 é o jeito mais rápido de abandonar a ferramenta
  useEffect(() => {
    try {
      const bruto = window.localStorage.getItem(CHAVE)
      if (bruto) setE(JSON.parse(bruto) as Estado)
    } catch {
      // sem storage o lab só não lembra da última sessão
    }
  }, [])

  const guardar = useCallback((novo: Estado) => {
    setE(novo)
    setCopiado(false)
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(novo))
    } catch {
      // ignorado
    }
  }, [])

  function trocarCorpo(corpo: Corpo) {
    // trocar de corpo recarrega as medidas dele: sem isso você ficaria
    // editando os números do homem com o desenho da mulher na tela
    guardar({ ...e, receita: { ...e.receita, corpo }, medidas: { ...MEDIDAS[corpo] } })
  }

  const ajustes: Ajustes = {
    medidas: e.medidas,
    cores: e.cores,
    pecas: {
      silhueta: e.pecas.silhueta.trim() || undefined,
      franja: e.pecas.franja.trim() || undefined,
      mecha: e.pecas.mecha.trim() || undefined,
    },
  }

  const codigo = `${e.receita.corpo}: { ${(Object.keys(LIMITES) as (keyof Medidas)[])
    .map((k) => `${k}: ${e.medidas[k]}`)
    .join(', ')} },`

  return (
    <main className="page">
      <Link className={styles.voltar} href="/lab">
        ← voltar ao lab
      </Link>
      <h1 className={styles.titulo}>Lab do avatar</h1>
      <p className={styles.intro}>
        Bancada. Nada daqui é salvo no banco nem muda o avatar de ninguém: o resultado é o
        <b> código para colar</b> em <code>src/components/Avatar.tsx</code>. O desenho usa o mesmo
        componente do jogo, então o que você vê aqui é o que sai lá.
      </p>

      <div className={styles.mesa}>
        <div className={styles.palco}>
          <Avatar avatar={e.receita} tamanho={200} ajustes={ajustes} />
          <div className={styles.miniaturas}>
            {[64, 40, 24].map((t) => (
              <Avatar key={t} avatar={e.receita} tamanho={t} ajustes={ajustes} />
            ))}
          </div>
          <Segmentado
            rotulo="Corpo"
            valor={e.receita.corpo}
            onChange={trocarCorpo}
            opcoes={CORPOS}
          />
          <Segmentado
            rotulo="Cabelo"
            valor={e.receita.cabelo}
            onChange={(v) => guardar({ ...e, receita: { ...e.receita, cabelo: v } })}
            opcoes={CORTES}
          />
          <Segmentado
            rotulo="Pele"
            valor={e.receita.pele}
            onChange={(v) => guardar({ ...e, receita: { ...e.receita, pele: v } })}
            opcoes={PELES}
          />
        </div>

        <div className={styles.controles}>
          <section className={styles.bloco}>
            <h2 className={styles.blocoTitulo}>Medidas</h2>
            {(Object.keys(LIMITES) as (keyof Medidas)[]).map((k) => {
              const [min, max, texto] = LIMITES[k]
              return (
                <label key={k} className={styles.numero}>
                  <span>
                    <b>{k}</b> <i>{texto}</i>
                  </span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={0.5}
                    value={e.medidas[k]}
                    onChange={(ev) =>
                      guardar({ ...e, medidas: { ...e.medidas, [k]: Number(ev.target.value) } })
                    }
                  />
                  <output>{e.medidas[k]}</output>
                </label>
              )
            })}
            <button
              type="button"
              className={buttons.button}
              onClick={() => guardar({ ...e, medidas: { ...MEDIDAS[e.receita.corpo] } })}
            >
              Voltar às medidas do jogo
            </button>
          </section>

          <section className={styles.bloco}>
            <h2 className={styles.blocoTitulo}>Cores de teste</h2>
            <p className={styles.blocoDica}>
              Achou uma boa? Ela entra nas listas de <code>Avatar.tsx</code> (CABELOS, ROUPAS,
              FUNDOS) e no rótulo em <code>src/data/avatar.ts</code>. Hoje o jogo tem{' '}
              {CORES.length} de cabelo, {ROUPAS.length} de roupa e {FUNDOS.length} de fundo.
            </p>
            {(['cabelo', 'roupa', 'fundo'] as const).map((k) => (
              <label key={k} className={styles.cor}>
                <span>{k}</span>
                <input
                  type="color"
                  value={e.cores[k]}
                  onChange={(ev) => guardar({ ...e, cores: { ...e.cores, [k]: ev.target.value } })}
                />
                <code>{e.cores[k]}</code>
              </label>
            ))}
          </section>

          <section className={styles.bloco}>
            <h2 className={styles.blocoTitulo}>Peças novas</h2>
            <p className={styles.blocoDica}>
              Cole o <code>d=</code> de um caminho SVG desenhado numa prancheta de 100×100 (Figma,
              Inkscape). Vazio = a peça do jogo. A <b>mecha</b> é escrita só para o lado direito:
              o esquerdo é espelhado sozinho.
            </p>
            {(['silhueta', 'franja', 'mecha'] as const).map((k) => (
              <label key={k} className={styles.peca}>
                <span>{k}</span>
                <textarea
                  rows={3}
                  value={e.pecas[k]}
                  placeholder="M50 10 C…"
                  onChange={(ev) => guardar({ ...e, pecas: { ...e.pecas, [k]: ev.target.value } })}
                />
              </label>
            ))}
          </section>

          <section className={styles.bloco}>
            <h2 className={styles.blocoTitulo}>Para colar em Avatar.tsx</h2>
            <pre className={styles.codigo}>{codigo}</pre>
            <button
              type="button"
              className={`${buttons.button} ${buttons.primary}`}
              onClick={() => {
                void navigator.clipboard?.writeText(codigo).then(() => setCopiado(true))
              }}
            >
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
          </section>
        </div>
      </div>

      <h2 className={styles.blocoTitulo}>Todas as combinações, com estas medidas</h2>
      <p className={styles.blocoDica}>
        É aqui que o estrago aparece: um ajuste que fica bom num caso costuma abrir buraco em
        outro. Confira antes de levar o número para o código.
      </p>
      <div className={styles.grade}>
        {CORTES.map((corte) =>
          PELES.map((pele) =>
            CORES.map((cor) => (
              <Avatar
                key={`${corte.valor}-${pele.valor}-${cor.valor}`}
                tamanho={72}
                avatar={{ ...e.receita, cabelo: corte.valor, pele: pele.valor, cor: cor.valor }}
                ajustes={{ medidas: e.medidas, pecas: ajustes.pecas }}
              />
            )),
          ),
        )}
      </div>
    </main>
  )
}
