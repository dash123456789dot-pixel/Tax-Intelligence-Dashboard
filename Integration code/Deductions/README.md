# Deductions Step — extracted from `layer1_india.html`

This is "Screen 2J — Tax Deductions (Chapter VI-A)"
(`panel-step-deductions`, lines 3908–4298 of the source file) — the
twelfth step in this project's wizard sequence.

## ⚠️ Correction to this task's premise, found via direct DOM-logic inspection

**This step is NOT always visible.** The source's own `syncUnlockStatus()`
has an explicit branch:

```js
} else if (step === 'step-deductions') {
    isAllowed = (state.profile.tax_regime === 'OLD');
```

The whole step is gated behind the **Old Tax Regime** — which also matches
the panel's own subtitle, right there in the HTML: *"Available under Old
Regime only."* Since the task instructions explicitly asked to verify
dependencies against the actual DOM logic rather than assume, this is
flagged prominently rather than silently built around the (incorrect)
"always visible" premise. `context.tax_regime` (injected from Step 1) and
`ui.visibility.stepEligible` implement this gate; when ineligible, the
component shows an explanatory banner instead of the form.

## Full cross-step dependency map

| Field | Owned by | Used for |
|---|---|---|
| `tax_regime` | Step 1 (Financial Life Snapshot) | **Step-level gate** (see above) |
| `entity_type` | Step 1 | 80TTB senior-**individual**-only rule; 80IAC (company/LLP only); 80LA (non-individual/HUF only); political-donation card title text |
| `date_of_birth` | Step 1 (profile) | `isSeniorCitizen()` → feeds the 80TTA/80TTB derivation |
| `final_india_residency_status` | Step 2 (Residency Solver) | PPF/NSC/SSY cosmetic NRI warnings; **hard blocks** on 80DD/80DDB/80U; 80TTA/80TTB derivation |
| `is_indian_company` | Step 2 (residency_detail) | 80M (Inter-Corporate Dividend Deduction) visibility |
| `has_salary_income`, `hra_received_inr` | Step 3 (Salary) | 80GG (rent-paid, no-HRA) eligibility |

## Two categories of NRI handling — don't conflate them

1. **Cosmetic warnings only** (PPF, NSC, SSY): a red warning line appears
   next to the field when NR, but **the typed value is never cleared**.
2. **Hard blocks** (80DD, 80DDB, 80U): the entire card is disabled
   (`opacity-40 pointer-events-none` equivalent), a "NRI Blocked" badge
   appears, and the section's `has_X` flag plus all its detail fields are
   **force-cleared** the instant residency flips to NR — reproduced in
   `applyNriBlocks()`, with a dedicated test proving the clear.

## The 80TTA / 80TTB derivation cascade

`derive80TTA()` implements the exact three-way branch from the source's
`derive80TTASection()`:
- NR → always 80TTA (NRO savings only, ₹10,000 cap), FD/RD field hidden and cleared.
- Senior citizen **and** `entity_type === 'individual'` → 80TTB (adds FD/RD
  interest, ₹50,000 cap). Note: a senior HUF or senior company does **not**
  qualify — only individuals.
- Otherwise → 80TTA (non-senior, savings only).

Changing residency, date of birth, *or* entity type all re-run this
derivation and clear the FD/RD field if it's no longer applicable — tested
explicitly for all three triggers.

## The 80G donation list: ineligible rows are silently dropped from computed state

`sync80GState()` in the original computes an eligibility flag per row
(cash > ₹2,000, or "in kind"/"other" payment modes → ineligible) and shows
a warning banner on the card — but **ineligible rows are never pushed into
the persisted `state.deductions.s80G` array at all**. This port keeps the
raw editable rows (`deductions.s80G_rows`, so the warning can still render
on an ineligible row) separate from `ui.computedS80G` (the equivalent of
the original's persisted array), which silently excludes them — exactly
like the source. Also note: the row's "Deduction Rate" select and
"Subject to Qualifying Limit" checkbox are both rendered in the original
but **never read** by `sync80GState()` — genuinely dead controls, kept
here for visual parity only.

## A dead control, faithfully preserved

`div-ded-80p` (Cooperative Society Deduction) carries `class="hidden"` in
the static markup and is **never** un-hidden by any code path in the
source (confirmed — it only appears in a regime-change *reset* list, never
in a "show" list). `ui.visibility.show80P` is hard-coded to `false` to
match this exactly, rather than guessing at the plausible intended
condition (something like `entity_type === 'coop'`, which doesn't even
exist as an option elsewhere in the app).

## What's in here

| File | What it is |
|---|---|
| `deriveDeductions.js` | Pure, DOM-free port of every `update80*` handler, `sync80DMedicalVisibility()`, `sync80DDVisibility()`, `derive80TTASection()`, `isSeniorCitizen()`, and `sync80GState()`. |
| `deductionsMachine.js` | The XState v5 machine — one context field per original input across all ~15 deduction sections, plus the six injected cross-step fields. |
| `src/DeductionsStep.jsx` | The React component — 80C basket, 80CCD, 80D (+ parents' medical), 80DD/80DDB/80U (shared disability-card component), 80GG, 80G donation list, special entity deductions, political contributions, 80TTA/TTB, 80M, 80QQB/80RRB royalty, 80E, 80EEA. |
| `src/deductionsStep.css` + `tailwind.config.js` | Shared brand CSS/theme. |
| `test-machine.mjs` | Smoke test — the OLD-regime gate, both NRI-handling categories, 80D/80GG conditional clearing, the full 80TTA/TTB cascade across all three triggers, entity-gated special deductions, and the 80G ineligible-row exclusion. |

## Setup

```bash
npm install xstate @xstate/react react react-dom
```

```jsx
import DeductionsStep from './src/DeductionsStep.jsx';
import './src/deductionsStep.css';

<DeductionsStep
  initialContext={{
    tax_regime: currentRegime,
    entity_type: currentEntityType,
    date_of_birth: profileDateOfBirth,
    final_india_residency_status: residencyContext.ui.cert.status,
    is_indian_company: residencyContext.residency_detail.is_indian_company,
    has_salary_income: salaryContext.salary.has_salary_income,
    hra_received_inr: salaryContext.salary.hra_received_inr,
  }}
  onBack={() => {/* navigate to previous step */}}
  onContinue={(context) => {/* persist context.deductions + context.ui.computedS80G, navigate to next step */}}
/>
```

## Verified behavior

Run against `xstate@5.32.4` in Node: the OLD-regime step gate, PPF/NSC/SSY
cosmetic-warning-vs-hard-block distinction, 80D parents'-medical
conditional clearing, 80GG's salary+HRA cross-step gate (including the
force-clear when HRA later appears), the full 80TTA/TTB derivation across
residency/senior/entity triggers, entity-gated special deductions
(80IAC/80LA/80M) and the politically-titled donation card, and the 80G
donation list's ineligible-row exclusion from computed state. Also
rendered via `react-dom/server` in an ineligible (NEW regime) state, a
fully-populated senior-individual state, and a company-entity state to
confirm the JSX compiles and every conditional block renders without
throwing.
