import { TextoComIcones } from '../Dinheiro'
import type { Acao } from '@/game/acoes'
import styles from './BarraDaSorte.module.sass'

type Rolar = Extract<Acao, { faz: 'rolar' }>

/** "cara", "coroa", "7", "1–3": como a faixa se escreve na barra. */
export function textoDaFaixa(lados: number, de: number, ate: number): string {
  if (lados === 2 && de === ate) return de === 1 ? 'cara' : 'coroa'
  return de === ate ? String(de) : `${de}–${ate}`
}

/**
 * A carta de SORTE desenhada como barra dividida (v0.43, escolhida pelo autor
 * entre os protótipos do `/lab/sorte`): uma faixa por saída do dado, com a
 * altura do tanto de faces dela, as faces escritas em cima e o que acontece
 * embaixo. É o `rolar` da carta virando desenho, sozinho: quem monta a carta
 * no lab escreve só o texto de cada faixa.
 *
 * As cores dizem o TOM, e o tom é escolha de quem faz a carta: verde e
 * vermelho só quando a carta quer dizer "deu certo / deu errado"; as neutras
 * não julgam, e são três tons de papelada que se distinguem entre si. Com
 * `semCor`, nenhuma faixa tem cor. `destaque` acende a faixa que saiu na mesa.
 */
export default function BarraDaSorte({ rolar, texto, destaque }: { rolar: Rolar; texto?: string; destaque?: number | null }) {
  const lados = Math.max(2, Number(rolar.lados) || 6)
  let neutra = 0
  return (
    <div className={styles.corpo}>
      {/* o que a carta faz ALÉM do dado: o texto dela, por cima da barra */}
      {texto ? (
        <p className={styles.antes}>
          <TextoComIcones texto={texto} />
        </p>
      ) : null}
      <div className={styles.barra}>
        {rolar.saidas.map((s, i) => {
          const peso = Math.max(0, Math.min(lados, s.ate) - Math.max(1, s.de) + 1)
          const tom = rolar.semCor ? styles.semCor : s.tom === 'bom' || s.tom === 'ruim' ? styles[s.tom] : styles[`neutro${neutra++ % 3}`]
          const estado = destaque == null ? '' : destaque === i ? styles.aceso : styles.apagado
          return (
            <div key={i} className={`${styles.lado} ${tom} ${estado}`} style={{ flexGrow: Math.max(peso / lados, 0.28) }}>
              <span className={styles.faixa}>
                {textoDaFaixa(lados, s.de, s.ate)}
                {lados !== 2 ? <small> · {Math.round((peso / lados) * 100)}%</small> : null}
              </span>
              <span className={styles.efeito}>
                <TextoComIcones texto={s.texto} />
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
