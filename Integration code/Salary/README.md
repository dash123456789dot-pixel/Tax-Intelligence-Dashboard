# Salary Step — extracted from `layer1_india.html`

This is the "Screen 2E — Salary" step (`panel-step-salary`, lines 2691–2956
of the source file). In the wizard's main sequence it's the third step
after Financial Life Snapshot and Residency Detection (the residency step
gates entity-specific screens; for an `individual` entity, Bank Details ->
Salary is next).

## What's in here

| File | What it is |
|---|---|
| `deriveSalary.js` | Pure, DOM-free port of `toggleSalarySection()`, `updateSalaryNum()`/`updateSalaryBool()`/`updateSalaryNested()`/`updateSalaryNestedNum()`, `togglePwdAllowance()`, `evaluateSalaryRegimeLock()`, `parseINRCurrency()`, and the `.inr-input` live-formatting behavior (`formatINRDisplay`). |
| `salaryMachine.js` | The XState v5 machine. `context.salary` has one field per original input (visible and hidden — see comments), `context.tax_regime` is the injected dependency that gates the old-regime fields, and `context.ui` is fully derived after every event. |
| `src/SalaryStep.jsx` | The React component. Markup/Tailwind classes copied from the source almost verbatim; every `onchange`/`oninput`/`onclick` becomes a `send(...)`; every `.sal-old-regime-field` / `classList.toggle('hidden')` check becomes a read from `context.ui.visibility`. |
| `src/salaryStep.css` | Same base CSS as the Residency Solver step (`.glass-card`, scrollbar, fonts) — this step doesn't introduce any new non-Tailwind CSS beyond what's already global on the page. |
| `tailwind.config.js` | Same brand theme extension (`brandGold`/`brandCyan`/`brandRed`/`font-display`) used across the whole app. |
| `test-machine.mjs` | Smoke test validating the machine against the original logic (regime-switch clearing, PwD toggle side effect, ESOP row CRUD, currency parsing). Safe to delete. |

## Every input, hidden and visible

`salaryMachine.js` documents each field with its original DOM id. One field,
`taxable_salary_inr`, is carried as **hidden** — it exists in
`state.domestic_income.salary` but is never written by a control in this
step; it's a computed value assigned elsewhere in the original file (from
the tax simulation output, `salary: { taxable_salary_inr: sim.salary }`).

The `form16-upload` file input is rendered for visual parity but intentionally
has **no** wired behavior — the original HTML has no `onchange`/JS handler
for it either (it's a dead control in the source), so no fake upload logic
was invented here.

## The one cross-step dependency: tax regime

`.sal-old-regime-field` (Basic+DA, LTA Claimed, the whole HRA card) is only
shown when `state.profile.tax_regime !== 'NEW'`. That field is owned by the
"Financial Life Snapshot" step, not this one. Here it's modeled as an
injected `context.tax_regime`, updated via a `SET_TAX_REGIME` event — when
the parent wizard changes regime, dispatch that event into this machine and
it will both hide **and clear** the old-regime-only fields, exactly like
`evaluateSalaryRegimeLock()` did.

## Setup

```bash
npm install xstate @xstate/react react react-dom
```

```jsx
import SalaryStep from './src/SalaryStep.jsx';
import './src/salaryStep.css'; // if not already loaded globally by another step

<SalaryStep
  initialContext={{ tax_regime: currentRegimeFromParentWizard }}
  onBack={() => {/* navigate to previous step */}}
  onContinue={(context) => {/* persist context.salary, navigate to next step */}}
/>
```

## Verified behavior

Run against `xstate@5.32.4` in Node, plus a `react-dom/server` render check
with both the collapsed default state and a fully-populated OLD-regime
state (HRA, ESOP rows, PwD allowance) to confirm the JSX compiles and every
conditional block renders without throwing.
