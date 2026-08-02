export type QuestionType = 'bool' | 'text' | 'date' | 'number' | 'select' | 'custom';

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
  labelColor?: 'brandGold' | 'brandCyan' | 'brandPurple';
  options?: SelectOption[]; // For 'select' type
}

export const ROUTER_QUESTIONS: Record<string, QuestionDef> = {
  primary_jurisdiction: {
    id: 'primary_jurisdiction',
    type: 'custom',
    heading: 'Which jurisdictions are involved?',
    questionLabel: 'Setup: Step 1',
    labelColor: 'brandGold',
  },
  us_entity_type: {
    id: 'us_entity_type',
    type: 'custom',
    heading: 'Select the US Entity Structure',
    questionLabel: 'Setup: US Entity',
    labelColor: 'brandCyan',
  },
  india_entity_type: {
    id: 'india_entity_type',
    type: 'custom',
    heading: 'Select the India Entity Structure',
    questionLabel: 'Setup: India Entity',
    labelColor: 'brandGold',
  },
  base_tax_year: {
    id: 'base_tax_year',
    type: 'select',
    heading: 'Which Tax Year are you filing for?',
    footnote: 'This establishes the baseline calendar for both the US (Jan-Dec) and Indian (Apr-Mar) tax engines.',
    questionLabel: 'Question 00',
    options: [
      { value: '2026', label: '2026 (US TY26 / India TY26-27)' }
    ],
    labelColor: 'brandGold',
  },
  full_name: {
    id: 'full_name',
    type: 'text',
    heading: 'What is your full name?',
    footnote: 'Flag Role: Personal information synced to Specialist compliance workspaces.',
    questionLabel: 'Question 01a',
    labelColor: 'brandGold',
  },
  date_of_birth: {
    id: 'date_of_birth',
    type: 'date',
    heading: 'What is your date of birth?',
    footnote: 'Flag Role: Personal information synced to Specialist compliance workspaces.',
    questionLabel: 'Question 01b',
    labelColor: 'brandGold',
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
  personal_tax_ids: {
    id: 'personal_tax_ids',
    type: 'custom',
    heading: 'Enter Personal Tax IDs',
    questionLabel: 'Personal Tax Identifiers',
    labelColor: 'brandGold', // It's white/40 in HTML, but we'll adapt in the UI
  },
  us_business_demographics: {
    id: 'us_business_demographics',
    type: 'custom',
    heading: 'US Entity Details',
    questionLabel: 'US Entity Demographics',
  },
  us_business_tax_ids: {
    id: 'us_business_tax_ids',
    type: 'custom',
    heading: 'US Business Tax IDs',
    questionLabel: 'US Business Tax Identifiers',
  },
  india_business_demographics: {
    id: 'india_business_demographics',
    type: 'custom',
    heading: 'Indian Entity Details',
    questionLabel: 'Indian Entity Demographics',
  },
  india_business_tax_ids: {
    id: 'india_business_tax_ids',
    type: 'custom',
    heading: 'Indian Business Tax IDs',
    questionLabel: 'Indian Business Tax Identifiers',
  }
};

