'use client';

import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { RightPanel } from './RightPanel';
import { useLayer1 } from '@/hooks/Layer1Context';
import { useSelector } from '@xstate/react';

export function Layer1Shell({ children }: { children: React.ReactNode }) {
  const { quarterActor } = useLayer1();
  const activeQuarter = useSelector(quarterActor, (s: any) => s.context.activeQuarter);
  return (
    <>
      <Header />
      <div id="global-tax-year-banner" className={`w-full bg-brandGold/10 border-b border-brandGold/20 py-2 text-center text-[10px] font-bold text-brandGold uppercase tracking-widest ${activeQuarter === 'ANNUAL' ? '' : 'hidden'}`}>
        VIEWING ANNUAL AGGREGATED SUMMARY. SWITCH TO A QUARTER TO EDIT.
      </div>
      <main className="max-w-[1440px] w-full mx-auto px-4 lg:px-8 py-8 flex-1 flex flex-col lg:flex-row gap-8">
        <Sidebar />
        <section className="flex-1 flex flex-col gap-6">
          <fieldset 
            disabled={activeQuarter === 'ANNUAL'} 
            className={activeQuarter === 'ANNUAL' ? 'opacity-50 cursor-not-allowed [&_button]:pointer-events-none border-none p-0 m-0 min-w-0' : 'border-none p-0 m-0 min-w-0'}
          >
            {children}
          </fieldset>
        </section>
        <RightPanel />
      </main>
    </>
  );
}
