import type { ResidencyStatus } from '../lib/residencySolver.types';

export type StepId =
  | 'step-profile' | 'step-dtaa' | 'step-compliance' | 'step-assets'
  | 'step-income' | 'step-hp' | 'step-business' | 'step-deductions'
  | 'step-credits' | 'step-output';

export type Layer1IndiaContext = {
  // ── Navigation ──
  activeStep: StepId;
  unlockedSteps: StepId[];          // starts as ['step-profile']

  // ── profile (from state.profile) ──
  profile: {
    full_name: string | null;
    entity_type: string;            // 'individual' default
    date_of_birth: string | null;
    pan: string | null;
    pan_aadhaar_linked: boolean;
    tax_regime: 'NEW' | 'OLD';
    turnover_lte_400cr: boolean;
    opt_115ba: boolean;
    opt_115baa: boolean;
    opt_115bab: boolean;
    mat_book_profit: number | null;
    mfg_setup_date: string | null;
    mfg_commence_date: string | null;
  };

  // ── residency_detail (from state.residency_detail) ──
  residency_detail: {
    live_tracking_active: boolean;
    trips: Array<{ arrival_date: string | null; departure_date: string | null }>;
    manual_days: number;
    days_in_india_current_year: number;
    days_in_india_preceding_4_years_gte_365: boolean | null;
    employment_or_crew_status: 'none' | 'employment' | 'crew' | null;
    is_departure_year: boolean | null;
    is_indian_citizen: boolean | null;
    is_pio_or_oci: boolean | null;
    nr_years_last_10_gte_9: boolean | null;
    days_in_india_last_7_years_lte_729: boolean | null;
    income_above_15l: boolean | null;
    liable_to_tax_in_another_country: boolean;
    is_wholly_outside_india: boolean | null;
    is_indian_company: boolean | null;
    is_poem_in_india: boolean | null;
    us_person_certified_to_bank: boolean | null;
    final_india_residency_status: ResidencyStatus;
  };

  // ── dtaa slice the solver reads ──
  dtaa: {
    dtaa_treaty_residence: 'none' | 'us' | string;
    dtaa_forced_nr: boolean;
  };

  // ── derived residency result (from the solver) ──
  residency_result: {
    status: ResidencyStatus;
    path: string;
    scope: string;
    dtaa_overridden: boolean;
  };
};

export type Layer1IndiaEvent =
  | { type: 'SWITCH_STEP'; step: StepId }
  | { type: 'SET_PROFILE'; field: keyof Layer1IndiaContext['profile']; value: unknown }
  | { type: 'SET_RESIDENCY'; field: keyof Layer1IndiaContext['residency_detail']; value: unknown }
  | { type: 'SET_DTAA'; field: keyof Layer1IndiaContext['dtaa']; value: unknown }
  | { type: 'SET_MANUAL_DAYS'; value: number }
  | { type: 'TOGGLE_LIVE_TRACKING'; value: boolean }
  | { type: 'ADD_TRIP' }
  | { type: 'UPDATE_TRIP'; index: number; field: 'arrival_date' | 'departure_date'; value: string }
  | { type: 'REMOVE_TRIP'; index: number }
  | { type: 'HYDRATE'; context: Partial<Layer1IndiaContext> };  // for router prefill + DB load
