import { TextoComIcones } from '../Dinheiro'
import type { Acao } from '@/game/acoes'
import type { Caminho } from '@/game/descricao'
import styles from './BarraDaSorte.module.sass'

type Rolar = Extract<Acao, { faz: 'rolar' }>

/** "cara", "coroa", "7", "1–3": como a faixa se escreve na barra. */
export function textoDaFaixa(lados: number, de: number, ate: number): string {
  if (lados === 2 && de === ate) return de === 1 ? 'cara' : 'coroa'
  return de === ate ? String(de) : `${de}–${ate}`
}

interface Faixa {
  /** O que vai em cima, em letra de máquina: as faces, ou a condição. */
  rotulo: string
  /** A chance, quando há ("33%"). */
  sub?: string
  texto: string
  tom: 'bom' | 'ruim' | 'neutro' | 'sem'
  /** A altura da faixa, de 0 a 1. */
  peso: number
}

/**
 * A barra dividida: uma faixa por saída, com a altura dela, o rótulo em
 * cima e o que acontece embaixo. Serve à carta de SORTE (as faixas do
 * dado) e à carta de CAMINHOS (o "se X, senão Y" do estado da partida).
 *
 * As cores dizem o TOM, e o tom é escolha de quem faz a carta: verde e
 * vermelho só quando a carta quer dizer "deu certo / deu errado"; as neutras
 * não julgam, e são três tons de papelada que se distinguem entre si.
 * `sem` não tem cor nenhuma. `destaque` acende a faixa que saiu na mesa.
 */
function BarraDividida({ antes, faixas, destaque }: { antes?: string; faixas: Faixa[]; destaque?: number | null }) {
  let neutra = 0
  return (
    <div className={styles.corpo}>
      {/* o que a carta faz ALÉM dos caminhos, por cima da barra */}
      {antes ? (
        <p className={styles.antes}>
          <TextoComIcones texto={antes} />
        </p>
      ) : null}
      <div className={styles.barra}>
        {faixas.map((f, i) => {
          const tom = f.tom === 'sem' ? styles.semCor : f.tom === 'neutro' ? styles[`neutro${neutra++ % 3}`] : styles[f.tom]
          const estado = destaque == null ? '' : destaque === i ? styles.aceso : styles.apagado
          return (
            <div key={i} className={`${styles.lado} ${tom} ${estado}`} style={{ flexGrow: Math.max(f.peso, 0.28) }}>
              <span className={styles.faixa}>
                <TextoComIcones texto={f.rotulo} />
                {f.sub ? <small> · {f.sub}</small> : null}
              </span>
              <span className={styles.efeito}>
                <TextoComIcones texto={f.texto} />
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * A carta de SORTE (v0.43, escolhida pelo autor entre os protótipos do
 * `/lab/sorte`): o `rolar` dela virando barra, sozinho — quem monta a carta
 * no lab escreve só o texto de cada faixa. Com `semCor`, nenhuma faixa tem
 * cor.
 */
export default function BarraDaSorte({ rolar, texto, destaque }: { rolar: Rolar; texto?: string; destaque?: number | null }) {
  const lados = Math.max(2, Number(rolar.lados) || 6)
  return (
    <BarraDividida
      antes={texto}
      destaque={destaque}
      faixas={rolar.saidas.map((s) => {
        const peso = Math.max(0, Math.min(lados, s.ate) - Math.max(1, s.de) + 1) / lados
        return {
          rotulo: textoDaFaixa(lados, s.de, s.ate),
          sub: lados !== 2 ? `${Math.round(peso * 100)}%` : undefined,
          texto: s.texto,
          tom: rolar.semCor ? 'sem' : (s.tom ?? 'neutro'),
          peso,
        }
      })}
    />
  )
}

/** A carta de CAMINHOS (v0.44): "se X, senão Y", com a condição no lugar das
 *  faces, todos da mesma altura; ou o `sorteio`, com a altura da chance.
 *  Neutros: o motor não sabe qual caminho é o bom. */
export function BarraDeCaminhos({ antes, caminhos }: { antes?: string; caminhos: Caminho[] }) {
  return (
    <BarraDividida
      antes={antes}
      faixas={caminhos.map((c) => ({ rotulo: c.quando, texto: c.texto, tom: 'neutro', peso: c.chance ?? 1 / caminhos.length }))}
    />
  )
}
