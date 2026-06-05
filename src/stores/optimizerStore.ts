import { create } from 'zustand'
import { dataAssetUrl } from '../lib/assets'
import type { ArsenalState, ItemIndex, Objective } from '../types'
import { DEFAULT_ARSENAL } from '../types'

interface OptimizerState {
  objectives: Objective[]
  skillCoefficient: number
  arsenal: ArsenalState
  itemIndex: ItemIndex | null
  itemIndexLoading: boolean
  itemIndexError: string | null
  addObjective: (itemName: string, quantity?: number) => void
  removeObjective: (itemName: string) => void
  updateObjectiveQuantity: (itemName: string, quantity: number) => void
  setSkillCoefficient: (value: number) => void
  setArsenal: (partial: Partial<ArsenalState>) => void
  loadItemIndex: () => Promise<void>
}

export const useOptimizerStore = create<OptimizerState>((set, get) => ({
  objectives: [],
  skillCoefficient: 0.5,
  arsenal: { ...DEFAULT_ARSENAL },
  itemIndex: null,
  itemIndexLoading: false,
  itemIndexError: null,

  addObjective: (itemName, quantity = 1) => {
    const { objectives } = get()
    if (objectives.some((o) => o.itemName === itemName)) return
    set({ objectives: [...objectives, { itemName, targetQuantity: quantity }] })
  },

  removeObjective: (itemName) => {
    set({ objectives: get().objectives.filter((o) => o.itemName !== itemName) })
  },

  updateObjectiveQuantity: (itemName, quantity) => {
    set({
      objectives: get().objectives.map((o) =>
        o.itemName === itemName ? { ...o, targetQuantity: Math.max(1, quantity) } : o,
      ),
    })
  },

  setSkillCoefficient: (value) => set({ skillCoefficient: value }),

  setArsenal: (partial) => {
    const next = { ...get().arsenal, ...partial }
    if (next.hasAtlas) next.hasKhora = false
    if (next.hasHydroid) next.hasKhora = false
    set({ arsenal: next })
  },

  loadItemIndex: async () => {
    if (get().itemIndex) return
    set({ itemIndexLoading: true, itemIndexError: null })
    try {
      const res = await fetch(dataAssetUrl('item_index.json'))
      if (!res.ok) throw new Error(`Failed to load item index (${res.status})`)
      const data = (await res.json()) as ItemIndex
      set({ itemIndex: data, itemIndexLoading: false })
    } catch (err) {
      set({
        itemIndexError: err instanceof Error ? err.message : 'Unknown error',
        itemIndexLoading: false,
      })
    }
  },
}))
