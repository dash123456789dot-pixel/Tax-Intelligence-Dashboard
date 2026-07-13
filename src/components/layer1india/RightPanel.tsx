'use client';

import React from 'react';
import { useLayer1 } from '@/hooks/Layer1Context';
import { useSelector } from '@xstate/react';

export function RightPanel() {
  const { sidebarActor } = useLayer1();
  const residencyResult = useSelector(sidebarActor, (s: any) => s.context.residencyResult);
  const residency = residencyResult || {
    status: 'ROR',
    path: 'Path ROR-1: Standard Resident (>182 days)',
    scope: 'Worldwide Income (Exemptions & DTAA credits available).'
  };
  
  return (
    <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-6">


      {/* Live RS-001 Residency Lock Certificate Card */}
      <div className="glass-card p-5 border border-white/5 flex flex-col gap-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Your Current Residency Status</span>
        
        <div className="flex flex-col items-center justify-center p-6 bg-brandGold/5 border border-brandGold/20 rounded-2xl text-center shadow-[0_0_20px_rgba(212,175,55,0.05)]">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Derived status</span>
          <span id="badge-lock-status" className="text-3xl font-black font-display text-brandGold tracking-wider mt-1">{residency.status}</span>
          <span className="text-[8px] font-black uppercase bg-brandGold/20 border border-brandGold/40 text-brandGold px-2 py-0.5 rounded-full mt-2 tracking-widest shadow-[0_0_10px_rgba(212,175,55,0.15)]">Lock set</span>
        </div>

        <div className="text-[10px] text-white/60 space-y-2 border-t border-white/5 pt-3">
          <div>
            <span className="font-bold text-white/80 block uppercase tracking-wide text-[8px] text-white/40">Rule Matched:</span>
            <span id="cert-statutory-path" className="text-brandGold font-medium">{residency.path}</span>
          </div>
          <div>
            <span className="font-bold text-white/80 block uppercase tracking-wide text-[8px] text-white/40">What gets taxed in India?</span>
            <span id="cert-scope" className="text-white/80">{residency.scope}</span>
          </div>
        </div>
      </div>

      {/* Surcharge Analyzer Preview Card */}
      <div className="glass-card p-5 border border-white/5 flex flex-col gap-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Tax Estimator (Live Preview)</span>

        {/* Income Buckets */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] border-b border-white/5 pb-1.5">
            <span className="text-white/50">Normal Slab Income</span>
            <span id="bucket-normal" className="font-mono text-white/90">₹0</span>
          </div>
          <div className="flex justify-between text-[11px] border-b border-white/5 pb-1.5">
            <span className="text-white/50">Dividend Income</span>
            <span id="bucket-div" className="font-mono text-white/90">₹0</span>
          </div>
          <div className="flex justify-between text-[11px] border-b border-white/5 pb-1.5">
            <span className="text-white/50">s.111A STCG (@ 20%)</span>
            <span id="bucket-stcg" className="font-mono text-white/90">₹0</span>
          </div>
          <div className="flex justify-between text-[11px] border-b border-white/5 pb-1.5">
            <span className="text-white/50">s.112A LTCG (@ 12.5%)</span>
            <span id="bucket-ltcg" className="font-mono text-white/90">₹0</span>
          </div>
          <div className="flex justify-between text-[11px] pt-0.5">
            <span className="text-white/70 font-bold">Total Gross Income</span>
            <span id="bucket-total" className="font-mono font-bold text-white/90">₹0</span>
          </div>
        </div>

        {/* Surcharge Rate Badge */}
        <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2 border border-white/5">
          <div className="flex flex-col">
            <span className="text-[8px] uppercase tracking-widest text-white/30 font-black">Surcharge Rate</span>
            <span id="surcharge-basis" className="text-[9px] text-white/40 mt-0.5">—</span>
          </div>
          <span id="surcharge-pct" className="text-lg font-black font-display text-brandGold">0%</span>
        </div>

        {/* Tax Breakdown */}
        <div className="space-y-1.5 border-t border-white/5 pt-2">
          <div className="flex justify-between text-[11px] border-b border-white/5 pb-1.5">
            <span className="text-white/50">Base Income Tax</span>
            <span id="preview-base-tax" className="font-mono text-white/80">₹0</span>
          </div>
          <div className="flex justify-between text-[11px] border-b border-white/5 pb-1.5">
            <span className="text-white/50">Surcharge</span>
            <span id="preview-surcharge" className="font-mono text-white/80">₹0</span>
          </div>
          <div className="flex justify-between text-[11px] border-b border-white/5 pb-1.5">
            <span className="text-white/50">Health &amp; Education Cess (4%)</span>
            <span id="preview-cess" className="font-mono text-white/80">₹0</span>
          </div>
          <div className="flex justify-between text-xs pt-0.5">
            <span className="text-brandGold font-bold">Est. Total Tax Liability</span>
            <span id="preview-total-tax" className="font-mono font-bold text-brandGold">₹0</span>
          </div>
        </div>

        <div className="text-[8px] text-white/30 uppercase tracking-widest text-center">
          Indicative estimate · Subject to deductions &amp; relief
        </div>
      </div>
    </aside>
  );
}
