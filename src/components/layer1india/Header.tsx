'use client';

import React from 'react';
import Link from 'next/link';
import { useLayer1 } from '@/hooks/Layer1Context';
import { useSelector } from '@xstate/react';

export function Header() {
  const { quarterActor } = useLayer1();
  const activeQuarter = useSelector(quarterActor, (s: any) => s.context.activeQuarter);

  return (
    <header className="sticky top-0 z-50 bg-[#050505]/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center space-x-12">
          <div id="nav-trigger-zone" className="relative group py-6 -my-6 cursor-pointer">
            <button className="text-white flex flex-col justify-center items-start gap-1.5 focus:outline-none">
              <span className="w-6 h-[2px] bg-current rounded-full"></span>
              <span className="w-4 h-[2px] bg-current rounded-full transition-all group-hover:w-6"></span>
              <span className="w-6 h-[2px] bg-current rounded-full"></span>
            </button>
            {/* Sidebar menu would go here, omitting for simplicity unless needed */}
          </div>
          <Link href="/layer1/india" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-brandGold rounded flex items-center justify-center text-black font-black text-xs tracking-wider">L1</div>
            <span className="text-xs font-black uppercase tracking-[0.4em] text-white">India Specialist</span>
          </Link>
        </div>
        
        <div className="flex items-center space-x-4 lg:space-x-6">
          {/* Quarter Switcher */}
          <div className="flex items-center bg-[#0a0a0a] border border-white/10 rounded-xl p-1 shadow-inner gap-1 quarter-switcher overflow-x-auto hide-scrollbar max-w-full">
            {(['Q1', 'Q2', 'Q3', 'Q4', 'ANNUAL'] as const).map((qId) => {
              const isActive = activeQuarter === qId;
              const activeClasses = "px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all bg-white/10 border border-brandGold text-brandGold shadow-[0_0_15px_rgba(255,215,0,0.1)]";
              const inactiveClasses = "px-4 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all text-gray-400 border border-white/10 bg-black hover:text-white hover:bg-white/5";
              
              let label = qId;
              let subtitle = '';
              if (qId === 'Q1') subtitle = 'APR-JUN';
              if (qId === 'Q2') subtitle = 'JUL-SEP';
              if (qId === 'Q3') subtitle = 'OCT-DEC';
              if (qId === 'Q4') subtitle = 'JAN-MAR';

              return (
                <button 
                  key={qId} 
                  onClick={() => quarterActor.send({ type: 'QUARTER.SWITCH', quarter: qId })}
                  className={`${isActive ? activeClasses : inactiveClasses} ${qId === 'ANNUAL' ? 'ml-2' : ''}`}
                >
                  {label} {subtitle && <span className={`hidden lg:inline text-[8px] ml-1 ${isActive ? 'opacity-70' : 'opacity-50'}`}>{subtitle}</span>}
                </button>
              );
            })}
            <div className="w-px h-6 bg-white/10 mx-1"></div>
            <button 
              onClick={() => quarterActor.send({ type: 'QUARTER.AUTO_FILL' })}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all text-brandCyan border border-brandCyan/30 bg-brandCyan/10 hover:bg-brandCyan/20 flex items-center gap-1" title="Copy current quarter to all other quarters"
            >
              <span>🪄 Auto-Fill Year</span>
            </button>
          </div>
          
          {/* Workspace Switcher */}
          <div id="workspace-switcher" className="flex items-center bg-white/5 border border-white/10 p-0.5 rounded-xl text-[9px] font-black uppercase tracking-widest">
            <span className="px-3 py-1.5 bg-brandGold text-black rounded-lg shadow-sm">India L1</span>
            <Link href="/layer1/us" className="px-3 py-1.5 text-white/40 hover:text-brandCyan transition-all rounded-lg font-bold">US L1</Link>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-brandGold animate-pulse"></span>
            <span className="text-[9px] font-black tracking-widest text-brandGold uppercase hidden md:inline">Layer 1 active</span>
          </div>
        </div>
      </div>
    </header>
  );
}
