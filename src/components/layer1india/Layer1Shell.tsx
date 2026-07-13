'use client';

import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { RightPanel } from './RightPanel';

export function Layer1Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <div id="global-tax-year-banner" className="w-full bg-brandGold/10 border-b border-brandGold/20 py-2 text-center text-[10px] font-bold text-brandGold uppercase tracking-widest hidden">
        {/* Injected via JS or context later */}
      </div>
      <main className="max-w-[1440px] w-full mx-auto px-4 lg:px-8 py-8 flex-1 flex flex-col lg:flex-row gap-8">
        <Sidebar />
        <section className="flex-1 flex flex-col gap-6">
          {children}
        </section>
        <RightPanel />
      </main>
    </>
  );
}
