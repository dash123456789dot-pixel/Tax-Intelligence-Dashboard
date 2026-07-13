# Jurisdiction Router Flow Comparison

Below is the architectural state flow comparison between the original DOM-based logic (`router.html`) and the new XState v5 Machine (`routerMachine.ts`). The charts illustrate how user inputs affect the trajectory of questions.

## 1. Original Flow (`router.html`)
The original flow was a straightforward, linear sequence of 13 questions with basic show/hide gating conditions. It ended abruptly after `left_india_for_employment_this_year`.

```mermaid
graph TD
  START((Start)) --> Q1[full_name]
  Q1 --> Q2[date_of_birth]
  Q2 --> Q3[is_indian_citizen]
  
  Q3 -->|False| Q4[is_pio_or_oci]
  Q3 -->|True| Q5[india_days]
  Q4 --> Q5
  
  Q5 --> Q6[has_india_source_income_or_assets]
  Q6 --> Q7[is_us_citizen]
  
  Q7 -->|False| Q8[has_green_card]
  Q7 -->|True| Q9[was_in_us_this_year]
  Q8 --> Q9
  
  Q9 -->|True| Q10[us_days]
  Q9 -->|False| Q11[has_us_source_income_or_assets]
  Q10 --> Q11
  
  Q11 --> CheckIC{"Is Indian Citizen?"}
  CheckIC -->|True| Q12[liable_to_tax_in_another_country]
  Q12 --> Q13[left_india_for_employment_this_year]
  Q13 --> END(("End: Calculate Flags"))
  CheckIC -->|False| END
```

<br/>

## 2. Phase 1 Router Machine (`routerMachine.ts`)
The new XState machine introduces several critical logic upgrades. It adds `base_tax_year` at the very beginning, and most importantly, it injects the **Tie-Breaker Rule Waterfall** dynamically if the user is evaluated as a Statutory Dual Resident.

```mermaid
graph TD
  START((Start)) --> Q0["[NEW] base_tax_year"]
  Q0 --> Q1[full_name]
  Q1 --> Q2[date_of_birth]
  Q2 --> Q3[is_indian_citizen]
  
  Q3 -->|False| Q4[is_pio_or_oci]
  Q3 -->|True| Q5[india_days]
  Q4 --> Q5
  
  Q5 --> Q6[has_india_source_income_or_assets]
  Q6 --> Q7[is_us_citizen]
  
  Q7 -->|False| Q8[has_green_card]
  Q7 -->|True| Q9[was_in_us_this_year]
  Q8 --> Q9
  
  Q9 -->|True| Q10[us_days]
  Q9 -->|False| Q11[has_us_source_income_or_assets]
  Q10 --> Q11
  
  Q11 --> CheckIC{"Is Indian Citizen?"}
  CheckIC -->|True| Q12[liable_to_tax_in_another_country]
  Q12 --> Q13[left_india_for_employment_this_year]
  Q13 --> CheckDual{"[NEW] Is Statutory Dual Resident?"}
  CheckIC -->|False| CheckDual
  
  %% Tie Breaker Waterfall
  CheckDual -->|True| TB1["[NEW] tb_permanent_home"]
  CheckDual -->|False| END(("End: Generate Report"))
  
  TB1 -->|Both / Neither| TB2["[NEW] tb_vital_interests"]
  TB1 -->|India / US| END
  
  TB2 -->|Undetermined| TB3["[NEW] tb_habitual_abode"]
  TB2 -->|India / US| END
  
  TB3 -->|Both / Neither| TB4["[NEW] tb_nationality"]
  TB3 -->|India / US| END
  
  TB4 --> END
```

### Key Differences Observed:
1. **Initial Tax Year Question:** The machine prepends `base_tax_year` to anchor the subsequent residence tests.
2. **Dynamic Residency Evaluation:** `isStatutoryDualResident(ctx)` is evaluated *during* the flow (after basic jurisdiction inputs are collected).
3. **Tie-Breaker Waterfall:** If dual residency is detected, the flow conditionally branches into up to 4 DTAA tie-breaker tests (`permanent_home` -> `vital_interests` -> `habitual_abode` -> `nationality`). They short-circuit directly to the report as soon as a definitive tie-breaker winner is established.
