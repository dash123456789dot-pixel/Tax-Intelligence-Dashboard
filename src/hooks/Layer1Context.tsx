'use client';

import React, { createContext, useContext, useState } from 'react';
import { useMachine } from '@xstate/react';
import { complianceSidebarMachine } from '@/machines/complianceSidebarMachine';
import { quarterMachine } from '@/machines/quarterMachine';

interface Layer1ContextType {
  sidebarActor: any; // Type accurately if possible
  quarterActor: any;
  ctx: any; // Add specific types as you evolve
}

const Layer1IndiaContext = createContext<Layer1ContextType | null>(null);

export function Layer1IndiaProvider({ children, initialProfile }: { children: React.ReactNode, initialProfile?: any }) {
  // Initialize standard dummy context or override with props
  const [ctx] = useState({
    profile: initialProfile || {
      entity_type: 'individual',
      tax_regime: 'NEW',
      pan: 'ABCDE1234F',
      date_of_birth: '1985-05-15'
    }
  });

  const [, , sidebarActor] = useMachine(complianceSidebarMachine);
  const [, , quarterActor] = useMachine(quarterMachine);

  return (
    <Layer1IndiaContext.Provider value={{ sidebarActor, quarterActor, ctx }}>
      {children}
    </Layer1IndiaContext.Provider>
  );
}

export function useLayer1() {
  const ctx = useContext(Layer1IndiaContext);
  if (!ctx) throw new Error('useLayer1 must be used within Layer1IndiaProvider');
  return ctx;
}
