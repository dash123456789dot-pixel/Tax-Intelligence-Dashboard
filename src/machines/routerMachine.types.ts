// Every field in routerState from router.html, typed exactly

export type RouterInputs = {
  base_tax_year: string | null;
  full_name: string | null;
  date_of_birth: string | null;          // ISO date string YYYY-MM-DD
  is_indian_citizen: boolean | null;
  is_pio_or_oci: boolean | null;
  india_days: number | null;
  has_india_source_income_or_assets: boolean | null;
  is_us_citizen: boolean | null;
  has_green_card: boolean | null;
  was_in_us_this_year: boolean | null;
  us_days: number | null;
  has_us_source_income_or_assets: boolean | null;
  liable_to_tax_in_another_country: boolean | null;
  left_india_for_employment_this_year: boolean | null;
  tb_permanent_home: string | null;
  tb_vital_interests: string | null;
  tb_habitual_abode: string | null;
  tb_nationality: string | null;
};

export type JurisdictionResult = 'dual' | 'india_only' | 'us_only' | 'none';

export type RouterDerived = {
  india_flag: boolean;
  us_flag: boolean;
  jurisdiction: JurisdictionResult;
  is_statutory_dual_resident: boolean;
  tie_breaker_winner: 'india' | 'us' | null;
};

export type RouterContext = RouterInputs & RouterDerived & {
  currentQuestionIndex: number;
  activeQuestions: string[];       // ordered list of question IDs currently in flow
  isComplete: boolean;
};

// Every event the machine accepts
export type RouterEvent =
  | { type: 'SET_BOOL'; fieldId: keyof RouterInputs; value: boolean }
  | { type: 'SET_TEXT'; fieldId: 'base_tax_year' | 'full_name' | 'tb_permanent_home' | 'tb_vital_interests' | 'tb_habitual_abode' | 'tb_nationality'; value: string }
  | { type: 'SET_DATE'; fieldId: 'date_of_birth'; value: string }
  | { type: 'SET_INT'; fieldId: 'india_days' | 'us_days'; value: number }
  | { type: 'HYDRATE'; context: Partial<RouterContext> }
  | { type: 'ADVANCE' }
  | { type: 'BACK' }
  | { type: 'RESET' };
