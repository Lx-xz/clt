'use client'

import { ClipboardCopy, Download, Gift, Shirt, Landmark, Layers, Mail, RotateCcw, Shuffle, SlidersHorizontal, Sparkles, Unlock } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import Dialogo from '@/components/Dialogo'
import { useSessao } from '@/components/SessaoGuard'
import { cartasDoJogo, todasAsCartas, todosOsEventos, versaoDoBaralho } from '@/game/catalogo'
import { NOMES_DE_RARIDADE, baralhoAtivo, cartasDoBaralho, copiasMaximas } from '@/game/colecao'
import { regras } from '@/game/regras'
import { COSMETICOS } from '@/game/cosmeticos'
import { clearRun, defaultCollection, loadCollection, saveCollection } from '@/game/storage'
import { enviarPresente } from '@/data/presentes'
import { sincronizar } from '@/data/sync'
import buttons from '@/styles/buttons.module.sass'
import styles from './lab.module.sass'

const BANCADAS = [
  {
    href: '/lab/cartas',
    titulo: 'Cartas de ação',
    texto: 'Criar, editar e remover carta — direto no banco, com o motivo da mudança obrigatório.',
    Icon: Layers,
  },
  {
    href: '/lab/regras',
    titulo: 'Regras do jogo',
    texto: 'Aluguel, cota, salário e energia base. Quem já está jogando termina com as regras antigas.',
    Icon: SlidersHorizontal,
  },
  {
    href: '/lab/eventos',
    titulo: 'Cartas de evento',
    texto: 'O mesmo para os eventos do dia, escolhas dos ambíguos inclusas.',
    Icon: Shuffle,
  },
  {
    href: '/lab/envelopes',
    titulo: 'Recompensas',
    texto: 'Abrir envelope, pacote, maleta e cofre de mentira, com a animação de verdade, e ver o que sai em mil aberturas. Nada vai para a sua coleção.',
    Icon: Mail,
  },
  // a proposta anterior (/lab/propostas) mora no museu, guardada de
  // recordação, a pedido do autor
  {
    href: '/lab/museu',
    titulo: 'Museu',
    texto: 'As versões de antes: o envelope de CSS, a maleta de couro e a escada em 3D. Para comparar; nada aqui está no jogo.',
    Icon: Landmark,
  },
]

/**
 * A porta do lab. As bancadas ficam nas rotas de dentro; aqui em cima moram
 * os dois atalhos de teste que **mudam o SEU jogo** — e é por isso que eles
 * são de admin: com a coleção inteira desbloqueada, um relato de "o jogo está
 * fácil" não diz mais nada, e num ranking com todo mundo junto isso seria
 * vantagem.
 */
export default function LabPage() {
  const sessao = useSessao()
  const [confirmando, setConfirmando] = useState<'desbloquear' | 'cosmeticos' | 'resetar' | null>(null)
  const [recado, setRecado] = useState<string | null>(null)

  function desbloquearTudo() {
    // todas as cartas, no teto de cópias; os baralhos montados não mudam
    const colecao = loadCollection()
    const todas = cartasDoJogo()
    const nova = { ...colecao, tenho: Object.fromEntries(todas.map((c) => [c.id, copiasMaximas(c)])) }
    saveCollection(nova)
    sincronizar(sessao.id, null, nova, () => {})
    setConfirmando(null)
    setRecado(`Coleção com as ${todas.length} cartas, cada uma no teto de cópias. Os baralhos não mudaram.`)
  }

  function desbloquearCosmeticos() {
    // todas as peças da tabela, as sazonais inclusive; o avatar vestido não muda
    const colecao = loadCollection()
    const nova = { ...colecao, cosmeticos: [...new Set([...colecao.cosmeticos, ...COSMETICOS.map((c) => c.id)])] }
    saveCollection(nova)
    sincronizar(sessao.id, null, nova, () => {})
    setConfirmando(null)
    setRecado(`Os ${COSMETICOS.length} cosméticos estão na sua coleção. O avatar vestido não mudou.`)
  }

  function resetar() {
    // a run em andamento e a coleção voltam ao começo. O histórico de partidas
    // NÃO é apagado: ele é append-only no banco de propósito, e some daqui
    // seria mentir sobre o balanceamento.
    clearRun()
    const nova = defaultCollection()
    saveCollection(nova)
    sincronizar(sessao.id, null, nova, () => {})
    setConfirmando(null)
    setRecado('Run e coleção zeradas. As partidas já terminadas continuam no histórico.')
  }

  /**
   * O jogo como ele está NO AR, num arquivo: as cartas e os eventos do
   * banco, as regras do modo e o baralho equipado desta conta. É o que o
   * `npm run simular -- --de arquivo.json` lê, e o simulador não roda sem
   * ele: as cartas só moram no banco.
   */
  function dadosParaOSimulador(): string {
    const colecao = loadCollection()
    const ativo = baralhoAtivo(colecao)
    return JSON.stringify(
      {
        geradoEm: new Date().toISOString(),
        versao: versaoDoBaralho(),
        modo: regras(),
        baralho: { nome: ativo.nome, cartas: cartasDoBaralho(ativo) },
        cartas: todasAsCartas(),
        eventos: todosOsEventos(),
      },
      null,
      1,
    )
  }

  async function copiarParaOSimulador() {
    try {
      await navigator.clipboard.writeText(dadosParaOSimulador())
      setRecado('Copiado: cartas, eventos, regras e o seu baralho equipado. Cole na conversa.')
    } catch {
      setRecado('O navegador não deixou copiar. Use o “Baixar arquivo”.')
    }
  }

  function baixarParaOSimulador() {
    const url = URL.createObjectURL(new Blob([dadosParaOSimulador()], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `clt-simulador-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <main className="page">
      <h1 className={styles.titulo}>Lab</h1>
      <p className={styles.intro}>
        A oficina. Cartas, eventos e regras se editam aqui, direto no banco: é ele que vale no jogo, e o
        código anda atrás.
      </p>

      <div className={styles.bancadas}>
        {BANCADAS.map(({ href, titulo, texto, Icon }) => (
          <Link key={href} className={styles.bancada} href={href}>
            <Icon size={20} aria-hidden />
            <b>{titulo}</b>
            <span>{texto}</span>
          </Link>
        ))}
      </div>

      <h2 className={styles.secao}>Simulador</h2>
      <p className={styles.aviso}>
        O jogo como está no ar — cartas, eventos, regras e o seu baralho equipado — num arquivo, para medir o
        balanceamento com milhares de partidas fora do navegador.
      </p>
      <div className={styles.acoes}>
        <button type="button" className={buttons.button} onClick={() => void copiarParaOSimulador()}>
          <ClipboardCopy size={15} aria-hidden />
          Copiar para o simulador
        </button>
        <button type="button" className={buttons.button} onClick={baixarParaOSimulador}>
          <Download size={15} aria-hidden />
          Baixar arquivo
        </button>
      </div>

      <h2 className={styles.secao}>Presente</h2>
      <p className={styles.aviso}>
        Dá uma carta a um jogador. Ela aparece no início dele, num envelope para abrir, com o seu recado. Convidado
        não recebe.
      </p>
      <EnviarPresente />

      <h2 className={styles.secao}>Atalhos de teste</h2>
      <p className={styles.aviso}>
        Estes mexem na <b>sua</b> conta de verdade, agora. Só admin os vê justamente por isso.
      </p>
      <div className={styles.acoes}>
        <button
          type="button"
          className={buttons.button}
          onClick={() => setConfirmando('desbloquear')}
        >
          <Unlock size={15} aria-hidden />
          Desbloquear todas as cartas
        </button>
        <button type="button" className={buttons.button} onClick={() => setConfirmando('cosmeticos')}>
          <Shirt size={15} aria-hidden />
          Desbloquear todos os cosméticos
        </button>
        <button type="button" className={buttons.button} onClick={() => setConfirmando('resetar')}>
          <RotateCcw size={15} aria-hidden />
          Resetar run e coleção
        </button>
      </div>
      {recado ? (
        <p className={styles.recado}>
          <Sparkles size={14} aria-hidden />
          {recado}
        </p>
      ) : null}

      {confirmando ? (
        <Dialogo
          titulo={confirmando === 'desbloquear' ? 'Desbloquear tudo?' : confirmando === 'cosmeticos' ? 'Desbloquear os cosméticos?' : 'Resetar?'}
          onFechar={() => setConfirmando(null)}
          acoes={
            <>
              <button
                type="button"
                className={`${buttons.button} ${buttons.primary}`}
                onClick={confirmando === 'desbloquear' ? desbloquearTudo : confirmando === 'cosmeticos' ? desbloquearCosmeticos : resetar}
              >
                {confirmando === 'resetar' ? 'Resetar' : 'Desbloquear'}
              </button>
              <button type="button" className={buttons.button} onClick={() => setConfirmando(null)}>
                Cancelar
              </button>
            </>
          }
        >
          <p className={styles.dialogoTexto}>
            {confirmando === 'cosmeticos'
              ? 'Todas as peças de avatar, as de Halloween inclusive, entram na sua coleção: dá para vestir qualquer uma no editor. A máquina e as recompensas passam a dar só repetidas para esta conta.'
              : confirmando === 'desbloquear'
              ? 'Todas as cartas entram na sua coleção, no teto de cópias, fora do baralho. Serve para testar carta nova sem jogar quatro semanas — e estraga qualquer leitura de dificuldade que venha da sua conta.'
              : 'A run em andamento é descartada e a coleção volta às cartas iniciais. As partidas já terminadas continuam no histórico: elas são append-only de propósito, e apagá-las seria mentir sobre o balanceamento.'}
          </p>
        </Dialogo>
      ) : null}
    </main>
  )
}

/**
 * O presente do admin (v0.40). Quem confere se é admin é o banco
 * (`admin_enviar_presente`); a carta chega pelo site de quem recebe, no
 * início (`components/Presentes`).
 */
function EnviarPresente() {
  const cartas = [...cartasDoJogo()].sort((a, b) => a.name.localeCompare(b.name, 'pt'))
  const [nick, setNick] = useState('')
  const [carta, setCarta] = useState(cartas[0]?.id ?? '')
  const [mensagem, setMensagem] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [recado, setRecado] = useState<{ ok: boolean; texto: string } | null>(null)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setOcupado(true)
    setRecado(null)
    const r = await enviarPresente(nick.trim(), carta, mensagem)
    setOcupado(false)
    if (!r.ok) return setRecado({ ok: false, texto: r.erro ?? 'Não deu para enviar.' })
    const nome = cartas.find((c) => c.id === carta)?.name ?? 'A carta'
    setRecado({ ok: true, texto: `${nome} foi para ${nick.trim()}. Aparece na próxima vez que abrir o início.` })
    setMensagem('')
  }

  return (
    <form className={styles.presente} onSubmit={(e) => void enviar(e)}>
      <input
        className={styles.campo}
        value={nick}
        onChange={(e) => setNick(e.target.value)}
        placeholder="nick de quem recebe"
        aria-label="Nick de quem recebe"
        autoCapitalize="none"
        spellCheck={false}
        required
      />
      <select className={styles.campo} value={carta} onChange={(e) => setCarta(e.target.value)} aria-label="Carta">
        {cartas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} · {NOMES_DE_RARIDADE[c.raridade ?? 'comum']}
          </option>
        ))}
      </select>
      <input
        className={styles.campo}
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
        placeholder="recado (opcional)"
        aria-label="Recado"
        maxLength={200}
      />
      <button type="submit" className={`${buttons.button} ${buttons.primary}`} disabled={ocupado || !nick.trim() || !carta}>
        <Gift size={15} aria-hidden /> {ocupado ? 'Enviando…' : 'Enviar presente'}
      </button>
      {recado ? <p className={recado.ok ? styles.recado : styles.erro}>{recado.texto}</p> : null}
    </form>
  )
}
