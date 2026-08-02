import React from 'react';
import { QuestionDef } from '@/lib/routerSchema';

interface JurisdictionSlideProps {
  def: QuestionDef;
  value: string | null;
  onChange: (val: string) => void;
  onAdvance: () => void;
}

export default function JurisdictionSlide({ def, value, onChange, onAdvance }: JurisdictionSlideProps) {
  const handleSelect = (val: string) => {
    onChange(val);
    setTimeout(() => onAdvance(), 150);
  };

  return (
    <div className="flex flex-col gap-3">
      <button 
        onClick={() => handleSelect('india')} 
        className={`tb-btn py-3 border rounded-xl bg-white/5 transition-all text-sm font-bold px-6 text-left 
          ${value === 'india' ? 'border-brandGold bg-brandGold/10 text-brandGold' : 'border-white/10 hover:border-brandGold/50 hover:bg-brandGold/5 text-white'}`}
      >
        🇮🇳 India Only
      </button>
      <button 
        onClick={() => handleSelect('us')} 
        className={`tb-btn py-3 border rounded-xl bg-white/5 transition-all text-sm font-bold px-6 text-left 
          ${value === 'us' ? 'border-brandCyan bg-brandCyan/10 text-brandCyan' : 'border-white/10 hover:border-brandCyan/50 hover:bg-brandCyan/5 text-white'}`}
      >
        🇺🇸 US Only
      </button>
      <button 
        onClick={() => handleSelect('cross_border')} 
        className={`tb-btn py-3 border rounded-xl bg-white/5 transition-all text-sm font-bold px-6 text-left 
          ${value === 'cross_border' ? 'border-[#8B5CF6] bg-[#8B5CF6]/10 text-[#8B5CF6]' : 'border-white/10 hover:border-[#8B5CF6]/50 hover:bg-[#8B5CF6]/5 text-white'}`}
      >
        🌐 Cross-Border (Both)
      </button>
    </div>
  );
}
