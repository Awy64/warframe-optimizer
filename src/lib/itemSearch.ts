/** Max edit distance allowed by query length (typos). */
function maxEditDistance(token: string): number {
  if (token.length <= 2) return 0
  if (token.length <= 4) return 1
  if (token.length <= 7) return 2
  return 3
}

/** Levenshtein distance with early exit when above `limit`. */
function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  let curr = new Array<number>(b.length + 1)

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    let rowMin = curr[0]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
      rowMin = Math.min(rowMin, curr[j])
    }
    if (rowMin > limit) return limit + 1
    ;[prev, curr] = [curr, prev]
  }

  return prev[b.length]
}

function isSubsequence(needle: string, haystack: string): boolean {
  let i = 0
  for (const ch of haystack) {
    if (ch === needle[i]) i++
    if (i === needle.length) return true
  }
  return false
}

/** Score a single query token against an item name; higher is better. */
function scoreToken(nameLower: string, token: string): number | null {
  if (!token) return null

  if (nameLower === token) return 1000
  if (nameLower.startsWith(token)) return 900 - (nameLower.length - token.length) * 0.1

  const index = nameLower.indexOf(token)
  if (index >= 0) return 850 - index * 0.5

  const words = nameLower.split(/\s+/)
  for (const word of words) {
    if (word.startsWith(token)) return 800
    if (word.includes(token)) return 780
  }

  const limit = maxEditDistance(token)
  let bestFuzzy = limit + 1

  for (const word of words) {
    bestFuzzy = Math.min(bestFuzzy, editDistance(token, word, limit))
  }
  bestFuzzy = Math.min(bestFuzzy, editDistance(token, nameLower, limit + 1))

  if (bestFuzzy <= limit) {
    return 650 - bestFuzzy * 40
  }

  if (token.length >= 3 && isSubsequence(token, nameLower)) {
    return 500
  }

  return null
}

function scoreName(name: string, tokens: string[]): number | null {
  const nameLower = name.toLowerCase()
  let total = 0
  for (const token of tokens) {
    const score = scoreToken(nameLower, token)
    if (score === null) return null
    total += score
  }
  return total
}

export function searchItemNames(
  names: readonly string[],
  query: string,
  excludeNames: readonly string[] = [],
  limit = 12,
): string[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean)
  const exclude = new Set(excludeNames)

  const ranked: { name: string; score: number }[] = []
  for (const name of names) {
    if (exclude.has(name)) continue
    const score = scoreName(name, tokens)
    if (score !== null) ranked.push({ name, score })
  }

  ranked.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
  return ranked.slice(0, limit).map((entry) => entry.name)
}
