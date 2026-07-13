# Layer 1 India: Question Hierarchy & UI Flow

This document maps the exact question hierarchy, visibility dependencies, and Step unlock logic based on the original `layer1_india.html` specification. The new XState implementation (`layer1IndiaMachine.guards.ts` and `residencySolver.ts`) is designed to mirror this exact structure.

## Complete Questionnaire & UI Enablement Flow

The flowchart below demonstrates:
1. How non-individual entity types are handled.
2. The deep nested hierarchy of questions for Individuals (e.g., Employment -> Income -> Liable to Tax).
3. The exact condition that unlocks **Step 2 (DTAA)** and **Step 3 (Compliance)** in the frontend (which occurs when the evaluated status is `Non-Resident (NR)`).

```mermaid
graph TD
  classDef start fill:#1E293B,stroke:#94A3B8,stroke-width:2px,color:#fff
  classDef question fill:#0F172A,stroke:#3B82F6,stroke-width:2px,color:#93C5FD
  classDef status_nr fill:#064E3B,stroke:#10B981,stroke-width:2px,color:#A7F3D0
  classDef status_res fill:#450A0A,stroke:#EF4444,stroke-width:2px,color:#FCA5A5
  classDef step fill:#4C1D95,stroke:#8B5CF6,stroke-width:2px,color:#DDD6FE

  START((Start: Step 1 Profile)):::start --> Q_Entity["Entity Type Selection"]:::question
  
  %% --------------------------------
  %% NON-INDIVIDUAL PATHS
  %% --------------------------------
  Q_Entity -->|Company| Q_Corp["Is Indian Company? / POEM in India?"]:::question
  Q_Corp --> END_COMP(("Evaluate Company Status"))
  
  Q_Entity -->|HUF / Firm / AOP / BOI / etc| Q_Wholly["Is control & management wholly outside India?"]:::question
  Q_Wholly -->|False| Q_Karta["HUF Karta Eval: NR in 9/10 years? AND <= 729 days in 7 years?"]:::question
  Q_Karta --> END_HUF(("Evaluate HUF (ROR/RNOR)")):::status_res
  Q_Wholly -->|True| END_NR(("Status: Non-Resident (NR)")):::status_nr

  %% --------------------------------
  %% INDIVIDUAL PATH
  %% --------------------------------
  Q_Entity -->|Individual| Q_Days["Days spent in India this year?"]:::question
  
  %% Path A: >= 182
  Q_Days -->|">= 182 Days"| Q_NR9["NR in 9/10 years? AND <= 729 days in 7 years?"]:::question
  Q_NR9 --> END_RES(("Status: Resident (ROR / RNOR)")):::status_res
  
  %% Path B: < 60
  Q_Days -->|"< 60 Days"| END_NR
  
  %% Path C: 60 - 181
  Q_Days -->|">= 60 & < 182 Days"| Q_P4Y["Spent 365+ days in India in last 4 years?"]:::question
  Q_P4Y -->|False| END_NR
  
  Q_P4Y -->|True| Q_Emp["Did you leave India for Employment or as Ship Crew?"]:::question
  
  %% Path C1: Employment / Crew
  Q_Emp -->|Yes| Q_Inc15_Emp["India-source income > 15 Lakhs?"]:::question
  Q_Inc15_Emp -->|False| END_NR
  Q_Inc15_Emp -->|True| Q_Ltac_Emp["Liable to tax in another country?"]:::question
  Q_Ltac_Emp -->|True| END_RES
  Q_Ltac_Emp -->|False| END_NR
  
  %% Path C2: No Employment -> Visitor Check
  Q_Emp -->|No| Q_Visit["Came on a visit to India (Indian Citizen / PIO)?"]:::question
  
  Q_Visit -->|False| Q_NR9_Follow["NR in 9/10 years? AND <= 729 days in 7 years?"]:::question
  Q_NR9_Follow --> END_RES
  
  Q_Visit -->|True| Q_Inc15_Vis["India-source income > 15 Lakhs?"]:::question
  Q_Inc15_Vis -->|Days >= 120| END_RES
  Q_Inc15_Vis -->|Days < 120| Q_Ltac_Vis["Liable to tax in another country?"]:::question
  
  Q_Ltac_Vis -->|True| END_RES
  Q_Ltac_Vis -->|False| END_NR
  
  %% --------------------------------
  %% STEP UNLOCK LOGIC
  %% --------------------------------
  END_NR -.->|Triggers syncUnlockStatus| UNLOCK_DTAA["🔓 UNLOCKS Step 2 (DTAA) & Step 3 (Compliance)"]:::step
  END_RES -.->|Triggers syncUnlockStatus| LOCK_DTAA["🔒 LOCKS Step 2 (DTAA) & Step 3 (Compliance)"]:::step
  END_HUF -.-> LOCK_DTAA
```

### Hierarchy Breakdown

1. **Company & Other Entities:** The flow expands beyond Individuals. Selecting HUF, Firm, or AOP immediately changes the visible questions to Corporate/Entity-specific metrics (like POEM or "Wholly outside India").
2. **The 365 Days Anchor:** For Individuals in the `60 - 181` day range, the flow is completely gated by the `365+ days in last 4 years` question. If answered False, the user is immediately an NR and no further questions appear.
3. **The Employment Branch:** Only if `365+ days` is True does the Employment question (`Did you leave India for Employment or as Ship Crew?`) appear below it. The answer to this determines whether the user goes down the Income branch or the Visitor branch.
4. **DTAA / Compliance Enablement:** As seen in the `layer1_india.html` DOM logic, calculating a final status of `NR` is the explicit trigger that unlocks the DTAA (Step 2) and Compliance (Step 3) sidebar steps. If the days slider goes to `>= 182`, the status becomes Resident, and those steps are immediately locked. 

Both the legacy `layer1_india.html` and the modern XState architecture use this exact dependency tree to toggle UI visibility.
