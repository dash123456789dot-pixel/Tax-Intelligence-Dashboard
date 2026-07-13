'use client';
import ChecklistRow from './ChecklistRow';

export default function ExposureCard({
  title,
  isActive,
  colorClass,
  checklist
}: {
  title: string;
  isActive: boolean;
  colorClass: 'brandGold' | 'brandCyan';
  checklist: {
    label: string;
    value: boolean | number | null;
    hidden?: boolean;
  }[];
}) {
  const isGold = colorClass === 'brandGold';
  const textColor = isGold ? 'text-[#D4AF37]' : 'text-[#06B6D4]';
  const badgeActive = isGold ? 'bg-[#D4AF37] text-black' : 'bg-[#06B6D4] text-black';
  
  return (
    <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col space-y-2">
      <div className="flex justify-between items-center">
        <span className={`text-[11px] font-bold ${textColor} uppercase tracking-widest`}>{title}</span>
        {isActive ? (
          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${badgeActive}`}>
            ACTIVE
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-white/5 text-white/40 border border-white/10">
            INACTIVE
          </span>
        )}
      </div>
      <ul className="text-[9px] space-y-1.5 text-white/40 pt-2">
        {checklist.map((item, idx) => (
          <ChecklistRow key={idx} {...item} />
        ))}
      </ul>
    </div>
  );
}
