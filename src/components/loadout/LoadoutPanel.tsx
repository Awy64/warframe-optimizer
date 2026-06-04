import { ItemSearch } from './ItemSearch'
import { ObjectiveCart } from './ObjectiveCart'
import { SkillSlider } from './SkillSlider'
import { ArsenalGrid } from './ArsenalGrid'
import { useOptimizerStore } from '../../stores/optimizerStore'

export function LoadoutPanel() {
  const itemIndexLoading = useOptimizerStore((s) => s.itemIndexLoading)
  const itemIndexError = useOptimizerStore((s) => s.itemIndexError)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-orokin">PRAPA Optimizer</h1>
        <p className="text-sm text-tenno-muted">Parametric Resource Acquisition Pathfinding</p>
      </header>

      {itemIndexLoading && (
        <p className="text-sm text-tenno-cyan">Loading item index...</p>
      )}
      {itemIndexError && (
        <p className="text-sm text-tenno-danger">
          {itemIndexError}. Run <code className="text-orokin">npm run build:index</code> first.
        </p>
      )}

      <ItemSearch />

      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-tenno-muted">
          Objective Cart
        </h2>
        <ObjectiveCart />
      </section>

      <SkillSlider />
      <ArsenalGrid />
    </div>
  )
}
