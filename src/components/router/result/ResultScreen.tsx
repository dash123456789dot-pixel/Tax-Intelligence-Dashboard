'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRouterMachine } from '@/hooks/useRouterMachine';
import ExposureCard from './ExposureCard';

export default function ResultScreen({ machine }: { machine: ReturnType<typeof useRouterMachine> }) {
  const { ctx, reset } = machine;
  const router = useRouter();
  const [redirecting, setRedirecting] = useState<string | null>(null);

  const indiaActive = ctx.india_flag === true;
  const usActive = ctx.us_flag === true;

  const dual = indiaActive && usActive;
  const india_only = indiaActive && !usActive;
  const us_only = !indiaActive && usActive;
  const none = !indiaActive && !usActive;

  useEffect(() => {
    if (india_only) {
      setRedirecting('India');
      sessionStorage.setItem('wising_router_payload', JSON.stringify(ctx));
      const timer = setTimeout(() => {
        router.push('/layer1/india');
      }, 1800);
      return () => clearTimeout(timer);
    }
    
    if (us_only) {
      setRedirecting('US');
      const timer = setTimeout(() => {
        router.push('/us');
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [india_only, us_only, router]);

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
    badgeColor = 'text-white'; // No specific pulse animation in router.html for dual, just generic dual text in router
  } else if (india_only) {
    resultBadgeText = 'INDIA ONLY';
    resultDescText = 'Exposure detected under the **India tax code only**. Redirecting to India Specialist compliance workspace automatically...';
    badgeColor = 'text-[#D4AF37]';
  } else if (us_only) {
    resultBadgeText = 'US ONLY';
    resultDescText = 'Exposure detected under the **US tax code only**. Redirecting to US Specialist compliance workspace automatically...';
    badgeColor = 'text-[#06B6D4]';
  }

  return (
    <div id="flow-complete-slide" className="w-full flex flex-col justify-center max-w-4xl mx-auto px-4">
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

      <div className="flex flex-col sm:flex-row gap-3 w-full justify-center mt-6">
        {dual && (
          <>
            <button 
              onClick={() => {
                sessionStorage.setItem('wising_router_payload', JSON.stringify(ctx));
                router.push('/layer1/india');
              }}
              className="flex-1 py-3 bg-[#D4AF37] text-black font-black text-center text-[10px] uppercase tracking-widest rounded-xl hover:brightness-110 transition-all"
            >
              Open Tax Intelligence (India)
            </button>
            <button 
              onClick={() => router.push('/us')}
              className="flex-1 py-3 bg-[#06B6D4] text-black font-black text-center text-[10px] uppercase tracking-widest rounded-xl hover:brightness-110 transition-all"
            >
              Open Tax Intelligence (US)
            </button>
          </>
        )}
        <button 
          onClick={reset}
          className="flex-1 py-3 border border-white/10 hover:border-white/30 bg-white/5 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all max-w-[300px] mx-auto"
        >
          Restart Questionnaire
        </button>
      </div>

      {(india_only || us_only) && (
        <div className="flex justify-center mt-8">
          <div className="flex items-center space-x-3 text-white/50">
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs tracking-widest uppercase font-bold">Auto-Routing...</span>
          </div>
        </div>
      )}
    </div>
  );
}
