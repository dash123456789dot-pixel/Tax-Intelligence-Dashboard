import React, { useState, useEffect } from 'react';

interface UsBusinessDemographicsSlideProps {
  machine: any;
  onAdvance: () => void;
}

export default function UsBusinessDemographicsSlide({ machine, onAdvance }: UsBusinessDemographicsSlideProps) {
  const { ctx, setText, setDate } = machine;
  
  const [name, setName] = useState(ctx.us_entity_name || '');
  const [date, setFormDate] = useState(ctx.us_formation_date || '');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (name !== (ctx.us_entity_name || '')) setText('us_entity_name', name);
  }, [name, setText, ctx.us_entity_name]);

  useEffect(() => {
    if (date !== (ctx.us_formation_date || '')) setDate('us_formation_date', date);
  }, [date, setDate, ctx.us_formation_date]);

  const handleContinue = () => {
    if (!name.trim() || !date) {
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
          <label className="block text-[10px] text-white/50 mb-1 uppercase tracking-widest font-black">US Legal Entity Name</label>
          <input 
            type="text" 
            placeholder="e.g. Acme LLC" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-lg font-black text-white focus:border-brandCyan/50 outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-[10px] text-white/50 mb-1 uppercase tracking-widest font-black">US Date of Incorporation / Formation</label>
          <input 
            type="date" 
            value={date}
            onChange={(e) => setFormDate(e.target.value)}
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
      {error && <p className="text-xs text-brandRed font-bold mt-4">Please provide all Entity details.</p>}
    </div>
  );
}
