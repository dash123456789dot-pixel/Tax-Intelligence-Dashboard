# Walkthrough: Layer 1 US Specialist & Routing Integration

This document summarizes the changes, fixes, and validation performed on the Layer 1 US Specialist workspace.

## Changes Made

### 1. Fixed JS Syntax Error in [layer1_us.html](file:///C:/Users/saarthak/.gemini/antigravity/scratch/tax-dashboard/layer1_us.html)
- **Problem**: When loading `layer1_us.html`, a `SyntaxError: Invalid or unexpected token` was thrown inside the JavaScript block.
- **Cause**: The key `401k_distributions_usd` on line 1533 of the state model started with a digit but was not quoted, which violates JavaScript identifier rules for object literal keys.
- **Solution**: Quoted the key as `"401k_distributions_usd"`. 
- **Verification**: Verified using a Node.js compilation runner (`vm.Script`) that the entire file now compiles with zero syntax errors.

### 2. Verified [router.html](file:///C:/Users/saarthak/.gemini/antigravity/scratch/tax-dashboard/router.html) Redirection (Strategy 1)
- Auto-redirection rules:
  - For `dual` jurisdiction, if India physical days are greater than or equal to US days, it auto-redirects to `layer1_india.html` after 1.8 seconds.
  - Otherwise, it auto-redirects to `layer1_us.html` after 1.8 seconds.
- Manual overrides are fully functional through action buttons.

### 3. Added Manual Workspace Switcher Toggle
- Added a high-fidelity workspace switcher toggle in the sticky header of both [layer1_us.html](file:///C:/Users/saarthak/.gemini/antigravity/scratch/tax-dashboard/layer1_us.html) and [layer1_india.html](file:///C:/Users/saarthak/.gemini/antigravity/scratch/tax-dashboard/layer1_india.html).
- The toggle displays `India L1` and `US L1` pills, with the active workspace highlighted in its respective theme accent (Gold for India, Cyan for US) and the inactive workspace acting as a link to switch instantly.
- Added direct links to both specialist workspaces in the hamburger sidebar menu under a separator line for alternative routing options.

### 4. Added Right Sidebar Widgets to US Specialist
- Upgraded the layout of [layer1_us.html](file:///C:/Users/saarthak/.gemini/antigravity/scratch/tax-dashboard/layer1_us.html) to support a 3-column layout on large screens, matching the India Specialist.
- **Try an Example Profile**: Added prefill buttons for standard persona scenarios:
  1. *Citizen Expat*: claims FEIE, foreign wages, and has foreign bank accounts.
  2. *Resident Alien (Green Card)*: Green Card holder with W-2 wages and retirement contributions.
  3. *Resident Alien (SPT)*: Meets the Substantial Presence Test via weighted physical days.
  4. *Non-Resident Alien (NRA)*: SPT not met, files ITIN Form W-7 and has ECI/FDAP income.
- **Your Current Residency Status**: Displays live residency lock certification (`US_CITIZEN`, `RESIDENT_ALIEN`, `DUAL_STATUS`, `NON_RESIDENT_ALIEN`), matching rule descriptions, and the scope of US tax exposure.
- **Derived Metrics Analyzer**: Dynamically tracks critical calculated US tax parameters side-by-side.

### 5. Gated Switcher Visibility to Dual Jurisdiction Only
- Added a check during workspace initialization to evaluate the Layer 0 router state (`wising_router_state` in `localStorage`).
- If `jurisdiction` is not `'dual'` (e.g. `'india_only'` or `'us_only'`), the workspace switcher toggle in the header and the workspace links in the sidebar hamburger menu are automatically hidden from the DOM to prevent unauthorized cross-border toggling.

## Verification & Testing

### 1. Static Validation
- Both files compiled with no syntax warnings or exceptions.

### 2. Runtime Behavior & Calculations
- **Substantial Presence Test (SPT)**: Computes `CY + (PY1 / 3) + (PY2 / 6)` days dynamically, handling exempt statuses and the closer connection exception.
- **FBAR Peaks**: Scans all bank accounts, aggregates peak balances of non-US accounts, and flags if aggregate exceeds $10,000.
- **Form 8938 Requirement**: Integrates MAGI, MFJ/single status, and foreign residency details to toggle Form 8938 necessity.
- **AMT Preference & NIIT 3.8%**: Automatically evaluates net investment income sums, applies thresholds, and calculates tax estimations.
- **Output Schema**: Compiles the 20-section `usState` schema into a formatted, downloadable, and copyable live JSON block.

### 3. Synchronized Active Workspace & Solved NRA Bypass
- **Directory Path Sync**: Discovered that development and rendering files in the user's IDE are located under the `antigravity-ide` scratch path, whereas model edits were previously targeted at the default `antigravity` scratch directory. Synced all files to `C:\Users\saarthak\.gemini\antigravity-ide\scratch\tax-dashboard\`.
- **Filing Status Bypass Guard**: Added `onFilingStatusChange` as an event interceptor in `layer1_us.html` to validate that Non-Resident Aliens (NRAs) cannot change their filing status to MFJ, HOH, or QSS unless a §6013 joint election is checked. If an invalid value is selected, the input automatically reverts and triggers an amber validation warning.
- **Redirection Gating Check**: Updated `layer1_us.html` to alert and redirect users back to `router.html` (Layer 0) if no onboarding state is found in `localStorage`, matching the behavior of `layer1_india.html` and ensuring the workspace switcher toggle is correctly gated only to Dual Jurisdiction profiles.
- **Spouse is US Person Conditional Gating**: Structured the "Spouse is a US Person?" toggle to be conditional on `filing_status` being in `["mfj", "mfs", "hoh"]`. When the filing status does not permit a spouse (i.e. `single` or `qss`), the toggle element is set to `null` in the schema state, and its UI container is completely hidden/removed from the layout using the `hidden` class.

## Move DOB and Full Name from Layer 1 Specialist Modules to Layer 0 Router Questionnaire

### 1. Unified Router Questionnaire (Layer 0)
- **Q1a (Full Name)** and **Q1b (Date of Birth)** are now requested as the first two slides in the Typeform-style questionnaire in [router.html](file:///C:/Users/saarthak/.gemini/antigravity-ide/scratch/tax-dashboard/router.html).
- The state schema handles text and date inputs and stores them in `localStorage` under `wising_router_state`.

### 2. Deletion of Redundant Fields in Layer 1 Specialists
- **India Specialist ([layer1_india.html](file:///C:/Users/saarthak/.gemini/antigravity-ide/scratch/tax-dashboard/layer1_india.html))**: Removed the `Full Name` and `Date of Birth` inputs from the profile HTML form.
- **US Specialist ([layer1_us.html](file:///C:/Users/saarthak/.gemini/antigravity-ide/scratch/tax-dashboard/layer1_us.html))**: Removed the `Date of Birth` input from the profile grid HTML form (Full Name was not present in the US Specialist profile HTML).

### 3. Dynamic Prefill and Sync
- Both specialist pages read `wising_router_state` from `localStorage` on page load in `initFromLocalStorage()`.
- They populate their internal profile state with the router's `full_name` and `date_of_birth` values and keep them as the single source of truth, overriding any older merged Specialist values.
- In [layer1_india.html](file:///C:/Users/saarthak/.gemini/antigravity-ide/scratch/tax-dashboard/layer1_india.html), prefilling the date of birth triggers senior citizen calculations (`derive80TTASection()`) dynamically on load.
- In both modules, DOM updates for the removed inputs are safeguarded with existence checks to prevent runtime `TypeError` crashes.

### 4. Interactive Persona Prefill Sync
- The "Try an Example Profile" buttons in US Specialist are updated to prefill persona-specific names and dates of birth.
- Clicking a persona dynamically synchronizes its identity (Name and Date of Birth) back to `wising_router_state` in `localStorage`, maintaining complete consistency between Layer 0 and Layer 1.

## Visual Optimization: Profile parameters stack vertically
- **India Specialist ([layer1_india.html](file:///C:/Users/saarthak/.gemini/antigravity-ide/scratch/tax-dashboard/layer1_india.html))** and **US Specialist ([layer1_us.html](file:///C:/Users/saarthak/.gemini/antigravity-ide/scratch/tax-dashboard/layer1_us.html))**: Modified the Profile Parameters grid layout to use `grid-cols-1` instead of `grid-cols-2`.
- This stretches PAN / Aadhaar / Regime options (India) and Filing Status / Taxpayer ID / Dependents options (US) across full-width rows of the step cards.
- It prevents layout squishing, gives inputs more breathing room, and aligns standard parameters beautifully in the high-fidelity UI design.

## Schema Compliance: Dynamic Residency Date Derivation
- **US Specialist ([layer1_us.html](file:///C:/Users/saarthak/.gemini/antigravity-ide/scratch/tax-dashboard/layer1_us.html))**: Added logic to calculate `residency_start_date` and `residency_end_date` dynamically inside the [evaluateUSResidencyLock](file:///C:/Users/saarthak/.gemini/antigravity-ide/scratch/tax-dashboard/layer1_us.html#L2117) function.
  - For full-year tax residents (`US_CITIZEN` or `RESIDENT_ALIEN`), the residency period spans the full year (`2026-01-01` to `2026-12-31`).
  - For dual-status taxpayers (`DUAL_STATUS`), `residency_start_date` dynamically defaults to the `green_card_grant_date` and `residency_end_date` defaults to the `i407_surrendered_date` if they are defined.
  - For non-resident aliens (`NON_RESIDENT_ALIEN`), both values correctly remain `null`.

## Compliance Integration: Dual Residency Conflict & DTAA Tie-Breaker
- **Conflict Identification**: Added real-time cross-checking logic to discover if a taxpayer qualifies as a domestic resident in both India (Fiscal Year: April–March) and the United States (Calendar Year: January–December).
- **Responsive Alert Box**: Designed a premium, glowing alert widget (`#dual-residency-alert`) that appears at the top of Step 1 in both [layer1_india.html](file:///C:/Users/saarthak/.gemini/antigravity-ide/scratch/tax-dashboard/layer1_india.html) and [layer1_us.html](file:///C:/Users/saarthak/.gemini/antigravity-ide/scratch/tax-dashboard/layer1_us.html) when a conflict is active.
- **Guidance & Education**: The alert includes detailed help panels outlining:
  - **DTAA Article 4 Tie-Breaker Rules** (Permanent Home, Center of Vital Interests, etc.) and how breaking the tie modifies tax filing rules (such as US Form 1040-NR + Form 8833).
  - **Tax Year Alignment & Apportionment** guidance, highlighting the necessity of US tax extensions (Form 4868 to October 15) to allow Indian tax liability to finalize on an accrued basis, or month-by-month income apportionment.
- **Interactive Treaty Selection Dropdown**: Added an interactive selector `#sel-dtaa-residence` mapping options:
  - `No Tie-Break / Dual Resident (Worldwide in both + FTC)`
  - `Tie-Break to India (File US Form 1040-NR + Form 8833)`
  - `Tie-Break to United States (File Indian return as Non-Resident)`
- **Real-Time Cross-Page Sync**: Bound a window `storage` event listener to both modules. If a user modifies their tie-breaker choice on one page, the DTAA state on the other page updates dynamically in real-time, preserving lockstep state agreement.

## Phase 3 Verification Results

We implemented and executed a programmatic mock browser testing suite at [verify_features.js](file:///C:/Users/saarthak/.gemini/antigravity/brain/48459a86-4525-4211-8971-8ae8826725b7/scratch/verify_features.js) to evaluate all three target behaviors under simulated conditions. All tests completed successfully with no exceptions.

### 1. DTAA Tie-Break Conflict Verification
- **Dual Resident Setup**: Configured a taxpayer with domestic residency in both the US (via citizenship/stays) and India (via `ROR`).
- **Alert Visibility**: Confirmed the premium `#dual-residency-alert` box correctly displays to guide the user on Article 4 tie-breaker rules and fiscal year adjustments.
- **Tie-Breaking Status Update**: When the treaty selector `#sel-dtaa-residence` was updated to `"Tie-Break to India"`:
  - The final US residency status immediately updated to `NON_RESIDENT_ALIEN`.
  - The `#dual-residency-alert` box remained **visible** instead of hiding, enabling the user to review or change their treaty choice dynamically.
- **Cross-Page Synchronization**: Confirmed modifying the treaty selection on the US Specialist immediately synchronized the selection back to the India Specialist's state in `localStorage` for complete alignment.

### 2. Substantial Presence Test (SPT) Calculations Card
- **Weighted Days & Badges**: Tested physical days across multiple scenarios:
  - **Scenario A (Unmet)**: Stays of 120 days across CY 2026, PY1 2025, PY2 2024. Calculated weighted days: `120 + 40 (120/3) + 20 (120/6) = 180` days. The summary card displayed `Condition Not Met (Non-Resident)` with a details explanation.
  - **Scenario B (Met)**: Current year stays increased to 150 days. Calculated weighted days: `150 + 40 + 20 = 210` days. The summary card updated to display a green `Condition Met (Resident)` badge.
  - **Scenario C (Exempt)**: Activated visitor exempt status (`f_student`). Stays successfully reset to 0, showing an amber `Exempt Status Active` badge.

### 3. India Specialist L1 State Persistence
- **State Recovery**: Merged the saved L1 India state properties (deductions, carry forward losses, bank accounts, DTAA options) into the global state on load.
- **DOM Restoration**: Confirmed all restored inputs, checkboxes, and dynamically created bank details cards successfully populated their values in the mock DOM elements (including `prof-aadhaar-linked`, `ded-elss`, and the newly added `ded-80d-senior`, `ded-80d-parents-has-insurance`, and `ded-80d-parents-med` restorations).

### 4. Exempt Individual Status History & Limits
- **Lifetime Calendar-Year Limit Controls**: Added `#exempt-details-container` which dynamically displays when `F Student` or `J Scholar` is selected. This enables users to enter:
  - First calendar year of presence in the U.S. under the status.
  - Total count of prior years claimed under the status.
  - Interactive checkboxes to declare Closer Connection exceptions (Form 8843) or lookback rule exceptions if they exceed the standard limits.
- **Dynamic Calculation Checks & Status Badges**:
  - **F-1 Student Exceeded (no override)**: If prior years $\ge 5$ and the override is not checked, the SPT stays are counted. The badge switches to `Exempt Limit Exceeded` (red), and stays count towards SPT.
  - **F-1 Student Exceeded (with override)**: Checking the override checkbox excludes their days again, returning the badge to `Exempt Status Active` (amber).
  - **J-1 Scholar Exceeded**: If prior years $\ge 2$ and lookback override is not checked, the J-1 scholar days are counted. The badge switches to `Exempt Limit Exceeded` (red).
- **Unit Testing**:
  - Added new test Scenarios C, D, E, and F to [verify_features.js](file:///C:/Users/saarthak/.gemini/antigravity/brain/48459a86-4525-4211-8971-8ae8826725b7/scratch/verify_features.js) to automate these assertions. All tests executed and passed successfully.

### 5. Simplification of Student & Scholar Exempt Status Copy
- **Simplified UI Labels**:
  - *First Calendar Year of Presence under this visa* is now **Year of first entry to U.S. on this visa** with helper text: *"Enter the year you first arrived in the U.S. on this visa (e.g., 2022). Even a single day counts as a full year."*
  - *Number of Prior Calendar Years Exemption Claimed* is now **Prior years spent in U.S. on this visa** with helper text: *"Total number of calendar years (before 2026) that you spent any part of in the U.S. on this visa."*
- **Clearer Exemption Checkboxes**:
  - *Student Exception: Keep Non-Resident status after 5 years (Form 8843)* is now **Extend Student Tax-Exempt Status (Over 5 Years)** with a plain English description of Closer Connection rules and Form 8843 requirement.
  - *Scholar Exception: Keep Non-Resident status after 2 years* is now **Extend Scholar Tax-Exempt Status (Over 2 Years)** with a clear, non-technical explanation of lookback exception rules.
- **Friendly Explanation Messages**:
  - Updated JavaScript residency evaluation outputs (displayed in the SPT stay tracker summary card) to use easy-to-understand descriptions like *"Student tax-exemption active (Year X of 5-year limit)"* or *"Scholar tax-exemption expired (2-year limit exceeded; requires lookback exception below)"* instead of tax-jargon-heavy code references.

### 6. Schema Alignment for Conditional Closer Connection Claim
- **Conformity with Conditional Schema**: Changed `closer_connection_claim` in `usState.us_residency_detail` to initialize to `null` instead of `false`.
- **Gated State Resolution**: When the gating condition (`spt_test_met = true AND us_days_current_year < 183`) is not satisfied, the property is dynamically set to `null` (rather than `false`) and the checkbox is disabled. When enabled, it is updated to `true` or `false` based on the user's interaction with the Form 8840 Closer Connection claim checkbox.
- **Conditional Visibility**: Wrapped the Closer Connection Claim? checkbox control inside `#div-closer-conn-container` which dynamically hides when the gating condition is not satisfied. This ensures the card is completely hidden when it is disabled/inactive to prevent user confusion.

### 7. Visual Stay Exclusion Indicator
- **Avoid Input Disconnect Confusion**: When an exempt status is active (e.g., Scholar Year 1 of 2), the actual physical days in the stay tracker elements (`#spt-calc-cy`, `#spt-calc-py1`, `#spt-calc-py2`) are shown with a **line-through styling** (e.g., `~~200 days~~`) and an amber **Excluded** label. This visually confirms to the user that the system is successfully reading their input values, but they are being excluded due to their active visa exemption.

### 8. State Residency Status Display (Screen 3B & Sidebar)
- **Visual State Status Cards**: Added a new `#card-state-status-summary` section at the bottom of the Step 2 (State Residency) panel. This dynamically renders a card for each state in the taxpayer's footprint.
- **Residency Rules & Classifications**:
  - *Full-Year Resident*: Primary state when `moved_states_this_year` is false.
  - *Part-Year Resident (Move-In / Move-Out)*: Primary or previous state when a move occurs.
  - *Statutory Resident*: Triggered if physical presence > 183 days and a home is maintained in NY or a secondary state.
  - *Military Resident / Exempt*: Under MSRRA.
  - *Non-Resident*: Footprint states that do not trigger other residency classes.
- **Harmonious Visual Details**: State cards display color-coded status badges, standard tax rate tags (e.g. CA 13.3%, NY 10.9%), and a `0% State Tax` badge for states with no income tax (e.g. TX, FL, WA).
- **Persistent Sidebar Integration**: Appended a state-residency status breakdown table at the bottom of the persistent "Your Current Residency Status" sidebar card to keep these classifications visible from any step of the wizard.

### 9. California FTB Exit & Domicile Planning Triggers
- **Dynamic Advice Cards**: Checking the California options now triggers live, responsive advice cards inside the California Domicile card:
  - *Are you planning to leave California?* → Triggers the FTB Exit Checklist outlining DMV, voter, and bank closure rules.
  - *Do you have a 546-day contract?* → Shows verification and rules under the RTC §17014(d) safe harbor rule.
  - *Do you still own property or hold voter registration?* → Triggers a high audit risk warning explaining how FTB wins domicile audits.
- **Dynamic Status Shift**: Checking the 546-day contract option dynamically overrides California's residency status, changing it to **Safe Harbor Non-Resident** with custom guidance explaining that worldwide income is exempt from CA tax.

### 10. Secondary States Permanent Place of Abode (PPA) Tooltip
- **Explanatory Tooltip Bubble**: Added a premium hover tooltip next to the "Did you have a home there?" checkbox inside the "Other States — Statutory Residency Trap" card stack.
- **Audit Explanation**: The tooltip explains what constitutes a Permanent Place of Abode (PPA) under statutory residency laws (owning, leasing, or having unrestricted year-round residential access to a house/apartment, and excluding short-term transient/vacation rentals or hotel stays).

## Active-Duty Military (MSRRA) Toggle Fixes
- **Problem**: Toggling the "Active-duty military member or military spouse?" switch ON in the US Specialist (Layer 1) checklist showed the checkbox was checked but did not display the conditional inputs ("Legal Home State of Record" and "Current Duty-Station State") or the MSRRA guidance panel on page load/restoration. In addition, selecting military states did not add them to the derived residency tracker or calculate the specialized MSRRA tax rules.
- **Solution**:
  1. Updated the DOM restoration block in `layer1_us.html` to invoke `toggleMilitaryFields()` on state load, and set the saved select dropdown options for `#state-mil-home` and `#state-mil-station`.
  2. Updated the initialization list in `loadSavedState()` to invoke `toggleMilitaryFields()` to ensure the layout resolves correctly if active duty state is saved.
  3. Modified `renderStateResidencyStatus()` to include `military_home_state_of_record` and `military_duty_station_state` in the set of unique states if the military toggle is active, ensuring their derived tax residency status is automatically calculated and shown in the residency cards and persistent sidebar.
  4. Modified `getStateResidencyInfo()` to calculate and return state-specific military tax residency statuses and explanations based on the 50-state categories (0% state tax home states, fully exempt military pay states, and out-of-state exempt states like CA and NY).
- **Verification**:
  - Expanded `verify_features.js` with comprehensive automated unit tests for active-duty military and verified that the state-specific outcomes match expectations (e.g. TX yields `Military Resident (0% Tax)` and CA yields `Military Duty Station (Exempt)`).
  - Verified that all tests run and pass perfectly.
  - Successfully synced all files to the IDE workspace.

## AI W-2 OCR File Upload Simulator
- **Problem**: Manually filling in the 10 separate fields of a W-2 form (wages, federal tax, social security wages/taxes, medicare wages/taxes, and state wages/taxes) is tedious. The user wants an option to upload their W-2 form to populate this data.
- **Solution**:
  1. Added a glowing **📤 Upload W-2** button to the W-2 Wages list header, and a prominent, dashed, cyan W-2 upload box directly above the W-2 list in [layer1_us.html](file:///C:/Users/saarthak/.gemini/antigravity/scratch/tax-dashboard/layer1_us.html), matching the high-visibility styling of the upload zones in the India Specialist (Layer 1).
  2. Implemented a premium, glassmorphic modal (`#modal-w2-upload`) featuring a drag-and-drop file zone for PDFs and images.
  3. Created an interactive OCR simulator allowing the user to select from three preset mock templates (Tech Corp W-2, Medical Group W-2, and Consulting LLC W-2) or drag in their own file.
  4. Added a scanning loader animation featuring a moving cyan laser bar and dynamic OCR status logs (e.g. `Initializing AI OCR extract engine`, `Scanning document for EIN`, etc.).
  5. Successfully calls `addW2Row(w2Data)` upon scanner completion to populate the W-2 wages schema, update the derived tax metrics in the sidebar, and save the state.
  6. Removed all "Box Numbers" (e.g., Box 1, Box 2, Box 15) from the Form W-2 input labels and OCR scanning log messages to keep only the descriptive field names.
  7. Restructured the W-2 input layout into a single, cohesive 5-column grid (`grid-cols-5`) on desktop, and set a fixed label height with bottom-alignment (`h-7 flex items-end`) for all labels. This ensures that even when a label wraps to two lines (e.g. "Federal Tax Withheld (USD)") and others stay on one line, all input boxes across both rows align perfectly horizontally and vertically.

## 4-Layer W-2 Wages Restructuring & Schema Alignment

### 1. New Structured W-2 Schema & DOM Layout
We restructured the W-2 wages schema and input components into a nested, four-layered format:
- **Layer 1: Core Fields (Always Visible)**: Contains `employer_name` and `wages_box1_usd`.
- **Layer 2: Advanced Taxes (Collapsible)**: Collapsed under **"Show Tax Details"** dropdown. Contains `employer_ein`, `federal_tax_withheld_usd`, `ss_wages_box3_usd`, `ss_tax_withheld_usd`, `medicare_wages_box5_usd`, and `medicare_tax_withheld_usd`.
- **Layer 3: Dynamic State/Local Taxes**: Toggled via **"Has State Taxes"** switch. Supports adding/removing multiple rows containing state codes, state wages, state tax withheld, local wages, local tax withheld, and locality names.
- **Layer 4: Rare Edge Cases**: Toggled via **"Add Benefits/Special Status"** switch. Contains a list of Box 12 benefit rows (Code + Amount) and the `is_statutory_employee` checkbox.

### 2. Backward Compatibility
- Implemented `normalizeW2Data(data)` to map older, flat W-2 data objects from `localStorage` or mock OCR templates into the nested schema format automatically during page load.

### 3. Layout Alignment & Styles
- Removed box numbers from all field labels.
- Structured Layer 1 into a grid, Layer 2 into a 3-column grid, Layer 3 state rows into a 7-column grid, and Layer 4 box 12 benefits into a 3-column grid to ensure all nested input boxes align perfectly horizontally and look premium.

### 4. Verification
- Programmatic assertions added to [verify_features.js](file:///C:/Users/saarthak/.gemini/antigravity/brain/48459a86-4525-4211-8971-8ae8826725b7/scratch/verify_features.js) pass successfully.
- Verified that AGI calculations, federal/state withholding aggregates, and additional medicare tax calculations reference the nested schema elements properly.
- All changes synchronized to the active IDE workspace.

## Dynamic Self-Employment (Schedule C) Array & Statutory W-2 Linkage

### 1. Dynamic Array Schema Restructuring
We restructured `usState.income_us_source.self_employment` from a static object to a dynamic array of objects to support multiple self-employed business operations.
- Added `business_name` (string/null) to identify each operation.
- Added `naics_code` (string/null) to capture the 6-digit Principal Business Code required by the IRS. Built input filtering to restrict inputs strictly to digits with a max length of 6.
- Added `statutory_w2_link_id` (string/null) to link W-2 statutory employee rows directly to correspond with self-employment expense sheets.

### 2. Statutory W-2 Linkage & Calculations
- Modified the W-2 schema serialization to persist the W-2 card's unique `id`.
- Created `updateStatutoryW2Dropdowns()` to dynamically scan for active W-2 cards marked as `is_statutory_employee = true`. The selector dropdowns inside self-employment cards are automatically rebuilt and populated in real-time when W-2 entries are added, modified, or removed.
- Updated `calculateEstimatedAgi()` and ECI calculations to iterate through all self-employment entries. If a business is linked to a statutory W-2, it allows the net loss (expenses) to deduct against other income directly on AGI, whereas regular self-employment losses continue to be capped at zero (`Math.max(0, seNet)`).

### 3. Restoration & Backward Compatibility
- Created `normalizeSeData(data)` to parse legacy static/flat self-employment objects recovered from `localStorage` into the array format on page initialization.
- Dynamic lists clearing and recovery in `initFromLocalStorage()` now correctly restore all saved self-employment businesses in the DOM.

### 4. Verification
- Programmatic unit tests added to [verify_features.js](file:///C:/Users/saarthak/.gemini/antigravity/brain/48459a86-4525-4211-8971-8ae8826725b7/scratch/verify_features.js) verify legacy object normalization, dynamic card creation, statutory dropdown linkage updates, and AGI calculations for both normal and statutory business losses. All tests compiled and passed successfully.

## Dedicated "Business" Step Realignment

We successfully realigned the Self-Employment (Schedule C) module into a dedicated wizard step:

### 1. Step Gating & Sidebar Navigation
- Created a new step `'step-business'` registered in the `stepIds` controller array.
- Shifted the sidebar step navigation order, inserting **"4. Business"** between **"3. US-Source Income"** and **"5. Foreign Income"** (which was previously step 4). All subsequent steps (up to 19. Schema JSON) have been incremented and renumbered accordingly.
- Extracted the entire self-employment form panel from `#panel-step-income-us` into its own `#panel-step-business` panel.
- Configured Back/Next navigation targets so that:
  - `step-income-us` routes forward to `step-business`.
  - `step-business` routes backward to `step-income-us` and forward to `step-income-foreign`.
  - `step-income-foreign` routes backward to `step-business`.

### 2. Layout & UI Polish
- Verified that all self-employment business cards align in a premium layout.
- The step header displays clear, non-technical instructions for Schedule C business expenses, NAICS 6-digit classification, and statutory employee linkages.

### 3. Verification & Testing
- Updated `verify_features.js` to assert the registration of `'step-business'` in `stepIds`.
- Successfully ran the programmatic Node.js test suite to verify correct compilation, navigation configurations, and statutory business calculations.
- Synced all updates to the target IDE workspace (`C:\Users\saarthak\.gemini\antigravity-ide\scratch\tax-dashboard`).

## Phase 4: Comprehensive U.S. Business Taxation & Compliance Integration

We completed the implementation of the comprehensive U.S. Business Taxation structure within the dedicated **"Business"** step panel of the U.S. Specialist tax dashboard.

### 1. Multi-Entity U.S. Business Schema & UI Cards
Created dedicated, collapsible UI panels (using `details` drawers) and dynamic Javascript builders for:
- **Sole Proprietorships/LLCs (Schedule C)**: Added inputs for accounting method (Cash vs. Accrual), LLC type, tax election (Disregarded, S-Corp, C-Corp), wages paid, Section 179 expense, 2026 Bonus Depreciation (at the 20% phase-down rate), vehicle mileage, and home office square footage.
- **Farming/Agriculture (Schedule F)**: Added similar detailed input parameters tailored for agricultural business schedules.
- **Partnerships (Form 1065 / Schedule K-1)**: Tracks general vs. limited partner status (affecting SE tax eligibility), material participation status (Active vs. Passive), stock/debt tax basis, and dynamic portfolio allocations (interest, dividends, capital gains).
- **S-Corporations (Form 1120-S / Schedule K-1)**: Captures S-Corp K-1 ordinary income, material participation status, tax basis, QBI wages, and asset base.
- **C-Corporations (Form 1120)**: Implements corporate-level double taxation modeling by calculating the 21% flat corporate tax rate on taxable income (gross minus COGS, operating expenses, and NOL carryforwards) and tracking shareholder dividend flows.
- **Fiduciary Trusts & Estates (Form 1041 / Schedule K-1)**: Captures ordinary income, rental real estate, and portfolio items distributed via Schedule K-1.

### 2. Business Compliance & Tax Analyzer
Implemented a real-time compliance card at the bottom of the Business step panel that displays:
- **Total Net Income**: Summarizes net active and passive pass-through flows.
- **Schedule SE Self-Employment Tax**: Calculates the 15.3% SE tax on Net SE earnings (net profits multiplied by 92.35%), adjusted for social security wage caps (capped by W-2 wages), and computes the 50% above-the-line deduction.
- **Section 199A QBI Deduction**: Models the full 20% QBI deduction, including phase-out ranges ($201,775 to $251,775 for Single, $403,500 to $503,500 for MFJ in 2026), SSTB exclusion limits, and wage/UBIA caps.
- **Corporate Tax**: Displays flat 21% C-Corp tax liability.

### 3. Hard Regulatory Limit Warning Flags
- **Passive Activity Loss Capping (Form 8582)**: Restricts net passive losses to passive income, displaying a warning flag with the suspended loss amount that carries forward.
- **Excess Business Loss Capping (Form 461)**: Identifies and limits aggregate active net losses to $305,000 (Single) / $610,000 (MFJ) for 2026, treating the disallowed excess as an individual NOL carryforward.
- **Wayfair Economic Nexus Warning**: Flags state-by-state economic nexus warnings if any single business exceeds the $100,000 gross receipts threshold.

### 4. Local Storage & Page Reload Restoration
Updated `initFromLocalStorage()` to clear, normalize, and rebuild all five new dynamic card types from local storage on page refresh, and automatically restore all UI visibility toggle controls.

### 5. Automated Verification Results
Successfully expanded [verify_features.js](file:///C:/Users/saarthak/.gemini/antigravity/brain/48459a86-4525-4211-8971-8ae8826725b7/scratch/verify_features.js) to assert these advanced rules:
- Wayfair economic nexus flags are raised on > $100K gross sales.
- Form 8582 passive activity loss caps are computed accurately.
- Form 461 Excess Business Loss limits disallow losses exceeding the $305,000 single cap.
- Above-the-line self-employment deductions (health insurance and retirement) are capped correctly.
- All mock assertions compile and pass with exit code `0`.
- All modifications are pushed to the target IDE workspace (`C:\Users\saarthak\.gemini\antigravity-ide\scratch\tax-dashboard`).

## Phase 5: Business Document Upload & AI OCR Simulator

We successfully implemented automated document uploading and simulated AI OCR parsing for the 6 key business schedules and tax forms:

### 1. Upload Actions in Headers
Added glowing cyan `📤 Upload [Document]` buttons next to the respective "Add" buttons in each business header:
- **Schedule C**: `📤 Upload Schedule C`
- **Schedule F**: `📤 Upload Schedule F`
- **Partnerships**: `📤 Upload 1065 K-1`
- **S-Corporations**: `📤 Upload 1120-S K-1`
- **C-Corporations**: `📤 Upload Form 1120`
- **Fiduciary Trusts & Estates**: `📤 Upload 1041 K-1`

### 2. Unified Document OCR Simulator Modal
Implemented a premium, glassmorphic modal `#modal-biz-upload` at the bottom of the body. Clicking any section's upload button dynamically reconfigures the modal with document-specific titles, dropzones, and preset mock templates.

### 3. Detailed Mock Preset Templates
Built high-fidelity mock data presets for instant autofill:
- **Schedule C**: *Digital Design Studio* (cash method, wages paid, vehicle, Section 179) and *E-Commerce Retail Store* (accrual method, new assets, home office).
- **Schedule F**: *Golden Apple Orchard* (farming gross, expenses, wages, 20% bonus depreciation, vehicle miles).
- **Partnerships (1065 K-1)**: *Apex Real Estate Holdings* (general partner, guaranteed payments, rental income) and *Quantum Code Startup* (limited partner, passive loss, tax basis limits).
- **S-Corporations (1120-S K-1)**: *Valuation Partners* (active ordinary income, QBI wages, capital gains).
- **C-Corporations (Form 1120)**: *Novachip Hardware* (gross, COGS, operating expenses, NOL carryovers, shareholder dividends).
- **Fiduciary (1041 K-1)**: *Vanderbilt Family Trust* (ordinary trust income, rental real estate, passive).

### 4. Interactive Scanner Animations
Bound custom file selections and presets to a multi-stage scanner animation (`simulateBizScan`) which shows a laser bar, updates a percentage bar, prints scanning logs specific to the document structure, builds the card, toggles step section visibility, and updates AGI/withholding metrics.

### 5. Verification
- Verified the page compiles without syntax issues.
- All modifications synced to the active IDE workspace.

## Phase 6: Advanced U.S. Business Taxation & Verification Details

We implemented and verified advanced U.S. Business Taxation calculations in `layer1_us.html` and added robust tests for them in `verify_features.js`.

### 1. Asset-by-Asset Depreciation Tracker
- **Fields Added**: Asset Name, MACRS Class (3-year, 5-year, 7-year, 15-year, 27.5-year, 39-year), Cost Basis, Section 179 expense, and a checkbox for 20% Bonus Depreciation.
- **Formulas & Rates**:
  - Net Year 1 depreciation is computed as the sum of allowed Section 179 + allowed Bonus Depreciation + standard MACRS depreciation on the remaining basis.
  - Bonus depreciation (20% in 2026) is restricted to non-real-estate property classes (excludes 27.5-year and 39-year classes).
  - MACRS rate multipliers: `3-year` (33.33%), `5-year` (20.00%), `7-year` (14.29%), `15-year` (5.00%), `27.5-year` (3.636%), `39-year` (2.564%).

### 2. At-Risk Basis Limitations (Form 6198)
- **Rules**: Restricts Partnership, S-Corp, and Fiduciary K-1 losses to the lesser of the taxpayer's cumulative Tax Basis and At-Risk Basis.
- **Verification**: A K-1 ordinary loss of `$50,000` with a Tax Basis of `$40,000` and an At-Risk Basis of `$30,000` was capped to a maximum allowed loss of `$30,000`, with `$20,000` disallowed and tracked separately.

### 3. Active Rental Real Estate $25,000 Exception (Form 8582)
- **Rules**: Allows active rental real estate participants to deduct up to `$25,000` of net rental losses against non-passive income. This allowance is phased out by 50 cents for every dollar that the taxpayer's Modified AGI (MAGI) exceeds `$100,000` (completely phased out at `$150,000`).
- **Verification**: A passive rental loss of `$20,000` with an active AGI of `$120,000` resulted in an allowance cap of `$15,000` (`$25,000 - ($120,000 - $100,000) * 0.50`), successfully restricting the allowed rental loss to `$15,000`.

### 4. Global Section 179 Cap & Phase-out (Form 4562)
- **Rules**: Aggregates requested Section 179 deductions globally across all pass-through entities (Schedule C, Schedule F, Partnerships, and S-Corps; excluding C-Corps). Applies a `$1.2M` cap and a `$3M` phase-out threshold dollar-for-dollar. If the threshold is exceeded, the allowable cap is reduced, and deductions are scaled down proportionally.
- **Verification**: Placed-in-service assets totaling `$3.2M` with a requested Section 179 of `$1.2M` triggered a `$200,000` cap reduction (to `$1.0M`). The system successfully calculated `$200,000` as disallowed Section 179 and scaled down the deductions.

### 5. Self-Employed Retirement Dynamic Limits
- **Rules**: Dynamically caps above-the-line self-employed retirement deductions based on taxpayer age calculated from their Date of Birth. For 2026, the limit is `$73,000` for taxpayers under age 50, and `$80,500` (including catch-up) for taxpayers age 50 or older.
- **Verification**: 
  - For a taxpayer born in 1980 (age 46 in 2026), the allowed deduction was capped at `$73,000`.
  - For a taxpayer born in 1970 (age 56 in 2026), the allowed deduction was capped at the requested `$80,000` (under the `$80,500` limit).

### 6. NIIT Passive Activity Income Integration
- **Rules**: Adds net passive business and rental income (after applying passive activity loss limitations) to the Net Investment Income (NII) pool for evaluating the 3.8% Net Investment Income Tax (NIIT) on AGI exceeding filing status thresholds.
- **Verification**: Verified that net passive income (e.g. passive K-1 gains remaining after offsetting passive losses) correctly flows into `netPassiveNii` and aggregates into the total Net Investment Income sum in the NIIT calculation module.

## Phase 7: High-Fidelity UI Adjustments & Tax-Compliance Verification Expansion

We optimized the depreciable assets input container layout and integrated strict IRS tax compliance limitations into the calculation engine:

### 1. Redesigned Depreciable Asset Layout (2-Row Grid Card)
- **Spacious Cards**: Shifted the compact table structure into a spacious, glassmorphic 2-row card layout.
- **Removed Squished Headers**: Removed the horizontal desktop column header row entirely.
- **Field Mappings**:
  - **Row 1**: Asset Description (7/12 columns) and MACRS Category dropdown (5/12 columns).
  - **Row 2**: Cost Basis, Section 179 Claim, Bonus Depreciation checkbox, and Yr 1 Deduction (each occupying a `col-span-3` layout in a 12-column grid).

### 2. Year 1 Deduction Overflow Prevention
- **Vertical Stacking**: Modified the Yr 1 Deduction display box to use a vertical flex-column structure (`flex flex-col justify-center`). Stacking the label above the numeric value gives the calculated number 100% of the card width, resolving the visual overflow bug.

### 3. MACRS Rate and Class Display Dropdowns
- **Rates and Examples**: Explicitly updated the MACRS class options to list the recovery period, IRS first-year rate percentages, and common examples side-by-side (e.g. `5-Yr [20.00%] (Computers, Vehicles, Devices)`).

### 4. Dynamic Section 179 and Bonus Depreciation Tax Gating
- **Real Estate Exclusions**: Selecting a real estate category (`27.5-year` or `39-year`) now dynamically disables the Section 179 input and the Bonus Depreciation checkbox, clearing their values and adding a compliance tooltip.
- **Basis Cap Warning**: Added active border validation highlighting Section 179 inputs in red/amber if the entered claim exceeds the asset's cost basis.

### 5. Section 179 Active Taxable Business Income Limitation
- **IRS Rules**: Implemented Form 4562's active income limit check. Aggregates W-2 wages and net active business income *before* Section 179, and caps the allowable Section 179 deduction to this sum.
- **Suspension & Carryforward**: Suspends any excess deduction and carries it forward (calculated as `suspendedSec179IncomeLimit`), adjusting the net AGI flow by adding back the suspended portion.
- **Compliance Alert**: Added a glowing warning card (`#biz-flag-sec179-income-limit`) to the Business Compliance Analyzer to display the suspended amount.

### 6. Expanded Programmatic Test Coverage
- Updated `verify_features.js` to assert the active income limit, the W-2 wage offset, and the real estate gating rules.
- Confirmed all verification checks pass successfully.
