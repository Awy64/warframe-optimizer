/** Display / spec names that differ from WFCD canonical item strings. */
export const ITEM_ALIASES: Record<string, string> = {
  'Vinquibus Bayonet Blueprint': 'Vinquibus Blueprint',
}

export function applyItemAliases(index: Record<string, import('./types.js').DropSource[]>): number {
  let added = 0
  for (const [alias, canonical] of Object.entries(ITEM_ALIASES)) {
    const sources = index[canonical]
    if (!sources?.length || index[alias]) continue
    index[alias] = sources.map((s) => ({ ...s }))
    added++
  }
  return added
}
