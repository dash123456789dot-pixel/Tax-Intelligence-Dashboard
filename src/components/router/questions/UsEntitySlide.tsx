import React from 'react';
import { QuestionDef } from '@/lib/routerSchema';

interface UsEntitySlideProps {
  def: QuestionDef;
  value: string | null;
  onChange: (val: string) => void;
  onAdvance: () => void;
}

export default function UsEntitySlide({ def, value, onChange, onAdvance }: UsEntitySlideProps) {
  const handleSelect = (val: string) => {
    onChange(val);
    setTimeout(() => onAdvance(), 150);
  };

  const getBtnClass = (val: string) => {
    return `tb-btn py-3 border rounded-xl bg-white/5 transition-all text-sm font-bold px-6 text-left 
      ${value === val ? 'border-brandCyan bg-brandCyan/10 text-brandCyan' : 'border-white/10 hover:border-brandCyan/50 hover:bg-brandCyan/5 text-white'}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <button onClick={() => handleSelect('individual')} className={getBtnClass('individual')}>
        👤 Individual
      </button>
      <button onClick={() => handleSelect('c_corp')} className={getBtnClass('c_corp')}>
        🏢 C-Corporation
      </button>
      <button onClick={() => handleSelect('s_corp')} className={getBtnClass('s_corp')}>
        🏬 S-Corporation
      </button>
      <button onClick={() => handleSelect('partnership')} className={getBtnClass('partnership')}>
        🤝 Partnership / LLC
      </button>
      <button onClick={() => handleSelect('trust')} className={getBtnClass('trust')}>
        🏛️ Trust / Estate
      </button>
    </div>
  );
}
