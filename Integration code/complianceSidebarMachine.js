/**
 * =============================================================================
 * ANTIGRAVITY BUILD PROMPT — paste this whole comment as the task prompt
 * =============================================================================
 * GOAL
 *   Implement `complianceSidebarMachine.js`: an XState v5 state machine that
 *   is the single source of truth for which "Compliance Steps" sidebar items
 *   in the Layer 1 India wizard are VISIBLE, LOCKED, and ACTIVE.
 *
 * SOURCE OF TRUTH (do not diverge from this without flagging it)
 *   Reverse-engineered from imperative DOM logic in layer1_india.html:
 *     - switchStep(stepId)            — guarded step navigation
 *     - syncUnlockStatus()            — the lock/unlock + visibility rules
 *     - updateSidebarVisibility()     — Phase 1 income-head show/hide rules
 *     - toggleSidebarGroup(groupId)   — accordion collapse/expand
 *   The exact gating rules extracted from that file are:
 *     - step-dtaa & step-compliance  -> visible+unlocked only when
 *       residencyStatus === 'NR'
 *     - step-fa                      -> visible+unlocked only when
 *       (residencyStatus === 'ROR' || residencyStatus === 'RNOR') AND the
 *       "international assets/income" checkbox is checked
 *     - step-deductions              -> visible+unlocked only when
 *       taxRegime === 'OLD'
 *     - step-salary/hp/business/cg/os -> visible only when the matching
 *       Financial Snapshot checkbox is checked (never independently locked)
 *     - all other steps (snapshot, profile, bank, credits, output) are
 *       always visible and never locked
 *   Defaults come from the source file's initial state object:
 *     residencyStatus: 'ROR', taxRegime: 'NEW', hasInternationalAssets: false,
 *     all income-head flags: false.
 *
 * REQUIREMENTS
 *   1. Pure, declarative gating table (STEP_DEFINITIONS + GATES) — no step's
 *      visibility/lock rule may be hardcoded into JSX or scattered across
 *      handlers. Adding/removing a step is a one-line data change.
 *   2. `isStepVisible`/`isStepUnlocked` must be pure functions of context so
 *      the sidebar never needs a manual "resync" call (the source file's
 *      syncUnlockStatus() had to be re-invoked by hand after every relevant
 *      change — that staleness bug is NOT to be reproduced here).
 *   3. Selecting a step is a GUARDED transition ("STEP.SELECT" + `canSelectStep`
 *      guard) — mirrors `if (!unlockedSteps.has(stepId)) return;` in the
 *      source's switchStep().
 *   4. When a context change causes the CURRENTLY ACTIVE step to become
 *      locked/hidden, the machine must redirect `activeStepId` back to
 *      'step-profile' — mirrors `if (currentStepId === step) switchStep('step-profile')`.
 *   5. No DOM access anywhere in this file (no `document.*`). This machine
 *      must be host-agnostic so the same file can drive a React, Vue, or
 *      vanilla UI.
 *
 * NON-GOALS
 *   - Do not implement the rest of the tax wizard's business logic here —
 *     only sidebar step visibility/lock/active/collapse state.
 *   - Do not persist state to localStorage/URL — that's the host app's job.
 *
 * ACCEPTANCE CRITERIA
 *   - Sending RESIDENCY.SET with status: 'NR' makes step-dtaa and
 *     step-compliance visible+selectable, and sets residencyStatus in context.
 *   - Sending RESIDENCY.SET with status: 'ROR' while step-compliance is
 *     active moves activeStepId back to 'step-profile'.
 *   - Sending INCOME_HEAD.TOGGLE { head: 'salary', checked: true } makes
 *     step-salary visible without affecting any other step.
 *   - Sending STEP.SELECT for a locked/hidden step is a no-op.
 * =============================================================================
 */

import { setup, assign } from "xstate";

/* -------------------------------------------------------------------------
 * Declarative step catalogue — extracted 1:1 from the <aside id="sidebar-steps">
 * markup in layer1_india.html. `gate` names a key in GATES below; steps with
 * no `gate` are always visible and never locked (the source file's default
 * "isAllowed = true / label = 'Active'" branch in syncUnlockStatus()).
 * ---------------------------------------------------------------------- */
export const STEP_DEFINITIONS = [
  { id: "step-snapshot", phaseId: "phase-setup", label: "Financial Life Snapshot" },
  { id: "step-profile", phaseId: "phase-setup", label: "Residency Detection" },

  { id: "step-salary", phaseId: "phase-income", label: "Salary", gate: "hasSalary" },
  { id: "step-hp", phaseId: "phase-income", label: "House Property", gate: "hasHouseProperty" },
  { id: "step-business", phaseId: "phase-income", label: "Business & Trading", gate: "hasBusiness" },
  { id: "step-cg", phaseId: "phase-income", label: "Capital Gains", gate: "hasCapitalGains" },
  { id: "step-os", phaseId: "phase-income", label: "Other Sources", gate: "hasOtherSources" },

  { id: "step-dtaa", phaseId: "phase-compliance", label: "Tax Treaties (DTAA)", gate: "isNR" },
  { id: "step-fa", phaseId: "phase-compliance", label: "Schedule FA & FSI", gate: "isResidentWithForeignAssets" },
  { id: "step-compliance", phaseId: "phase-compliance", label: "Compliance Docs", gate: "isNR" },
  { id: "step-bank", phaseId: "phase-compliance", label: "Bank Accounts" },

  { id: "step-deductions", phaseId: "phase-wrapup", label: "Deductions (Ch VI-A)", gate: "isOldRegime" },
  { id: "step-credits", phaseId: "phase-wrapup", label: "Losses & Tax Credits" },
  { id: "step-output", phaseId: "phase-wrapup", label: "Final Tax Output", highlight: true },
];

export const PHASE_DEFINITIONS = [
  { id: "phase-setup", title: "Phase 0: Setup" },
  { id: "phase-income", title: "Phase 1: Income Heads" },
  { id: "phase-compliance", title: "Phase 2: Compliance & Assets" },
  { id: "phase-wrapup", title: "Phase 3: Wrap-Up & Taxes" },
];

/* -------------------------------------------------------------------------
 * Gate predicates — the literal conditions from syncUnlockStatus():
 *   isAllowed = (lock === 'NR')                                   // dtaa & compliance
 *   isAllowed = (lock === 'ROR' || lock === 'RNOR') && isIntlChecked // fa
 *   isAllowed = (state.profile.tax_regime === 'OLD')              // deductions
 * plus updateSidebarVisibility()'s per-checkbox income-head toggles.
 * ---------------------------------------------------------------------- */
const GATES = {
  isNR: (ctx) => ctx.residencyStatus === "NR",
  isResidentWithForeignAssets: (ctx) =>
    (ctx.residencyStatus === "ROR" || ctx.residencyStatus === "RNOR") && ctx.hasInternationalAssets,
  isOldRegime: (ctx) => ctx.taxRegime === "OLD",
  hasSalary: (ctx) => ctx.incomeHeads.salary,
  hasHouseProperty: (ctx) => ctx.incomeHeads.houseProperty,
  hasBusiness: (ctx) => ctx.incomeHeads.business,
  hasCapitalGains: (ctx) => ctx.incomeHeads.capitalGains,
  hasOtherSources: (ctx) => ctx.incomeHeads.otherSources,
};

/** True if `stepId` should be rendered at all in the sidebar. */
export function isStepVisible(context, stepId) {
  const def = STEP_DEFINITIONS.find((s) => s.id === stepId);
  if (!def) return false;
  if (!def.gate) return true;
  return GATES[def.gate](context);
}

/** True if `stepId` can currently be navigated to (clickable). In the
 * source file, gated steps use the same boolean for both "hidden" and
 * "locked" — a hidden step is never independently clickable either. */
export function isStepUnlocked(context, stepId) {
  return isStepVisible(context, stepId);
}

/** Convenience: every step, with its computed visible/locked/active flags,
 * grouped by phase — this is what the React layer maps over. */
export function selectSidebarView(context) {
  return PHASE_DEFINITIONS.map((phase) => ({
    ...phase,
    collapsed: context.collapsedPhaseIds.includes(phase.id),
    steps: STEP_DEFINITIONS.filter((s) => s.phaseId === phase.id && isStepVisible(context, s.id)).map((s) => ({
      ...s,
      locked: !isStepUnlocked(context, s.id),
      active: s.id === context.activeStepId,
    })),
  })).filter((phase) => phase.steps.length > 0);
}

/* -------------------------------------------------------------------------
 * Initial context — mirrors the source file's default `state` object:
 *   final_india_residency_status: 'ROR', tax_regime: 'NEW',
 *   #setup-international unchecked, all income-head checkboxes unchecked.
 * activeStepId defaults to 'step-snapshot' (the step actually rendered
 * active in the markup) rather than the source's `currentStepId = 'step-profile'`
 * variable, which never matched the real default-visible panel.
 * ---------------------------------------------------------------------- */
const initialContext = {
  residencyStatus: "ROR", // 'ROR' | 'RNOR' | 'NR'
  taxRegime: "NEW", // 'OLD' | 'NEW'
  hasInternationalAssets: false,
  incomeHeads: {
    salary: false,
    houseProperty: false,
    business: false,
    capitalGains: false,
    otherSources: false,
  },
  activeStepId: "step-snapshot",
  collapsedPhaseIds: [],
};

export const complianceSidebarMachine = setup({
  types: {},
  guards: {
    // mirrors: if (!unlockedSteps.has(stepId)) return;
    canSelectStep: ({ context, event }) => isStepUnlocked(context, event.stepId),
  },
  actions: {
    selectStep: assign({
      activeStepId: ({ event }) => event.stepId,
    }),
    togglePhase: assign({
      collapsedPhaseIds: ({ context, event }) =>
        context.collapsedPhaseIds.includes(event.phaseId)
          ? context.collapsedPhaseIds.filter((id) => id !== event.phaseId)
          : [...context.collapsedPhaseIds, event.phaseId],
    }),
    setResidencyStatus: assign({
      residencyStatus: ({ event }) => event.status,
    }),
    setTaxRegime: assign({
      taxRegime: ({ event }) => event.regime,
    }),
    setInternational: assign({
      hasInternationalAssets: ({ event }) => event.checked,
    }),
    setIncomeHead: assign({
      incomeHeads: ({ context, event }) => ({
        ...context.incomeHeads,
        [event.head]: event.checked,
      }),
    }),
    // mirrors: if (currentStepId === step) switchStep('step-profile');
    redirectIfActiveStepLocked: assign({
      activeStepId: ({ context }) =>
        isStepUnlocked(context, context.activeStepId) ? context.activeStepId : "step-profile",
    }),
  },
}).createMachine({
  id: "complianceSidebar",
  context: initialContext,
  initial: "ready",
  states: {
    ready: {
      on: {
        "STEP.SELECT": {
          guard: "canSelectStep",
          actions: "selectStep",
        },
        "PHASE.TOGGLE": {
          actions: "togglePhase",
        },
        "RESIDENCY.SET": {
          actions: ["setResidencyStatus", "redirectIfActiveStepLocked"],
        },
        "TAX_REGIME.SET": {
          actions: ["setTaxRegime", "redirectIfActiveStepLocked"],
        },
        "INTERNATIONAL.TOGGLE": {
          actions: ["setInternational", "redirectIfActiveStepLocked"],
        },
        "INCOME_HEAD.TOGGLE": {
          actions: "setIncomeHead",
        },
      },
    },
  },
});

export default complianceSidebarMachine;
