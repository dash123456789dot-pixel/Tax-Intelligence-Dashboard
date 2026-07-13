'use client';
import type { QuestionDef } from '@/lib/routerSchema';
import { useState, useEffect } from 'react';

export default function NumberQuestion({
  def,
  value,
  onChange,
  onAdvance
}: {
  def: QuestionDef;
  value: number | null;
  onChange: (val: number) => void;
  onAdvance: () => void;
}) {
  const isGold = def.labelColor === 'brandGold';
  const accentClass = isGold ? 'accent-brandGold' : 'accent-brandCyan';
  const focusClass = isGold ? 'focus:border-brandGold/50 focus:ring-brandGold/50' : 'focus:border-brandCyan/50 focus:ring-brandCyan/50';

  const [localValue, setLocalValue] = useState<string>(value !== null ? String(value) : '');

  useEffect(() => {
    if (value !== null) {
      setLocalValue(String(value));
    }
  }, [value]);

  const handleChange = (newVal: string) => {
    setLocalValue(newVal);
    if (newVal !== '') {
      onChange(parseInt(newVal, 10));
    }
  };

  return (
    <div className="w-full text-left">
      <div className="relative space-y-6 max-w-md mr-auto">
        <div className="relative">
          <input
            type="number"
            min="0"
            max={def.id === 'india_days' ? "366" : "365"}
            value={localValue}
            onInput={(e) => handleChange(e.currentTarget.value)}
            placeholder="0"
            className={`w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-3xl font-black text-white outline-none transition-colors ${focusClass}`}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-white/20">Days</span>
        </div>
        
        <input
          type="range"
          min="0"
          max={def.id === 'india_days' ? "366" : "365"}
          value={localValue === '' ? 0 : localValue}
          onInput={(e) => handleChange(e.currentTarget.value)}
          className={`w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer ${accentClass}`}
        />
      </div>
      
      <div className="w-full max-w-md mr-auto flex justify-start mt-10">
        <button
          onClick={onAdvance}
          disabled={localValue === ''}
          className={`w-full py-4 ${isGold ? 'bg-brandGold' : 'bg-brandCyan'} text-black font-black text-xs uppercase tracking-widest rounded-xl hover:brightness-110 transition-all flex items-center justify-between px-6 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span>Continue</span>
          <kbd className="hidden sm:inline px-2 py-1 bg-black/10 rounded text-[10px] font-mono text-black/50 border border-black/5">Enter</kbd>
        </button>
      </div>
      
      {def.id === 'india_days' && (
        <p className="text-[11px] text-white/30 uppercase tracking-widest mt-6 text-center">
          Flag Role: india_days &gt; 0 contributes to india_flag. Pre-filled into layer1_india residency engine.
        </p>
      )}
      {def.id === 'us_days' && (
        <p className="text-[11px] text-white/30 uppercase tracking-widest mt-6 text-center">
          Flag Role: us_days &gt; 0 and was_in_us = true contributes to us_flag.
        </p>
      )}
    </div>
  );
}
