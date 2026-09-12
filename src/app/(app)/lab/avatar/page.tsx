'use client'

import { Check, FlaskConical } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import Avatar, {
  ACESSORIOS,
  CABELOS_FORMA,
  MEDIDAS,
  OLHOS,
  type Acessorio,
  type Ajustes,
  type FormaDeCabelo,
  type Medidas,
  type Olhos,
} from '@/components/Avatar'
import Dialogo from '@/components/Dialogo'
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
import { SLOTS_DE_COR } from './sugestoes'
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
 *
 * **As peças marcadas com o frasco são de TESTE e o jogador não as alcança.**
 * Elas existem no `Avatar.tsx` e são desenhadas de verdade, mas a receita
 * gravada no banco não tem como pedi-las — cabelo quadrado, careca, degradê,
 * boné, chapéu e olho detalhado. Isso é de propósito: dá para ver como ficam
 * em todas as combinações antes de decidir se entram, e decidir que não entram
 * não custa migração nenhuma.
 *
 * Clique simples experimenta; **clique duplo abre a confirmação** de "adicionar
 * ao jogo", que não é automática (não há servidor) — ela junta a peça numa
 * lista com o que falta fazer no código para promovê-la.
 */

/** [mínimo, máximo, o que é, passo] */
const LIMITES: Record<keyof Medidas, [number, number, string, number]> = {
  larg: [12, 32, 'meia-largura do rosto', 0.5],
  topo: [6, 28, 'topo da cabeça', 0.5],
  queixo: [56, 86, 'linha do queixo', 0.5],
  cantoY: [0, 30, 'canto do rosto, vertical', 0.5],
  cantoX: [0, 32, 'canto do rosto, horizontal', 0.5],
  rx: [16, 40, 'raio horizontal do cabelo', 0.5],
  ry: [16, 40, 'raio vertical do cabelo', 0.5],
  cy: [20, 50, 'centro do cabelo', 0.5],
  ombro: [64, 92, 'onde o ombro começa', 0.5],
  meioOmbro: [0, 34, 'recuo do ombro', 0.5],
  ombroBorda: [0, 34, 'borda do ombro: quanto ele é arredondado', 0.5],
  pescocoLarg: [3, 14, 'grossura do pescoço', 0.5],
  pescocoAlt: [6, 30, 'quanto do pescoço aparece', 0.5],
  escalaCabeca: [0.7, 1.3, 'tamanho da cabeça inteira', 0.01],
  nariz: [0.5, 2, 'tamanho do nariz', 0.05],
  sobrancelha: [0.8, 6, 'grossura da sobrancelha', 0.2],
  olho: [0.6, 1.8, 'tamanho do olho', 0.05],
}

const GRUPOS: { titulo: string; chaves: (keyof Medidas)[] }[] = [
  { titulo: 'Rosto', chaves: ['larg', 'topo', 'queixo', 'cantoY', 'cantoX', 'escalaCabeca'] },
  { titulo: 'Cabelo', chaves: ['rx', 'ry', 'cy'] },
  { titulo: 'Pescoço e ombros', chaves: ['pescocoLarg', 'pescocoAlt', 'ombro', 'meioOmbro', 'ombroBorda'] },
  { titulo: 'Feições', chaves: ['nariz', 'sobrancelha', 'olho'] },
]

// v2: o estado ganhou as peças de teste e as aprovadas. Um estado da v1 não
// as tem, e a página quebraria ao ler — mesma regra do save do jogo
const CHAVE = 'clt:avatar-lab:v2'

interface Estado {
  receita: Receita
  medidas: Medidas
  cores: { cabelo: string; roupa: string; fundo: string; pele: string; acessorio: string; olho: string }
  pecas: { silhueta: string; franja: string; mecha: string }
  teste: { cabelo: FormaDeCabelo; acessorio: Acessorio; olhos: Olhos }
  /** O que você já confirmou que quer no jogo, para não se perder. */
  aprovadas: string[]
}

function inicial(corpo: Corpo): Estado {
  return {
    receita: { ...AVATAR_PADRAO, corpo, cabelo: 'longo', pele: 'media', cor: 'castanho' },
    medidas: { ...MEDIDAS[corpo] },
    cores: {
      cabelo: '#6b4326', roupa: '#6f7f8c', fundo: '#d8cfba',
      pele: '', acessorio: '#8c5a58', olho: '#4a3524',
    },
    pecas: { silhueta: '', franja: '', mecha: '' },
    teste: { cabelo: 'longo', acessorio: 'nenhum', olhos: 'simples' },
    aprovadas: [],
  }
}

/** O que o popup precisa saber para explicar o que falta fazer no código. */
interface Promocao {
  chave: string
  titulo: string
  oQue: string
  passos: string[]
}

export default function AvatarLabPage() {
  const [e, setE] = useState<Estado>(() => inicial('homem'))
  const [copiado, setCopiado] = useState(false)
  const [promovendo, setPromovendo] = useState<Promocao | null>(null)

  // o trabalho do lab sobrevive a recarregar a página: mexer em dezessete
  // números e perder tudo num F5 é o jeito mais rápido de abandonar a
  // ferramenta
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

  function aprovar(p: Promocao) {
    if (!e.aprovadas.includes(p.chave)) guardar({ ...e, aprovadas: [...e.aprovadas, p.chave] })
    setPromovendo(null)
  }

  const ajustes: Ajustes = {
    medidas: e.medidas,
    cores: {
      cabelo: e.cores.cabelo,
      roupa: e.cores.roupa,
      fundo: e.cores.fundo,
      pele: e.cores.pele || undefined,
      acessorio: e.cores.acessorio,
      olho: e.cores.olho,
    },
    pecas: {
      silhueta: e.pecas.silhueta.trim() || undefined,
      franja: e.pecas.franja.trim() || undefined,
      mecha: e.pecas.mecha.trim() || undefined,
    },
    teste: e.teste,
  }

  /** As miniaturas da galeria não herdam a peça em edição do mesmo grupo —
   *  senão todas as opções de cabelo apareceriam com o cabelo escolhido. */
  function comTeste(troca: Partial<Estado['teste']>): Ajustes {
    return { ...ajustes, teste: { ...e.teste, ...troca } }
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
      <p className={styles.avisoTeste}>
        <FlaskConical size={15} aria-hidden />
        O que estiver marcado assim é <b>peça de teste</b>: desenhada de verdade, mas fora do
        alcance do jogador — a receita gravada no banco não tem como pedir. Clique para
        experimentar, <b>clique duas vezes</b> para confirmar que quer no jogo.
      </p>

      <div className={styles.mesa}>
        <div className={styles.palco}>
          <Avatar avatar={e.receita} tamanho={200} ajustes={ajustes} />
          <div className={styles.miniaturas}>
            {[64, 40, 24].map((t) => (
              <Avatar key={t} avatar={e.receita} tamanho={t} ajustes={ajustes} />
            ))}
          </div>
          {/* o palco tem 200px e "Homem | Mulher | Manequim" não cabe: os chips
              do Segmentado não quebram, e sem isto ele transbordava POR CIMA da
              coluna de controles, à direita */}
          <div className={styles.rolaLado}>
            <Segmentado rotulo="Corpo" valor={e.receita.corpo} onChange={trocarCorpo} opcoes={CORPOS} />
          </div>
          <div className={styles.rolaLado}>
            <Segmentado
              rotulo="Pele"
              valor={e.receita.pele}
              onChange={(v) => guardar({ ...e, receita: { ...e.receita, pele: v } })}
              opcoes={PELES}
            />
          </div>
        </div>

        <div className={styles.controles}>
          <section className={styles.bloco}>
            <h2 className={styles.blocoTitulo}>Cabelo</h2>
            <div className={styles.galeria}>
              {(Object.keys(CABELOS_FORMA) as FormaDeCabelo[]).map((id) => {
                const f = CABELOS_FORMA[id]
                return (
                  <Peca
                    key={id}
                    rotulo={f.rotulo}
                    teste={f.teste}
                    ativa={e.teste.cabelo === id}
                    aprovada={e.aprovadas.includes(`cabelo:${id}`)}
                    aoEscolher={() => guardar({ ...e, teste: { ...e.teste, cabelo: id } })}
                    aoPromover={() =>
                      setPromovendo({
                        chave: `cabelo:${id}`,
                        titulo: `Cabelo “${f.rotulo}” no jogo`,
                        oQue: f.teste
                          ? 'O desenho já existe e já é feito pelo componente do jogo. O que falta é a receita do jogador poder pedi-lo.'
                          : 'Este corte já está no jogo — não há nada a fazer.',
                        passos: f.teste
                          ? [
                              `Em src/data/avatar.ts: acrescente '${id}' ao tipo Corte e { valor: '${id}', rotulo: '${f.rotulo}' } em CORTES.`,
                              `Em src/components/Avatar.tsx: tire o teste: true da linha '${id}' de CABELOS_FORMA.`,
                              'Em /perfil/editar a opção aparece sozinha, porque a tela lê CORTES.',
                              'Não precisa mexer no banco: salvar_avatar() não valida, e lerAvatar() já cai no padrão diante de peça desconhecida.',
                            ]
                          : [],
                      })
                    }
                  >
                    <Avatar avatar={e.receita} tamanho={56} ajustes={comTeste({ cabelo: id })} />
                  </Peca>
                )
              })}
            </div>
          </section>

          <section className={styles.bloco}>
            <h2 className={styles.blocoTitulo}>Acessório</h2>
            <p className={styles.blocoDica}>
              É a peça barata: vai solta por cima de tudo, sem encaixe com o cabelo nem com o
              rosto para errar — o oposto do cabelo, que custou três tentativas.
            </p>
            <div className={styles.galeria}>
              {(Object.keys(ACESSORIOS) as Acessorio[]).map((id) => {
                const a = ACESSORIOS[id]
                return (
                  <Peca
                    key={id}
                    rotulo={a.rotulo}
                    teste={a.teste}
                    ativa={e.teste.acessorio === id}
                    aprovada={e.aprovadas.includes(`acessorio:${id}`)}
                    aoEscolher={() => guardar({ ...e, teste: { ...e.teste, acessorio: id } })}
                    aoPromover={() =>
                      setPromovendo({
                        chave: `acessorio:${id}`,
                        titulo: `Acessório “${a.rotulo}” no jogo`,
                        oQue: a.teste
                          ? 'O desenho já existe. O acessório é o único destes que a receita ainda não tem campo para guardar — é o que custa mais.'
                          : 'Não é uma peça: é a ausência de acessório.',
                        passos: a.teste
                          ? [
                              'Em src/data/avatar.ts: acrescente acessorio ao tipo Avatar (com ‘nenhum’ no AVATAR_PADRAO) e uma lista ACESSORIOS de rótulos.',
                              'Decida a COR: ou ela vira uma sexta escolha da receita, ou o acessório herda a cor da roupa. Herdar é mais barato e combina sozinho.',
                              'Em src/components/Avatar.tsx: leia avatar.acessorio em vez de ajustes.teste.acessorio, e tire o teste: true.',
                              'Em /perfil/editar: mais um Segmentado, lendo a lista nova.',
                              'Sem migração: lerAvatar() cai no padrão para quem não tiver o campo.',
                            ]
                          : [],
                      })
                    }
                  >
                    <Avatar avatar={e.receita} tamanho={56} ajustes={comTeste({ acessorio: id })} />
                  </Peca>
                )
              })}
            </div>
          </section>

          <section className={styles.bloco}>
            <h2 className={styles.blocoTitulo}>Olhos</h2>
            <div className={styles.galeria}>
              {(Object.keys(OLHOS) as Olhos[]).map((id) => {
                const o = OLHOS[id]
                return (
                  <Peca
                    key={id}
                    rotulo={o.rotulo}
                    teste={o.teste}
                    ativa={e.teste.olhos === id}
                    aprovada={e.aprovadas.includes(`olhos:${id}`)}
                    aoEscolher={() => guardar({ ...e, teste: { ...e.teste, olhos: id } })}
                    aoPromover={() =>
                      setPromovendo({
                        chave: `olhos:${id}`,
                        titulo: `Olhos “${o.rotulo}” no jogo`,
                        oQue: o.teste
                          ? 'Confira antes em 24px, na barra lateral: detalhe que só aparece no tamanho grande é peso sem retorno.'
                          : 'Já é o olho do jogo.',
                        passos: o.teste
                          ? [
                              'Se for para TODO MUNDO: troque o padrão de OLHOS em Avatar.tsx e tire o teste: true. Não mexe em receita nem em banco.',
                              'Se for ESCOLHA do jogador: acrescente olhos ao tipo Avatar, uma lista de rótulos, e um Segmentado em /perfil/editar.',
                              'A cor da íris só existe no olho detalhado — se ele entrar como escolha, ela precisa de uma paleta própria.',
                            ]
                          : [],
                      })
                    }
                  >
                    <Avatar avatar={e.receita} tamanho={56} ajustes={comTeste({ olhos: id })} />
                  </Peca>
                )
              })}
            </div>
          </section>

          {GRUPOS.map((g) => (
            <section key={g.titulo} className={styles.bloco}>
              <h2 className={styles.blocoTitulo}>{g.titulo}</h2>
              {g.chaves.map((k) => {
                const [min, max, texto, passo] = LIMITES[k]
                return (
                  <label key={k} className={styles.numero}>
                    <span>
                      <b>{k}</b> <i>{texto}</i>
                    </span>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={passo}
                      value={e.medidas[k]}
                      onChange={(ev) =>
                        guardar({ ...e, medidas: { ...e.medidas, [k]: Number(ev.target.value) } })
                      }
                    />
                    <output>{e.medidas[k]}</output>
                  </label>
                )
              })}
            </section>
          ))}

          <button
            type="button"
            className={buttons.button}
            onClick={() => guardar({ ...e, medidas: { ...MEDIDAS[e.receita.corpo] } })}
          >
            Voltar às medidas do jogo
          </button>

          <section className={styles.bloco}>
            <h2 className={styles.blocoTitulo}>Cores</h2>
            <p className={styles.blocoDica}>
              As sugestões são um atalho: clicar numa preenche o hex, e é o <b>hex</b> que manda.
              Hoje o jogo tem {PELES.length} peles, {CORES.length} cores de cabelo, {ROUPAS.length}{' '}
              de roupa e {FUNDOS.length} de fundo.
            </p>
            {SLOTS_DE_COR.map((slot) => {
              const atual = e.cores[slot.chave]
              return (
                <div key={slot.chave} className={styles.slotCor}>
                  <label className={styles.cor}>
                    <span>{slot.rotulo}</span>
                    <input
                      type="color"
                      value={atual || '#c98d5d'}
                      onChange={(ev) =>
                        guardar({ ...e, cores: { ...e.cores, [slot.chave]: ev.target.value } })
                      }
                    />
                    <input
                      className={styles.hex}
                      value={atual}
                      placeholder={slot.chave === 'pele' ? 'vazio = a pele escolhida' : '#rrggbb'}
                      onChange={(ev) =>
                        guardar({ ...e, cores: { ...e.cores, [slot.chave]: ev.target.value } })
                      }
                    />
                  </label>
                  <div className={styles.amostras}>
                    {slot.cores.map((cor) => (
                      <button
                        key={cor.hex}
                        type="button"
                        title={`${cor.nome} ${cor.hex}${cor.noJogo ? ' — já está no jogo' : ' — sugestão de teste'}`}
                        aria-label={`${cor.nome}, ${cor.noJogo ? 'já está no jogo' : 'sugestão de teste'}`}
                        className={`${styles.amostra} ${cor.noJogo ? '' : styles.amostraTeste} ${
                          atual.toLowerCase() === cor.hex ? styles.amostraAtiva : ''
                        } ${e.aprovadas.includes(`cor:${slot.chave}:${cor.hex}`) ? styles.amostraOk : ''}`}
                        style={{ background: cor.hex }}
                        onClick={() =>
                          guardar({ ...e, cores: { ...e.cores, [slot.chave]: cor.hex } })
                        }
                        onDoubleClick={() =>
                          setPromovendo({
                            chave: `cor:${slot.chave}:${cor.hex}`,
                            titulo: `${cor.nome} (${cor.hex}) em ${slot.rotulo}`,
                            oQue: cor.noJogo
                              ? 'Esta cor já é uma das que o jogador pode escolher.'
                              : `Para o jogador poder escolher esta cor ela precisa entrar em duas listas: ${slot.onde}.`,
                            passos: cor.noJogo
                              ? []
                              : [
                                  `Acrescente ${cor.hex} em ${slot.onde}.`,
                                  slot.chave === 'pele'
                                    ? 'A pele precisa dos TRÊS tons: base, sombra e sombra forte. O lab deriva as sombras automaticamente para ver o efeito, mas no jogo elas são escolhidas à mão — derivada some no tom escuro.'
                                    : 'Confira na grade do rodapé: cor que fica boa num corpo costuma sumir em outro.',
                                ],
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </section>

          <section className={styles.bloco}>
            <h2 className={styles.blocoTitulo}>Peças novas, por caminho SVG</h2>
            <p className={styles.blocoDica}>
              Cole o <code>d=</code> de um caminho desenhado numa prancheta de 100×100 (Figma,
              Inkscape). Vazio = a peça do corte escolhido acima. A <b>mecha</b> é escrita só para
              o lado direito: o esquerdo é espelhado sozinho.
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

          {e.aprovadas.length > 0 ? (
            <section className={`${styles.bloco} ${styles.aprovadasBloco}`}>
              <h2 className={styles.blocoTitulo}>Aprovadas para entrar no jogo</h2>
              <p className={styles.blocoDica}>
                Esta lista é um lembrete seu, não uma fila: <b>nada aqui entrou no jogo</b>. Ela
                mora neste navegador e some se você limpar o storage.
              </p>
              <ul className={styles.aprovadas}>
                {e.aprovadas.map((a) => (
                  <li key={a}>
                    <Check size={14} aria-hidden /> <code>{a}</code>
                    <button
                      type="button"
                      className={styles.tirar}
                      onClick={() =>
                        guardar({ ...e, aprovadas: e.aprovadas.filter((x) => x !== a) })
                      }
                    >
                      tirar
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
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

      {promovendo ? (
        <Dialogo titulo={promovendo.titulo} onFechar={() => setPromovendo(null)}>
          <p className={styles.popupTexto}>{promovendo.oQue}</p>
          {promovendo.passos.length > 0 ? (
            <>
              <p className={styles.popupAviso}>
                Confirmar <b>não escreve código</b> — o site é export estático e não tem servidor
                para escrever arquivo. O que a confirmação faz é guardar a peça numa lista, para
                você não perder a decisão até fazer isto aqui:
              </p>
              <ol className={styles.passos}>
                {promovendo.passos.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            </>
          ) : null}
          <div className={styles.popupAcoes}>
            <button type="button" className={buttons.button} onClick={() => setPromovendo(null)}>
              Cancelar
            </button>
            {promovendo.passos.length > 0 ? (
              <button
                type="button"
                className={`${buttons.button} ${buttons.primary}`}
                onClick={() => aprovar(promovendo)}
              >
                Confirmar e adicionar à lista
              </button>
            ) : null}
          </div>
        </Dialogo>
      ) : null}
    </main>
  )
}

/**
 * Um item da galeria. Clique simples experimenta, clique duplo abre a
 * confirmação — e o frasco marca o que ainda não é alcançável pelo jogador,
 * que é a informação mais importante desta tela.
 */
function Peca({ rotulo, teste, ativa, aprovada, aoEscolher, aoPromover, children }: {
  rotulo: string
  teste?: boolean
  ativa: boolean
  aprovada: boolean
  aoEscolher: () => void
  aoPromover: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={`${styles.pecaBotao} ${teste ? styles.pecaTeste : ''} ${ativa ? styles.pecaAtiva : ''}`}
      onClick={aoEscolher}
      onDoubleClick={aoPromover}
      title={teste ? `${rotulo} — peça de teste. Clique duplo para confirmar que quer no jogo.` : rotulo}
    >
      {children}
      <span className={styles.pecaNome}>
        {teste ? <FlaskConical size={11} aria-hidden /> : null}
        {rotulo}
        {aprovada ? <Check size={11} aria-hidden /> : null}
      </span>
    </button>
  )
}
