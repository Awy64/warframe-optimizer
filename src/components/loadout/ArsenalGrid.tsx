import { useOptimizerStore } from '../../stores/optimizerStore'
import type { ArsenalState } from '../../types'

interface CheckboxProps {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

function Checkbox({ label, checked, disabled, onChange }: CheckboxProps) {
  return (
    <label className={`flex items-center gap-2 text-sm ${disabled ? 'opacity-40' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-orokin"
      />
      {label}
    </label>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-tenno-muted">{title}</h3>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  )
}

export function ArsenalGrid() {
  const arsenal = useOptimizerStore((s) => s.arsenal)
  const setArsenal = useOptimizerStore((s) => s.setArsenal)

  const set = (key: keyof ArsenalState) => (value: boolean) => setArsenal({ [key]: value })

  const khoraDisabled = arsenal.hasAtlas || arsenal.hasHydroid

  return (
    <div className="space-y-4">
      <Section title="Loot Frames">
        <Checkbox label="Ivara" checked={arsenal.hasIvara} onChange={set('hasIvara')} />
        <Checkbox label="Atlas" checked={arsenal.hasAtlas} onChange={set('hasAtlas')} />
        <Checkbox
          label="Khora"
          checked={arsenal.hasKhora}
          disabled={khoraDisabled}
          onChange={set('hasKhora')}
        />
        <Checkbox
          label="Hydroid"
          checked={arsenal.hasHydroid}
          onChange={(v) => {
            if (v) setArsenal({ hasHydroid: true, hasKhora: false })
            else setArsenal({ hasHydroid: false })
          }}
        />
        <Checkbox label="Nekros" checked={arsenal.hasNekros} onChange={set('hasNekros')} />
      </Section>
      <Section title="Weapons">
        <Checkbox label="High Slash" checked={arsenal.hasHighSlash} onChange={set('hasHighSlash')} />
        <Checkbox label="Vinquibus" checked={arsenal.hasVinquibus} onChange={set('hasVinquibus')} />
      </Section>
      <Section title="Boosters">
        <Checkbox
          label="Drop Chance"
          checked={arsenal.dropChanceBoosterActive}
          onChange={set('dropChanceBoosterActive')}
        />
        <Checkbox
          label="Resource"
          checked={arsenal.resourceBoosterActive}
          onChange={set('resourceBoosterActive')}
        />
      </Section>
      <Section title="Quest & Mode">
        <Checkbox
          label="Angels of the Zariman"
          checked={arsenal.hasZarimanUnlocked}
          onChange={set('hasZarimanUnlocked')}
        />
        <Checkbox
          label="Steel Path"
          checked={arsenal.steelPathActive}
          onChange={set('steelPathActive')}
        />
      </Section>
    </div>
  )
}
