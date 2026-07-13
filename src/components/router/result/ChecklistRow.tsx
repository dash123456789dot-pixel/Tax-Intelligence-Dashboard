'use client';

export default function ChecklistRow({
  label,
  value,
  hidden = false
}: {
  label: string;
  value: boolean | number | null;
  hidden?: boolean;
}) {
  if (hidden && value === null) return null;

  const isMet = value === true || (typeof value === 'number' && value > 0);
  const isFalse = value === false || (typeof value === 'number' && value === 0);

  if (isMet) {
    return (
      <li className="flex items-center space-x-2 transition-all text-[#10B981] font-bold">
        <span>[x]</span>
        <span>{label}</span>
      </li>
    );
  } else if (isFalse) {
    return (
      <li className="flex items-center space-x-2 transition-all text-white/20">
        <span>[ ]</span>
        <span className="line-through">{label}</span>
      </li>
    );
  } else {
    return (
      <li className="flex items-center space-x-2 transition-all text-white/40">
        <span>[ ]</span>
        <span>{label}</span>
      </li>
    );
  }
}
