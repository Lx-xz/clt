/** Regras do nick, iguais às constraints da tabela players. */
export const NICK_MIN = 2
export const NICK_MAX = 16

export function normalizarNick(bruto: string): string {
  return bruto.trim().toLowerCase()
}

/** Devolve o problema encontrado, ou null quando o nick serve. */
export function validarNick(bruto: string): string | null {
  const nick = normalizarNick(bruto)
  if (nick.length < NICK_MIN) return `O nick precisa de pelo menos ${NICK_MIN} letras.`
  if (nick.length > NICK_MAX) return `O nick pode ter no máximo ${NICK_MAX} letras.`
  if (!/^[a-z0-9_-]+$/.test(nick)) return 'Use só letras, números, hífen e underscore.'
  return null
}
