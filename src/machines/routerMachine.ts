import { createMachine, assign } from 'xstate';
import type { RouterContext, RouterEvent } from './routerMachine.types';
import {
  buildActiveQuestions,
  deriveOutputs,
} from './routerMachine.guards';

export const INITIAL_CONTEXT: RouterContext = {
  // Inputs — all null
  base_tax_year: null,
  full_name: null,
  date_of_birth: null,
  is_indian_citizen: null,
  is_pio_or_oci: null,
  india_days: null,
  has_india_source_income_or_assets: null,
  is_us_citizen: null,
  has_green_card: null,
  was_in_us_this_year: null,
  us_days: null,
  has_us_source_income_or_assets: null,
  liable_to_tax_in_another_country: null,
  left_india_for_employment_this_year: null,
  tb_permanent_home: null,
  tb_vital_interests: null,
  tb_habitual_abode: null,
  tb_nationality: null,
  // Derived
  india_flag: false,
  us_flag: false,
  jurisdiction: 'none',
  is_statutory_dual_resident: false,
  tie_breaker_winner: null,
  // Navigation
  currentQuestionIndex: 0,
  activeQuestions: [
    'base_tax_year', 'full_name', 'date_of_birth', 'is_indian_citizen',
    'india_days', 'has_india_source_income_or_assets',
    'is_us_citizen', 'was_in_us_this_year',
    'has_us_source_income_or_assets',
  ],
  isComplete: false,
};

// Helper: recompute context after any input changes
const recompute = (ctx: RouterContext): Partial<RouterContext> => {
  const activeQuestions = buildActiveQuestions(ctx);
  const derived = deriveOutputs(ctx);
  const isComplete = ctx.currentQuestionIndex >= activeQuestions.length;
  return { ...derived, activeQuestions, isComplete };
};

export const routerMachine = createMachine({
  id: 'jurisdictionRouter',
  types: {} as { context: RouterContext; events: RouterEvent },
  context: INITIAL_CONTEXT,
  initial: 'questioning',
  on: {
    HYDRATE: [
      {
        guard: ({ event }) => !!(event.context.isComplete || (event.context as any).is_complete),
        target: '.complete',
        actions: assign(({ context, event }) => {
          const updated = { ...context, ...event.context };
          return { ...updated, ...recompute(updated as RouterContext) };
        }),
      },
      {
        target: '.questioning',
        actions: assign(({ context, event }) => {
          const updated = { ...context, ...event.context };
          return { ...updated, ...recompute(updated as RouterContext) };
        }),
      },
    ],
  },
  states: {
    questioning: {
      on: {
        SET_BOOL: {
          actions: assign(({ context, event }) => {
            const updated = { ...context, [event.fieldId]: event.value };
            const next = recompute(updated as RouterContext);
            const isNowComplete =
              (updated.currentQuestionIndex) >= (next.activeQuestions?.length ?? 0);
            return { ...updated, ...next, isComplete: isNowComplete };
          }),
        },
        SET_TEXT: {
          actions: assign(({ context, event }) => {
            console.log("SET_TEXT event received:", event);
            const updated = { ...context, [event.fieldId]: event.value };
            console.log("Updated context base_tax_year:", updated.base_tax_year);
            return { ...updated, ...recompute(updated as RouterContext) };
          }),
        },
        SET_DATE: {
          actions: assign(({ context, event }) => {
            const updated = { ...context, [event.fieldId]: event.value };
            return { ...updated, ...recompute(updated as RouterContext) };
          }),
        },
        SET_INT: {
          actions: assign(({ context, event }) => {
            const updated = { ...context, [event.fieldId]: event.value };
            return { ...updated, ...recompute(updated as RouterContext) };
          }),
        },
        ADVANCE: [
          {
            guard: ({ context }) => context.currentQuestionIndex + 1 >= context.activeQuestions.length,
            target: 'complete',
            actions: assign(({ context }) => ({
              currentQuestionIndex: context.currentQuestionIndex + 1,
              isComplete: true
            })),
          },
          {
            actions: assign(({ context }) => ({
              currentQuestionIndex: context.currentQuestionIndex + 1,
              isComplete: false
            })),
          }
        ],
        BACK: {
          actions: assign(({ context }) => ({
            currentQuestionIndex: Math.max(0, context.currentQuestionIndex - 1),
          })),
        },
        RESET: {
          actions: assign(() => INITIAL_CONTEXT),
        },
      },
    },
    complete: {
      entry: assign(({ context }) => ({
        ...deriveOutputs(context),
        isComplete: true,
      })),
      on: {
        RESET: {
          target: 'questioning',
          actions: assign(() => INITIAL_CONTEXT),
        },
        BACK: {
          target: 'questioning',
          actions: assign(({ context }) => ({
            currentQuestionIndex: context.activeQuestions.length - 1,
            isComplete: false,
          })),
        },
      },
    },
  },
});

export default routerMachine;
