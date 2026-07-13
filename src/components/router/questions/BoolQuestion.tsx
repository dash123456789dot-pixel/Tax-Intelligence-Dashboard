'use client';
import type { QuestionDef } from '@/lib/routerSchema';

export default function BoolQuestion({
  def,
  value,
  onChange,
  onAdvance
}: {
  def: QuestionDef;
  value: boolean | null;
  onChange: (val: boolean) => void;
  onAdvance?: () => void;
}) {
  const isGold = def.labelColor === 'brandGold';
  
  const hoverBorder = isGold ? 'hover:border-brandGold/50 hover:bg-brandGold/5' : 'hover:border-brandCyan/50 hover:bg-brandCyan/5';
  
  const activeClass = isGold 
    ? 'input-pill-selected bg-brandGold/15 border-brandGold/60 text-white shadow-[0_0_15px_rgba(212,175,55,0.15)]'
    : 'input-pill-selected bg-brandCyan/15 border-brandCyan/60 text-white shadow-[0_0_15px_rgba(6,182,212,0.15)]';

  const handleSelect = (val: boolean) => {
    onChange(val);
    if (onAdvance) {
      setTimeout(() => onAdvance(), 150);
    }
  };

  return (
    <div className="w-full text-left">
      <div className="w-full max-w-md mr-auto flex flex-col sm:flex-row justify-start gap-4 mt-2">
        <button
          onClick={() => handleSelect(true)}
          className={`bool-btn-yes flex-1 py-4 border rounded-xl transition-all text-sm font-bold flex items-center justify-between px-6 
            ${value === true ? 'input-pill-selected' : 'border-white/10 bg-white/5 hover:border-brandGold/50 hover:bg-brandGold/5'} 
            ${value === false ? 'opacity-50' : ''}`}
        >
          <span>Yes</span>
          <kbd className="hidden sm:inline px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-white/40 border border-white/15">Y</kbd>
        </button>
        
        <button
          onClick={() => handleSelect(false)}
          className={`bool-btn-no flex-1 py-4 border rounded-xl transition-all text-sm font-bold flex items-center justify-between px-6 
            ${value === false ? 'input-pill-selected' : 'border-white/10 bg-white/5 hover:border-brandGold/50 hover:bg-brandGold/5'} 
            ${value === true ? 'opacity-50' : ''}`}
        >
          <span>No</span>
          <kbd className="hidden sm:inline px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-white/40 border border-white/15">N</kbd>
        </button>
      </div>
    </div>
  );
}
