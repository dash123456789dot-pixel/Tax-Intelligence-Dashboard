# DTAA / Tax Treaties Step — extracted from `layer1_india.html`

This is "Screen 2B — Tax Treaties (Avoid Paying Tax Twice)" (`panel-step-dtaa`,
lines 2333–2437 of the source file) — the eighth step in this project's
wizard sequence: Snapshot -> Residency Solver -> Salary -> House Property
-> Business -> Capital Gains -> Other Sources -> **DTAA**.

## Cross-step dependencies

| Field | Owned by | Used for |
|---|---|---|
| `final_india_residency_status` | Step 2 (Residency Solver) | Step eligibility gate (see below) |
| `days_in_india_current_year` | Step 2 (Residency Solver) | Step eligibility gate — **the binding explicitly requested for this extraction** |
| `dtaa.dtaa_treaty_residence` / `dtaa.dtaa_forced_nr` | Step 2 (Residency Solver's Article-4 tie-breaker wizard) | Read-only here; written by that wizard, not by anything in this step's own UI |

### The combined eligibility gate (what this task specifically asked for)

The original only ever gated this step's sidebar visibility on
`final_india_residency_status === 'NR'` (see `syncUnlockStatus()` in the
source, which sets `isAllowed = (lock === 'NR')` for `step-dtaa`). **Per
explicit instruction, this port also requires
`days_in_india_current_year < 180`** before treating the step as
reachable — both conditions must hold together. See
`computeStepEligibility()` in `deriveDtaa.js`, and `ui.visibility.stepEligible`
in the component. When ineligible, the step renders a short explanatory
banner (showing the current status and day count) instead of the form,
rather than silently hiding everything with no explanation.

The boundary is exclusive: exactly 180 days is **not** eligible (tested —
179 passes, 180 does not), matching "below 180 days" literally.

### The tie-breaker link back to the Residency Solver step

`dtaa.dtaa_treaty_residence` and `dtaa.dtaa_forced_nr` are written by the
DTAA Article-4 tie-breaker wizard that lives *inside* the Residency Solver
step's own panel (see that step's extraction, `residencyMachine.js`) —
**not** by anything in this DTAA step's UI. This step only reads them
(indirectly, via the injected `final_india_residency_status`, since the
Residency Solver's RS-001 engine folds a `'us'` tie-break result into an
NR override). Dispatch `SET_DTAA_TREATY_RESIDENCE` here if a parent wizard
wants this step's local copy to reflect a live change from that wizard.

## What's in here

| File | What it is |
|---|---|
| `deriveDtaa.js` | Pure, DOM-free port of `toggleUSResidentDtaa()`, `togglePeAlert()`, `toggleTrcUpload()`, `updateDtaaField()`, `updateCompTRC()`, the India-US treaty rate/article auto-fill table from `updateDtaaElection()`, `autoFillUSTreaty()`, and the per-row dividend/capital-gains warning banners from `renderDtaaElections()`. |
| `dtaaMachine.js` | The XState v5 machine. One context field per original input (see comments on `initialDtaaContext`), plus the injected cross-step fields and the new combined eligibility gate. |
| `src/DtaaStep.jsx` | The React component — country selector, TRC toggle + upload sub-fields, PE toggle + alert, and the treaty elections table with per-row auto-filled rate/article and conditional warning banners. |
| `src/dtaaStep.css` + `tailwind.config.js` | Shared brand CSS/theme. |
| `test-machine.mjs` | Smoke test — specifically exercises the eligibility gate's boundary (179 vs 180 days) and both sides of the NR/days conditions independently, plus the treaty-election auto-fill and banner logic. |

## Two things worth knowing that are faithfully NOT "fixed"

1. **The TRC upload sub-fields write to `compliance_docs.trc`, not `dtaa`.**
   Even though `Upload TRC PDF` / `Validity Start Date` / `Validity End Date`
   are rendered inside this DTAA panel, the original's `updateCompTRC()`
   writes them to `state.compliance_docs.trc` — a different top-level
   object entirely (shared with the separate Compliance Documents step).
   This port keeps that exact split: `context.compliance_docs.trc` is a
   distinct object from `context.dtaa`, updated via its own `UPDATE_COMP_TRC`
   event.
2. **The "⚡ Auto-Fill US Rates" button is dead UI in the original** — its
   `hidden` class is never removed by any code path (confirmed: no
   `getElementById('us-autofill-btn')` call exists anywhere in the source
   outside its own declaration). The `autoFillUSTreaty()` function it calls
   is fully implemented and functional; only the button's own visibility
   was never wired up. This port reproduces that exactly
   (`showUsAutofillBtn: false`, always) rather than guessing at what the
   intended condition might have been (plausibly `is_us_resident_for_dtaa === true`).
   The `AUTOFILL_US_TREATY` event is still fully functional if a parent
   wants to surface it through some other control.

## Setup

```bash
npm install xstate @xstate/react react react-dom
```

```jsx
import DtaaStep from './src/DtaaStep.jsx';
import './src/dtaaStep.css';

<DtaaStep
  initialContext={{
    final_india_residency_status: residencyContext.ui.cert.status,
    days_in_india_current_year: residencyContext.residency_detail.days_in_india_current_year,
    dtaa: { dtaa_treaty_residence: residencyContext.dtaa.dtaa_treaty_residence, dtaa_forced_nr: residencyContext.dtaa.dtaa_forced_nr },
  }}
  onBack={() => {/* navigate to previous step */}}
  onContinue={(context) => {/* persist context.dtaa + context.compliance_docs.trc, navigate to next step */}}
/>
```

## Verified behavior

Run against `xstate@5.32.4` in Node: the combined NR + days<180 gate
(including the exact 180-day boundary), country selection deriving
`is_us_resident_for_dtaa`, TRC toggle/upload writing to the correct
(`compliance_docs.trc`) object, PE toggle + alert, treaty-election
add/remove/update with the India-US auto-fill table and per-row warning
banners, the "replace the whole list" semantics of `autoFillUSTreaty()`,
and the always-hidden dead autofill button. Also rendered via
`react-dom/server` in both an ineligible state (shows the explanatory
banner, hides the form) and a fully-populated eligible state to confirm
the JSX compiles and every conditional block renders without throwing.
