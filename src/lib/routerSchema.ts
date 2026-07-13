export type QuestionType = 'bool' | 'text' | 'date' | 'number' | 'select';

export interface SelectOption {
  value: string;
  label: string;
}

export interface QuestionDef {
  id: string;
  type: QuestionType;
  heading: string;
  footnote?: string;
  questionLabel?: string;
  labelColor?: 'brandGold' | 'brandCyan';
  options?: SelectOption[]; // For 'select' type
}

export const ROUTER_QUESTIONS: Record<string, QuestionDef> = {
  base_tax_year: {
    id: 'base_tax_year',
    type: 'select',
    heading: 'Which Tax Year are you filing for?',
    footnote: 'Select the primary tax year for this assessment.',
    options: [
      { value: '2022', label: '2022 (US TY22 / India FY22-23)' },
      { value: '2023', label: '2023 (US TY23 / India FY23-24)' },
      { value: '2024', label: '2024 (US TY24 / India FY24-25)' },
      { value: '2025', label: '2025 (US TY25 / India FY25-26)' },
      { value: '2026', label: '2026 (US TY26 / India FY26-27)' }
    ],
    labelColor: 'brandGold',
  },
  full_name: {
    id: 'full_name',
    type: 'text',
    heading: 'What is your full name?',
    footnote: 'Flag Role: Personal information synced to Specialist compliance workspaces.',
  },
  date_of_birth: {
    id: 'date_of_birth',
    type: 'date',
    heading: 'What is your date of birth?',
    footnote: 'Flag Role: Personal information synced to Specialist compliance workspaces.',
  },
  is_indian_citizen: {
    id: 'is_indian_citizen',
    type: 'bool',
    heading: 'Are you an Indian citizen?',
    footnote: 'Flag Role: Contributes to India Flag. Gates employment-departure & other country liability questions.',
    questionLabel: 'Question 01',
    labelColor: 'brandGold',
  },
  is_pio_or_oci: {
    id: 'is_pio_or_oci',
    type: 'bool',
    heading: 'Are you a Person of Indian Origin (PIO) or OCI cardholder?',
    footnote: 'Enabled if: Non-Indian Citizen. Flag Role: Pre-filled for the 120-day visitor path (s.6(6)(c)).',
    questionLabel: 'Question 02 (Conditional)',
    labelColor: 'brandGold',
  },
  india_days: {
    id: 'india_days',
    type: 'number',
    heading: 'How many days were you physically present in India this tax year?',
    footnote: '1 April 2025 – 31 March 2026',
    questionLabel: 'Question 03',
    labelColor: 'brandGold',
  },
  has_india_source_income_or_assets: {
    id: 'has_india_source_income_or_assets',
    type: 'bool',
    heading: 'Do you have any India-source income or Indian-situs assets this year?',
    footnote: 'INCLUDES: NRO/NRE interest, Indian dividends, rental income, capital gains, salary/pension, property, bank accounts, demat holdings, or mutual funds.',
    questionLabel: 'Question 04',
    labelColor: 'brandGold',
  },
  is_us_citizen: {
    id: 'is_us_citizen',
    type: 'bool',
    heading: 'Are you a US citizen?',
    footnote: 'Flag Role: If true, us_flag is set to true unconditionally. US has worldwide taxing rights for all citizens.',
    questionLabel: 'Question 05',
    labelColor: 'brandCyan',
  },
  has_green_card: {
    id: 'has_green_card',
    type: 'bool',
    heading: 'Do you hold a valid US Green Card (Form I-551)?',
    footnote: 'Enabled if: Non-US Citizen. Note: An unsurrendered Green Card creates taxing rights even if expired.',
    questionLabel: 'Question 06 (Conditional)',
    labelColor: 'brandCyan',
  },
  was_in_us_this_year: {
    id: 'was_in_us_this_year',
    type: 'bool',
    heading: 'Were you physically present in the United States at any point this calendar year?',
    footnote: '1 January 2026 – 31 December 2026',
    questionLabel: 'Question 07',
    labelColor: 'brandCyan',
  },
  us_days: {
    id: 'us_days',
    type: 'number',
    heading: 'Exactly how many days were you in the US this calendar year?',
    footnote: '1 January 2026 – 31 December 2026',
    questionLabel: 'Question 07b (Conditional)',
    labelColor: 'brandCyan',
  },
  has_us_source_income_or_assets: {
    id: 'has_us_source_income_or_assets',
    type: 'bool',
    heading: 'Do you have any US-source income or US-situs assets this year?',
    footnote: 'INCLUDES: US salary, RSU vesting, US rental, US dividends, US bank interest, US brokerage accounts, or US real estate holdings.',
    questionLabel: 'Question 07c',
    labelColor: 'brandCyan',
  },
  liable_to_tax_in_another_country: {
    id: 'liable_to_tax_in_another_country',
    type: 'bool',
    heading: 'Are you personally liable to pay income tax in any other country this year?',
    footnote: 'Note: collected to pre-fill Deemed Resident path s.6(1A). UAE personal income tax is 0% -> answer False.',
    questionLabel: 'Question 08 (Pass-Through)',
    labelColor: 'brandGold',
  },
  left_india_for_employment_this_year: {
    id: 'left_india_for_employment_this_year',
    type: 'bool',
    heading: 'Did you leave India this year specifically for employment abroad or as a ship crew member?',
    footnote: 'Pre-filled to gate employment_or_crew_status inside layer1_india. Enabled for: Indian Citizens.',
    questionLabel: 'Question 09 (Pass-Through)',
    labelColor: 'brandGold',
  },
  tb_permanent_home: {
    id: 'tb_permanent_home',
    type: 'select',
    heading: 'Where do you have a permanent home available to you?',
    footnote: 'DTAA Tie-Breaker Step 1 (Article 4). A permanent home is arranged and retained for your continuous use.',
    options: [
      { value: 'india', label: 'India Only' },
      { value: 'us', label: 'US Only' },
      { value: 'both', label: 'Both Countries' },
      { value: 'neither', label: 'Neither Country' }
    ],
    labelColor: 'brandCyan',
  },
  tb_vital_interests: {
    id: 'tb_vital_interests',
    type: 'select',
    heading: 'Where is your center of vital interests?',
    footnote: 'DTAA Tie-Breaker Step 2. Where are your closest personal and economic relations?',
    options: [
      { value: 'india', label: 'Closer to India' },
      { value: 'us', label: 'Closer to the US' },
      { value: 'undetermined', label: 'Cannot be determined' }
    ],
    labelColor: 'brandCyan',
  },
  tb_habitual_abode: {
    id: 'tb_habitual_abode',
    type: 'select',
    heading: 'Where do you have an habitual abode?',
    footnote: 'DTAA Tie-Breaker Step 3. In which country do you live more habitually/routinely?',
    options: [
      { value: 'india', label: 'India' },
      { value: 'us', label: 'United States' },
      { value: 'both', label: 'Both / Undetermined' },
      { value: 'neither', label: 'Neither' }
    ],
    labelColor: 'brandCyan',
  },
  tb_nationality: {
    id: 'tb_nationality',
    type: 'select',
    heading: 'What is your nationality / citizenship?',
    footnote: 'DTAA Tie-Breaker Step 4. Usually decided by mutual agreement if dual national.',
    options: [
      { value: 'india', label: 'Indian Citizen' },
      { value: 'us', label: 'US Citizen' },
      { value: 'other', label: 'Other / Dual' }
    ],
    labelColor: 'brandCyan',
  }
};

