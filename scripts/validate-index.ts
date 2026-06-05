import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const PUBLIC = join(import.meta.dirname, '..', 'public')

function assertNoNullLiterals(label: string, raw: string) {
  if (raw.includes(':null')) {
    throw new Error(`${label} contains null literals`)
  }
}

function walkNumbers(label: string, value: unknown, path = label): void {
  if (value == null) {
    throw new Error(`${path}: unexpected null`)
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error(`${path}: non-finite number ${value}`)
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkNumbers(label, entry, `${path}[${index}]`))
    return
  }
  if (typeof value === 'object') {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      walkNumbers(label, entry, `${path}.${key}`)
    }
  }
}

for (const file of ['item_index.json', 'node_levels.json']) {
  const path = join(PUBLIC, file)
  const raw = readFileSync(path, 'utf8')
  assertNoNullLiterals(file, raw)
  walkNumbers(file, JSON.parse(raw))
}

const version = readFileSync(join(PUBLIC, 'data_version.txt'), 'utf8').trim()
if (!/^[a-f0-9]{12}$/.test(version)) {
  throw new Error(`data_version.txt has invalid version: ${version}`)
}

console.log(`Validated index files (data version ${version})`)
