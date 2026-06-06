import { useOptimizerStore } from '../../stores/optimizerStore'
import type { ArsenalState } from '../../types'

interface SwitchProps {
  label: string
  checked: boolean
  disabled?: boolean
  color?: 'gold' | 'cyan'
  onChange: (checked: boolean) => void
}

function Switch({ label, checked, disabled, color = 'cyan', onChange }: SwitchProps) {
  const activeColorClasses =
    color === 'gold'
      ? 'peer-checked:border-orokin peer-checked:bg-orokin/10 peer-checked:after:bg-orokin peer-checked:after:shadow-[0_0_6px_#c8a951]'
      : 'peer-checked:border-tenno-cyan peer-checked:bg-tenno-cyan/10 peer-checked:after:bg-tenno-cyan peer-checked:after:shadow-[0_0_6px_#4ecdc4]'

  return (
    <label
      className={`flex items-center justify-between rounded-lg border border-tenno-border bg-tenno-panel/40 px-3 py-2 text-sm transition duration-200 hover:border-tenno-muted/40 ${
        disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <span className={`text-xs font-semibold uppercase tracking-wider ${checked ? 'text-gray-100' : 'text-tenno-muted'}`}>
        {label}
      </span>
      <div className="relative flex items-center">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div
          className={`relative w-8 h-4.5 bg-tenno-bg border border-tenno-border rounded-full transition duration-200 peer-focus:outline-none after:content-[''] after:absolute after:top-[2.5px] after:left-[2.5px] after:bg-tenno-muted after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:after:translate-x-3.5 ${activeColorClasses}`}
        />
      </div>
    </label>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-tenno-muted">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{children}</div>
    </div>
  )
}

export function ArsenalGrid() {
  const arsenal = useOptimizerStore((s) => s.arsenal)
  const setArsenal = useOptimizerStore((s) => s.setArsenal)

  const set = (key: keyof ArsenalState) => (value: boolean) => setArsenal({ [key]: value })

  const anyFrameSelected =
    arsenal.hasIvara ||
    arsenal.hasAtlas ||
    arsenal.hasKhora ||
    arsenal.hasHydroid ||
    arsenal.hasNekros

  const ivaraDisabled = arsenal.squadSize === 1 && anyFrameSelected && !arsenal.hasIvara
  const atlasDisabled = arsenal.squadSize === 1 && anyFrameSelected && !arsenal.hasAtlas
  const khoraDisabled =
    arsenal.hasAtlas ||
    arsenal.hasHydroid ||
    (arsenal.squadSize === 1 && anyFrameSelected && !arsenal.hasKhora)
  const hydroidDisabled = arsenal.squadSize === 1 && anyFrameSelected && !arsenal.hasHydroid
  const nekrosDisabled = arsenal.squadSize === 1 && anyFrameSelected && !arsenal.hasNekros

  return (
    <div className="space-y-4">
      <Section title="Squad Size">
        <div className="col-span-2 flex rounded-lg border border-tenno-border bg-tenno-panel/40 p-1">
          {[1, 2, 3, 4].map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setArsenal({ squadSize: size })}
              className={`flex-1 py-1.5 text-center text-xs font-semibold uppercase tracking-wider rounded-md transition duration-200 cursor-pointer ${
                arsenal.squadSize === size
                  ? 'bg-tenno-cyan/20 text-tenno-cyan border border-tenno-cyan/40 shadow-[0_0_8px_#4ecdc433]'
                  : 'text-tenno-muted hover:text-gray-100 hover:bg-tenno-panel/20 border border-transparent'
              }`}
            >
              {size === 1 ? '1 (Solo)' : size}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Loot Frames">
        <Switch
          label="Ivara"
          checked={arsenal.hasIvara}
          disabled={ivaraDisabled}
          color="gold"
          onChange={set('hasIvara')}
        />
        <Switch
          label="Atlas"
          checked={arsenal.hasAtlas}
          disabled={atlasDisabled}
          color="gold"
          onChange={set('hasAtlas')}
        />
        <Switch
          label="Khora"
          checked={arsenal.hasKhora}
          disabled={khoraDisabled}
          color="gold"
          onChange={set('hasKhora')}
        />
        <Switch
          label="Hydroid"
          checked={arsenal.hasHydroid}
          disabled={hydroidDisabled}
          color="gold"
          onChange={(v) => {
            if (v) setArsenal({ hasHydroid: true, hasKhora: false })
            else setArsenal({ hasHydroid: false })
          }}
        />
        <Switch
          label="Nekros"
          checked={arsenal.hasNekros}
          disabled={nekrosDisabled}
          color="gold"
          onChange={set('hasNekros')}
        />
      </Section>

      <Section title="Weapons">
        <Switch label="High Slash" checked={arsenal.hasHighSlash} onChange={set('hasHighSlash')} />
        <Switch label="Vinquibus" checked={arsenal.hasVinquibus} onChange={set('hasVinquibus')} />
      </Section>

      <Section title="Boosters">
        <Switch
          label="Drop Chance"
          checked={arsenal.dropChanceBoosterActive}
          onChange={set('dropChanceBoosterActive')}
        />
        <Switch
          label="Resource"
          checked={arsenal.resourceBoosterActive}
          onChange={set('resourceBoosterActive')}
        />
      </Section>

      <Section title="Quest & Mode">
        <Switch
          label="Angels of the Zariman"
          checked={arsenal.hasZarimanUnlocked}
          onChange={set('hasZarimanUnlocked')}
        />
        <Switch
          label="Steel Path"
          checked={arsenal.steelPathActive}
          onChange={set('steelPathActive')}
        />
      </Section>
    </div>
  )
}
