# PRAPA Warframe Yield Optimizer

Predictive yield simulator for Warframe farming routes. Uses the **Parametric Resource Acquisition Pathfinding Algorithm (PRAPA)** to rank mission nodes by projected volumetric yield based on your loadout, skill level, and arsenal synergies.

## Tech Stack

- **Frontend:** Vite + React + TypeScript + Tailwind CSS + Zustand
- **Compute:** Rust compiled to WebAssembly (`wasm-pack`)
- **Data:** Build-time WFCD fetch → static `item_index.json` / `node_levels.json`

## Prerequisites

- Node.js 22+
- Rust stable + [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)

## Setup

```bash
npm install
npm run build:index   # fetch WFCD data (requires network)
npm run build:wasm    # compile Rust PRAPA engine
npm run dev           # start dev server
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build:index` | Fetch WFCD data, write `public/*.json` |
| `npm run build:wasm` | Build WASM crate to `wasm/pkg/` |
| `npm run build` | Production frontend build |
| `npm run build:all` | Index + WASM + frontend |
| `npm run test:wasm` | Run Rust unit tests |

## Architecture

```
Loadout Panel (30%)          Mission Board (70%)
├── Item search              └── Ranked NodeCards (PRAPA cost)
├── Objective cart
├── Skill slider (0.1–1.0)
└── Arsenal checkboxes  →  WASM engine  →  sorted results
```

PRAPA scoring: `Y = KPM × P_base × M_node × M_loot × (B_drop × B_resource)`  
Cost: `C = (1 / (Y × S_m)) × F_p` — lower is better.

## Booster taxonomy

The three in-game booster classes are **not interchangeable** and the engine models each separately. Conflating them is the most common modeling error, so each currency/resource routes through exactly one class:

| Class | UI toggle | Doubles | Steel Path | Notable |
|-------|-----------|---------|-----------|---------|
| **Resource Booster** | `resourceBoosterActive` | Resource pickups, **Void Traces**, Kuva | — | Does **nothing** to Endo |
| **Drop Chance Booster** | `dropChanceBoosterActive` | Drop *chance* of table items | ×2 on SP | Does **nothing** to Void Traces |
| **Mod Drop Chance Booster** | `modDropChanceBoosterActive` | Mod-classified drops incl. **Endo** | ×2 on SP (+100% mod drop) | Does **nothing** to resources |
| **Credit Booster** | `creditBoosterActive` | Credit pickups | — | Stacks ×2 with Chroma Effigy |

Currency rows in the index carry a `currency-*` tag (`currency-endo`, `currency-credits`, `currency-traces`, `currency-kuva`) selecting the class at runtime. Endo arena farms (e.g. Vodyanoi) also tag `loot-scalable` so Nekros/Khora loot frames multiply them.

### Companion modeling

- **Smeeta Kavat** (`companion: smeeta`) — Charm adds a small EV of rare resources native to the mission planet (`rare-native` sources only).
- **Chesa Kubrow** (`companion: chesa`) — Retrieve is in the same *loot-corpse* group as Nekros Desecrate, so they **do not stack** (the engine takes the max).
- **Retriever mods** (`retriever`) — `loyal` (13% all), `resourceful` (18% resources + traces), `prosperous` (18% credits) apply an expected-value pickup-duplication multiplier to the matching payload class.

## Deployment

GitHub Actions builds and deploys to GitHub Pages on push to `main`. Enable Pages with source "GitHub Actions" in repo settings.

## License

GPL-3.0 — see [LICENSE](LICENSE).
