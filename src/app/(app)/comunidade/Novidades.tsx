'use client'

import { ROTULO_TIPO, VERSOES, type AntesEDepois } from '@/data/changelog'
import styles from './changelog.module.sass'
import { TextoComIcones } from '@/components/Dinheiro'

function dataCurta(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

/** A foto de antes e a de agora, lado a lado (uma embaixo da outra no
 *  celular). Tocar abre a foto inteira numa aba. */
function Comparacao({ c }: { c: AntesEDepois }) {
  const foto = (img: AntesEDepois['antes'], rotulo: string, alt: string) => (
    <a className={styles.foto} href={img.src} target="_blank" rel="noreferrer">
      <span className={styles.rotuloFoto}>{rotulo}</span>
      <img src={img.src} width={img.width} height={img.height} alt={alt} loading="lazy" />
    </a>
  )
  return (
    <figure className={styles.comparacao}>
      <div className={styles.fotos}>
        {foto(c.antes, `Antes · ${c.antesDe}`, `${c.legenda}, na ${c.antesDe}`)}
        {foto(c.depois, 'Agora', `${c.legenda}, agora`)}
      </div>
      <figcaption>{c.legenda}</figcaption>
    </figure>
  )
}

export default function Novidades() {
  return (
    <>
      <p className={styles.intro}>
        O que mudou no jogo, versão por versão. Onde a cara mudou, tem a foto de antes e
        a de agora. Sentiu falta de alguma coisa? A aba de <b>Feedbacks</b> é o caminho — o que entra aqui costuma ter
        começado lá.
      </p>


      {VERSOES.map((v) => (
        <section key={v.versao} className={styles.versao}>
          <header className={styles.cabecalho}>
            <span className={styles.numero}>v{v.versao}</span>
            <h2 className={styles.nome}>{v.titulo}</h2>
            <time className={styles.data} dateTime={v.data}>
              {dataCurta(v.data)}
            </time>
          </header>
          <ul className={styles.itens}>
            {v.itens.map((item) => (
              <li key={item.texto} className={styles.item}>
                <span className={`${styles.marca} ${styles[item.tipo]}`}>
                  {ROTULO_TIPO[item.tipo]}
                </span>
                <span>
                  <TextoComIcones texto={item.texto} />
                </span>
              </li>
            ))}
          </ul>
          {v.imagens?.map((c) => <Comparacao key={c.legenda} c={c} />)}
        </section>
      ))}
    </>
  )
}
