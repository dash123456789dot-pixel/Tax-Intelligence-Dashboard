'use client';
import { useState } from 'react';
import { useRouterMachine } from '@/hooks/useRouterMachine';

export default function RouterDebugPanel({ machine }: { machine: ReturnType<typeof useRouterMachine> }) {
  const [isOpen, setIsOpen] = useState(false);
  const { state, ctx } = machine;

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-[#1e1e1e] border border-white/20 text-white/70 px-4 py-2 rounded-lg text-xs font-mono font-bold hover:bg-[#2a2a2a] hover:text-white transition-all shadow-lg flex items-center gap-2"
      >
        <svg className="w-4 h-4 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        Debug XState
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] flex flex-col bg-[#0a0a0a] border border-white/20 rounded-xl shadow-2xl overflow-hidden font-mono text-xs text-white/80">
      <div className="flex justify-between items-center bg-[#1e1e1e] p-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="font-bold text-white tracking-widest uppercase text-[10px]">XState Inspector</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="overflow-y-auto p-4 space-y-4">
        <div>
          <h4 className="text-[10px] text-white/40 uppercase tracking-widest mb-1 border-b border-white/5 pb-1">Current State</h4>
          <div className="text-[#06B6D4] font-bold">
            {typeof state.value === 'string' ? state.value : JSON.stringify(state.value)}
          </div>
        </div>

        <div>
          <h4 className="text-[10px] text-white/40 uppercase tracking-widest mb-1 border-b border-white/5 pb-1">Computed Flags</h4>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className={`p-2 rounded border ${ctx.india_flag ? 'border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-white/5 bg-white/5 text-white/30'}`}>
              India: {ctx.india_flag ? 'TRUE' : 'FALSE'}
            </div>
            <div className={`p-2 rounded border ${ctx.us_flag ? 'border-[#06B6D4]/50 bg-[#06B6D4]/10 text-[#06B6D4]' : 'border-white/5 bg-white/5 text-white/30'}`}>
              US: {ctx.us_flag ? 'TRUE' : 'FALSE'}
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-[10px] text-white/40 uppercase tracking-widest mb-1 border-b border-white/5 pb-1">Context Payload</h4>
          <pre className="text-[10px] bg-black p-3 rounded text-[#A3E635] overflow-x-auto">
            {JSON.stringify(ctx, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
