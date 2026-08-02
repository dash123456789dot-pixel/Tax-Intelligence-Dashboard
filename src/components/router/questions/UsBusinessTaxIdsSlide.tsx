import React, { useState, useEffect } from 'react';

interface UsBusinessTaxIdsSlideProps {
  machine: any;
  onAdvance: () => void;
}

export default function UsBusinessTaxIdsSlide({ machine, onAdvance }: UsBusinessTaxIdsSlideProps) {
  const { ctx, setText } = machine;
  
  const [ein, setEin] = useState(ctx.ein || '');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (ein !== (ctx.ein || '')) setText('ein', ein);
  }, [ein, setText, ctx.ein]);

  const handleContinue = () => {
    if (!ein.trim()) {
      setError(true);
      return;
    }
    setError(false);
    onAdvance();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-3">
        <div>
          <label className="block text-[10px] text-white/50 mb-1 uppercase tracking-widest font-black">US EIN (Employer Identification Number)</label>
          <input 
            type="text" 
            placeholder="XX-XXXXXXX" 
            value={ein}
            onChange={(e) => setEin(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-lg font-black text-white focus:border-brandCyan/50 outline-none transition-colors"
          />
        </div>
      </div>
      <div className="flex gap-4 mt-4">
        <button 
          onClick={handleContinue} 
          className="px-6 py-3 bg-brandGold text-black font-black text-xs uppercase tracking-widest rounded-xl hover:brightness-110 transition-all flex items-center gap-2"
        >
          <span>Continue</span>
        </button>
      </div>
      {error && <p className="text-xs text-brandRed font-bold mt-4">Please complete all required fields.</p>}
    </div>
  );
}
