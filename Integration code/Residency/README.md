# Residency Solver Step — extracted from `layer1_india.html`

This is the "Screen 2A — Residency Detection" step (`panel-step-profile`,
lines 1918–2333 of the source file), also referred to in the source's own
comments as the **RS-001 Residency Solver**. It's the second step of the
India Layer-1 onboarding wizard, right after "Financial Life Snapshot."

## What's in here

| File | What it is |
|---|---|
| `derive.js` | Pure, DOM-free port of every computation the original inline `<script>` ran for this step: `runResidencySolver()`, `syncResidencyUI()`, `checkDualResidencyConflict()`, `evaluateTieBreaker()`, `recalculateTotalDays()` / `calculateLiveDays()`, and the entity-morph visibility rules pulled out of `updateBizEntityType()`. No `document.getElementById`, no `classList` — every function is `(context) => value`. |
| `residencyMachine.js` | The XState v5 machine. `context` holds one field per original DOM input (visible **and** hidden — see comments in the file), and `context.ui` is fully derived by calling `deriveAll()` from `derive.js` after every event. |
| `src/ResidencySolverStep.jsx` | The React component. Markup and Tailwind classes are copied from the source HTML almost verbatim; every `onchange`/`onclick`/`oninput` becomes a `send(...)` to the machine, and every `classList.add('hidden')` check becomes a `{condition && <div>...}` read from `context.ui.visibility`. |
| `src/residencySolverStep.css` | The non-Tailwind CSS the step depends on (`.glass-card`, scrollbar styling, fonts, range-input thumb) — extracted from the `<style>` block in `<head>`. |
| `tailwind.config.js` | The `brandGold` / `brandCyan` / `brandGreen` / `font-display` theme extension from the original inline `tailwind.config`. Without this, the Tailwind classes used in the component won't resolve to the right colors. |
| `test-derive.js`, `test-machine.mjs` | Smoke tests used to validate the port against the original logic (see below) — not required at runtime, safe to delete. |

## Why one XState machine and not several

The original screen has no real "modes" of its own — it's one continuously
live derivation over a single blob of state (every `onchange` handler
mutates a field, then immediately re-runs the whole solver + UI-sync
chain). So the machine mirrors that: a single `ready` state, and every event
does `assign(mutate one field) -> recomputeDerived (deriveAll)`.

## Every input, hidden and visible

`residencyMachine.js` has a comment on every context field noting whether it
was a **visible** control in this step (with its original DOM id) or a
**hidden** field (present in `state.residency_detail` / `state.company_residency`
but not wired to any control in this particular screen — e.g.
`is_poem_in_india`, `ship_nationality`,
`liable_to_tax_in_another_country_being_indian_citizen`, and the derived
`final_india_residency_status`).

The DTAA Article-4 tie-breaker wizard (`tb-home` / `tb-cvi` / `tb-abode` /
`tb-nationality`) is included because it physically lives inside this same
panel (`panel-step-profile`), inside the conditionally-shown
`dual-residency-alert` block — it is **not** the separate "STEP 2: DTAA
TREATY" panel that comes right after this one in the source file, which
covers `dtaa-country` / TRC and was left out as out of scope for this step.

## One intentional external seam

The original's `checkDualResidencyConflict()` reads a **different** wizard's
state via `localStorage.getItem('wising_us_state')` to see if the person is
also a US domestic resident. That's a cross-page/cross-tab hack in the
source; here it's modeled as `context.external.is_us_domestic_resident`,
settable via a `SET_US_DOMESTIC_RESIDENT` event, so a parent app can wire it
up however it actually manages that value (a sibling machine, a shared
store, etc.) instead of polling `localStorage`.

## Setup

```bash
npm install xstate @xstate/react react react-dom
```

Import the CSS once globally (e.g. your app root), and make sure your
Tailwind config extends the theme in `tailwind.config.js` (merge it into
your own config if you already have one).

```jsx
import ResidencySolverStep from './src/ResidencySolverStep.jsx';
import './src/residencySolverStep.css';

<ResidencySolverStep
  onBack={() => {/* navigate to previous step */}}
  onContinue={(context) => {/* persist context, navigate to next step */}}
/>
```

`initialContext` (optional prop) lets you hydrate from a saved session —
it's shallow-merged over `initialResidencyContext` from `residencyMachine.js`.

## Verified behavior

`derive.js` and `residencyMachine.js` were both run against `xstate@5.32.4`
in Node to confirm parity with the original logic, including:
- ROR / RNOR / NR outcomes across the individual day-count branches
- Company POEM derivation (active-business vs. key-management-location vs. mixed director count)
- HUF wholly-outside / Karta RNOR paths (including the inverted `res-huf-nr9` / `res-huf-d7` semantics)
- Live-tracking day totals from trip date ranges
- DTAA Article 4 tie-breaker cascade and its override of the final status
- Field-level visibility for every entity type
