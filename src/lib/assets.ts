import dataVersion from '../data_version.txt?raw'

/** Resolve a public asset path for both local dev (/) and GitHub Pages (/warframe-optimizer/). */
export function assetUrl(path: string): string {
  const normalized = path.replace(/^\//, '')
  return `${import.meta.env.BASE_URL}${normalized}`
}

/** Versioned URL for large data files so service-worker caches refresh after index rebuilds. */
export function dataAssetUrl(path: string): string {
  const version = dataVersion.trim()
  return version ? `${assetUrl(path)}?v=${version}` : assetUrl(path)
}
