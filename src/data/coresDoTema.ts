/**
 * O `--papel` de cada tema (`src/styles/_tokens.sass`), para a barra do
 * navegador pintar com a cor do fundo da página.
 *
 * Mora num módulo SEM `'use client'` de propósito: o layout é componente de
 * servidor, e um valor importado de módulo de cliente chega lá como
 * referência de cliente, não como o objeto — as `<meta name="theme-color">`
 * simplesmente sumiam do HTML, sem erro nenhum.
 */
export const COR_DA_BARRA = { claro: '#e9e4d9', escuro: '#171613' } as const
