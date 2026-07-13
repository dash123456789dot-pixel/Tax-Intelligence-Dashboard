'use client';

export default function RouterProgress({
  progressPct,
  currentIdx,
  total,
  onReset
}: {
  progressPct: number;
  currentIdx: number;
  total: number;
  onReset: () => void;
}) {
  return (
    <>
      <div id="questionnaire-header" className="flex justify-between items-center mb-6 relative z-10">
        <div>
          <span className="px-2 py-1 bg-brandGold/20 border border-brandGold/40 text-[9px] font-black text-brandGold uppercase tracking-widest rounded-md">
            Layer 0 Router v4.0
          </span>
          <span id="question-index-disp" className="text-xs font-bold text-white/40 ml-4 font-mono">
            Q{currentIdx + 1} / Q{total}
          </span>
        </div>
        <button 
          id="btn-reset-top"
          onClick={onReset} 
          className="text-[9px] font-black text-white/40 hover:text-white uppercase tracking-widest px-3 py-1.5 border border-white/10 hover:border-white/30 rounded-lg transition-all"
        >
          Reset Flow
        </button>
      </div>

      <div id="questionnaire-progress" className="w-full bg-white/5 h-1 rounded-full overflow-hidden mb-8 relative z-10">
        <div 
          id="progress-bar-fill" 
          className="bg-brandGold h-full transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </>
  );
}
