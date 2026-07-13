/**
 * =============================================================================
 * ANTIGRAVITY BUILD PROMPT — paste this whole comment as the task prompt
 * =============================================================================
 * GOAL
 *   Implement `financialSnapshotMachine.js`: an XState v5 machine modeling
 *   every input on the "Financial Life Snapshot" step (Step 1) of the Layer 1
 *   India wizard (layer1_india.html, <div id="panel-step-snapshot">), AND
 *   forward every sidebar-relevant change to the existing
 *   complianceSidebarMachine.js so the "Compliance Steps" panel shows/hides
 *   and locks/unlocks itself live, with zero manual glue code in React.
 *
 * SOURCE OF TRUTH — extracted line-for-line from layer1_india.html
 *   Form fields (element id -> JS handler -> state.profile field):
 *     #biz-entity-type      -> updateBizEntityType(val)     -> entity_type
 *     #prof-pan             -> updateProfileField('pan', ...)
 *     #prof-regime          -> updateProfileField('tax_regime', ...)
 *     #prof-aadhaar-linked  -> updateProfileField('pan_aadhaar_linked', ...)
 *     #prof-turnover-400    -> updateProfileField('turnover_lte_400cr', ...)
 *     #prof-opt-115baa      -> updateProfileField('opt_115baa', ...)
 *     #prof-opt-115bab      -> updateProfileField('opt_115bab', ...)
 *     #prof-opt-115ba       -> updateProfileField('opt_115ba', ...)
 *     #prof-mfg-setup-date  -> updateProfileField('mfg_setup_date', ...)
 *     #prof-mfg-commence-date -> updateProfileField('mfg_commence_date', ...)
 *     #prof-mat-profit      -> updateProfileField('mat_book_profit', ...)
 *     #setup-salary/#setup-hp/#setup-business/#setup-cg/#setup-os/
 *       #setup-international -> toggleSetupCard(id) -> updateSidebarVisibility()
 *
 *   Derived UI-morphing rules (all pure functions of context, exported below):
 *     - forcesOldRegime: entityType in {firm, llp, company, trust, local}
 *       -> hides the Tax Regime dropdown (#div-prof-regime) and forces
 *       taxRegime = 'OLD'.                             [updateBizEntityType]
 *     - showsCorporateBlock: entityType === 'company' AND
 *       residencyStatus === 'ROR' (isDomesticCompany).  [updateBizEntityType]
 *     - showsMatProfitField: entityType === 'company' AND NOT opt115BAA.
 *       (115BAA is a flat-rate regime that is MAT-exempt.)
 *                                          [updateBizEntityType + sync115BAAToggles]
 *     - The 4 corporate regimes (turnover<=400cr, 115BAA, 115BAB, 115BA) are
 *       MUTUALLY EXCLUSIVE: selecting one clears the other three.
 *                                          [updateProfileField's corpRegimes block]
 *     - Regime row visibility: if none of the 4 is selected, show all 4 rows;
 *       once one is selected, show ONLY that row.       [syncCorporateRegimesVisibility]
 *     - showsManufacturingWarning / showsMfgDatesBlock: opt115BAB OR opt115BA.
 *     - showsMfgCommenceDateField: opt115BAB only (not opt115BA).
 *                                          [syncCorporateRegimesVisibility]
 *     - showsPresumptiveWarning: residencyStatus === 'ROR' AND entityType is
 *       NOT eligible for presumptive taxation (llp/company/aop/trust/local/
 *       coop/ajp) OR (entityType === 'huf', which is eligible for 44AD but
 *       not 44ADA).                        [validateEntityPresumptiveEligibility]
 *     - Sidebar-relevant fields (forwarded via sendTo to the sidebar actor,
 *       see `input.sidebarActorRef`):
 *         entityType        -> "ENTITY_TYPE.SET"   (gates step-salary)
 *         taxRegime          -> "TAX_REGIME.SET"    (gates step-deductions)
 *         incomeHeads.*       -> "INCOME_HEAD.TOGGLE" (Phase 1 step visibility)
 *         hasInternationalAssets -> "INTERNATIONAL.TOGGLE" (gates step-fa)
 *
 * REQUIREMENTS
 *   1. One event per input, named after the field (e.g. "ENTITY_TYPE.SET",
 *      "PAN.SET", "AADHAAR_LINKED.TOGGLE", "CORP.OPT_115BAA.TOGGLE", ...).
 *   2. This machine owns ONLY Step 1's own fields. `residencyStatus` is
 *      read-only here (Step 2's concern) — accept it via a "RESIDENCY_STATUS.SYNC"
 *      inbound event so Step 1 can compute isDomesticCompany/presumptive
 *      warnings without owning that field.
 *   3. Every sidebar-relevant transition must `sendTo` the shared sidebar
 *      actor (passed in via `input.sidebarActorRef` at machine start) —
 *      the React layer must NEVER manually re-derive or forward these;
 *      that forwarding lives here, in the machine.
 *   4. No DOM access anywhere in this file.
 *
 * NON-GOALS
 *   - Section 8 company toggle, Angel Tax, LIC maturity, minor-child income,
 *     gifts, spousal clubbing, local-authority exemptions, 80IAC — all real
 *     side effects of updateBizEntityType() in the source file, but they
 *     belong to OTHER steps' panels (Other Sources, Deductions, Business),
 *     not to the Financial Life Snapshot form itself. Do not add them here.
 *
 * ACCEPTANCE CRITERIA
 *   - Checking "Salary" (INCOME_HEAD.TOGGLE salary=true) while entityType is
 *     'individual' makes the sidebar's step-salary appear; switching
 *     entityType to 'company' hides it again, even with the checkbox still
 *     checked (both conditions are required, exactly as in the source).
 *   - Setting entityType to 'firm' forces taxRegime to 'OLD' and the sidebar's
 *     step-deductions becomes visible, with no separate TAX_REGIME.SET call
 *     needed from React.
 *   - Checking CORP.OPT_115BAA hides the MAT profit field and unchecks any
 *     other corporate regime checkbox that was previously checked.
 *   - Checking CORP.OPT_115BAB shows the manufacturing warning, the mfg
 *     dates block, AND the commence-date sub-field; CORP.OPT_115BA shows
 *     the warning and dates block but NOT the commence-date sub-field.
 * =============================================================================
 */

import { setup, assign } from "xstate";

/* -------------------------------------------------------------------------
 * Entity-type driven rule tables — copied verbatim from updateBizEntityType()
 * and validateEntityPresumptiveEligibility().
 * ---------------------------------------------------------------------- */
const FORCES_OLD_REGIME = ["firm", "llp", "company", "trust", "local"];
const PRESUMPTIVE_44AD_INELIGIBLE = ["llp", "company", "aop", "trust", "local", "coop", "ajp"];
const CORP_REGIME_KEYS = ["turnoverLte400Cr", "opt115BAA", "opt115BAB", "opt115BA"];
const CORP_EVENT_TO_KEY = {
  "CORP.TURNOVER_400.TOGGLE": "turnoverLte400Cr",
  "CORP.OPT_115BAA.TOGGLE": "opt115BAA",
  "CORP.OPT_115BAB.TOGGLE": "opt115BAB",
  "CORP.OPT_115BA.TOGGLE": "opt115BA",
};

export function isIndividual(ctx) {
  return ctx.entityType === "individual";
}
export function isCompany(ctx) {
  return ctx.entityType === "company";
}
export function forcesOldRegime(ctx) {
  return FORCES_OLD_REGIME.includes(ctx.entityType);
}
export function isDomesticCompany(ctx) {
  return isCompany(ctx) && ctx.residencyStatus === "ROR";
}
export function showsCorporateBlock(ctx) {
  return isDomesticCompany(ctx);
}
export function showsMatProfitField(ctx) {
  return isCompany(ctx) && !ctx.corporate.opt115BAA;
}
export function showsManufacturingWarning(ctx) {
  return ctx.corporate.opt115BAB || ctx.corporate.opt115BA;
}
export function showsMfgDatesBlock(ctx) {
  return ctx.corporate.opt115BAB || ctx.corporate.opt115BA;
}
export function showsMfgCommenceDateField(ctx) {
  return ctx.corporate.opt115BAB;
}
/** Which of the 4 mutually-exclusive corporate regime rows should render.
 * Source rule: if none selected, show all 4; once one is selected, show
 * only that one (syncCorporateRegimesVisibility's `!anySelected || isX`). */
export function visibleCorporateRegimeRows(ctx) {
  const anySelected = CORP_REGIME_KEYS.some((k) => ctx.corporate[k]);
  return CORP_REGIME_KEYS.filter((k) => !anySelected || ctx.corporate[k]);
}
export function showsPresumptiveWarning(ctx) {
  if (ctx.residencyStatus !== "ROR") return false;
  const eligible44AD = !PRESUMPTIVE_44AD_INELIGIBLE.includes(ctx.entityType);
  const eligible44ADA = eligible44AD && ctx.entityType !== "huf";
  return !eligible44AD || !eligible44ADA;
}
export function presumptiveWarningText(ctx) {
  const eligible44AD = !PRESUMPTIVE_44AD_INELIGIBLE.includes(ctx.entityType);
  if (!eligible44AD) {
    return "Companies, LLPs, AOPs, Trusts, Local Authorities, and Co-ops are NOT eligible for Presumptive Taxation Scheme (Eligible Business)/ADA. (However, Presumptive Taxation Scheme (Transporters) for Goods Transport remains available).";
  }
  return "HUFs are eligible for Presumptive Taxation Scheme (Eligible Business) (Business), but NOT eligible for Presumptive Taxation Scheme (Professionals) (Profession).";
}

const initialContext = {
  entityType: "individual",
  pan: "",
  taxRegime: "NEW",
  panAadhaarLinked: true,
  corporate: {
    turnoverLte400Cr: false,
    opt115BAA: false,
    opt115BAB: false,
    opt115BA: false,
    mfgSetupDate: "",
    mfgCommenceDate: "",
    matBookProfit: null,
  },
  incomeHeads: {
    salary: false,
    houseProperty: false,
    business: false,
    capitalGains: false,
    otherSources: false,
  },
  hasInternationalAssets: false,
  // Read-only mirror of Step 2's output; only used to compute
  // isDomesticCompany / presumptive-eligibility warnings locally.
  residencyStatus: "ROR",
};

/** Clears the other 3 corporate-regime checkboxes when one is turned on —
 * mirrors updateProfileField()'s `corpRegimes.forEach(reg => ... false)`. */
function applyCorpMutualExclusivity(corporate, justSetKey) {
  const next = { ...corporate };
  if (next[justSetKey]) {
    CORP_REGIME_KEYS.forEach((k) => {
      if (k !== justSetKey) next[k] = false;
    });
  }
  // MAT is meaningless once 115BAA (flat-rate, MAT-exempt) is chosen — this
  // clearing IS in the source (sync115BAAToggles nulls mat_book_profit).
  if (next.opt115BAA) next.matBookProfit = null;
  // NOTE — intentional deviation, not in the source: layer1_india.html never
  // clears #prof-mfg-setup-date/#prof-mfg-commence-date when their block is
  // hidden again, so a value entered under 115BAB can silently linger after
  // switching to 115BA. We clear it here to avoid submitting a stale hidden
  // date. Remove this block if byte-for-byte source parity is required.
  if (!next.opt115BAB && !next.opt115BA) {
    next.mfgSetupDate = "";
    next.mfgCommenceDate = "";
  }
  if (!next.opt115BAB) next.mfgCommenceDate = "";
  return next;
}

export const financialSnapshotMachine = setup({
  types: {},
  actions: {
    setEntityType: assign({
      entityType: ({ event }) => event.value,
      // source: forceOldRegime -> state.profile.tax_regime = 'OLD'
      taxRegime: ({ context, event }) => (FORCES_OLD_REGIME.includes(event.value) ? "OLD" : context.taxRegime),
    }),
    setPan: assign({ pan: ({ event }) => event.value.toUpperCase() }),
    setTaxRegime: assign({
      // source: the <select> is hidden (and therefore un-editable) once
      // forceOldRegime is true — this guard is the machine-level equivalent.
      taxRegime: ({ context, event }) => (forcesOldRegime(context) ? context.taxRegime : event.value),
    }),
    toggleAadhaarLinked: assign({ panAadhaarLinked: ({ event }) => event.checked }),
    setCorpField: assign({
      corporate: ({ context, event }) => {
        const key = CORP_EVENT_TO_KEY[event.type];
        return applyCorpMutualExclusivity({ ...context.corporate, [key]: event.checked }, key);
      },
    }),
    setMfgSetupDate: assign({
      corporate: ({ context, event }) => ({ ...context.corporate, mfgSetupDate: event.value }),
    }),
    setMfgCommenceDate: assign({
      corporate: ({ context, event }) => ({ ...context.corporate, mfgCommenceDate: event.value }),
    }),
    setMatProfit: assign({
      corporate: ({ context, event }) => ({ ...context.corporate, matBookProfit: event.value }),
    }),
    setIncomeHead: assign({
      incomeHeads: ({ context, event }) => ({ ...context.incomeHeads, [event.head]: event.checked }),
    }),
    setInternational: assign({ hasInternationalAssets: ({ event }) => event.checked }),
    syncResidencyStatus: assign({ residencyStatus: ({ event }) => event.status }),

    // ---- Forwarding actions: keep complianceSidebarMachine in lockstep ----
    // Plain (non-assign) action functions, optional-chained so this machine
    // also runs standalone — e.g. in isolation/unit tests — without a
    // sidebarActorRef, instead of throwing on send-to-null.
    forwardEntityType: ({ context, event }) => {
      context.sidebarActorRef?.send({ type: "ENTITY_TYPE.SET", value: event.value });
    },
    forwardTaxRegime: ({ context }) => {
      context.sidebarActorRef?.send({ type: "TAX_REGIME.SET", regime: context.taxRegime });
    },
    forwardIncomeHead: ({ context, event }) => {
      context.sidebarActorRef?.send({ type: "INCOME_HEAD.TOGGLE", head: event.head, checked: event.checked });
    },
    forwardInternational: ({ context, event }) => {
      context.sidebarActorRef?.send({ type: "INTERNATIONAL.TOGGLE", checked: event.checked });
    },
  },
}).createMachine({
  id: "financialSnapshot",
  context: ({ input }) => ({
    ...initialContext,
    // The already-started complianceSidebarMachine actor this form drives.
    // Passed in at useMachine(financialSnapshotMachine, { input: { sidebarActorRef } }).
    sidebarActorRef: input?.sidebarActorRef ?? null,
  }),
  initial: "editing",
  states: {
    editing: {
      on: {
        "ENTITY_TYPE.SET": {
          actions: ["setEntityType", "forwardEntityType", "forwardTaxRegime"],
        },
        "PAN.SET": { actions: "setPan" },
        "TAX_REGIME.SET": { actions: ["setTaxRegime", "forwardTaxRegime"] },
        "AADHAAR_LINKED.TOGGLE": { actions: "toggleAadhaarLinked" },

        "CORP.TURNOVER_400.TOGGLE": { actions: "setCorpField" },
        "CORP.OPT_115BAA.TOGGLE": { actions: "setCorpField" },
        "CORP.OPT_115BAB.TOGGLE": { actions: "setCorpField" },
        "CORP.OPT_115BA.TOGGLE": { actions: "setCorpField" },
        "CORP.MFG_SETUP_DATE.SET": { actions: "setMfgSetupDate" },
        "CORP.MFG_COMMENCE_DATE.SET": { actions: "setMfgCommenceDate" },
        "CORP.MAT_PROFIT.SET": { actions: "setMatProfit" },

        "INCOME_HEAD.TOGGLE": { actions: ["setIncomeHead", "forwardIncomeHead"] },
        "INTERNATIONAL.TOGGLE": { actions: ["setInternational", "forwardInternational"] },

        "RESIDENCY_STATUS.SYNC": { actions: "syncResidencyStatus" },
      },
    },
  },
});

export default financialSnapshotMachine;
