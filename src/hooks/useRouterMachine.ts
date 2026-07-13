import { useMachine } from '@xstate/react';
import { useEffect, useRef } from 'react';
import { routerMachine, INITIAL_CONTEXT } from '@/machines/routerMachine';
import type { RouterContext, RouterEvent } from '@/machines/routerMachine.types';

const STORAGE_KEY = 'wising_router_state';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function useRouterMachine() {
  const [state, send] = useMachine(routerMachine);
  const ctx = state.context;

  // Track the previous tax year to detect selection changes
  const prevYearRef = useRef<string | null>(null);

  // Load saved state for a specific tax year from Backend (Redis cache or PostgreSQL database)
  const loadSavedState = async (year: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/router-cache?financial_year=${year}`);
      const result = await res.json();
      if (result.success && result.data) {
        console.log(`[Router] Rehydrated state for year ${year} from backend ${result.source || 'cache'}`);
        send({ type: 'HYDRATE', context: result.data });
      } else {
        console.log(`[Router] No saved state for year ${year}, initializing fresh context`);
        send({ type: 'HYDRATE', context: { ...INITIAL_CONTEXT, base_tax_year: year } });
      }
    } catch (err) {
      console.error(`[Router] Failed to load saved state for year ${year}:`, err);
    }
  };

  // 1. Initialize session and load default/last tax year state on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        await fetch(`${API_BASE_URL}/api/session/init`, { method: 'POST' });
        console.log("[Router] Backend session initialized.");

        // Read tax year from local storage or default to '2025'
        let initialYear = '2025';
        try {
          const localData = localStorage.getItem(STORAGE_KEY);
          if (localData) {
            const parsed = JSON.parse(localData);
            if (parsed.base_tax_year) {
              initialYear = parsed.base_tax_year;
            }
          }
        } catch (e) {}

        prevYearRef.current = initialYear;
        await loadSavedState(initialYear);
      } catch (err) {
        console.error('[Router] Session initialization failed:', err);
      }
    };
    initSession();
  }, []);

  // 2. Load saved state when the user selects a different tax year
  useEffect(() => {
    if (ctx.base_tax_year && ctx.base_tax_year !== prevYearRef.current) {
      const newYear = ctx.base_tax_year;
      prevYearRef.current = newYear;
      loadSavedState(newYear);
    }
  }, [ctx.base_tax_year]);

  // 3. Persist to localStorage and cache to Redis (debounced) on context changes
  useEffect(() => {
    if (!ctx) return;
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));

    // Only cache to backend if base_tax_year is selected
    if (!ctx.base_tax_year) return;

    const delayDebounceFn = setTimeout(async () => {
      try {
        await fetch(`${API_BASE_URL}/api/router-cache`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ctx),
        });
      } catch (err) {
        console.error('[Router] Failed to cache state to Redis:', err);
      }
    }, 1000); // 1-second debounce

    return () => clearTimeout(delayDebounceFn);
  }, [ctx]);

  // 4. Save to PostgreSQL database permanently when router questionnaire is complete
  useEffect(() => {
    if (ctx.isComplete && ctx.base_tax_year) {
      const persistToDB = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/router-persist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ctx),
          });
          const result = await res.json();
          if (result.success) {
            console.log('[Router] Session successfully persisted permanently to PostgreSQL!');
          } else {
            console.error('[Router] DB persistence returned error:', result.error);
          }
        } catch (err) {
          console.error('[Router] Failed to persist session to DB:', err);
        }
      };
      persistToDB();
    }
  }, [ctx.isComplete, ctx.base_tax_year, ctx]);

  // Helpers for the UI layer
  const currentQuestionId = ctx.activeQuestions[ctx.currentQuestionIndex] ?? null;
  const progressPct = ctx.isComplete
    ? 100
    : Math.round((ctx.currentQuestionIndex / ctx.activeQuestions.length) * 100);
  const isFirstQuestion = ctx.currentQuestionIndex === 0;

  return {
    ctx,
    state,
    send,
    currentQuestionId,
    progressPct,
    isFirstQuestion,
    isComplete: ctx.isComplete,
    jurisdiction: ctx.jurisdiction,
    // Typed send helpers
    setBool: (fieldId: keyof RouterContext, value: boolean) =>
      send({ type: 'SET_BOOL', fieldId: fieldId as any, value }),
    setInt: (fieldId: 'india_days' | 'us_days', value: number) =>
      send({ type: 'SET_INT', fieldId, value }),
    setText: (fieldId: 'full_name' | 'base_tax_year', value: string) =>
      send({ type: 'SET_TEXT', fieldId: fieldId as any, value }),
    setDate: (value: string) =>
      send({ type: 'SET_DATE', fieldId: 'date_of_birth', value }),
    advance: () => send({ type: 'ADVANCE' }),
    back: () => send({ type: 'BACK' }),
    reset: async () => {
      try {
        await fetch(`${API_BASE_URL}/api/session/logout`, { method: 'POST' });
        console.log('[Router] Session cache cleared on logout/reset');
      } catch (err) {
        console.error('[Router] Failed to clear session cache:', err);
      }
      send({ type: 'RESET' });
    },
  };
}
