# House Property Step — extracted from `layer1_india.html`

This is the "Screen 2F — House Property (DOM-02)" step (`panel-step-hp`,
lines 2958–2993 of the source file). It's the fourth step in the wizard's
main sequence used across this project: Financial Life Snapshot ->
Residency Detection -> Salary -> House Property.

## What's in here

| File | What it is |
|---|---|
| `deriveHouseProperty.js` | Pure, DOM-free port of `toggleHPSection()`, `addHouseProperty()`, `removeHouseProperty()`, `updateHPField()` (including the co-owner-share clamp and the SOP/regime zero-out side effects), and the per-property visibility rules that were computed inline inside `renderHouseProperties()`'s template-literal string (`isSOP`, `hideInterest`, the co-owner-share-driven "Financial Values Represent" field, and the self-occupied-with-loan gating). |
| `hpMachine.js` | The XState v5 machine. `context.house_property.properties` is an array where each item has one field per original per-row control (see the comments on `initialHPContext`), plus a hidden `_uploads` UI-only tracker. `context.ui` is fully derived after every event. |
| `src/HousePropertyStep.jsx` | The React component. `renderHouseProperties()`'s template-literal HTML string is now a real `<PropertyCard>` component; every `onchange`/`onblur`/`onclick` becomes a `send(...)`; every inline `${isSOP ? 'opacity-30 pointer-events-none hidden' : ''}` becomes a read from `context.ui.visibility.properties[idx]`. |
| `src/housePropertyStep.css` + `tailwind.config.js` | Same base CSS/brand theme shared by the whole app — this step doesn't add any new non-Tailwind CSS. |
| `test-machine.mjs` | Smoke test validating the machine against the original logic. Safe to delete. |

## Every input, hidden and visible

Each property row mirrors `state.domestic_income.house_property.properties[i]`
exactly, field for field — `property_use`, `co_owner_share_percent`,
`financial_values_represent`, `gross_annual_value_inr`,
`municipal_taxes_paid_inr`, `interest_on_borrowed_capital_inr`,
`pre_construction_interest_inr`, `is_self_occupied_with_loan`. All of them
are visible controls in the original card; none are hidden in the domain
sense.

The one **hidden** field per row, `_uploads: { loan, rent, tax }`, is not
part of the real domain schema at all — it's a UI-only mirror of
`handleHPUpload()`'s fake "Scanning Document..." -> "Extraction Successful"
animation (a 2-second `setTimeout` that only mutated DOM text/classes in the
original and never touched `state`). It's kept as machine context (rather
than component-local state) so the whole step stays driven by one source of
truth, and reproduced via a delayed self-raised `HP_UPLOAD_COMPLETE` event
instead of `setTimeout`.

## Two cross-step dependencies

Both are injected into context (owned by earlier steps) exactly like in the
Salary step extraction:

- **`tax_regime`** ('NEW' | 'OLD') — gates the interest fields (SOP + NEW
  hides interest entirely) and the self-occupied-with-loan toggle (NEW
  always hides/disables it).
- **`entity_type`** — `isCorp = entity !== 'individual' && entity !== 'huf'`
  also hides the self-occupied-with-loan toggle for company/firm/etc.
  entities, and determines the "← Back" target (`step-salary` for
  individuals, `step-bank` otherwise — reproduced via the `onBack` callback
  receiving the resolved target id).

Dispatch `SET_TAX_REGIME` / `SET_ENTITY_TYPE` into this machine whenever the
parent wizard's values change.

## Setup

```bash
npm install xstate @xstate/react react react-dom
```

```jsx
import HousePropertyStep from './src/HousePropertyStep.jsx';
import './src/housePropertyStep.css'; // if not already loaded globally

<HousePropertyStep
  initialContext={{ tax_regime: currentRegime, entity_type: currentEntityType }}
  onBack={(targetStepId) => {/* navigate to targetStepId */}}
  onContinue={(context) => {/* persist context.house_property, navigate to next step */}}
/>
```

## Verified behavior

Run against `xstate@5.32.4` in Node: section toggle seeding/clearing
properties, add/remove rows, SOP<->LOP field zero-out (including the
regime-dependent interest clearing), co-owner-share clamping (1–100),
conditional "Financial Values Represent" visibility, self-occupied-toggle
gating by regime and entity type, and the delayed upload-mock status
transition. Also rendered via `react-dom/server` in both collapsed and a
fully-populated two-property OLD-regime state to confirm the JSX compiles
and every conditional block renders without throwing.
