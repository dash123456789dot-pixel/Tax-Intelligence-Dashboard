'use client';

import React, { createContext, useContext } from 'react';
import { useLayer1India as useLayer1IndiaHook } from './useLayer1India';

type Layer1IndiaContextType = ReturnType<typeof useLayer1IndiaHook>;

const Layer1IndiaContext = createContext<Layer1IndiaContextType | null>(null);

export function Layer1IndiaProvider({ children }: { children: React.ReactNode }) {
  const machine = useLayer1IndiaHook();
  return (
    <Layer1IndiaContext.Provider value={machine}>
      {children}
    </Layer1IndiaContext.Provider>
  );
}

export function useLayer1() {
  const ctx = useContext(Layer1IndiaContext);
  if (!ctx) throw new Error('useLayer1 must be used within Layer1IndiaProvider');
  return ctx;
}
