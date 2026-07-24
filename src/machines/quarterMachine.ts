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
        // Deep clone Q1 data to Q2, Q3, Q4
        const clone = (data: any) => JSON.parse(JSON.stringify(data || {}));
        return {
          ...context.quarters,
          Q2: clone(q1Data),
          Q3: clone(q1Data),
          Q4: clone(q1Data)
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
