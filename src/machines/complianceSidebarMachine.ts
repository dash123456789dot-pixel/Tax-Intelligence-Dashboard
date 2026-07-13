import { setup, assign, ActorRef } from "xstate";

export interface SidebarContext {
  residencyStatus: string; // 'ROR' | 'RNOR' | 'NR'
  residencyResult?: {
    status: string;
    path: string;
    scope: string;
  };
  taxRegime: string; // 'OLD' | 'NEW'
  entityType: string; // 'individual' | etc.
  hasInternationalAssets: boolean;
  incomeHeads: {
    salary: boolean;
    houseProperty: boolean;
    business: boolean;
    capitalGains: boolean;
    otherSources: boolean;
    [key: string]: boolean;
  };
  activeStepId: string;
  collapsedPhaseIds: string[];
  sidebarActorRef?: ActorRef<any, any> | null;
}

export type SidebarEvent =
  | { type: "STEP.SELECT"; stepId: string }
  | { type: "PHASE.TOGGLE"; phaseId: string }
  | { type: "RESIDENCY.SET"; status: string; path?: string; scope?: string }
  | { type: "TAX_REGIME.SET"; regime: string }
  | { type: "ENTITY_TYPE.SET"; value: string }
  | { type: "INTERNATIONAL.TOGGLE"; checked: boolean }
  | { type: "INCOME_HEAD.TOGGLE"; head: string; checked: boolean };

export interface StepDefinition {
  id: string;
  phaseId: string;
  label: string;
  gate?: keyof typeof GATES;
  highlight?: boolean;
}

export interface PhaseDefinition {
  id: string;
  title: string;
}

/* -------------------------------------------------------------------------
 * Declarative step catalogue — extracted 1:1 from the <aside id="sidebar-steps">
 * markup in layer1_india.html. `gate` names a key in GATES below; steps with
 * no `gate` are always visible and never locked.
 * Note: prefixed with step numbers as requested by the user.
 * ---------------------------------------------------------------------- */
export const STEP_DEFINITIONS: StepDefinition[] = [
  { id: "step-snapshot", phaseId: "phase-setup", label: "1. Financial Life Snapshot" },
  { id: "step-profile", phaseId: "phase-setup", label: "2. Residency Detection" },

  { id: "step-salary", phaseId: "phase-income", label: "3. Salary", gate: "isIndividualWithSalary" },
  { id: "step-hp", phaseId: "phase-income", label: "4. House Property", gate: "hasHouseProperty" },
  { id: "step-business", phaseId: "phase-income", label: "5. Business & Trading", gate: "hasBusiness" },
  { id: "step-cg", phaseId: "phase-income", label: "6. Capital Gains", gate: "hasCapitalGains" },
  { id: "step-os", phaseId: "phase-income", label: "7. Other Sources", gate: "hasOtherSources" },

  { id: "step-dtaa", phaseId: "phase-compliance", label: "8. Tax Treaties (DTAA)", gate: "isNR" },
  { id: "step-fa", phaseId: "phase-compliance", label: "9. Schedule FA & FSI", gate: "isResidentWithForeignAssets" },
  { id: "step-compliance", phaseId: "phase-compliance", label: "10. Compliance Docs", gate: "isNR" },
  { id: "step-bank", phaseId: "phase-compliance", label: "11. Bank Accounts" },

  { id: "step-deductions", phaseId: "phase-wrapup", label: "12. Deductions (Ch VI-A)", gate: "isOldRegime" },
  { id: "step-credits", phaseId: "phase-wrapup", label: "13. Losses & Tax Credits" },
  { id: "step-output", phaseId: "phase-wrapup", label: "14. Final Tax Output", highlight: true },
];

export const PHASE_DEFINITIONS: PhaseDefinition[] = [
  { id: "phase-setup", title: "Phase 0: Setup" },
  { id: "phase-income", title: "Phase 1: Income Heads" },
  { id: "phase-compliance", title: "Phase 2: Compliance & Assets" },
  { id: "phase-wrapup", title: "Phase 3: Wrap-Up & Taxes" },
];

/* -------------------------------------------------------------------------
 * Gate predicates — the literal conditions from syncUnlockStatus()
 * ---------------------------------------------------------------------- */
const GATES = {
  isNR: (ctx: SidebarContext) => ctx.residencyStatus === "NR",
  isResidentWithForeignAssets: (ctx: SidebarContext) =>
    (ctx.residencyStatus === "ROR" || ctx.residencyStatus === "RNOR") && ctx.hasInternationalAssets,
  isOldRegime: (ctx: SidebarContext) => ctx.taxRegime === "OLD",
  isIndividualWithSalary: (ctx: SidebarContext) => ctx.entityType === "individual" && ctx.incomeHeads.salary,
  hasHouseProperty: (ctx: SidebarContext) => ctx.incomeHeads.houseProperty,
  hasBusiness: (ctx: SidebarContext) => ctx.incomeHeads.business,
  hasCapitalGains: (ctx: SidebarContext) => ctx.incomeHeads.capitalGains,
  hasOtherSources: (ctx: SidebarContext) => ctx.incomeHeads.otherSources,
};

/** True if `stepId` should be rendered at all in the sidebar. */
export function isStepVisible(context: SidebarContext, stepId: string): boolean {
  const def = STEP_DEFINITIONS.find((s) => s.id === stepId);
  if (!def) return false;
  if (!def.gate) return true;
  return GATES[def.gate](context);
}

/** True if `stepId` can currently be navigated to (clickable). */
export function isStepUnlocked(context: SidebarContext, stepId: string): boolean {
  return isStepVisible(context, stepId);
}

export interface SidebarStepView extends StepDefinition {
  locked: boolean;
  active: boolean;
}

export interface SidebarPhaseView extends PhaseDefinition {
  collapsed: boolean;
  steps: SidebarStepView[];
}

/** Convenience: every step, with its computed visible/locked/active flags,
 * grouped by phase — this is what the React layer maps over. */
export function selectSidebarView(context: SidebarContext): SidebarPhaseView[] {
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
 * Initial context — mirrors the source file's default `state` object
 * ---------------------------------------------------------------------- */
const initialContext: SidebarContext = {
  residencyStatus: "ROR", // 'ROR' | 'RNOR' | 'NR'
  taxRegime: "NEW", // 'OLD' | 'NEW'
  entityType: "individual", // state.profile.entity_type default
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
  types: {
    context: {} as SidebarContext,
    events: {} as SidebarEvent,
  },
  guards: {
    canSelectStep: ({ context, event }) => {
      if (event.type === "STEP.SELECT") {
        return isStepUnlocked(context, event.stepId);
      }
      return false;
    },
  },
  actions: {
    selectStep: assign({
      activeStepId: ({ event }) => {
        if (event.type === "STEP.SELECT") {
          return event.stepId;
        }
        return "step-profile";
      },
    }),
    togglePhase: assign({
      collapsedPhaseIds: ({ context, event }) => {
        if (event.type === "PHASE.TOGGLE") {
          return context.collapsedPhaseIds.includes(event.phaseId)
            ? context.collapsedPhaseIds.filter((id) => id !== event.phaseId)
            : [...context.collapsedPhaseIds, event.phaseId];
        }
        return context.collapsedPhaseIds;
      },
    }),
    setResidencyStatus: assign({
      residencyStatus: ({ event }) => {
        if (event.type === "RESIDENCY.SET") {
          return event.status;
        }
        return "ROR";
      },
      residencyResult: ({ event }) => {
        if (event.type === "RESIDENCY.SET") {
          return {
            status: event.status,
            path: event.path || '',
            scope: event.scope || '',
          };
        }
        return undefined;
      },
    }),
    setTaxRegime: assign({
      taxRegime: ({ event }) => {
        if (event.type === "TAX_REGIME.SET") {
          return event.regime;
        }
        return "NEW";
      },
    }),
    setEntityType: assign({
      entityType: ({ event }) => {
        if (event.type === "ENTITY_TYPE.SET") {
          return event.value;
        }
        return "individual";
      },
    }),
    setInternational: assign({
      hasInternationalAssets: ({ event }) => {
        if (event.type === "INTERNATIONAL.TOGGLE") {
          return event.checked;
        }
        return false;
      },
    }),
    setIncomeHead: assign({
      incomeHeads: ({ context, event }) => {
        if (event.type === "INCOME_HEAD.TOGGLE") {
          console.log("complianceSidebarMachine RECEIVED INCOME_HEAD.TOGGLE:", event.head, event.checked);
          return {
            ...context.incomeHeads,
            [event.head]: event.checked,
          };
        }
        return context.incomeHeads;
      },
    }),
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
        "ENTITY_TYPE.SET": {
          actions: ["setEntityType", "redirectIfActiveStepLocked"],
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
