export type EmploymentStatus = 'none' | 'employment' | 'crew';

export type ResidencyInputs = {
  entity_type: 'individual' | 'huf' | string;  // solver only special-cases huf vs individual
  india_days: number | null;
  days_in_india_preceding_4_years_gte_365: boolean | null;  // p4y
  employment_or_crew_status: EmploymentStatus | null;        // emp
  is_indian_citizen: boolean | null;                         // Replaces visit flag logic natively
  is_pio_or_oci: boolean | null;                             // Replaces visit flag logic natively
  nr_years_last_10_gte_9: boolean | null;                    // nr9
  days_in_india_last_7_years_lte_729: boolean | null;        // d7_729
  income_above_15l: boolean | null;                          // inc15
  liable_to_tax_in_another_country: boolean | null;          // ltac
  // HUF-specific
  is_wholly_outside_india: boolean | null;
  is_poem_in_india: boolean | null;
  // HUF Karta RNOR conditions (capture exact fields from the HTML)
  huf_karta_nr9: boolean | null;
  huf_karta_d7_729: boolean | null;
};

export type DtaaInputs = {
  dtaa_treaty_residence: 'none' | 'us' | string;
  dtaa_forced_nr: boolean;
};

export type ResidencyStatus = 'ROR' | 'RNOR' | 'NR';

export type ResidencyResult = {
  status: ResidencyStatus;
  path: string;    // the exact legal path label, e.g. "Path ROR-1: Standard Resident (...)"
  scope: string;   // the exact income scope string
  dtaa_overridden: boolean;  // true if the DTAA override changed the solver result
};
