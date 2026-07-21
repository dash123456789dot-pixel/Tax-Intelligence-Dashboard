# Bank Accounts Step — extracted from `layer1_india.html`

This is "Screen 2D — Bank Accounts" (`panel-step-bank`, lines 2649–2685 of
the source file) — the eleventh step in this project's wizard sequence.

## Cross-step check: this step has NO eligibility gate (confirmed, not assumed)

`syncUnlockStatus()` in the original has explicit special-case branches
for `step-dtaa`/`step-compliance` (NR-only) and `step-fa`
(ROR/RNOR + `setup_international`), but **no branch at all** for
`step-bank`. Every reference to `step-bank` in the file was checked; none
of them gate its reachability. It falls through to the function's default
`let isAllowed = true;` and is therefore unconditionally visible/reachable
— exactly matching the "always visible" premise this extraction was given.
See the header comment in `deriveBankAccounts.js` for the full trace.

### What *does* depend on other steps: navigation targets, not visibility

Two things are injected, but they only resolve which step a "← Back" or
"Next Step →" click should go to — they never hide or show this step's own
form:

| Field | Owned by | Used for |
|---|---|---|
| `residency_lock` | Step 2 (Residency Solver) | Back button target: `'NR' → step-compliance`, `'ROR' → step-fa`, else `step-profile` |
| `entity_type` | Step 1 (Financial Life Snapshot) | Next button target: `'individual' → step-salary`, else `step-hp` |

`onBack(backTarget)` / `onContinue(context, nextTarget)` receive the
resolved target so a parent router can act on it.

## What's in here

| File | What it is |
|---|---|
| `deriveBankAccounts.js` | Pure, DOM-free port of `addBankAccountRow()`'s defaults, `toggleBankTypeDependencies()`, `checkNROAccounts()`, `handleBankUpload()` (mock OCR), and `syncBankAccountsState()` (incl. its NRO-repatriation aggregation and the two bugs below). |
| `bankAccountsMachine.js` | The XState v5 machine. `bank_accounts` is an array of rows; raw string inputs are stored as typed, with all numeric/type-conditional coercion happening at derive time (`computeAccount()`), mirroring how the original recomputes `state.bank_accounts` from the live DOM on every keystroke rather than coercing once at input time. |
| `src/BankAccountsStep.jsx` | The React component — dynamic bank-account cards (with mock-OCR statement upload), conditional NRE/FCNR/NRO fields, and the NRO Repatriation Summary panel. |
| `src/bankAccountsStep.css` + `tailwind.config.js` | Shared brand CSS/theme. |
| `test-machine.mjs` | Smoke test — row CRUD, account-type-conditional field visibility and computed-object key presence, the NRO-repatriation null-reset behavior, the interest-rate bug, and the mock upload. |

## Two genuine bugs, faithfully preserved rather than fixed

1. **Interest rate truncation.** `syncBankAccountsState()` computes
   `annual_interest_rate` as `parseINRCurrency(rateRaw) / 100 || null`.
   `parseINRCurrency()` does `parseInt(stripped, 10)`, which stops at the
   first non-digit character — so typing `"3.5"` (meaning 3.5%) is parsed
   as the integer `3` *before* dividing by 100, yielding `0.03` (3%) with
   the `.5` silently lost. Reproduced exactly in `computeAccount()`, with
   a dedicated test proving both the broken decimal case and the working
   plain-integer case (`"4"` → `0.04`, correct).
2. **NRO Repatriation Summary resets to `null`, not just hidden, when no
   row is NRO.** `syncBankAccountsState()` does
   `state.nro_repatriation = hasNRO ? {...} : null;` — so if a person had
   already filled in the repatriation panel and then changes their only
   NRO account to a different type, the *computed* `nro_repatriation`
   object becomes `null` even though the raw inputs are still sitting in
   the (now-hidden) panel. This port keeps the raw inputs
   (`context.nro_repatriation_inputs`) around untouched, but
   `ui.computedNroRepatriation` — the thing that would actually be sent to
   a tax engine — faithfully collapses to `null`, exactly like the
   original (see the dedicated test block).

## Setup

```bash
npm install xstate @xstate/react react react-dom
```

```jsx
import BankAccountsStep from './src/BankAccountsStep.jsx';
import './src/bankAccountsStep.css';

<BankAccountsStep
  initialContext={{
    residency_lock: residencyContext.ui.cert.status,
    entity_type: currentEntityType,
  }}
  onBack={(targetStepId) => {/* navigate to targetStepId */}}
  onContinue={(context, targetStepId) => {/* persist context.bank_accounts + context.ui.computedNroRepatriation, navigate to targetStepId */}}
/>
```

## Verified behavior

Run against `xstate@5.32.4` in Node: row add/remove, account-type-driven
field visibility (NRE/FCNR/NRO) and the corresponding computed-object key
presence/absence, the NRO-repatriation null-reset quirk, the interest-rate
truncation bug (both broken and working cases), the mock bank-statement
upload (including its real 1500ms delay), the US-person tri-state field,
and both navigation-target resolvers across all their branches. Also
rendered via `react-dom/server` in an empty state and a fully-populated
two-account state (one NRO, one NRE) to confirm the JSX compiles and every
conditional block renders without throwing.
