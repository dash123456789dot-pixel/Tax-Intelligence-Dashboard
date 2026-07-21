# Capital Gains Step — extracted from `layer1_india.html`

This is "Screen 2H — Capital Gains" (`panel-step-cg`, lines 3446–3643 of the
source file) — five independent sub-modules under one step: **Immovable
Property Sales**, **Share Buybacks**, **Stocks and Crypto Trading**
(financial holdings), **Physical Gold & Sovereign Gold Bonds**
(commodities), and **Private Company Share Transfers** (unlisted equity).

## Cross-step dependencies

| Field | Owned by | Used for |
|---|---|---|
| `entity_type` | Step 1 (Financial Life Snapshot) | Restricts 4 of the 8 property reinvestment exemption options to Individuals/HUFs |
| `final_india_residency_status` | **Step 2: Residency Solver** | Unlocks Property "Buyer TDS" fields (Section 195) and Unlisted Equity's FEMA/foreign-currency fields — both NR-only |
| `has_capital_gains` | Step 1 dashboard (`#setup-cg`) | See "the disconnected master gate" below |

Wire `SET_ENTITY_TYPE` / `SET_RESIDENCY_STATUS` from the parent wizard the
same way as the Business step.

## The disconnected master gate (a genuine quirk, faithfully kept)

The original has **two independent switches** that decide "is capital
gains relevant" and they never talk to each other:

1. **`#setup-cg`** — a dashboard checkbox on the *Financial Life Snapshot*
   step. It sets `state.capital_gains.has_capital_gains` and decides
   whether the Capital Gains step even appears in the sidebar/wizard flow.
2. **`#cg-has`** (`toggleCGSection()`) — the toggle *inside this step*.
   It only ever flips the local `div-cg-section` DOM visibility. It never
   writes to `state.capital_gains.has_capital_gains` at all.

This port keeps them exactly as disconnected: `has_capital_gains` is
injected, read-only, informational context (for a parent router to decide
whether to show this step); `cg_section_gate_open` is the step's own local
switch, with no side effect on `has_capital_gains`. This is not a bug I
introduced — it's a faithful reproduction of the source's actual wiring.

**Related quirk, also preserved:** when `cg-has` is switched off, the
original's cleanup code tries to reset four other sub-module selects by
id (`cg-buyback-has`, `cg-stocks-crypto-has`, `cg-gold-has`,
`cg-private-shares-has`) — but none of those ids exist in the current
markup (the real ones are `bb-has`, `fin-has`, `com-has`, `ul-has`), so
those four resets are silently dead code. Only the Property module (whose
id, `prop-has`, does match) actually gets reset. `TOGGLE_CG_SECTION` in
`capitalGainsMachine.js` reproduces this exactly — turning the section off
resets Property only; Buyback/Financial/Commodity/Unlisted state is left
untouched, matching the real (if accidental) original behavior.

## What's in here

| File | What it is |
|---|---|
| `deriveCapitalGains.js` | Pure, DOM-free port of all five modules' toggle/sync/dependency logic, including the **Section 50C** stamp-duty-value override for property sales, and the **buyback era-based tax-treatment computation** (pre-Oct-2024 / post-Oct-2024 deemed-dividend / capital-gains-era with LTCG/STCG classification). |
| `capitalGainsMachine.js` | The XState v5 machine. One context object per sub-module (`property`, `share_buyback`, `financial_holdings`, `commodities`, `unlisted_equity`), each holding an array of rows with factories matching the original's `add*Row()` defaults. |
| `src/CapitalGainsStep.jsx` | The React component — one row-renderer component per sub-module, plus the Broker/Wallet "Connect" placeholders (see below). |
| `src/capitalGainsStep.css` + `tailwind.config.js` | Shared brand CSS/theme. |
| `test-machine.mjs` | Smoke test — covers the 50C override, the buyback era computation, both residency-gated field sets, the exemption-option entity filter, and the disconnected-gate quirk. |

## Broker / wallet "Connect" buttons — intentionally empty (as requested)

Every broker card (Zerodha, Groww, Angel One), crypto exchange card
(Binance, Coinbase, Kraken, CoinDCX), the wallet "Sync Wallet" button, and
the CSV upload dropzone are rendered with **no-op** click handlers
(`onClick={() => {}}`). This matches the original closely: only
Zerodha/Groww/Angel One had a bare `alert('Initiating OAuth for X...')`
stub, the CSV dropzone was `alert('File upload dialog would open here.')`,
and Binance/Coinbase/Kraken/CoinDCX had **no handler of any kind** in the
source. None of this was real integration work in the original either —
it's a deliberate placeholder, ready for real OAuth/broker-API wiring
later.

## Every input, hidden and visible

Each sub-module's row schema is documented field-by-field in
`capitalGainsMachine.js`'s comments on `initialCapitalGainsContext`, and
each row factory in `deriveCapitalGains.js` (`defaultProperty()`,
`defaultBuyback()`, `defaultFinancialTx()`, `defaultCommodity()`,
`defaultUnlisted()`) carries inline comments for conditional fields. Two
notable **hidden/dead** fields, faithfully preserved:
- Property's `address` / `pincode` — rendered as inputs in the original
  markup but never read by `syncPropertyState()`. Kept in the schema for
  shape-completeness, not persisted anywhere (matching the original bug).
- Financial holdings' `isin` — always `null`; there was never a control
  for it in the original `addFinancialRow()` markup either.

## Setup

```bash
npm install xstate @xstate/react react react-dom
```

```jsx
import CapitalGainsStep from './src/CapitalGainsStep.jsx';
import './src/capitalGainsStep.css';

<CapitalGainsStep
  initialContext={{
    entity_type: currentEntityType,
    final_india_residency_status: residencyContext.ui.cert.status,
    has_capital_gains: dashboardSetupCgChecked,
  }}
  onBack={() => {/* navigate to previous step */}}
  onContinue={(context) => {/* persist property/share_buyback/financial_holdings/commodities/unlisted_equity, navigate to next step */}}
/>
```

## Verified behavior

Run against `xstate@5.32.4` in Node: Section 50C stamp-duty override,
buyback pre/post-Oct-2024/capital-gains-era classification (including LTCG
vs STCG by holding period and listed/unlisted threshold), residency-gated
Buyer TDS and FEMA fields, entity-gated exemption options, pre-2001/pre-2018
grandfathering FMV visibility, SFEA investment-income conditional field,
SGB maturity toggle, and the disconnected-master-gate reset quirk. Also
rendered via `react-dom/server` in collapsed, fully-populated (all five
modules, NR individual), and broker-tab states to confirm the JSX compiles
and every conditional block renders without throwing.
