'use client';

export default function RouterFooter({
  isFirst,
  onBack,
  onSkip
}: {
  isFirst: boolean;
  onBack: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/5 relative z-10">
      <button 
        onClick={onBack}
        className={`text-xs font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest flex items-center gap-2 ${isFirst ? 'opacity-30 pointer-events-none' : ''}`}
      >
        <span>&larr; Back</span>
        <kbd className="hidden sm:inline px-1 py-0.5 bg-white/5 rounded text-[10px] font-mono text-white/30 border border-white/10">↑</kbd>
      </button>
      
      <button 
        onClick={onSkip}
        className="text-xs font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest flex items-center gap-2"
      >
        <span>Skip</span>
        <kbd className="hidden sm:inline px-1 py-0.5 bg-white/5 rounded text-[10px] font-mono text-white/30 border border-white/10">↓</kbd>
      </button>
    </div>
  );
}
