'use client'

import { CircleHelp, MessageSquare, Pencil, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import Dialogo from '@/components/Dialogo'
import { useSessao } from '@/components/SessaoGuard'
import {
  STATUS,
  TIPOS,
  URGENCIAS,
  adminAtualizarFeedback,
  comentarFeedback,
  comentariosDoFeedback,
  criarFeedback,
  editarFeedback,
  excluirFeedback,
  feedbacksParecidos,
  listarFeedbacks,
  rotuloDe,
  type Comentario,
  type Feedback,
  type Parecido,
  type StatusFeedback,
  type TipoFeedback,
  type Urgencia,
} from '@/data/feedback'
import buttons from '@/styles/buttons.module.sass'
import styles from './feedback.module.sass'

/** O formulário do relato, enquanto ele ainda não foi enviado. */
interface Rascunho {
  id: number | null
  tipo: TipoFeedback
  titulo: string
  corpo: string
}

const RASCUNHO_VAZIO: Rascunho = { id: null, tipo: 'bug', titulo: '', corpo: '' }

function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function FeedbackPage() {
  const sessao = useSessao()
  const [lista, setLista] = useState<Feedback[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<StatusFeedback | ''>('')
  const [soMeus, setSoMeus] = useState(false)
  const [aberto, setAberto] = useState<number | null>(null)
  const [comentarios, setComentarios] = useState<Record<number, Comentario[]>>({})
  const [comentando, setComentando] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [comoFunciona, setComoFunciona] = useState(false)

  // o relato sendo escrito, e a etapa em que ele está
  const [rascunho, setRascunho] = useState<Rascunho | null>(null)
  const [parecidos, setParecidos] = useState<Parecido[] | null>(null)

  const recarregar = useCallback(() => {
    listarFeedbacks()
      .then((l) => {
        setLista(l)
        setErro(null)
      })
      .catch((e: unknown) => setErro(e instanceof Error ? e.message : 'Não deu para carregar.'))
  }, [])

  useEffect(recarregar, [recarregar])

  async function tentar(acao: () => Promise<void>) {
    setOcupado(true)
    setErro(null)
    try {
      await acao()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu certo.')
    } finally {
      setOcupado(false)
    }
  }

  function abrir(id: number) {
    if (aberto === id) {
      setAberto(null)
      return
    }
    setAberto(id)
    setComentando('')
    if (!comentarios[id]) {
      void comentariosDoFeedback(id)
        .then((c) => setComentarios((atual) => ({ ...atual, [id]: c })))
        .catch(() => {})
    }
  }

  function recarregarComentarios(id: number) {
    return comentariosDoFeedback(id).then((c) => setComentarios((atual) => ({ ...atual, [id]: c })))
  }

  /**
   * A checagem de repetido. Ela acontece ANTES de gravar, e não depois: o
   * jogador vê o que já existe e decide — abrir o que está lá, desistir, ou
   * mandar o dele assim mesmo. Relato repetido não é erro de quem escreve, é
   * falta de quem mostra o que já foi dito.
   */
  function procurarParecidos() {
    if (!rascunho) return
    if (rascunho.titulo.trim().length < 5 || rascunho.corpo.trim().length < 10) {
      setErro('Escreva um título de pelo menos 5 letras e conte o caso em pelo menos 10.')
      return
    }
    void tentar(async () => {
      // editar um relato que já existe não precisa de checagem: ele já é ele
      if (rascunho.id !== null) {
        await salvar()
        return
      }
      const achados = await feedbacksParecidos(rascunho.titulo, rascunho.corpo)
      if (achados.length === 0) {
        await salvar()
        return
      }
      setParecidos(achados)
    })
  }

  async function salvar() {
    if (!rascunho) return
    const { id, tipo, titulo, corpo } = rascunho
    if (id === null) await criarFeedback(tipo, titulo.trim(), corpo.trim(), '/feedback')
    else await editarFeedback(id, tipo, titulo.trim(), corpo.trim())
    setRascunho(null)
    setParecidos(null)
    recarregar()
  }

  const visiveis = (lista ?? []).filter(
    (f) => (!filtro || f.status === filtro) && (!soMeus || f.meu),
  )

  return (
    <main className="page">
      <header className={styles.topo}>
        <div>
          <h1 className={styles.titulo}>Feedbacks</h1>
          <p className={styles.intro}>
            Todo bug relatado e toda sugestão ficam aqui, à vista, com o que aconteceu com cada um.
            O que já foi entregue vive em <Link href="/changelog">Novidades</Link>.
          </p>
        </div>
        <div className={styles.topoAcoes}>
          <button type="button" className={buttons.button} onClick={() => setComoFunciona(true)}>
            <CircleHelp size={16} aria-hidden />
            Como funciona
          </button>
          {sessao.convidado ? null : (
            <button
              type="button"
              className={`${buttons.button} ${buttons.primary}`}
              onClick={() => {
                setRascunho(RASCUNHO_VAZIO)
                setParecidos(null)
                setErro(null)
              }}
            >
              <Plus size={16} aria-hidden />
              Reportar ou sugerir
            </button>
          )}
        </div>
      </header>

      {sessao.convidado ? (
        <p className={styles.avisoConvidado}>
          Você está como convidado: dá para ler tudo, mas para relatar é preciso ter conta — é o
          único jeito de te responder e de você acompanhar o que aconteceu com o seu relato.{' '}
          <Link href="/">criar conta</Link>
        </p>
      ) : null}

      <div className={styles.filtros}>
        <button
          type="button"
          className={`${styles.pilula} ${filtro === '' ? styles.pilulaAtiva : ''}`}
          onClick={() => setFiltro('')}
        >
          Tudo
        </button>
        {STATUS.map((s) => (
          <button
            key={s.valor}
            type="button"
            title={s.explica}
            className={`${styles.pilula} ${filtro === s.valor ? styles.pilulaAtiva : ''}`}
            onClick={() => setFiltro(s.valor)}
          >
            {s.rotulo}
          </button>
        ))}
        {sessao.convidado ? null : (
          <label className={styles.caixa}>
            <input type="checkbox" checked={soMeus} onChange={(e) => setSoMeus(e.target.checked)} />
            <span>só os meus</span>
          </label>
        )}
      </div>

      {erro ? <p className={styles.erro}>{erro}</p> : null}
      {lista === null ? <p className={styles.vazio}>Carregando…</p> : null}
      {lista !== null && visiveis.length === 0 ? (
        <p className={styles.vazio}>Nada por aqui ainda. Seja o primeiro.</p>
      ) : null}

      <ul className={styles.lista}>
        {visiveis.map((f) => (
          <li key={f.id} id={`feedback-${f.id}`} className={`${styles.card} ${aberto === f.id ? styles.cardAberto : ''}`}>
            <button type="button" className={styles.cabecalho} onClick={() => abrir(f.id)}>
              <span className={`${styles.selo} ${styles[f.status]}`}>
                {rotuloDe(STATUS, f.status)}
              </span>
              <span className={styles.cardTitulo}>{f.titulo}</span>
              <span className={styles.meta}>
                <span className={styles.tipo}>{rotuloDe(TIPOS, f.tipo)}</span>
                <span className={styles.mono}>#{f.id}</span>
                {f.comentarios > 0 ? (
                  <span className={styles.mono}>
                    <MessageSquare size={12} aria-hidden /> {f.comentarios}
                  </span>
                ) : null}
                {f.meu ? <span className={styles.seuSelo}>seu</span> : null}
              </span>
            </button>

            {aberto === f.id ? (
              <div className={styles.corpo}>
                <p className={styles.texto}>{f.corpo}</p>
                <p className={styles.rodapeCard}>
                  por <b>{f.autor_nick}</b> em {dataCurta(f.criado_em)} · urgência{' '}
                  {rotuloDe(URGENCIAS, f.urgencia)}
                  {f.nota !== null ? ` · nota do admin ${f.nota}/5` : ''}
                </p>
                <p className={styles.explicaStatus}>
                  {STATUS.find((s) => s.valor === f.status)?.explica}
                </p>

                {f.meu || sessao.admin ? (
                  <div className={styles.acoesDono}>
                    <button
                      type="button"
                      className={`${buttons.button} ${buttons.ghost}`}
                      onClick={() =>
                        setRascunho({ id: f.id, tipo: f.tipo, titulo: f.titulo, corpo: f.corpo })
                      }
                    >
                      <Pencil size={14} aria-hidden />
                      Editar
                    </button>
                    <button
                      type="button"
                      className={`${buttons.button} ${buttons.ghost}`}
                      disabled={ocupado}
                      onClick={() => {
                        if (!window.confirm('Excluir este relato? Não dá para desfazer.')) return
                        void tentar(async () => {
                          await excluirFeedback(f.id)
                          setAberto(null)
                          recarregar()
                        })
                      }}
                    >
                      <Trash2 size={14} aria-hidden />
                      Excluir
                    </button>
                  </div>
                ) : null}

                {sessao.admin ? <PainelAdmin feedback={f} aoSalvar={recarregar} /> : null}

                <div className={styles.conversa}>
                  {(comentarios[f.id] ?? []).map((c) => (
                    <div
                      key={c.id}
                      className={`${styles.comentario} ${c.de_admin ? styles.deAdmin : ''}`}
                    >
                      <span className={styles.comentarioQuem}>
                        {c.autor_nick}
                        {c.de_admin ? <span className={styles.seloAdmin}>admin</span> : null}
                        <span className={styles.mono}>{dataCurta(c.criado_em)}</span>
                      </span>
                      <p className={styles.texto}>{c.corpo}</p>
                    </div>
                  ))}
                  {(comentarios[f.id] ?? []).length === 0 ? (
                    <p className={styles.vazio}>Sem resposta ainda.</p>
                  ) : null}
                </div>

                {sessao.convidado ? null : (
                  <form
                    className={styles.responder}
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (comentando.trim().length === 0) return
                      void tentar(async () => {
                        await comentarFeedback(f.id, comentando.trim())
                        setComentando('')
                        await recarregarComentarios(f.id)
                        recarregar()
                      })
                    }}
                  >
                    <textarea
                      className={styles.campoTexto}
                      rows={2}
                      value={comentando}
                      onChange={(e) => setComentando(e.target.value)}
                      placeholder={
                        sessao.admin ? 'Responder como admin…' : 'Acrescentar alguma coisa…'
                      }
                    />
                    <button type="submit" className={buttons.button} disabled={ocupado}>
                      Comentar
                    </button>
                  </form>
                )}
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {rascunho && parecidos === null ? (
        <Dialogo
          titulo={rascunho.id === null ? 'Reportar ou sugerir' : `Editar o relato #${rascunho.id}`}
          largo
          onFechar={() => setRascunho(null)}
          acoes={
            <>
              <button
                type="button"
                className={`${buttons.button} ${buttons.primary}`}
                disabled={ocupado}
                onClick={procurarParecidos}
              >
                {ocupado ? 'Um instante…' : rascunho.id === null ? 'Continuar' : 'Salvar'}
              </button>
              <button type="button" className={buttons.button} onClick={() => setRascunho(null)}>
                Cancelar
              </button>
            </>
          }
        >
          <label className={styles.rotulo}>
            Tipo
            <select
              className={styles.campo}
              value={rascunho.tipo}
              onChange={(e) => setRascunho({ ...rascunho, tipo: e.target.value as TipoFeedback })}
            >
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.rotulo}>
            Título
            <input
              className={styles.campo}
              value={rascunho.titulo}
              maxLength={120}
              placeholder="em uma linha, o que aconteceu"
              onChange={(e) => setRascunho({ ...rascunho, titulo: e.target.value })}
            />
          </label>
          <label className={styles.rotulo}>
            O caso
            <textarea
              className={styles.campoTexto}
              rows={6}
              maxLength={4000}
              value={rascunho.corpo}
              placeholder={
                rascunho.tipo === 'bug'
                  ? 'O que você fez, o que esperava e o que aconteceu. Aparelho e navegador ajudam muito.'
                  : 'Conte a ideia e, se der, o problema que ela resolve.'
              }
              onChange={(e) => setRascunho({ ...rascunho, corpo: e.target.value })}
            />
          </label>
          {rascunho.id === null ? (
            <p className={styles.dica}>
              Ao continuar, procuramos relatos parecidos e mostramos o que acharmos — você decide se
              abre o que já existe ou manda o seu.
            </p>
          ) : null}
        </Dialogo>
      ) : null}

      {rascunho && parecidos !== null ? (
        <Dialogo
          titulo="Isto já foi dito?"
          largo
          onFechar={() => setParecidos(null)}
          acoes={
            <>
              <button
                type="button"
                className={buttons.button}
                onClick={() => setParecidos(null)}
                disabled={ocupado}
              >
                Voltar e editar o meu
              </button>
              <button
                type="button"
                className={`${buttons.button} ${buttons.primary}`}
                disabled={ocupado}
                onClick={() => void tentar(salvar)}
              >
                {ocupado ? 'Enviando…' : 'Mandar assim mesmo'}
              </button>
              <button
                type="button"
                className={`${buttons.button} ${buttons.ghost}`}
                onClick={() => {
                  setRascunho(null)
                  setParecidos(null)
                }}
              >
                Deixa pra lá
              </button>
            </>
          }
        >
          <p className={styles.dica}>
            Achamos {parecidos.length === 1 ? 'um relato parecido' : `${parecidos.length} relatos parecidos`}
            . Se um deles for o seu caso, comente lá: relato com mais gente junto sobe na fila.
          </p>
          <ul className={styles.parecidos}>
            {parecidos.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={styles.parecido}
                  onClick={() => {
                    setRascunho(null)
                    setParecidos(null)
                    abrir(p.id)
                    document.getElementById(`feedback-${p.id}`)?.scrollIntoView({ block: 'center' })
                  }}
                >
                  <span className={`${styles.selo} ${styles[p.status]}`}>
                    {rotuloDe(STATUS, p.status)}
                  </span>
                  <span>{p.titulo}</span>
                  <span className={styles.mono}>{Math.round(p.semelhanca * 100)}%</span>
                </button>
              </li>
            ))}
          </ul>
        </Dialogo>
      ) : null}

      {comoFunciona ? (
        <Dialogo titulo="Como funciona" largo onFechar={() => setComoFunciona(false)}>
          <p className={styles.dica}>
            O combinado, dos dois lados, para ninguém ficar no escuro.
          </p>
          <h3 className={styles.subtitulo}>Do seu lado</h3>
          <ul className={styles.listaExplica}>
            <li>Você escreve; antes de gravar, mostramos o que já existe de parecido.</li>
            <li>O relato é seu: dá para editar e apagar quando quiser.</li>
            <li>Dá para comentar quantas vezes for preciso — no seu e no dos outros.</li>
            <li>Você acompanha o estado aqui mesmo, e o que virar entrega aparece em Novidades.</li>
          </ul>
          <h3 className={styles.subtitulo}>Do lado de cá</h3>
          <ul className={styles.listaExplica}>
            <li>Todo relato é lido, e responde-se pelo comentário — inclusive para dizer não.</li>
            <li>
              O estado muda conforme anda, e a urgência diz o que fura a fila. Relato bem escrito
              ganha nota, e a nota vai virar recompensa.
            </li>
            <li>Nada é apagado por ser inconveniente. Recusado vira &ldquo;não vai rolar&rdquo;, com o motivo escrito.</li>
          </ul>
          <h3 className={styles.subtitulo}>O que cada estado quer dizer</h3>
          <ul className={styles.listaExplica}>
            {STATUS.map((s) => (
              <li key={s.valor}>
                <b>{s.rotulo}</b> — {s.explica}
              </li>
            ))}
          </ul>
        </Dialogo>
      ) : null}
    </main>
  )
}

/** Os controles que só o admin vê. O banco recusa estas chamadas de outros. */
function PainelAdmin({ feedback, aoSalvar }: { feedback: Feedback; aoSalvar: () => void }) {
  const [status, setStatus] = useState<StatusFeedback>(feedback.status)
  const [urgencia, setUrgencia] = useState<Urgencia>(feedback.urgencia)
  const [nota, setNota] = useState<string>(feedback.nota === null ? '' : String(feedback.nota))
  const [salvando, setSalvando] = useState(false)
  const [falha, setFalha] = useState<string | null>(null)

  const mudou =
    status !== feedback.status ||
    urgencia !== feedback.urgencia ||
    nota !== (feedback.nota === null ? '' : String(feedback.nota))

  return (
    <div className={styles.painelAdmin}>
      <span className={styles.painelTitulo}>Admin</span>
      <label className={styles.rotuloCurto}>
        Estado
        <select value={status} onChange={(e) => setStatus(e.target.value as StatusFeedback)}>
          {STATUS.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.rotulo}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.rotuloCurto}>
        Urgência
        <select value={urgencia} onChange={(e) => setUrgencia(e.target.value as Urgencia)}>
          {URGENCIAS.map((u) => (
            <option key={u.valor} value={u.valor}>
              {u.rotulo}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.rotuloCurto}>
        Nota
        <select value={nota} onChange={(e) => setNota(e.target.value)}>
          <option value="">—</option>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className={buttons.button}
        disabled={!mudou || salvando}
        onClick={() => {
          setSalvando(true)
          setFalha(null)
          adminAtualizarFeedback(feedback.id, {
            status,
            urgencia,
            nota: nota === '' ? undefined : Number(nota),
          })
            .then(aoSalvar)
            .catch((e: unknown) => setFalha(e instanceof Error ? e.message : 'Não deu certo.'))
            .finally(() => setSalvando(false))
        }}
      >
        {salvando ? 'Salvando…' : 'Aplicar'}
      </button>
      {falha ? <span className={styles.erro}>{falha}</span> : null}
    </div>
  )
}
