import React, { useState, useEffect } from 'react';
import { QuestionDef } from '@/lib/routerSchema';

interface PersonalTaxIdsSlideProps {
  machine: any;
  onAdvance: () => void;
}

export default function PersonalTaxIdsSlide({ machine, onAdvance }: PersonalTaxIdsSlideProps) {
  const { ctx, setText } = machine;
  const showIndia = ctx.primary_jurisdiction === 'india' || ctx.primary_jurisdiction === 'cross_border';
  const showUs = ctx.primary_jurisdiction === 'us' || ctx.primary_jurisdiction === 'cross_border';

  const [pan, setPan] = useState(ctx.pan || '');
  const [ssn, setSsn] = useState(ctx.ssn || '');
  const [error, setError] = useState(false);

  // Sync to context on blur or change
  useEffect(() => {
    if (pan !== (ctx.pan || '')) setText('pan', pan);
  }, [pan, setText, ctx.pan]);
  
  useEffect(() => {
    if (ssn !== (ctx.ssn || '')) setText('ssn', ssn);
  }, [ssn, setText, ctx.ssn]);

  const handleContinue = () => {
    if (showIndia && !pan.trim()) {
      setError(true);
      return;
    }
    if (showUs && !ssn.trim()) {
      setError(true);
      return;
    }
    setError(false);
    onAdvance();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-3">
        {showIndia && (
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
        )}
        {showUs && (
          <div>
            <label className="block text-[10px] text-white/50 mb-1 uppercase tracking-widest font-black">US SSN (Social Security Number) or ITIN</label>
            <input 
              type="text" 
              placeholder="XXX-XX-XXXX" 
              value={ssn}
              onChange={(e) => setSsn(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-lg font-black text-white focus:border-brandCyan/50 outline-none transition-colors"
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
