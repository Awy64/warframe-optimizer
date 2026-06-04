/** Resolve a public asset path for both local dev (/) and GitHub Pages (/warframe-optimizer/). */
export function assetUrl(path: string): string {
  const normalized = path.replace(/^\//, '')
  return `${import.meta.env.BASE_URL}${normalized}`
}
