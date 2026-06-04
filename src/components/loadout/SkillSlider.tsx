import { useOptimizerStore } from '../../stores/optimizerStore'

function skillLabel(value: number): string {
  if (value <= 0.3) return 'Novice'
  if (value <= 0.7) return 'Intermediate'
  return 'Expert'
}

export function SkillSlider() {
  const skillCoefficient = useOptimizerStore((s) => s.skillCoefficient)
  const setSkillCoefficient = useOptimizerStore((s) => s.setSkillCoefficient)

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-medium uppercase tracking-wider text-tenno-muted">
          Skill Coefficient
        </label>
        <span className="text-sm text-tenno-cyan">
          {skillCoefficient.toFixed(2)} — {skillLabel(skillCoefficient)}
        </span>
      </div>
      <input
        type="range"
        min={0.1}
        max={1.0}
        step={0.05}
        value={skillCoefficient}
        onChange={(e) => setSkillCoefficient(parseFloat(e.target.value))}
        className="w-full accent-orokin"
      />
      <div className="mt-1 flex justify-between text-xs text-tenno-muted">
        <span>Novice</span>
        <span>Expert</span>
      </div>
    </div>
  )
}
