import { setup, assign, ActorRef } from "xstate";

export interface FinancialSnapshotContext {
  entityType: string;
  pan: string;
  taxRegime: string;
  panAadhaarLinked: boolean;
  corporate: {
    turnoverLte400Cr: boolean;
    opt115BAA: boolean;
    opt115BAB: boolean;
    opt115BA: boolean;
    mfgSetupDate: string;
    mfgCommenceDate: string;
    matBookProfit: string | null;
  };
  incomeHeads: {
    salary: boolean;
    houseProperty: boolean;
    business: boolean;
    capitalGains: boolean;
    otherSources: boolean;
    [key: string]: boolean;
  };
  hasInternationalAssets: boolean;
  residencyStatus: string;
  sidebarActorRef: ActorRef<any, any> | null;
}

export type FinancialSnapshotEvent =
  | { type: "ENTITY_TYPE.SET"; value: string }
  | { type: "PAN.SET"; value: string }
  | { type: "TAX_REGIME.SET"; value: string }
  | { type: "AADHAAR_LINKED.TOGGLE"; checked: boolean }
  | { type: "CORP.TURNOVER_400.TOGGLE"; checked: boolean }
  | { type: "CORP.OPT_115BAA.TOGGLE"; checked: boolean }
  | { type: "CORP.OPT_115BAB.TOGGLE"; checked: boolean }
  | { type: "CORP.OPT_115BA.TOGGLE"; checked: boolean }
  | { type: "CORP.MFG_SETUP_DATE.SET"; value: string }
  | { type: "CORP.MFG_COMMENCE_DATE.SET"; value: string }
  | { type: "CORP.MAT_PROFIT.SET"; value: string | null }
  | { type: "INCOME_HEAD.TOGGLE"; head: string; checked: boolean }
  | { type: "INTERNATIONAL.TOGGLE"; checked: boolean }
  | { type: "RESIDENCY_STATUS.SYNC"; status: string };

const FORCES_OLD_REGIME = ["firm", "llp", "company", "trust", "local"];
const PRESUMPTIVE_44AD_INELIGIBLE = ["llp", "company", "aop", "trust", "local", "coop", "ajp"];
const CORP_REGIME_KEYS = ["turnoverLte400Cr", "opt115BAA", "opt115BAB", "opt115BA"] as const;
const CORP_EVENT_TO_KEY = {
  "CORP.TURNOVER_400.TOGGLE": "turnoverLte400Cr",
  "CORP.OPT_115BAA.TOGGLE": "opt115BAA",
  "CORP.OPT_115BAB.TOGGLE": "opt115BAB",
  "CORP.OPT_115BA.TOGGLE": "opt115BA",
} as const;

type CorpRegimeKey = typeof CORP_REGIME_KEYS[number];

export function isIndividual(ctx: FinancialSnapshotContext) {
  return ctx.entityType === "individual";
}
export function isCompany(ctx: FinancialSnapshotContext) {
  return ctx.entityType === "company";
}
export function forcesOldRegime(ctx: FinancialSnapshotContext) {
  return FORCES_OLD_REGIME.includes(ctx.entityType);
}
export function isDomesticCompany(ctx: FinancialSnapshotContext) {
  return isCompany(ctx) && ctx.residencyStatus === "ROR";
}
export function showsCorporateBlock(ctx: FinancialSnapshotContext) {
  return isDomesticCompany(ctx);
}
export function showsMatProfitField(ctx: FinancialSnapshotContext) {
  return isCompany(ctx) && !ctx.corporate.opt115BAA;
}
export function showsManufacturingWarning(ctx: FinancialSnapshotContext) {
  return ctx.corporate.opt115BAB || ctx.corporate.opt115BA;
}
export function showsMfgDatesBlock(ctx: FinancialSnapshotContext) {
  return ctx.corporate.opt115BAB || ctx.corporate.opt115BA;
}
export function showsMfgCommenceDateField(ctx: FinancialSnapshotContext) {
  return !!ctx.corporate.opt115BAB;
}
export function visibleCorporateRegimeRows(ctx: FinancialSnapshotContext): CorpRegimeKey[] {
  const anySelected = CORP_REGIME_KEYS.some((k) => ctx.corporate[k]);
  return CORP_REGIME_KEYS.filter((k) => !anySelected || ctx.corporate[k]);
}
export function showsPresumptiveWarning(ctx: FinancialSnapshotContext) {
  if (ctx.residencyStatus !== "ROR") return false;
  const eligible44AD = !PRESUMPTIVE_44AD_INELIGIBLE.includes(ctx.entityType);
  const eligible44ADA = eligible44AD && ctx.entityType !== "huf";
  return !eligible44AD || !eligible44ADA;
}
export function presumptiveWarningText(ctx: FinancialSnapshotContext) {
  const eligible44AD = !PRESUMPTIVE_44AD_INELIGIBLE.includes(ctx.entityType);
  if (!eligible44AD) {
    return "Companies, LLPs, AOPs, Trusts, Local Authorities, and Co-ops are NOT eligible for Presumptive Taxation Scheme (Eligible Business)/ADA. (However, Presumptive Taxation Scheme (Transporters) for Goods Transport remains available).";
  }
  return "HUFs are eligible for Presumptive Taxation Scheme (Eligible Business) (Business), but NOT eligible for Presumptive Taxation Scheme (Professionals) (Profession).";
}

const initialContext: Omit<FinancialSnapshotContext, "sidebarActorRef"> = {
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
  residencyStatus: "ROR",
};

function applyCorpMutualExclusivity(corporate: FinancialSnapshotContext["corporate"], justSetKey: CorpRegimeKey) {
  const next = { ...corporate };
  if (next[justSetKey]) {
    CORP_REGIME_KEYS.forEach((k) => {
      if (k !== justSetKey) next[k] = false;
    });
  }
  if (next.opt115BAA) next.matBookProfit = null;
  if (!next.opt115BAB && !next.opt115BA) {
    next.mfgSetupDate = "";
    next.mfgCommenceDate = "";
  }
  if (!next.opt115BAB) next.mfgCommenceDate = "";
  return next;
}

export const financialSnapshotMachine = setup({
  types: {
    context: {} as FinancialSnapshotContext,
    events: {} as FinancialSnapshotEvent,
  },
  actions: {
    setEntityType: assign({
      entityType: ({ event }) => {
        if (event.type === "ENTITY_TYPE.SET") {
          return event.value;
        }
        return "individual";
      },
      taxRegime: ({ context, event }) => {
        if (event.type === "ENTITY_TYPE.SET") {
          return FORCES_OLD_REGIME.includes(event.value) ? "OLD" : context.taxRegime;
        }
        return context.taxRegime;
      },
    }),
    setPan: assign({
      pan: ({ event }) => {
        if (event.type === "PAN.SET") {
          return event.value.toUpperCase();
        }
        return "";
      },
    }),
    setTaxRegime: assign({
      taxRegime: ({ context, event }) => {
        if (event.type === "TAX_REGIME.SET") {
          return forcesOldRegime(context) ? context.taxRegime : event.value;
        }
        return context.taxRegime;
      },
    }),
    toggleAadhaarLinked: assign({
      panAadhaarLinked: ({ event }) => {
        if (event.type === "AADHAAR_LINKED.TOGGLE") {
          return event.checked;
        }
        return true;
      },
    }),
    setCorpField: assign({
      corporate: ({ context, event }) => {
        if (
          event.type === "CORP.TURNOVER_400.TOGGLE" ||
          event.type === "CORP.OPT_115BAA.TOGGLE" ||
          event.type === "CORP.OPT_115BAB.TOGGLE" ||
          event.type === "CORP.OPT_115BA.TOGGLE"
        ) {
          const key = CORP_EVENT_TO_KEY[event.type];
          return applyCorpMutualExclusivity({ ...context.corporate, [key]: event.checked }, key);
        }
        return context.corporate;
      },
    }),
    setMfgSetupDate: assign({
      corporate: ({ context, event }) => {
        if (event.type === "CORP.MFG_SETUP_DATE.SET") {
          return { ...context.corporate, mfgSetupDate: event.value };
        }
        return context.corporate;
      },
    }),
    setMfgCommenceDate: assign({
      corporate: ({ context, event }) => {
        if (event.type === "CORP.MFG_COMMENCE_DATE.SET") {
          return { ...context.corporate, mfgCommenceDate: event.value };
        }
        return context.corporate;
      },
    }),
    setMatProfit: assign({
      corporate: ({ context, event }) => {
        if (event.type === "CORP.MAT_PROFIT.SET") {
          return { ...context.corporate, matBookProfit: event.value };
        }
        return context.corporate;
      },
    }),
    setIncomeHead: assign({
      incomeHeads: ({ context, event }) => {
        if (event.type === "INCOME_HEAD.TOGGLE") {
          return { ...context.incomeHeads, [event.head]: event.checked };
        }
        return context.incomeHeads;
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
    syncResidencyStatus: assign({
      residencyStatus: ({ event }) => {
        if (event.type === "RESIDENCY_STATUS.SYNC") {
          return event.status;
        }
        return "ROR";
      },
    }),

    forwardEntityType: ({ context, event }) => {
      if (event.type === "ENTITY_TYPE.SET") {
        context.sidebarActorRef?.send({ type: "ENTITY_TYPE.SET", value: event.value });
      }
    },
    forwardTaxRegime: ({ context }) => {
      context.sidebarActorRef?.send({ type: "TAX_REGIME.SET", regime: context.taxRegime });
    },
    forwardIncomeHead: ({ context, event }) => {
      if (event.type === "INCOME_HEAD.TOGGLE") {
        console.log("FORWARDING INCOME_HEAD.TOGGLE:", event.head, event.checked, "to sidebar:", !!context.sidebarActorRef);
        context.sidebarActorRef?.send({ type: "INCOME_HEAD.TOGGLE", head: event.head, checked: event.checked });
      }
    },
    forwardInternational: ({ context, event }) => {
      if (event.type === "INTERNATIONAL.TOGGLE") {
        context.sidebarActorRef?.send({ type: "INTERNATIONAL.TOGGLE", checked: event.checked });
      }
    },
  },
}).createMachine({
  id: "financialSnapshot",
  context: ({ input }) => {
    console.log("financialSnapshotMachine INITIALIZING CONTEXT WITH INPUT:", input);
    return {
      ...initialContext,
      sidebarActorRef: (input as any)?.sidebarActorRef ?? null,
    };
  },
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
