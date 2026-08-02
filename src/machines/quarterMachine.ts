import { setup, assign } from 'xstate';

export type QuarterType = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'ANNUAL';

export interface QuarterData {
  salary?: any;
  business?: any;
  hp?: any;
  cg?: any;
  os?: any;
  fa?: any;
  deductions?: any;
  credits?: any;
  residency?: any;
  dtaa?: any;
  compliance?: any;
  bank?: any;
}

export interface QuarterContext {
  activeQuarter: QuarterType;
  quarters: {
    Q1: QuarterData;
    Q2: QuarterData;
    Q3: QuarterData;
    Q4: QuarterData;
  };
}

export type QuarterEvent =
  | { type: 'QUARTER.SWITCH'; quarter: QuarterType }
  | { type: 'QUARTER.UPDATE_DATA'; quarter: QuarterType; stepId: keyof QuarterData; data: any }
  | { type: 'QUARTER.AUTO_FILL' }
  | { type: 'HYDRATE'; quarters: QuarterContext['quarters'] };

function splitFlow(node: any): [any, any, any, any] {
  if (node === null || node === undefined) return [null, null, null, null];
  if (Array.isArray(node)) {
    const out: [any[], any[], any[], any[]] = [[], [], [], []];
    node.forEach((el) => {
      const parts = splitFlow(el);
      for (let i = 0; i < 4; i++) out[i].push(parts[i]);
    });
    return out;
  }
  if (typeof node === 'object') {
    const out: [any, any, any, any] = [{}, {}, {}, {}];
    for (const k in node) {
      if (!Object.prototype.hasOwnProperty.call(node, k)) continue;
      const v = node[k];
      if (typeof v === 'number') {
        const base = Math.floor(v / 4);
        const rem = v - base * 3;
        out[0][k] = base;
        out[1][k] = base;
        out[2][k] = base;
        out[3][k] = rem;
      } else if (typeof v === 'boolean' || typeof v === 'string') {
        out[0][k] = out[1][k] = out[2][k] = out[3][k] = v;
      } else {
        const parts = splitFlow(v);
        for (let i = 0; i < 4; i++) out[i][k] = parts[i];
      }
    }
    return out;
  }
  return [node, node, node, node];
}

export const quarterMachine = setup({
  types: {
    context: {} as QuarterContext,
    events: {} as QuarterEvent,
  },
  actions: {
    switchQuarter: assign({
      activeQuarter: ({ event }) => (event as any).quarter
    }),
    updateData: assign({
      quarters: ({ context, event }) => {
        const ev = event as Extract<QuarterEvent, { type: 'QUARTER.UPDATE_DATA' }>;
        // If updating ANNUAL, it doesn't make sense since it's aggregated, ignore.
        if (ev.quarter === 'ANNUAL') return context.quarters;
        
        return {
          ...context.quarters,
          [ev.quarter]: {
            ...context.quarters[ev.quarter],
            [ev.stepId]: ev.data
          }
        };
      }
    }),
    autoFillFromQ1: assign({
      quarters: ({ context }) => {
        const q1Data = context.quarters.Q1;
        const spread = splitFlow(q1Data);
        return {
          ...context.quarters,
          Q1: spread[0],
          Q2: spread[1],
          Q3: spread[2],
          Q4: spread[3]
        };
      }
    }),
    hydrateContext: assign({
      quarters: ({ event, context }) => {
        if (event.type === 'HYDRATE') {
          return event.quarters;
        }
        return context.quarters;
      }
    })
  }
}).createMachine({
  id: 'quarterMachine',
  initial: 'active',
  context: {
    activeQuarter: 'Q1',
    quarters: {
      Q1: {},
      Q2: {},
      Q3: {},
      Q4: {}
    }
  },
  states: {
    active: {
      on: {
        'QUARTER.SWITCH': {
          actions: 'switchQuarter'
        },
        'QUARTER.UPDATE_DATA': {
          actions: 'updateData'
        },
        'QUARTER.AUTO_FILL': {
          actions: 'autoFillFromQ1'
        },
        'HYDRATE': {
          actions: 'hydrateContext'
        }
      }
    }
  }
});
