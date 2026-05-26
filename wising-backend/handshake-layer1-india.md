# Layer 1 India Handshake

## Overview
This document specifies the updated JSON schema structure that the React frontend will send to the backend for processing Indian tax logic, particularly focusing on the latest Chapter VI-A v5.1 additions alongside Business/Profession, Unlisted Equity, Buybacks, and House Property structures.

The global state object is `layer1_state`.

---

## 1. Chapter VI-A Deductions (v5.1 Schema)

### Structure Updates
- Contains specific validations for section 80C, 80D, 80G.
- Blocked conditionally if the user's Indian residency status is 'NR' (Non-Resident).

```json
{
    "deductions_via": {
        "section_80c_total": 150000,
        "section_80d": {
            "self_family_premium": 25000,
            "parents_premium": 50000,
            "preventive_health_checkup": 5000
        },
        "section_80g": {
            "donations": [
                {
                    "donee_name": "PM Cares Fund",
                    "donee_pan": "XXXXX1234X",
                    "donation_amount": 10000,
                    "deduction_limit_type": "100_percent_no_qualifying_limit" 
                }
            ]
        },
        "section_80tta_ttb": {
            "savings_interest_claimed": 10000 
        }
    }
}
```
**Backend Action**: Validate `section_80g` array for valid PAN structures and ensure deduction caps (like 1.5 Lakhs for 80C) are strictly enforced in the tax engine, even if frontend allows input.

---

## 2. Business / Profession Income (`domestic_income.business_profession`)

```json
{
    "has_business_profession_income": true,
    "businesses": [
        {
            "business_nature": "MANUFACTURING", 
            "profession_type": "legal", 
            "gross_receipts_turnover": 5000000,
            
            // Presumptive flags
            "is_presumptive": true,
            "presumptive_code": "44ADA",
            
            // s.44ADA Specific fields
            "ada_gross_receipts": 3000000,
            "ada_cash_receipts_inr": 500000, 
            
            // Non-presumptive Expenses
            "net_expenses": 0, 
            "depreciation_claimed": 0
        }
    ]
}
```
**Backend Action**: Enforce `net_expenses = 0` and `depreciation_claimed = 0` if `presumptive_code` is present.

---

## 3. Unlisted Equity (`capital_gains.unlisted_equity`)

```json
{
    "has_unlisted_equity_transaction": true,
    "transactions": [
        {
            "company_name": "Startup Tech Pvt Ltd",
            "acquisition_date": "2020-05-10",
            "cost_per_share": 100.50,
            "cost_per_share_currency": "INR",
            "number_of_shares": 1000,
            "sale_price_per_share": 500.00,
            "sale_price_per_share_currency": "INR",
            "sale_date": "2024-06-15",
            
            // NRI Specific Fields (Populated if residency == 'NR')
            "fmv_valuation_report_date": "2024-01-31", 
            "original_investment_currency": "USD", 
            "original_cost_in_foreign_currency": 1200.50 
        }
    ]
}
```

---

## 4. Share Buybacks (`capital_gains.share_buyback`)

```json
{
    "has_buyback_transaction": true,
    "transactions": [
        {
            "company_name": "Tech Corp Ltd",
            "buyback_date": "2024-11-05", 
            "consideration_received": 500000,
            "acquisition_cost": 200000,
            
            "tax_regime_era": "post_oct2024", 
            "dividend_income_offered": 500000, 
            "capital_loss_claimed": 200000 
        }
    ]
}
```

---

## 5. House Property (`domestic_income.house_property`)

```json
{
    "has_house_property": true,
    "properties": [
        {
            "property_use": "LOP", 
            "gross_rent_received": 600000, 
            "municipal_taxes_paid": 50000,
            "interest_on_borrowed_capital": 250000,
            "pre_construction_interest": 50000,
            "co_owner_share_percentage": 100 
        }
    ]
}
```
