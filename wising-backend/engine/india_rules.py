INDIA_INITIAL_CONTEXT = {
    "profile": {
        "full_name": None,
        "entity_type": 'individual',
        "date_of_birth": None,
        "pan": None,
        "pan_aadhaar_linked": False,
        "tax_regime": 'NEW'
    },
    "residency_detail": {
        "live_tracking_active": False,
        "trips": [{"arrival_date": None, "departure_date": None}],
        "manual_days": 182,
        "is_wholly_outside_india": None,
        "is_indian_company": None,
        "is_poem_in_india": None,
        "days_in_india_current_year": 182,
        "days_in_india_preceding_4_years_gte_365": None,
        "employment_or_crew_status": None,
        "is_departure_year": None,
        "ship_nationality": None,
        "came_on_visit_to_india_pio_citizen": None,
        "nr_years_last_10_gte_9": None,
        "days_in_india_last_7_years_lte_729": None,
        "india_source_income_above_15l": None,
        "liable_to_tax_in_another_country_being_indian_citizen": False,
        "final_india_residency_status": 'ROR'
    },
    "dtaa": {
        "tax_residency_country": None,
        "is_us_resident_for_dtaa": None,
        "dtaa_treaty_residence": "none",
        "dtaa_forced_nr": False,
        "trc_status": False,
        "has_permanent_establishment_in_india": False,
        "treaty_elections": [],
        "mfn_clause_invoked": False
    },
    "compliance_docs": {
        "trc": { "validity_start_date": None, "validity_end_date": None, "document_uploaded": False },
        "form_10f": { "is_filed": False, "ack_number": None },
        "section_197_cert": { "is_available": False, "rate": None, "validity_start_date": None, "validity_end_date": None, "covered_income_types": None },
        "chapter_xiia_elected": False
    },
    "bank_accounts": [],
    "property": {
        "has_indian_property_transaction": False,
        "properties": []
    },
    "financial_holdings": {
        "has_financial_transactions": False,
        "transactions": []
    },
    "commodities": {
        "has_commodity_transactions": False,
        "transactions": []
    },
    "unlisted_equity": {
        "has_unlisted_equity_transaction": False,
        "transactions": []
    },
    "share_buyback": {
        "has_buyback_transaction": False,
        "transactions": []
    },
    "domestic_income": {
        "salary": {
            "has_salary_income": False,
            "gross_salary_inr": None,
            "pwd_transport_allowance": {
                "is_eligible_pwd": False,
                "allowance_received_inr": None
            },
            "conveyance_allowance_inr": None
        }
    },
    "computed_residency": {
        "status": "NR",
        "path": "NR-Default: Standard Non-Resident",
        "scope": "India-source income only."
    }
}

def evaluate_india_rules(context: dict) -> dict:
    """
    Takes the current context (user inputs) and returns a UI Manifest
    with visible, hidden, and disabled elements.
    Also calculates the computed residency and stores it in context.
    """
    manifest = {
        "visible_fields": [],
        "hidden_fields": [],
        "disabled_fields": [],
        "active_step": context.get("active_step", "step-profile"),
        "warnings": [],
        "errors": []
    }

    # Extract profiles & fields
    profile = context.get("profile", {})
    entity_type = profile.get("entity_type", "individual")
    res_detail = context.get("residency_detail", {})
    dtaa = context.get("dtaa", {})
    
    # 1. Evaluate residency status
    is_dtaa_override = dtaa.get("dtaa_forced_nr") is True or dtaa.get("dtaa_treaty_residence") == "us"
    
    status = "NR"
    path = "NR-Default: Standard Non-Resident"
    scope = "India-source income only."
    
    if is_dtaa_override:
        status = "NR"
        path = "DTAA Article 4 Treaty Tie-Breaker to United States"
        scope = "India-source income only (DTAA Article 4 non-resident status)."
    elif entity_type == "company":
        is_indian_company = res_detail.get("is_indian_company")
        is_poem_in_india = res_detail.get("is_poem_in_india")
        if is_indian_company is False and is_poem_in_india is False:
            status = "NR"
            path = "Path NR-1: Foreign Company (POEM outside India)"
            scope = "India-source income only."
        elif is_poem_in_india is True:
            status = "ROR"
            path = "Path RES-2: Foreign Company with POEM in India"
            scope = "Worldwide income."
        else:
            status = "ROR"
            path = "Path RES-1: Indian Company"
            scope = "Worldwide income."
    elif entity_type in ["firm", "llp", "aop", "trust"]:
        is_wholly_outside = res_detail.get("is_wholly_outside_india")
        if is_wholly_outside is True:
            status = "NR"
            path = "Path NR-2: Control and Management wholly outside India"
            scope = "India-source income only."
        else:
            status = "ROR"
            path = "Path RES-3: Control and Management partially or wholly in India"
            scope = "Worldwide income."
    elif entity_type == "huf":
        is_wholly_outside = res_detail.get("is_wholly_outside_india")
        nr_years = res_detail.get("nr_years_last_10_gte_9")
        days_7y = res_detail.get("days_in_india_last_7_years_lte_729")
        is_karta_rnor = nr_years is True or days_7y is True
        
        if is_wholly_outside is True:
            status = "NR"
            path = "Path NR-3: HUF Control and Management wholly outside India"
            scope = "India-source income only."
        elif is_karta_rnor:
            status = "RNOR"
            path = "Path RNOR-HUF: HUF Resident but Not Ordinarily Resident (Karta meets RNOR conditions)"
            scope = "India-source income + business controlled in India."
        else:
            status = "ROR"
            path = "Path ROR-HUF: HUF Resident and Ordinarily Resident"
            scope = "Worldwide income."
    else: # individual
        days_curr = res_detail.get("days_in_india_current_year", 182)
        if days_curr is None:
            days_curr = 182
            
        is_days_gte182 = days_curr >= 182
        is_days_between_60_181 = days_curr >= 60 and days_curr < 182
        is_days_less_60 = days_curr < 60
        is_days_gte120 = days_curr >= 120
        
        preceding_4y_gte365 = res_detail.get("days_in_india_preceding_4_years_gte_365")
        employment_status = res_detail.get("employment_or_crew_status")
        has_employment_exc = employment_status and employment_status != "none"
        has_visitor_exc = res_detail.get("came_on_visit_to_india_pio_citizen") is True
        income_above_15l = res_detail.get("india_source_income_above_15l") is True
        not_liable_elsewhere = res_detail.get("liable_to_tax_in_another_country_being_indian_citizen") is False
        nr_years = res_detail.get("nr_years_last_10_gte_9")
        days_7y = res_detail.get("days_in_india_last_7_years_lte_729")
        is_neither_nr9_nor_d7 = nr_years is False and days_7y is False
        
        if is_days_gte182:
            if is_neither_nr9_nor_d7:
                status = "ROR"
                path = "Path ROR-1: Standard Resident (>182 days + not NR 9/10 + >729 preceding days)"
                scope = "Worldwide income. Deductions and treaty foreign tax credits fully unlocked."
            elif nr_years is True:
                status = "RNOR"
                path = "Path RNOR-1: Resident but Not Ordinarily Resident (Condition A: NR in 9/10 years)"
                scope = "India-source income + business controlled in India. Foreign salary/investments exempt."
            else:
                status = "RNOR"
                path = "Path RNOR-2: Resident but Not Ordinarily Resident (Condition B: <=729 days in 7 years)"
                scope = "India-source income + business controlled in India. Foreign salary/investments exempt."
        elif is_days_between_60_181:
            if preceding_4y_gte365 is True:
                if has_employment_exc:
                    if income_above_15l and not_liable_elsewhere:
                        status = "RNOR"
                        path = "Path RNOR-3: Deemed Resident s.6(1A) (Employment Exception, income >15L)"
                        scope = "Deemed resident scope: India-source income + India-controlled businesses."
                    elif not income_above_15l:
                        status = "NR"
                        path = "Path NR-7: Non-Resident (Employment departure exception + India income <=15L)"
                        scope = "India-source income only."
                    else:
                        status = "NR"
                        path = "Path NR-8: Non-Resident (Employment exception, Deemed Resident blocked by tax liability elsewhere)"
                        scope = "India-source income only."
                elif has_visitor_exc:
                    if is_days_gte120 and income_above_15l:
                        status = "RNOR"
                        path = "Path RNOR-4: Condition C Visitor path (>=120 days + s.6(6)(c) RNOR)"
                        scope = "India-source income + India-controlled businesses. Foreign sources exempt."
                    elif is_days_gte120 and not income_above_15l:
                        status = "NR"
                        path = "Path NR-5: Non-Resident (Visitor >=120 days but India income <=15L)"
                        scope = "India-source income only."
                    elif not is_days_gte120 and income_above_15l and not_liable_elsewhere:
                        status = "RNOR"
                        path = "Path RNOR-6: Deemed Resident s.6(1A) (Visitor <120 days, income >15L, not liable elsewhere)"
                        scope = "Deemed resident scope: India-source income + India-controlled businesses."
                    else:
                        status = "NR"
                        path = "Path NR-10: Non-Resident (Visitor <120 days)"
                        scope = "India-source income only."
                else: # Standard 60
                    if is_neither_nr9_nor_d7:
                        status = "ROR"
                        path = "Path ROR-2: Standard Resident (>60 days & >=365 in 4 yrs + not NR 9/10 + >729 preceding days)"
                        scope = "Worldwide income. Deductions and treaty foreign tax credits fully unlocked."
                    elif nr_years is True:
                        status = "RNOR"
                        path = "Path RNOR-5: RNOR (>60 days & >=365 in 4 yrs + NR in 9/10 years)"
                        scope = "India-source income + business controlled in India. Foreign salary/investments exempt."
                    else:
                        status = "RNOR"
                        path = "Path RNOR-6: RNOR (>60 days & >=365 in 4 yrs + <=729 days in 7 years)"
                        scope = "India-source income + business controlled in India. Foreign salary/investments exempt."
            else: # not preceding 4 years gte 365
                if income_above_15l and not_liable_elsewhere:
                    status = "RNOR"
                    path = "Path RNOR-7: Deemed Resident s.6(1A) (<182 days, <365 in 4 yrs, but income >15L & not liable elsewhere)"
                    scope = "Deemed resident scope: India-source income + India-controlled businesses."
                else:
                    status = "NR"
                    path = "Path NR-6: Non-Resident (<182 days and <365 in 4 yrs)"
                    scope = "India-source income only."
        elif is_days_less_60:
            if income_above_15l and not_liable_elsewhere:
                status = "RNOR"
                path = "Path RNOR-8: Deemed Resident s.6(1A) (<60 days, income >15L, not liable elsewhere)"
                scope = "Deemed resident scope: India-source income + India-controlled businesses."
            else:
                status = "NR"
                path = "Path NR-9: Non-Resident (<60 days)"
                scope = "India-source income only."

    context["computed_residency"] = {
        "status": status,
        "path": path,
        "scope": scope
    }

    # 2. Control field visibility & alerts
    if entity_type in ["company", "llp", "aop", "trust"]:
        manifest["hidden_fields"].append("section_80c")
        manifest["hidden_fields"].append("presumptive_taxation_44ad")
        manifest["warnings"].append({
            "id": "warn-entity-presumptive",
            "text": "Companies, LLPs, AOPs, and Trusts are NOT eligible for presumptive taxation under s.44AD."
        })
    else:
        manifest["visible_fields"].append("section_80c")
        manifest["visible_fields"].append("presumptive_taxation_44ad")

    # DTAA visibility
    if status in ["RNOR", "NR"]:
        manifest["visible_fields"].extend(["dtaa_treaty_section", "trc_certificate"])
    else:
        manifest["hidden_fields"].extend(["dtaa_treaty_section", "trc_certificate"])

    return manifest
