'use client'

import { useEffect, useState } from 'react'
import Avatar from '@/components/Avatar'
import Card from '@/components/Card'
import { AboboraIcon, TokenIcon } from '@/components/icons'
import AberturaDeEnvelope, { ObjetoDaRecompensa } from '@/components/Envelope'
import { useSessao } from '@/components/SessaoGuard'
import { avatarAleatorio, vestirParaMostrar, type Avatar as Receita } from '@/data/avatar'
import { carregarDoBanco, sincronizar } from '@/data/sync'
import { getCard } from '@/game/catalogo'
import { NOMES_DE_RARIDADE } from '@/game/colecao'
import { COSMETICOS, cosmeticoPorId, type Cosmetico } from '@/game/cosmeticos'
import { abrirEnvelope, hoje, type Abertura } from '@/game/missoes'
import { loadCollection, loadRun } from '@/game/storage'
import {
  VAGAS,
  chaveDaVaga,
  comprar,
  halloweenQueFalta,
  maquinaDeHoje,
  precoDaVaga,
  raridadeDaVaga,
  saldo,
  temporadaDeHalloween,
  type Vaga,
} from '@/game/tokens'
import type { Collection, GameState } from '@/game/types'
import styles from './maquina.module.sass'
import { tocar } from '@/data/efeitos'
import BotaoQueTreme from '@/components/BotaoQueTreme'

/** Quanto dura a queda da vaga até a boca (bate com `.caindo` no sass). */
const QUEDA_MS = 1300

/**
 * A máquina de vendas (v0.29): onde os tokens viram a carta ou o item que a
 * sorte não deu. Três cartas e três itens por dia (`maquinaDeHoje`), montados
 * uma vez e gravados na coleção — recarregar não sorteia outra vitrine, e a
 * vaga comprada fica vazia até amanhã.
 *
 * A estética é de máquina de lanche de corredor de escritório: o gabinete, a
 * vitrine de vidro com as molas, o visor de cristal líquido que fala com
 * quem compra, e a boca embaixo, onde o que foi comprado cai. Tocar na vaga
 * escolhe; "Comprar" desconta, a mola gira e o prêmio cai na boca.
 */
export default function MaquinaPage() {
  const sessao = useSessao()
  const [colecao, setColecao] = useState<Collection | null>(null)
  const [escolhida, setEscolhida] = useState<Vaga | null>(null)
  const [visor, setVisor] = useState<{ texto: string; erro?: boolean } | null>(null)
  const [caindo, setCaindo] = useState<Vaga | null>(null)
  const [naBoca, setNaBoca] = useState<Vaga | null>(null)
  const [abrindo, setAbrindo] = useState<(Omit<Abertura, 'colecao' | 'tokens'> & { novas: string[] }) | null>(null)
  // quem veste o item na vitrine: o seu avatar, ou um sorteado se ainda é
  // o manequim (que não veste nada)
  const [modelo] = useState<Receita>(() =>
    sessao.avatar.rosto !== 'manequim' ? sessao.avatar : avatarAleatorio(COSMETICOS.map((c) => c.id)),
  )

  // a coleção do espelho abre a página e a do banco a substitui; a vitrine
  // de hoje é montada em cima da que valer, e gravada se for nova
  useEffect(() => {
    let vivo = true
    const montar = (c: Collection) => {
      const comVitrine = maquinaDeHoje(c, hoje())
      setColecao(comVitrine)
      if (comVitrine !== c) sincronizar(sessao.id, loadRun<GameState>(), comVitrine, () => {})
    }
    montar(loadCollection())
    void carregarDoBanco(sessao.id)
      .then(({ collection }) => {
        if (vivo) montar(collection)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [sessao.id])

  if (!colecao?.maquina) return <main className="page" />
  const m = colecao.maquina
  const vagas: Vaga[][] = [
    Array.from({ length: VAGAS.cartas }, (_, i) => m.cartas[i]).map((id) => (id ? { tipo: 'carta' as const, id } : null)).filter(Boolean) as Vaga[],
    Array.from({ length: VAGAS.cosmeticos }, (_, i) => m.cosmeticos[i]).map((id) => (id ? { tipo: 'cosmetico' as const, id } : null)).filter(Boolean) as Vaga[],
  ]
  // a prateleira da abóbora (v0.34): só na temporada, e só enquanto houver
  // item de Halloween que a pessoa não tem — a abóbora daqui nunca repete
  if (temporadaDeHalloween(hoje()) && halloweenQueFalta(colecao).length > 0) vagas.push([{ tipo: 'abobora', id: 'abobora' }])
  const vendida = (v: Vaga) => m.vendidos.includes(chaveDaVaga(v))
  const meuSaldo = saldo(colecao)

  function escolher(v: Vaga) {
    if (caindo || vendida(v)) return
    setEscolhida(v)
    setVisor(null)
  }

  function comprarEscolhida() {
    if (!escolhida || !colecao || caindo) return
    const r = comprar(colecao, escolhida)
    if (typeof r === 'string') {
      tocar('semDinheiro')
      setVisor({ texto: r, erro: true })
      return
    }
    setColecao(r)
    sincronizar(sessao.id, loadRun<GameState>(), r, () => {})
    setCaindo(escolhida)
    setNaBoca(null)
    setVisor({ texto: 'Obrigado!' })
    const v = escolhida
    setEscolhida(null)
    if (v.tipo === 'abobora') setVisor({ texto: 'Toque na abóbora' })
    setTimeout(() => {
      setCaindo(null)
      setNaBoca(v)
    }, QUEDA_MS)
  }

  /** A abóbora comprada entrou fechada na coleção; abrir é aqui, na boca.
   *  Abre ANTES da animação, como toda recompensa: fechar no meio não perde
   *  o item, e sair da página sem abrir a deixa na fila do início. */
  function abrirAbobora() {
    if (!colecao) return
    const i = colecao.envelopes.findIndex((e) => e.tipo === 'abobora')
    const r = i >= 0 ? abrirEnvelope(colecao, i) : null
    setNaBoca(null)
    if (!r) return
    setColecao(r.colecao)
    sincronizar(sessao.id, loadRun<GameState>(), r.colecao, () => {})
    setAbrindo({ tipo: r.tipo, cartas: r.cartas, cosmeticos: r.cosmeticos, emToken: r.emToken, novas: [] })
    setVisor(null)
  }

  const textoDoVisor = visor
    ? visor.texto
    : escolhida
      ? `${codigo(escolhida, vagas)} · ${nomeDaVaga(escolhida, colecao)}`
      : 'Escolha uma vaga'

  return (
    // sem título nem explicação, a pedido do autor: a máquina se explica, e
    // sem texto ela cabe inteira na tela do celular, sem rolar
    <main className={styles.pagina}>
      <h1 className="sr-only">Máquina de vendas</h1>

      <div className={styles.maquina}>
        <div className={styles.letreiro} aria-hidden>
          CLT
        </div>

        <div className={styles.corpo}>
          <div className={styles.vitrine}>
            <span className={styles.reflexo} aria-hidden />
            {vagas.map((fileira, f) => (
              <div key={f} className={styles.prateleira}>
                {fileira.map((v, i) => {
                  const cosmetico = v.tipo === 'cosmetico' ? cosmeticoPorId(v.id) : undefined
                  const vazia = vendida(v) && caindo?.id !== v.id
                  return (
                    <button
                      key={v.id}
                      type="button"
                      className={`${styles.vaga} ${escolhida && chaveDaVaga(escolhida) === chaveDaVaga(v) ? styles.escolhida : ''} ${vazia ? styles.vazia : ''}`}
                      onClick={() => escolher(v)}
                      disabled={vazia}
                      aria-label={`${codigo(v, vagas)}: ${nomeDaVaga(v, colecao)}, ${precoDaVaga(v, colecao)} tokens${vazia ? ', esgotado' : ''}`}
                    >
                      <span className={`${styles.produto} ${caindo && chaveDaVaga(caindo) === chaveDaVaga(v) ? styles.caindo : ''}`}>
                        {vazia ? null : v.tipo === 'abobora' ? (
                          <ObjetoDaRecompensa tipo="abobora" largura={72} className={styles.aboboraNaVaga} />
                        ) : v.tipo === 'carta' ? (
                          <Card card={getCard(v.id)} className={styles.cartaNaVaga} />
                        ) : cosmetico ? (
                          <ItemNaVitrine cosmetico={cosmetico} modelo={modelo} tamanho={84} />
                        ) : null}
                      </span>
                      <Mola girando={!!caindo && chaveDaVaga(caindo) === chaveDaVaga(v)} />
                      <span className={`${styles.etiqueta} ${styles[`r_${raridadeDaVaga(v)}`]}`}>
                        <b>{codigo(v, vagas)}</b>
                        {vazia ? (
                          'esgotado'
                        ) : (
                          precoDaVaga(v, colecao) === 0 ? (
                            'grátis'
                          ) : (
                            <>
                              <TokenIcon size={14} />
                              {precoDaVaga(v, colecao)}
                            </>
                          )
                        )}
                      </span>
                    </button>
                  )
                })}
                {fileira.length === 0 ? <p className={styles.semNada}>{f === 0 ? 'Você já tem todas as cartas.' : 'Você já tem todos os itens.'}</p> : null}
              </div>
            ))}
          </div>

          <div className={styles.painel}>
            <div className={`${styles.visor} ${visor?.erro ? styles.visorErro : ''}`} aria-live="polite">
              {textoDoVisor}
            </div>
            <div className={styles.saldo}>
              <span>Saldo</span>
              <b>
                <TokenIcon size={22} /> {meuSaldo}
              </b>
            </div>
            {escolhida ? (
              <div className={styles.preco}>
                <span>Preço</span>
                <b className={meuSaldo < precoDaVaga(escolhida, colecao) ? styles.falta : ''}>
                  <TokenIcon size={18} /> {precoDaVaga(escolhida, colecao)}
                </b>
              </div>
            ) : null}
            <span className={styles.fenda} aria-hidden />
            <BotaoQueTreme className={styles.comprar} disabled={!escolhida || !!caindo} onClick={comprarEscolhida}>
              Comprar
            </BotaoQueTreme>
          </div>
        </div>

        {/* a boca: onde o que foi comprado cai. Já está na coleção — tocar
            só tira da boca */}
        <button
          type="button"
          className={`${styles.boca} ${naBoca ? styles.bocaCheia : ''}`}
          onClick={() => (naBoca?.tipo === 'abobora' ? abrirAbobora() : setNaBoca(null))}
          disabled={!naBoca}
          aria-label={
            naBoca
              ? naBoca.tipo === 'abobora'
                ? 'A abóbora comprada: toque para abrir'
                : `${nomeDaVaga(naBoca, colecao)} — já está na sua coleção. Toque para tirar.`
              : 'Boca da máquina, vazia'
          }
        >
          {naBoca ? (
            <span className={styles.premio}>
              {naBoca.tipo === 'abobora' ? (
                <ObjetoDaRecompensa tipo="abobora" largura={64} />
              ) : naBoca.tipo === 'carta' ? (
                <Card card={getCard(naBoca.id)} className={styles.cartaNaBoca} />
              ) : cosmeticoPorId(naBoca.id) ? (
                <ItemNaVitrine cosmetico={cosmeticoPorId(naBoca.id)!} modelo={modelo} tamanho={72} />
              ) : null}
              <span className={styles.premioTexto}>
                <b>{naBoca.tipo === 'abobora' ? 'Toque para abrir' : nomeDaVaga(naBoca, colecao)}</b>
              </span>
            </span>
          ) : (
            <span className={styles.empurre}>empurre</span>
          )}
        </button>
      </div>
      {abrindo ? <AberturaDeEnvelope {...abrindo} onFechar={() => setAbrindo(null)} /> : null}
    </main>
  )
}

/** "A1", "B3": a fileira (A cartas, B itens, C a abóbora) e a posição, como
 *  na máquina. */
function codigo(v: Vaga, vagas: Vaga[][]): string {
  if (v.tipo === 'abobora') return 'C1'
  const f = v.tipo === 'carta' ? 0 : 1
  return `${'AB'[f]}${vagas[f].findIndex((x) => x.id === v.id) + 1}`
}

function nomeDaVaga(v: Vaga, c?: Collection): string {
  if (v.tipo === 'abobora') return c && !c.aboboraGratis ? 'Abóbora (grátis)' : 'Abóbora'
  const nome = v.tipo === 'carta' ? getCard(v.id).name : (cosmeticoPorId(v.id)?.nome ?? v.id)
  return `${nome} (${NOMES_DE_RARIDADE[raridadeDaVaga(v)]})`
}

/** O item na vitrine: o avatar vestindo a peça, com a abóbora no canto se
 *  for da coleção de Halloween. */
function ItemNaVitrine({ cosmetico, modelo, tamanho }: { cosmetico: Cosmetico; modelo: Receita; tamanho: number }) {
  return (
    <span className={styles.item}>
      <Avatar avatar={vestirParaMostrar(modelo, cosmetico.campo, cosmetico.valor)} tamanho={tamanho} />
      {cosmetico.tema === 'halloween' ? <AboboraIcon size={22} className={styles.abobora} /> : null}
    </span>
  )
}

/** A mola de arame que segura o produto: gira uma volta quando ele sai. */
function Mola({ girando }: { girando: boolean }) {
  return (
    <svg className={`${styles.mola} ${girando ? styles.molaGirando : ''}`} viewBox="0 0 120 16" aria-hidden>
      {Array.from({ length: 7 }, (_, i) => (
        <ellipse key={i} cx={10 + i * 16.6} cy="8" rx="7" ry="6" fill="none" stroke="currentColor" strokeWidth="2.2" />
      ))}
    </svg>
  )
}
