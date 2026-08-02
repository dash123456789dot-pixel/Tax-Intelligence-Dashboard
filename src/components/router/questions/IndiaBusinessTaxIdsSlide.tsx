import React, { useState, useEffect } from 'react';

interface IndiaBusinessTaxIdsSlideProps {
  machine: any;
  onAdvance: () => void;
}

export default function IndiaBusinessTaxIdsSlide({ machine, onAdvance }: IndiaBusinessTaxIdsSlideProps) {
  const { ctx, setText } = machine;
  
  const [pan, setPan] = useState(ctx.corp_pan || '');
  const [cin, setCin] = useState(ctx.cin || '');
  const [error, setError] = useState(false);

  const isCompany = ctx.india_entity_type === 'company';
  const isLlp = ctx.india_entity_type === 'llp';

  useEffect(() => {
    if (pan !== (ctx.corp_pan || '')) setText('corp_pan', pan);
  }, [pan, setText, ctx.corp_pan]);

  useEffect(() => {
    if (cin !== (ctx.cin || '')) setText('cin', cin);
  }, [cin, setText, ctx.cin]);

  const handleContinue = () => {
    if (!pan.trim() || ((isCompany || isLlp) && !cin.trim())) {
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
          <label className="block text-[10px] text-white/50 mb-1 uppercase tracking-widest font-black">Indian PAN (Permanent Account Number)</label>
          <input 
            type="text" 
            placeholder="ABCDE1234F" 
            value={pan}
            onChange={(e) => setPan(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-lg font-black text-white focus:border-brandGold/50 outline-none transition-colors"
          />
        </div>
        {(isCompany || isLlp) && (
          <div>
            <label className="block text-[10px] text-white/50 mb-1 uppercase tracking-widest font-black">
              {isCompany ? 'CIN (Corporate Identification Number)' : 'LLPIN (LLP Identification Number)'}
            </label>
            <input 
              type="text" 
              placeholder={isCompany ? "U12345MH2024PTC123456" : "AAA-1234"}
              value={cin}
              onChange={(e) => setCin(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-lg font-black text-white focus:border-brandGold/50 outline-none transition-colors"
            />
          </div>
        )}
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
