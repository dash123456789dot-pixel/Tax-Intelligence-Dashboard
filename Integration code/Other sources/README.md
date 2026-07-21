# Other Sources Step — extracted from `layer1_india.html`

This is "Screen 2I — Other Sources" (`panel-step-os`, lines 3647–3903 of
the source file, internally labeled "DOM-04") — the seventh step in this
project's wizard sequence: Snapshot -> Residency Solver -> Salary -> House
Property -> Business -> Capital Gains -> **Other Sources**.

It also includes the **Agricultural Income** block, which — despite living
at `state.domestic_income.has_agricultural_income` /
`agricultural_income_inr` in the original (a sibling of `business_income`,
not actually part of `other_sources`) — has its one and only rendered UI
inside this same panel. It's extracted here because that's where the form
actually is.

## Cross-step dependencies

| Field | Owned by | Used for |
|---|---|---|
| `entity_type` | Step 1 (Financial Life Snapshot) | Gates 8 different fields/cards — see table below |
| `deemed_dividend_from_buyback_inr` | **Step 5: Capital Gains** (computed) | Read-only, informational; not a rendered input in this step either (see note) |

### Entity-type gating (all ported from `updateBizEntityType()`)

| Field / card | Visible when |
|---|---|
| `card-os-family-pension` | `entity_type === 'individual'` |
| `card-os-retirement` | `entity_type === 'individual'` |
| `div-os-minor-child` | `entity_type === 'individual'` |
| `div-os-spousal-clubbing` | `entity_type === 'individual'` |
| `div-os-angel-tax` | `entity_type === 'company'` |
| `div-os-lic-maturity` | `individual` or `huf` |
| `div-os-gifts-exemptions` (marriage/relative checkboxes) | `individual` or `huf` |
| `div-os-local-authority-10-20` | `entity_type === 'local'` |
| Gifts input vs. "Fully Exempt" trust banner | input for everyone except `trust`; banner only for `trust` |

Switching entity type also **clears** fields that are no longer
applicable — `angel_tax_premium_inr` (leaving `company`), `lic_maturity_inr`
(leaving `individual`/`huf`), and auto-zeroes (not nulls!)
`gifts_above_50k_inr` when entering `trust` — all ported exactly as
`clearFieldsForEntityChange()` in `deriveOtherSources.js`.

### The Capital Gains cross-step read (`deemed_dividend_from_buyback_inr`)

The original computes, elsewhere in its tax-simulation engine:
`sum(consideration_received_inr)` across every `share_buyback` transaction
where `buyback_pre_or_post_oct2024 === 'post_oct2024'` (see the Capital
Gains step's `computeBuybackDerived()`), and stores the result at
`state.other_sources.deemed_dividend_from_buyback_inr`. **There is no
rendered control for this field anywhere in the Other Sources panel's own
HTML** — it's a background computation the tax engine needs, not something
the person types. This port keeps it that way: `deemed_dividend_from_buyback_inr`
is injected, read-only context (settable via `SET_DEEMED_DIVIDEND_FROM_BUYBACK`,
which your parent wizard would dispatch after recomputing the Capital
Gains step's buyback totals) and **not rendered as a form field** in
`OtherSourcesStep.jsx`, matching the original faithfully rather than
inventing a display for it.

## A genuine quirk, faithfully preserved: the "auto-flip" gate

Unlike the Capital Gains step's fully disconnected master gate,
`updateOSField()` in the original does something different but equally
worth knowing: **any single field edit force-sets
`has_other_sources_income = true`**, regardless of whatever the `os-has`
toggle currently shows. The gate and the fields are coupled one-directionally:
turning the gate on/off toggles visibility and (only in the "on" direction)
sets the flag; but typing into *any* field also flips the flag to `true`
on its own. `applyOSFieldUpdate()` in `deriveOtherSources.js` reproduces
this exactly — see `test-machine.mjs`'s first scenario.

## What's in here

| File | What it is |
|---|---|
| `deriveOtherSources.js` | Pure, DOM-free port of `toggleOSSection()`, `updateOSField()` (incl. the family-pension auto-deduction and the auto-flip quirk), `toggleAgriSection()`/`updateAgriIncome()`, `clearFieldsForEntityChange()`, and all entity-driven visibility rules. |
| `otherSourcesMachine.js` | The XState v5 machine. One context field per original input (see comments on `initialOtherSourcesContext`), plus the two injected cross-step fields. |
| `src/OtherSourcesStep.jsx` | The React component — four income cards (Slab-Rate Streams, Retirement & Exempt Receipts, Family Pension, Special Rate Streams) plus the Agricultural Income block, each collapsible "+ Add TDS" sub-field as local UI state, and the two intentionally-inert gift-exemption checkboxes. |
| `src/otherSourcesStep.css` + `tailwind.config.js` | Shared brand CSS/theme. |
| `test-machine.mjs` | Smoke test — covers the auto-flip quirk, the family-pension deduction formula, every entity-gated field/card, the entity-change clearing side effects, and the cross-step buyback figure. |

## Two intentionally-dead controls, preserved as-is

- **`os-gifts-marriage` / `os-gifts-relative` checkboxes** had no
  `onchange` handler in the original at all. They're rendered here too,
  but genuinely wired to nothing — not a bug in this extraction, a
  faithful reproduction of dead UI in the source.
- **`unexplained_income_115BBE_inr`** is read/written by `updateOSField()`
  but was missing from the original's own initial-state object declaration
  (JS just adds it on first write). Declared explicitly here with a proper
  `null` default instead of relying on that implicit behavior.

## Setup

```bash
npm install xstate @xstate/react react react-dom
```

```jsx
import OtherSourcesStep from './src/OtherSourcesStep.jsx';
import './src/otherSourcesStep.css';

<OtherSourcesStep
  initialContext={{
    entity_type: currentEntityType,
    deemed_dividend_from_buyback_inr: capitalGainsBuybackTotal, // from the CG step's derived buyback totals
  }}
  onBack={() => {/* navigate to previous step */}}
  onContinue={(context) => {/* persist context.other_sources + context.agricultural, navigate to next step */}}
/>
```

## Verified behavior

Run against `xstate@5.32.4` in Node: the auto-flip gate quirk, the family-
pension standard-deduction formula (`min(15000, round(gross/3))`), every
entity-gated field/card for `individual`/`huf`/`company`/`trust`/`local`,
the entity-change clearing side effects (angel tax, LIC maturity, gifts
auto-zero for trusts), the agricultural income sub-toggle, and the
cross-step deemed-dividend figure. Also rendered via `react-dom/server` in
collapsed, individual (with agri income), company, and trust states to
confirm the JSX compiles and every conditional block renders correctly.
