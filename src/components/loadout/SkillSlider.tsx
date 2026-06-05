import { useOptimizerStore } from '../../stores/optimizerStore'

function skillLabel(value: number): string {
  if (value <= 0.3) return 'Casual / Novice'
  if (value <= 0.6) return 'Regular / Intermediate'
  if (value <= 0.8) return 'Optimized / Hardcore'
  return 'Speedrunner / Expert'
}

export function SkillSlider() {
  const skillCoefficient = useOptimizerStore((s) => s.skillCoefficient)
  const setSkillCoefficient = useOptimizerStore((s) => s.setSkillCoefficient)

  return (
    <div className="rounded-lg border border-tenno-border bg-tenno-bg/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-tenno-muted">
          Skill Coefficient
        </label>
        <span className="text-xs font-bold uppercase tracking-wide text-tenno-cyan">
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
        className="w-full h-1.5 cursor-pointer rounded-lg bg-tenno-border appearance-none accent-orokin focus:outline-none focus:ring-1 focus:ring-tenno-cyan/50"
      />
      <div className="mt-2 flex justify-between text-[10px] uppercase font-bold tracking-wider text-tenno-muted">
        <span className={skillCoefficient <= 0.3 ? 'text-orokin' : ''}>Casual</span>
        <span className={skillCoefficient > 0.3 && skillCoefficient <= 0.6 ? 'text-orokin' : ''}>Regular</span>
        <span className={skillCoefficient > 0.6 && skillCoefficient <= 0.8 ? 'text-orokin' : ''}>Hardcore</span>
        <span className={skillCoefficient > 0.8 ? 'text-orokin' : ''}>Speedrunner</span>
      </div>
    </div>
  )
}

