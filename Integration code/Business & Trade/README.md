# Business Step — extracted from `layer1_india.html`

This is "Screen 2G — Business, Profession & Trading Income" (`panel-step-business`,
lines 2996–3443 of the source file), internally labeled "DOM-03 Specialist
Cockpit" — the fifth step in this project's wizard sequence: Financial Life
Snapshot -> Residency Solver -> Salary -> House Property -> **Business**.

This is by a wide margin the most cross-step-coupled screen in the wizard,
which is why the deliverable leads with dependencies before anything else.

## Cross-step dependencies (read this first)

This step reads **four** fields it does not own:

| Field | Owned by | Used for |
|---|---|---|
| `tax_regime` | Step 1 (Financial Life Snapshot) | Locks/hides the AMT credit carry-forward block (Old-Regime-only) |
| `entity_type` | Step 1 (Financial Life Snapshot) | Gates s44AD/s44ADA eligibility (companies/LLPs/AOPs/etc. can't use them); gates Section 8 / S35AD blocks |
| `is_indian_company` | **Step 2: Residency Solver** (`residency_detail.is_indian_company`) | Gates the Section 8 (NGO) toggle and the Special Corporate Business Schemes (S35AD) block — domestic companies only |
| `final_india_residency_status` | **Step 2: Residency Solver** (RS-001 output: `'ROR'\|'RNOR'\|'NR'`) | **The big one.** Presumptive taxation (s44AD/s44ADA) is a hard legal gate — only ROR taxpayers may opt for it. NR status additionally *unlocks* a different scheme (s44BB, minerals-oil presumptive) |

`businessMachine.js` exposes four setters for these — `SET_TAX_REGIME`,
`SET_ENTITY_TYPE`, `SET_IS_INDIAN_COMPANY`, `SET_RESIDENCY_STATUS` — and
every one of them re-runs the full eligibility cascade
(`deriveBusiness.js` → `runEligibilityCascade`), exactly mirroring how the
original's `validate*Eligibility()` functions were wired to fire on every
relevant state change, not just on direct edits within this step.

**Wire the Residency Solver step's derived status into this step.** Every
time the Residency Solver's `context.ui.cert.status` changes, dispatch:
```js
businessSend({ type: 'SET_RESIDENCY_STATUS', value: residencyStatus });
businessSend({ type: 'SET_IS_INDIAN_COMPANY', value: residencyContext.residency_detail.is_indian_company });
```

### A faithfully-preserved quirk in that dependency

The original's `validateS44ADEligibility()` / `validateS44ADAEligibility()`
functions check turnover, digital-receipt ratio, business-code, and the
5-year lock-in — but they do **not** check ROR status when deciding whether
to force-revert an *already-selected* s44AD/s44ADA. The ROR gate is enforced
only at the **options list** level (`renderBusinessEntries()`'s
`schemeOptions` — ported here as `computeEntrySchemeOptions`): once ROR is
lost, `'s44AD'` simply stops being a valid `<option>`, but the underlying
`entry.presumptive_scheme` value is left stale until the person touches
that dropdown again. This is exactly why the `warn-pres-nri` banner exists
— to catch that stale-but-now-illegal state and tell the person to fix it.
This port reproduces that behavior exactly (see `test-machine.mjs`'s
`s44BB`-vs-`s44AD` comparison, which demonstrates both sides: s44BB/s44BBB
*are* explicitly force-reverted by their own validators when the
cross-step context changes, s44AD/s44ADA are not).

## What's in here

| File | What it is |
|---|---|
| `deriveBusiness.js` | Pure, DOM-free port of `toggleBusinessModule()`, `updateBizNature()`, `toggleReceiptsVisibility()`, the full eligibility cascade (`validateS44ADEligibility` / `validateS44ADAEligibility` / `validateS44AEEligibility` / `validateS44BBEligibility` / `validateS44BBBEligibility`), `updateBizPresumptive()`'s entries→array sync, `syncGstSection()`, `evaluateAmtCreditExpiry()`, and the cross-step visibility rules for Section 8 / S35AD pulled from `evaluateEntityOverrides()` / `updateBizEntityType()`. |
| `businessMachine.js` | The XState v5 machine. One context field per original input (see the extensive inline comments on `initialBusinessContext`), plus the four injected cross-step fields and their setters. |
| `src/BusinessStep.jsx` | The React component — nature checkboxes, business-entry cards, partner-firm cards, goods-vehicle fleet list, F&O/Intraday cards, GST section, deemed-business-income fields, the AMT credit block, and all eligibility warning banners. |
| `src/businessStep.css` + `tailwind.config.js` | Shared brand CSS/theme. |
| `test-machine.mjs` | Smoke test — this one specifically exercises the cross-step dependency scenarios (residency flips, entity flips, is_indian_company flips) in addition to the ordinary CRUD/eligibility checks. |

## Deferred sub-features (explicitly out of scope)

The original's business step is enormous — deep enough that a few genuinely
separate sub-systems were **not** ported, to keep this extraction reviewable.
Each is called out in code comments at the point it would attach:

1. **Per-entry branch / SEZ / export / revenue-line-item micro-UI.** Each
   business entry (and each branch within it) can, in the original, expand
   into a business-code-specific granular revenue breakdown (via a
   `revenueLineItems` lookup table), SEZ deduction toggles, export-revenue
   tracking with cross-field validation, and even banking-specific bad-debt
   provisions. This is a large, mostly self-contained sub-system
   (`renderBusinessEntries()`'s inner branch-rendering closure is ~250 lines
   alone). This port instead gives each non-presumptive entry a single
   aggregate "Turnover / Gross Receipts" field, clearly labeled as
   simplified in the UI itself.
2. **"Unit-Wise Business Expenses" and "Common Assets" accordions.** Both
   are "Auto-Mirrored Architecture" containers populated by
   `renderBusinessExpenses()` / `renderUnitAssetBlocks()` — functions that
   operate across the *entire* `domestic_income` tree (reading business
   entries, branches, and quarters together) rather than being local to
   this step. The accordion shells are rendered with a placeholder note
   rather than invented content.
3. **The duplicate `id="div-pres-s44ae"` block.** The source HTML has two
   elements sharing that id — the real one (`s44ae-vehicles-container` /
   `addGoodsVehicle()`, wired) and a second, dead one (`<table
   id="vehicle-table">` / `addVehicleRow()`). Because `getElementById`
   always resolves to the first match, the second block's own `hidden`
   class is never removed by any code path and it can never be shown. Only
   the functional implementation is ported here.

## Setup

```bash
npm install xstate @xstate/react react react-dom
```

```jsx
import BusinessStep from './src/BusinessStep.jsx';
import './src/businessStep.css';

<BusinessStep
  initialContext={{
    tax_regime: currentRegime,
    entity_type: currentEntityType,
    is_indian_company: residencyContext.residency_detail.is_indian_company,
    final_india_residency_status: residencyContext.ui.cert.status,
  }}
  onBack={() => {/* navigate to previous step */}}
  onContinue={(context) => {/* persist context.business_income, navigate to next step */}}
/>
```

## Verified behavior

Run against `xstate@5.32.4` in Node — the cross-step scenarios (residency
ROR→NR→ROR round trip forcing s44BB reversion but *not* s44AD reversion;
entity individual→company; is_indian_company gating Section 8/S35AD),
s44AD's turnover-cap/lock-in/business-code reverts, s44ADA's receipts-cap
and profession-type reverts, the 10-vehicle S44AE cap, GST section state
clearing, partner-firm CRUD, and the AMT expiry calculation (including a
fix — see below). Also rendered via `react-dom/server` across three
distinct context shapes (collapsed default; OLD-regime individual with a
s44AD business + partner firm + F&O; NR foreign company with a goods-transport
s44AE entry) to confirm the JSX compiles and every conditional block renders
without throwing.

### One bug fix (documented, not silently applied)

`evaluateAmtCreditExpiry()`'s origin-year regex in the original was
`/(d{4})/` — missing the `\` before `d`, so it could never match a real
year and the "AMT credit expiring soon" warning was permanently dead code.
`computeAmtExpiry()` in `deriveBusiness.js` fixes this to `/(\d{4})/` and
says so directly in a code comment, rather than silently reproducing a
no-op warning feature.
