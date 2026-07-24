'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRouterMachine } from '@/hooks/useRouterMachine';
import ExposureCard from './ExposureCard';

export default function ResultScreen({ machine }: { machine: ReturnType<typeof useRouterMachine> }) {
  const { ctx } = machine;
  const router = useRouter();

  // Phase 0: Determining (0-5s)
  // Phase 1: Exposing (5-8s)
  // Phase 2: Routing (8s+)
  const [phase, setPhase] = useState(0);

  const indiaActive = ctx.india_flag === true;
  const usActive = ctx.us_flag === true;

  const dual = indiaActive && usActive;
  const india_only = indiaActive && !usActive;
  const us_only = !indiaActive && usActive;
  const none = !indiaActive && !usActive;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 5000);
    const t2 = setTimeout(() => setPhase(2), 8000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (phase === 2) {
      if (india_only || dual) {
        sessionStorage.setItem('wising_router_payload', JSON.stringify(ctx));
        router.push('/layer1/india');
      } else if (us_only) {
        router.push('/us');
      }
    }
  }, [phase, india_only, dual, us_only, ctx, router]);

  const indiaChecklist = [
    { label: 'Indian Citizen', value: ctx.is_indian_citizen },
    { label: 'PIO or OCI Cardholder', value: ctx.is_pio_or_oci },
    { label: 'India Presence (Days > 0)', value: ctx.india_days },
    { label: 'India-Source Income / Assets', value: ctx.has_india_source_income_or_assets },
    { label: 'Tax Liable Elsewhere (Deemed)', value: ctx.liable_to_tax_in_another_country, hidden: true },
    { label: 'Employment Departure Status', value: ctx.left_india_for_employment_this_year, hidden: true }
  ];

  const usChecklist = [
    { label: 'US Citizen', value: ctx.is_us_citizen },
    { label: 'US Green Card Holder', value: ctx.has_green_card },
    { label: 'US Presence (Days > 0)', value: (ctx.was_in_us_this_year === true && ctx.us_days !== null && ctx.us_days > 0) ? ctx.us_days : ctx.was_in_us_this_year === false ? 0 : null },
    { label: 'US-Source Income / Assets', value: ctx.has_us_source_income_or_assets }
  ];

  let resultBadgeText = 'NONE';
  let resultDescText = 'No exposure detected. Instantiation of specialist Layer 1 tax compliance modules is locked.';
  let badgeColor = 'text-white/40';

  if (dual) {
    resultBadgeText = 'DUAL EXPOSURE';
    resultDescText = 'Exposure detected under **both India and US tax codes**.';
    badgeColor = 'text-white';
  } else if (india_only) {
    resultBadgeText = 'INDIA ONLY';
    resultDescText = 'Exposure detected under the **India tax code only**.';
    badgeColor = 'text-[#D4AF37]';
  } else if (us_only) {
    resultBadgeText = 'US ONLY';
    resultDescText = 'Exposure detected under the **US tax code only**.';
    badgeColor = 'text-[#06B6D4]';
  }

  let routingText = 'Routing...';
  if (india_only || dual) routingText = 'Routing to Indian Jurisdiction...';
  if (us_only) routingText = 'Routing to US Jurisdiction...';

  return (
    <div id="flow-complete-slide" className="w-full flex flex-col justify-center max-w-4xl mx-auto px-4">
      {phase === 0 ? (
        <div className="flex flex-col items-center justify-center space-y-6 py-20">
          <svg className="animate-spin h-10 w-10 text-white/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm tracking-[0.2em] uppercase font-bold text-white/70">Determining Jurisdiction</span>
        </div>
      ) : (
        <>
          <div className="text-center mb-10 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 rounded-full bg-[#10B981]/20 text-[#10B981] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Jurisdiction Routing Determination</h2>
            
            <div id="result-badge" className={`text-3xl lg:text-4xl font-black tracking-widest uppercase py-3 px-6 rounded-2xl transition-all duration-300 ${badgeColor}`}>
              {resultBadgeText}
            </div>
            
            <p id="result-desc" className="text-xs text-white/50 max-w-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: resultDescText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 w-full">
            <ExposureCard 
              title="India Tax Exposure" 
              isActive={indiaActive} 
              colorClass="brandGold" 
              checklist={indiaChecklist} 
            />
            <ExposureCard 
              title="US Tax Exposure" 
              isActive={usActive} 
              colorClass="brandCyan" 
              checklist={usChecklist} 
            />
          </div>

          {phase === 2 && !none && (
            <div className="flex justify-center mt-8">
              <div className="flex items-center space-x-3 text-white/50">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-xs tracking-widest uppercase font-bold">{routingText}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
