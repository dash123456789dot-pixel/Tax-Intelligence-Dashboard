# Schedule FA & FSI Step — extracted from `layer1_india.html`

This is "Screen 2J — Foreign Assets (Schedule FA & FSI)" (`panel-step-fa`,
lines 2439–2520 of the source file) — the ninth step in this project's
wizard sequence: ... -> Business -> Capital Gains -> Other Sources -> DTAA
-> **Schedule FA & FSI**.

## Cross-step dependencies

| Field | Owned by | Used for |
|---|---|---|
| `final_india_residency_status` | Step 2 (Residency Solver) | Step eligibility gate |
| `setup_international` | Step 1 (Financial Life Snapshot's `#setup-international` dashboard checkbox) | Step eligibility gate |

### The combined eligibility gate (per explicit instruction)

Confirmed directly in the source's own `syncUnlockStatus()`:

```js
} else if (step === 'step-fa') {
    const isIntlChecked = document.getElementById('setup-international') && document.getElementById('setup-international').checked;
    isAllowed = (lock === 'ROR' || lock === 'RNOR') && isIntlChecked;
```

This port enforces exactly that: `ui.visibility.stepEligible` is true only
when `final_india_residency_status` is `'ROR'` or `'RNOR'` **and**
`setup_international` is checked. When ineligible, the component shows a
short explanatory banner (current status + checkbox state) instead of
silently hiding the form with no explanation. See
`computeStepEligibility()` in `deriveForeignAssets.js` and the test suite's
first block, which exercises all four combinations (ROR+unchecked,
ROR+checked, NR+checked, RNOR+checked).

## What's in here

| File | What it is |
|---|---|
| `deriveForeignAssets.js` | Pure, DOM-free port of `toggleForeignAssets()`, `toggleReceivedForeignIncome()` (both tri-state: `true` \| `false` \| `null`), `addFaRow()`'s per-row defaults, `toggleFaCardType()`, `toggleFaStatus()`, `toggleFaDtaa()`, `calculateFaFtc()` + `syncFaState()` (merged into one row-level FTC computation), and `updateLrsTcs()`'s full TCS-rate table (travel/investment/education/medical bands). |
| `foreignAssetsMachine.js` | The XState v5 machine. `foreign_assets` and `lrs_outbound` context objects mirror the original's two real top-level state trees; one field per original input, with the combined eligibility gate as injected context. |
| `src/ForeignAssetsStep.jsx` | The React component — the two tri-state Yes/No gates, LRS aggregate fields with live TCS estimate, and the dynamic Schedule FA/FSI declaration cards (asset details + FSI/FTC sub-sections). |
| `src/foreignAssetsStep.css` + `tailwind.config.js` | Shared brand CSS/theme. |
| `test-machine.mjs` | Smoke test — the eligibility gate across all combinations, both tri-state gates (including the "null defaults to visible" FSI-section quirk), category-change/status-change/DTAA-toggle side effects, the FTC currency conversion, and every LRS TCS band. |

## Notable behaviors, faithfully preserved

- **Tri-state gates, not booleans.** `has_foreign_assets` and
  `has_received_foreign_income` are `true | false | null` in the original,
  not plain booleans — `null` is the pre-answered state, and it has its
  own distinct visibility rules (e.g. FSI sections default to **visible**
  when `has_received_foreign_income` is `null`, only hiding when explicitly
  answered `false` — see `computeIncomeGateVisibility()`).
- **Category change doesn't reset an unrelated field.** `toggleFaCardType()`
  only *forces* `head_of_income` when switching to a pure-income category
  (`salary`/`business`/`other_income`); switching back to an asset category
  leaves whatever `head_of_income` was previously set to completely
  untouched (verified in `test-machine.mjs`).
- **The three FSI numeric fields (`income_foreign`, `tax_foreign`,
  `conversion_rate`) are NOT live-comma-formatted** in the original — they
  lack the `.inr-input` class that the asset-value fields have. This port
  matches that: they're plain uncontrolled text inputs (parsed as floats
  on blur), while the asset-value fields (`initial_value`, `peak_balance`,
  etc.) use the shared `InrField` live-formatting component.
- **Turning off Foreign Assets (`false` or `null`) clears the whole asset
  list** and force-resets the foreign-income gate (`false` when assets
  answer is `false`; `null` when reset entirely) — reproduced exactly in
  `TOGGLE_FOREIGN_ASSETS`.

## Setup

```bash
npm install xstate @xstate/react react react-dom
```

```jsx
import ForeignAssetsStep from './src/ForeignAssetsStep.jsx';
import './src/foreignAssetsStep.css';

<ForeignAssetsStep
  initialContext={{
    final_india_residency_status: residencyContext.ui.cert.status,
    setup_international: dashboardSetupInternationalChecked,
  }}
  onBack={() => {/* navigate to previous step */}}
  onContinue={(context) => {/* persist context.foreign_assets + context.lrs_outbound, navigate to next step */}}
/>
```

## Verified behavior

Run against `xstate@5.32.4` in Node: the combined ROR/RNOR + intl-checkbox
gate across all relevant combinations, both tri-state gates and their
distinct `null` behavior, category/status/DTAA toggle side effects, the
FTC INR conversion, and every band of the LRS TCS rate table (travel flat
2%, investment/gift 20% on excess, education/medical 2% on excess,
education-loan 0%, below-threshold NIL). Also rendered via
`react-dom/server` in an ineligible state (banner only, form hidden) and a
fully-populated eligible state (asset row with FSI/FTC/DTAA fields, TCS
estimate) to confirm the JSX compiles and every conditional block renders
without throwing.
