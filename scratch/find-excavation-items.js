import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = import.meta.dirname ? join(import.meta.dirname, '..') : '.'
const itemJson = JSON.parse(readFileSync(join(root, 'public/item_index.json'), 'utf8'))

const excItems = new Set()
for (const [itemName, sources] of Object.entries(itemJson.items)) {
  for (const src of sources) {
    if (src.gameMode.toLowerCase().includes('excavation')) {
      excItems.add(itemName)
    }
  }
}

console.log('Items found in Excavation:')
console.log(Array.from(excItems).slice(0, 20))
