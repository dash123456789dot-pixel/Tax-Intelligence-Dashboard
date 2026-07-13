'use client';
import type { QuestionDef } from '@/lib/routerSchema';
import { ArrowRight } from 'lucide-react';

export default function TextQuestion({
  def,
  value,
  onChange,
  onAdvance
}: {
  def: QuestionDef;
  value: string | null;
  onChange: (val: string) => void;
  onAdvance: () => void;
}) {
  return (
    <div className="w-full text-left">
      <div className="relative max-w-md mr-auto">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={def.id === 'base_tax_year' ? '2023' : 'Enter details...'}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-2xl font-black text-white focus:border-brandGold/50 outline-none transition-colors"
        />
      </div>
      
      <div className="w-full max-w-md mr-auto flex justify-start mt-10">
        <button
          onClick={onAdvance}
          disabled={!value || value.trim() === ''}
          className="w-full py-4 bg-brandGold text-black font-black text-xs uppercase tracking-widest rounded-xl hover:brightness-110 transition-all flex items-center justify-between px-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Continue</span>
          <kbd className="hidden sm:inline px-2 py-1 bg-black/10 rounded text-[10px] font-mono text-black/50 border border-black/5">Enter</kbd>
        </button>
      </div>
    </div>
  );
}
