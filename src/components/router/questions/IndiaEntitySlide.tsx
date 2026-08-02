import React from 'react';
import { QuestionDef } from '@/lib/routerSchema';

interface IndiaEntitySlideProps {
  def: QuestionDef;
  value: string | null;
  onChange: (val: string) => void;
  onAdvance: () => void;
}

export default function IndiaEntitySlide({ def, value, onChange, onAdvance }: IndiaEntitySlideProps) {
  const handleSelect = (val: string) => {
    onChange(val);
    setTimeout(() => onAdvance(), 150);
  };

  const getBtnClass = (val: string) => {
    return `tb-btn py-3 border rounded-xl bg-white/5 transition-all text-sm font-bold px-6 text-left 
      ${value === val ? 'border-brandGold bg-brandGold/10 text-brandGold' : 'border-white/10 hover:border-brandGold/50 hover:bg-brandGold/5 text-white'}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <button onClick={() => handleSelect('individual')} className={getBtnClass('individual')}>
        👤 Individual
      </button>
      <button onClick={() => handleSelect('huf')} className={getBtnClass('huf')}>
        👨‍👩‍👧‍👦 HUF
      </button>
      <button onClick={() => handleSelect('company')} className={getBtnClass('company')}>
        🏢 Company
      </button>
      <button onClick={() => handleSelect('llp')} className={getBtnClass('llp')}>
        🤝 LLP
      </button>
      <button onClick={() => handleSelect('partnership')} className={getBtnClass('partnership')}>
        🤝 Partnership Firm
      </button>
      <button onClick={() => handleSelect('trust')} className={getBtnClass('trust')}>
        🏛️ Trust
      </button>
    </div>
  );
}
