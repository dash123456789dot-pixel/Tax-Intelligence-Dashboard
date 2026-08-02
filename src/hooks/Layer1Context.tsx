'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { complianceSidebarMachine } from '@/machines/complianceSidebarMachine';
import { quarterMachine } from '@/machines/quarterMachine';
import { useFormDraft } from '@/hooks/useFormDraft';

interface Layer1ContextType {
  sidebarActor: any; // Type accurately if possible
  quarterActor: any;
  ctx: any; // Add specific types as you evolve
  submitStep: (stepId: string, stepData: any) => Promise<void>;
  submitFinal: (allData: any) => Promise<void>;
  financialYear: string;
  setFinancialYear: (year: string) => void;
}

const Layer1IndiaContext = createContext<Layer1ContextType | null>(null);

export function Layer1IndiaProvider({ children, initialProfile }: { children: React.ReactNode, initialProfile?: any }) {
  const [ctx, setCtx] = useState({
    profile: initialProfile || {
      entity_type: 'individual',
      tax_regime: 'NEW',
      pan: '',
      date_of_birth: '',
      name: '',
    }
  });

  const [financialYear, setFinancialYear] = useState("2024-25");

  const [, , sidebarActor] = useMachine(complianceSidebarMachine);
  const [, , quarterActor] = useMachine(quarterMachine);

  // Load router payload to set base tax year and profile data
  useEffect(() => {
    try {
      const payloadStr = sessionStorage.getItem('wising_router_payload');
      if (payloadStr) {
        const payload = JSON.parse(payloadStr);
        if (payload.base_tax_year) {
          const yearNum = parseInt(payload.base_tax_year, 10);
          if (!isNaN(yearNum)) {
             setFinancialYear(`${yearNum - 1}-${payload.base_tax_year.slice(-2)}`);
          }
        }
        
        setCtx(prev => ({
           ...prev,
           profile: {
              ...prev.profile,
              date_of_birth: payload.date_of_birth || prev.profile.date_of_birth,
              name: payload.full_name || prev.profile.name,
           }
        }));
      }
    } catch(e) {}
  }, []);

  // Load from Draft / Auto-save using dynamic financialYear
  const { data: draftData, updateData, loading, submitStep, submitFinal } = useFormDraft("ALL", financialYear, {});

  const [hasHydrated, setHasHydrated] = useState(false);

  // 1. Hydrate on initial load
  useEffect(() => {
    if (!loading && !hasHydrated) {
      const data = (draftData || {}) as any;
      let finalSidebar = data.sidebar || {};
      let finalQuarters = data.quarters || {};
      
      try {
        const payloadStr = sessionStorage.getItem('wising_router_payload');
        if (payloadStr) {
          const payload = JSON.parse(payloadStr);
          
          if (payload.india_days !== undefined) {
             if (!finalQuarters.Q1) finalQuarters.Q1 = {};
             if (!finalQuarters.Q1.residency) finalQuarters.Q1.residency = {};
             if (!finalQuarters.Q1.residency.residency_detail) finalQuarters.Q1.residency.residency_detail = {};
             
             if (finalQuarters.Q1.residency.residency_detail.manual_days === undefined) {
                 finalQuarters.Q1.residency.residency_detail.manual_days = payload.india_days;
             }
          }
        }
      } catch (e) {}

      if (Object.keys(finalSidebar).length > 0) sidebarActor.send({ type: "HYDRATE", payload: finalSidebar });
      if (Object.keys(finalQuarters).length > 0) quarterActor.send({ type: "HYDRATE", quarters: finalQuarters });
      
      setHasHydrated(true);
    }
  }, [loading, hasHydrated, draftData, sidebarActor, quarterActor]);

  // 2. Subscribe and debounced auto-save
  useEffect(() => {
    if (!hasHydrated) return; // don't autosave while hydrating
    
    let debounceTimer: NodeJS.Timeout;

    const performSave = () => {
      const sCtx = sidebarActor.getSnapshot().context;
      const qCtx = quarterActor.getSnapshot().context.quarters;
      updateData({ sidebar: sCtx, quarters: qCtx });
    };

    const sub1 = sidebarActor.subscribe(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(performSave, 1000);
    });

    const sub2 = quarterActor.subscribe(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(performSave, 1000);
    });

    return () => {
      sub1.unsubscribe();
      sub2.unsubscribe();
      clearTimeout(debounceTimer);
    };
  }, [hasHydrated, sidebarActor, quarterActor, updateData]);

  return (
    <Layer1IndiaContext.Provider value={{ sidebarActor, quarterActor, ctx, submitStep, submitFinal, financialYear, setFinancialYear }}>
      {loading ? (
        <div className="flex h-screen items-center justify-center text-white/40">Loading your draft...</div>
      ) : (
        children
      )}
    </Layer1IndiaContext.Provider>
  );
}

export function useLayer1() {
  const ctx = useContext(Layer1IndiaContext);
  if (!ctx) throw new Error('useLayer1 must be used within Layer1IndiaProvider');
  return ctx;
}
