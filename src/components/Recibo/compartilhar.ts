import { ENVELOPES } from '@/game/missoes'
import { FIM, type DadosDoRecibo } from './Recibo'

/** O endereço que vai junto: o do jogo no ar, e não o de onde se joga — quem
 *  compartilha do `localhost` não quer mandar o `localhost` para ninguém. */
export const ENDERECO_DO_JOGO = 'https://lx-xz.github.io/clt/'

/** As cores da nota, fixas: a imagem sai igual no tema claro e no escuro,
 *  porque quem a recebe não está no tema de ninguém. */
const COR = {
  fundo: '#e9e4d9',
  papel: '#fbfaf5',
  tinta: '#1e1c18',
  fraca: '#6b6558',
  linha: '#c4bba7',
  produtividade: '#2f7a4d',
  estresse: '#b03028',
  destaque: '#c8971f',
  dinheiro: '#3f6b33',
}

const MONO = 'ui-monospace, "SFMono-Regular", "Cascadia Mono", Menlo, Consolas, monospace'
const L = 720 // largura da imagem
const PAPEL = 560 // largura da nota
const M = 44 // margem de dentro da nota

/** A frase que acompanha a imagem. Sem "R$": o dinheiro do jogo não é real. */
export function textoDoRecibo(d: DadosDoRecibo): string {
  const convite = 'Aguenta um mês de CLT?'
  if (d.outcome === 'vitoria') return `Fechei o mês no CLT com ${d.dinheiro} de saldo. ${convite} ${ENDERECO_DO_JOGO}`
  if (d.outcome === 'abandono') return `Pedi demissão no dia ${d.dias} do CLT. ${convite} ${ENDERECO_DO_JOGO}`
  return `${FIM[d.outcome].title} no dia ${d.dias} do CLT. ${convite} ${ENDERECO_DO_JOGO}`
}

/** O avatar do recibo na tela, desenhado como imagem: o SVG é o mesmo do
 *  jogo, e o fundo, que é CSS (a moldura), vem do estilo calculado. */
async function imagemDoAvatar(svg: SVGSVGElement): Promise<{ img: HTMLImageElement; fundo: string } | null> {
  const fundo = getComputedStyle(svg.parentElement ?? svg).backgroundColor
  const texto = new XMLSerializer().serializeToString(svg)
  const url = URL.createObjectURL(new Blob([texto], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return { img, fundo }
  } catch {
    return null
  } finally {
    // o decode já leu: a imagem continua desenhável sem a url
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const linhas: string[] = []
  let atual = ''
  for (const palavra of texto.split(' ')) {
    const teste = atual ? `${atual} ${palavra}` : palavra
    if (ctx.measureText(teste).width > largura && atual) {
      linhas.push(atual)
      atual = palavra
    } else atual = teste
  }
  if (atual) linhas.push(atual)
  return linhas
}

/** A cédula do medidor, em traço: o dinheiro do jogo é ícone e número. */
function cedula(ctx: CanvasRenderingContext2D, x: number, y: number, cor: string) {
  ctx.save()
  ctx.strokeStyle = cor
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.roundRect(x, y - 13, 30, 19, 3)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x + 15, y - 3.5, 4.2, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

/**
 * Desenha o recibo numa imagem PNG. É um desenho à mão no canvas, e não um
 * "print" da tela: uma biblioteca de captura de DOM pesaria mais que o jogo
 * inteiro, e o recibo é texto em linhas — o canvas desenha isso em cem
 * linhas, do tamanho certo para o WhatsApp e igual em qualquer tema.
 */
export async function imagemDoRecibo(d: DadosDoRecibo, svgDoAvatar?: SVGSVGElement | null): Promise<Blob> {
  const avatar = svgDoAvatar ? await imagemDoAvatar(svgDoAvatar) : null
  const fim = FIM[d.outcome]
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Este navegador não desenha imagem.')

  // as linhas da nota, montadas antes para saber a altura
  const linhas: [string, string][] = [['Dias trabalhados', String(d.dias)]]
  if (d.cartasJogadas != null) linhas.push(['Cartas jogadas', String(d.cartasJogadas)])
  if (d.estresse != null) linhas.push(['Estresse no fim', `${d.estresse}/${d.estresseMaximo ?? 10}`])
  const extras: { texto: string; cor: string }[] = []
  for (const e of d.envelopes ?? []) {
    extras.push({ texto: `${ENVELOPES[e.tipo].nome} · ${e.cartas.length} cartas`, cor: COR.tinta })
  }
  for (const c of d.conquistas ?? []) extras.push({ texto: `Conquista: ${c.nome}`, cor: COR.destaque })

  ctx.font = `15px ${MONO}`
  const textoFim = quebrar(ctx, fim.text, PAPEL - M * 2)

  // a nota é desenhada DUAS vezes: a primeira só para saber onde ela acaba
  // (a altura depende do texto, dos envelopes e das conquistas), a segunda
  // no tamanho certo. Estimar a altura de antemão errava a cada linha nova
  const pintar = (ctx: CanvasRenderingContext2D, altura: number): number => {
    ctx.fillStyle = COR.fundo
    ctx.fillRect(0, 0, L, altura)

    // o papel, com a serrilha em cima e embaixo, e a sombra embaixo dele
    const x0 = (L - PAPEL) / 2
    const y0 = 30
    const h = altura - 60
    // um número INTEIRO de dentes: com sobra, o último arco passava da
    // borda e o fechamento do caminho entortava o papel
    const dente = PAPEL / Math.round(PAPEL / 18) / 2
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, .18)'
    ctx.shadowBlur = 24
    ctx.shadowOffsetY = 8
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    for (let x = x0; x < x0 + PAPEL; x += dente * 2) ctx.arc(x + dente, y0, dente * 0.55, Math.PI, 0, true)
    ctx.lineTo(x0 + PAPEL, y0 + h)
    for (let x = x0 + PAPEL; x > x0; x -= dente * 2) ctx.arc(x - dente, y0 + h, dente * 0.55, 0, Math.PI, true)
    ctx.closePath()
    ctx.fillStyle = COR.papel
    ctx.fill()
    ctx.restore()

    const esq = x0 + M
    const dir = x0 + PAPEL - M
    let y = y0 + 58
    const tracejado = (yy: number) => {
      ctx.save()
      ctx.strokeStyle = COR.linha
      ctx.lineWidth = 2
      ctx.setLineDash([7, 6])
      ctx.beginPath()
      ctx.moveTo(esq, yy)
      ctx.lineTo(dir, yy)
      ctx.stroke()
      ctx.restore()
    }

    ctx.fillStyle = COR.tinta
    ctx.font = `bold 26px ${MONO}`
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(fim.title.toUpperCase(), esq, y)
    y += 22
    tracejado(y)
    y += 26

    if (avatar) {
      const t = 160
      const ax = L / 2 - t / 2
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(ax, y, t, t, 16)
      ctx.fillStyle = avatar.fundo
      ctx.fill()
      ctx.clip()
      ctx.drawImage(avatar.img, ax, y, t, t)
      ctx.restore()
      y += t + 30
    }

    ctx.fillStyle = COR.fraca
    ctx.font = `15px ${MONO}`
    for (const l of textoFim) {
      ctx.fillText(l, esq, y)
      y += 24
    }
    y += 10

    ctx.font = `15px ${MONO}`
    for (const [rot, val] of linhas) {
      y += 34
      ctx.fillStyle = COR.fraca
      ctx.textAlign = 'left'
      ctx.font = `15px ${MONO}`
      ctx.fillText(rot, esq, y)
      ctx.fillStyle = COR.tinta
      ctx.textAlign = 'right'
      ctx.font = `bold 22px ${MONO}`
      ctx.fillText(val, dir, y)
      ctx.textAlign = 'left'
      y += 14
      ctx.save()
      ctx.strokeStyle = COR.linha
      ctx.setLineDash([2, 4])
      ctx.beginPath()
      ctx.moveTo(esq, y)
      ctx.lineTo(dir, y)
      ctx.stroke()
      ctx.restore()
    }

    // o total, com a linha dupla de recibo em cima
    y += 8
    ctx.fillStyle = COR.fraca
    ctx.fillRect(esq, y, dir - esq, 1.5)
    ctx.fillRect(esq, y + 5, dir - esq, 1.5)
    y += 44
    ctx.fillStyle = COR.tinta
    ctx.font = `bold 17px ${MONO}`
    ctx.fillText('PONTUAÇÃO FINAL', esq, y)
    ctx.font = `bold 28px ${MONO}`
    ctx.textAlign = 'right'
    ctx.fillText(String(d.dinheiro), dir, y + 2)
    const larguraValor = ctx.measureText(String(d.dinheiro)).width
    ctx.textAlign = 'left'
    cedula(ctx, dir - larguraValor - 40, y, COR.tinta)
    y += 18

    if (extras.length) {
      y += 14
      tracejado(y)
      y += 12
      ctx.font = `bold 15px ${MONO}`
      for (const e of extras) {
        y += 30
        ctx.fillStyle = e.cor
        ctx.fillText(e.texto, esq, y)
      }
    }

    // o rodapé: de onde veio, e para onde ir
    y += 34
    tracejado(y)
    y += 40
    ctx.textAlign = 'center'
    ctx.fillStyle = COR.tinta
    ctx.font = `bold 18px ${MONO}`
    ctx.fillText('CLT · Coffee, Labor and Tears', L / 2, y)
    y += 28
    ctx.fillStyle = COR.fraca
    ctx.font = `15px ${MONO}`
    ctx.fillText(ENDERECO_DO_JOGO.replace(/^https:\/\//, '').replace(/\/$/, ''), L / 2, y)
    return y + 60
  }
  const altura = pintar(document.createElement('canvas').getContext('2d') ?? ctx, 4000) + 30
  // 2x: a imagem chega nítida no celular de quem recebe
  const escala = 2
  canvas.width = L * escala
  canvas.height = altura * escala
  ctx.scale(escala, escala)
  pintar(ctx, altura)

  return new Promise((ok, falha) =>
    canvas.toBlob((b) => (b ? ok(b) : falha(new Error('Não deu para gerar a imagem.'))), 'image/png'),
  )
}

/**
 * Compartilha o recibo: no celular, abre a janela de compartilhar do próprio
 * aparelho (WhatsApp e companhia) com a imagem e a frase com o link; onde
 * ela não aceita arquivo (a maioria dos computadores), baixa a imagem e copia
 * a frase. Devolve o que aconteceu, para o botão dizer.
 */
export async function compartilharRecibo(
  d: DadosDoRecibo,
  svgDoAvatar?: SVGSVGElement | null,
): Promise<'compartilhado' | 'baixado' | 'cancelado'> {
  const blob = await imagemDoRecibo(d, svgDoAvatar)
  const arquivo = new File([blob], 'recibo-clt.png', { type: 'image/png' })
  const texto = textoDoRecibo(d)
  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], text: texto })
      return 'compartilhado'
    } catch (e) {
      // fechar a janela de compartilhar não é erro
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelado'
      throw e
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = arquivo.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  await navigator.clipboard?.writeText(texto).catch(() => {})
  return 'baixado'
}
