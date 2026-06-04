import { useEffect } from 'react'
import { SplitLayout } from './components/layout/SplitLayout'
import { LoadoutPanel } from './components/loadout/LoadoutPanel'
import { MissionBoard } from './components/mission-board/MissionBoard'
import { useOptimizerStore } from './stores/optimizerStore'

export default function App() {
  const loadItemIndex = useOptimizerStore((s) => s.loadItemIndex)

  useEffect(() => {
    loadItemIndex()
  }, [loadItemIndex])

  return (
    <SplitLayout left={<LoadoutPanel />} right={<MissionBoard />} />
  )
}
