import { useMachine, useActorRef } from '@xstate/react';
import { useEffect } from 'react';
import { layer1IndiaMachine } from '@/machines/layer1IndiaMachine';
import { complianceSidebarMachine } from '@/machines/complianceSidebarMachine';
import * as guards from '@/machines/layer1IndiaMachine.guards';
import { readRouterHandoff } from '@/lib/routerHandoff';

export function useLayer1India() {
  const sidebarActor = useActorRef(complianceSidebarMachine);
  const [state, send] = useMachine(layer1IndiaMachine);

  // Router prefill on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const payloadStr = sessionStorage.getItem('wising_router_payload');
        if (payloadStr) {
          const routerPayload = JSON.parse(payloadStr);
          send({ type: 'HYDRATE', context: {
            profile: { 
              full_name: routerPayload.full_name ?? null, 
              date_of_birth: routerPayload.date_of_birth ?? null 
            },
            residency_detail: {
              manual_days: routerPayload.india_days ?? 182,
              india_days: routerPayload.india_days ?? 182,
              is_indian_citizen: routerPayload.is_indian_citizen ?? null,
              is_pio_or_oci: routerPayload.is_pio_or_oci ?? null,
              income_above_15l: routerPayload.has_india_source_income_or_assets ?? null,
              liable_to_tax_in_another_country: routerPayload.liable_to_tax_in_another_country ?? false,
              employment_or_crew_status: routerPayload.left_india_for_employment_this_year ? 'employment' : null
            },
          } as any});
        }
      } catch (e) {
        console.error('Failed to parse router payload', e);
      }
    }
  }, [send]);

  const ctx = state.context;
  return {
    ctx, send,
    activeStep: ctx.activeStep,
    isUnlocked: (step: string) => ctx.unlockedSteps.includes(step as never),
    residency: ctx.residency_result,
    sidebarActor,
    // visibility helpers
    show: {
      corpRegimes: guards.showCorpRegimes(ctx),
      profileRegime: guards.showProfileRegime(ctx),
      mfgDates: guards.showMfgDates(ctx),
      matProfit: guards.showMatProfit(ctx),
      presumptiveWarning: guards.showPresumptiveWarning(ctx),
      liveTrackingPanel: guards.showLiveTrackingPanel(ctx),
      p4y: guards.showP4y(ctx),
      employment: guards.showEmployment(ctx),
      visitor: guards.showVisitor(ctx),
      departure: guards.showDeparture(ctx),
      nr9: guards.showNr9(ctx),
      d7: guards.showD7(ctx),
      inc15: guards.showInc15(ctx),
    },
    setProfile: (field: string, value: unknown) => send({ type: 'SET_PROFILE', field: field as never, value }),
    setResidency: (field: string, value: unknown) => send({ type: 'SET_RESIDENCY', field: field as never, value }),
    setDtaa: (field: string, value: unknown) => send({ type: 'SET_DTAA', field: field as never, value }),
    setManualDays: (value: number) => send({ type: 'SET_MANUAL_DAYS', value }),
    toggleLiveTracking: (value: boolean) => send({ type: 'TOGGLE_LIVE_TRACKING', value }),
    switchStep: (step: string) => send({ type: 'SWITCH_STEP', step: step as never }),
  };
}
