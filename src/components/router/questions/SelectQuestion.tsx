import React from 'react';
import { QuestionDef } from '../../../lib/routerSchema';
import { ArrowRight } from 'lucide-react';

interface SelectQuestionProps {
  question: QuestionDef;
  value: string | null;
  onChange: (val: string) => void;
  onContinue: () => void;
}

export function SelectQuestion({
  question,
  value,
  onChange,
  onContinue,
}: SelectQuestionProps) {
  // If no options provided, fallback to an empty select
  const options = question.options || [];

  return (
    <div className="w-full text-left">
      <div className="relative max-w-md mr-auto">
        <select
          value={value ?? ''}
          onChange={(e) => {
            console.log("Select changed to:", e.target.value);
            onChange(e.target.value);
          }}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-2xl font-black text-white focus:border-brandGold/50 outline-none transition-colors appearance-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 1.5rem center',
            backgroundSize: '1.5em 1.5em',
            paddingRight: '3rem'
          }}
        >
          <option value="" disabled hidden className="text-white/50">-- Select Option --</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#121212] text-white">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="w-full max-w-md mr-auto flex justify-start mt-10">
        <button
          onClick={onContinue}
          disabled={!value}
          className="w-full py-4 bg-brandGold text-black font-black text-xs uppercase tracking-widest rounded-xl hover:brightness-110 transition-all flex items-center justify-between px-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Continue</span>
          <kbd className="hidden sm:inline px-2 py-1 bg-black/10 rounded text-[10px] font-mono text-black/50 border border-black/5">Enter</kbd>
        </button>
      </div>
    </div>
  );
}
