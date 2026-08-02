// Every field in routerState from router.html, typed exactly

export type RouterInputs = {
  primary_jurisdiction: 'india' | 'us' | 'cross_border' | null;
  us_entity_type: 'individual' | 'c_corp' | 's_corp' | 'partnership' | 'trust' | null;
  india_entity_type: 'individual' | 'huf' | 'company' | 'llp' | 'partnership' | 'trust' | null;
  base_tax_year: string | null;
  full_name: string | null;
  date_of_birth: string | null;          // ISO date string YYYY-MM-DD

  pan: string | null;
  ssn: string | null;
  us_entity_name: string | null;
  us_formation_date: string | null;
  ein: string | null;
  india_entity_name: string | null;
  india_formation_date: string | null;
  corp_pan: string | null;
  cin: string | null;
};

export type JurisdictionResult = 'dual' | 'india_only' | 'us_only' | 'none';

export type RouterDerived = {
  india_flag: boolean;
  us_flag: boolean;
  jurisdiction: JurisdictionResult;
};

export type RouterContext = RouterInputs & RouterDerived & {
  currentQuestionIndex: number;
  activeQuestions: string[];       // ordered list of question IDs currently in flow
  isComplete: boolean;
};

// Every event the machine accepts
export type RouterEvent =
  | { type: 'SET_BOOL'; fieldId: keyof RouterInputs; value: boolean }
  | { type: 'SET_STRING'; fieldId: keyof RouterInputs; value: string }
  | { type: 'SET_TEXT'; fieldId: keyof RouterInputs; value: string }
  | { type: 'SET_DATE'; fieldId: keyof RouterInputs; value: string }
  | { type: 'SET_INT'; fieldId: keyof RouterInputs; value: number }
  | { type: 'HYDRATE'; context: Partial<RouterContext> }
  | { type: 'ADVANCE' }
  | { type: 'BACK' }
  | { type: 'RESET' };
