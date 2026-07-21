# Compliance Documents Step — extracted from `layer1_india.html`

This is "Screen 2C — Additional Documents & Special Rates"
(`panel-step-compliance`, lines 2524–2647 of the source file) — the tenth
step in this project's wizard sequence: ... -> DTAA -> Schedule FA & FSI
-> **Compliance Documents**.

## Cross-step dependency

| Field | Owned by | Used for |
|---|---|---|
| `final_india_residency_status` | Step 2 (Residency Solver) | The step's sole eligibility gate |

### The eligibility gate (confirmed by direct DOM-logic inspection, per instruction)

The source's own `syncUnlockStatus()` gates this step identically to the
DTAA step:

```js
if (step === 'step-dtaa' || step === 'step-compliance') {
    isAllowed = (lock === 'NR');
```

That's the **entire** condition — a single check against
`final_india_residency_status`, with no second checkbox (unlike the
Foreign Assets step's `ROR/RNOR + setup_international` gate). This port
enforces exactly that one condition — `ui.visibility.stepEligible =
(final_india_residency_status === 'NR')` — without inventing an additional
requirement, since none exists in the source for this particular step
(confirmed by grepping every reference to `step-compliance` in the file).
When ineligible, the component shows a short explanatory banner instead of
silently hiding the form.

## What's in here

| File | What it is |
|---|---|
| `deriveCompliance.js` | Pure, DOM-free port of `updateComp10F()`, `handleForm10fUpload()` (mock OCR), `updateCompS197Bool()`, `updateS197IncomeTypes()`, `handleS197Upload()` (mock OCR, including its auto-checked income types), `updateCompS197Field()`, and `updateCompField()`. |
| `complianceMachine.js` | The XState v5 machine. `compliance_docs.form_10f` and `compliance_docs.section_197_cert` mirror the original's two real sub-objects; the mock-upload pattern reuses the delayed-`raise()` technique from the House Property step's extraction. |
| `src/ComplianceStep.jsx` | The React component — Form 41 toggle + dual entry (upload/manual), Lower TDS Certificate toggle + auto-fill upload + rate/dates/income-type checkboxes, and the Chapter XII-A opt-in. |
| `src/complianceStep.css` + `tailwind.config.js` | Shared brand CSS/theme. |
| `test-machine.mjs` | Smoke test — the eligibility gate, both mock-OCR uploads (including the 1500ms delay), income-type toggling/merging, and the rate-field bug below. |

## A genuine bug, faithfully preserved rather than fixed

`updateCompS197Field('rate', val)` runs the Approved Lower Rate (a
fraction like `0.05` for 5%) through `parseINRCurrency()`, which does
`parseInt(stripped, 10)`. `parseInt` stops at the first non-digit
character, so `parseInt("0.05", 10) === 0`. Worse, the field also carries
the `inr-input` class, which triggers the original's global,
document-level live-formatter that strips every non-digit character *as
the person types* — so a decimal point can never even be typed into that
box in the browser. Even the mock OCR auto-fill (`handleS197Upload()`,
which writes the literal string `'0.03'`) goes through this exact same
broken path. **The net effect: this field can never actually store a
fractional value through the UI**, despite its own placeholder ("e.g.
0.05") suggesting it should.

This is reproduced exactly in `parseS197Rate()` (which just calls the same
`parseINRCurrency()`) and in `s197MockExtraction()` (whose auto-filled rate
correctly comes out as `0`) — see `test-machine.mjs`'s dedicated test block
demonstrating both the broken decimal case and the working integer case.
This was **not** silently fixed, since doing so would misrepresent what
the source actually computes.

## Setup

```bash
npm install xstate @xstate/react react react-dom
```

```jsx
import ComplianceStep from './src/ComplianceStep.jsx';
import './src/complianceStep.css';

<ComplianceStep
  initialContext={{ final_india_residency_status: residencyContext.ui.cert.status }}
  onBack={() => {/* navigate to previous step */}}
  onContinue={(context) => {/* persist context.compliance_docs, navigate to next step */}}
/>
```

## Verified behavior

Run against `xstate@5.32.4` in Node: the NR-only eligibility gate, both
document-upload mock-OCR flows (including their real 1500ms delay and the
S197 upload's auto-checked income types merging with whatever was already
selected), the income-type checkbox toggle, and the rate-field bug (both
the broken decimal case and the working plain-integer case). Also rendered
via `react-dom/server` in an ineligible state (banner only, form hidden)
and a fully-populated eligible state to confirm the JSX compiles and every
conditional block renders without throwing.
