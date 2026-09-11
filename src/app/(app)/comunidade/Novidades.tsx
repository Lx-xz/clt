'use client'

import { EM_ANDAMENTO, ROTULO_TIPO, VERSOES } from '@/data/changelog'
import styles from './changelog.module.sass'

function dataCurta(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export default function Novidades() {
  return (
    <>
      <p className={styles.intro}>
        O que já entrou no jogo, e o que está sendo feito agora. Sentiu falta de alguma coisa? A
        página de <b>Feedbacks</b> é o caminho — o que entra aqui costuma ter
        começado lá.
      </p>

      <section className={styles.andamento}>
        <h2 className={styles.andamentoTitulo}>Fazendo agora</h2>
        <ul className={styles.lista}>
          {EM_ANDAMENTO.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

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
                <span>{item.texto}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
