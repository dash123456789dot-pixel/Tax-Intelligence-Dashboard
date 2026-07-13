US_INITIAL_CONTEXT = {
    "profile": {
        "tax_entity_type": "individual",
        "incorporation_state": None,
        "incorporated_in_us": None,
        "full_name": None,
        "date_of_birth": None,
        "filing_status": "single",
        "ssn_or_itin": None,
        "ssn_or_itin_type": "none",
        "dependents_count": 0,
        "spouse_is_us_person": None
    },
    "us_residency_detail": {
        "is_us_citizen": False,
        "has_green_card": False,
        "green_card_grant_date": None,
        "i407_surrendered_date": None,
        "us_days_current_year": 0,
        "us_days_minus_1_year": 0,
        "us_days_minus_2_years": 0,
        "us_days_excluded_current": 0,
        "us_days_excluded_minus_1": 0,
        "us_days_excluded_minus_2": 0,
        "us_days_excluded_reason": "none",
        "exempt_individual_status": "none",
        "exempt_first_year": None,
        "exempt_prior_years_count": 0,
        "exempt_student_closer_conn_exception": False,
        "exempt_scholar_lookback_exception": False,
        "closer_connection_claim": None,
        "first_year_choice_election": False,
        "first_year_choice_entry_date": None,
        "s6013g_joint_election": False,
        "spt_day_count_weighted": 0,
        "spt_test_met": False,
        "final_us_residency_status": "NON_RESIDENT_ALIEN",
        "dtaa_treaty_residence": "none",
        "residency_start_date": None,
        "residency_end_date": None
    },
    "state_residency": {
        "jan_1_domicile_state": "",
        "dec_31_domicile_state": "",
        "total_states_footprint": [],
        "primary_state_of_residence": "",
        "moved_states_this_year": False,
        "previous_state": "",
        "move_date": None,
        "state_days_in_current_state": None,
        "dependents_school_state": "",
        "primary_bank_and_medical_nexus_state": "",
        "vehicles_registered_state": "",
        "active_duty_military_or_spouse": False,
        "military_home_state_of_record": "",
        "military_duty_station_state": "",
        "ca_planning_departure": False,
        "ca_safe_harbor_employment_contract": False,
        "ca_retains_property_or_voter_reg": False,
        "ny_actual_days_present": None,
        "ny_permanent_place_of_abode": False,
        "secondary_states_with_accommodations": []
    },
    "income_us_source": {
        "has_employment_income": False,
        "has_capital_gains": False,
        "has_crypto": False,
        "stocks_needs_wash_sale_reconciliation": False,
        "crypto_needs_wash_sale": False,
        "has_sec_1256": False,
        "has_qof_rollover": False,
        "has_qsbs": False,
        "has_real_estate": False,
        "has_1031_exchange": False,
        "has_installment_sale": False,
        "has_collectibles": False,
        "has_capital_loss_carryovers": False,
        "st_loss_carryover_usd": None,
        "lt_loss_carryover_usd": None,
        "self_employment": [],
        "partnerships_k1": [],
        "s_corporations_k1": [],
        "c_corporations_1120": [],
        "farming_schedule_f": [],
        "trusts_estates_k1": [],
        "se_health_insurance_deduction_usd": None,
        "se_retirement_deduction_usd": None,
        "interest_us_source_usd": None,
        "ordinary_dividends_us_source_usd": None,
        "qualified_dividends_us_source_usd": None,
        "stcg_us_source_usd": None,
        "ltcg_us_source_usd": None,
        "rental_income_us_source_usd": None,
        "royalty_income_us_source_usd": None,
        "k1_passthrough_income_usd": None,
        "ira_distributions_usd": None,
        "401k_distributions_usd": None,
        "social_security_benefits_usd": None,
        "crypto_transactions": []
    },
    "income_foreign_source": {
        "foreign_wages": [],
        "foreign_interest_usd": None,
        "foreign_dividends_usd": None,
        "foreign_stcg_usd": None,
        "foreign_ltcg_usd": None,
        "foreign_rental_income_usd": None,
        "foreign_pension_income_usd": None,
        "section_988_gains_losses": []
    },
    "equity_compensation": {
        "has_equity_comp": False,
        "iso_exercises": [],
        "nso_exercises": [],
        "rsu_vestings": [],
        "espp_purchases": [],
        "unvested_restricted_stock_awards": []
    },
    "foreign_earned_income": {
        "claims_feie": False,
        "qualification_test": "physical_presence",
        "tax_home_country": "",
        "physical_presence_start_date": None,
        "physical_presence_end_date": None,
        "days_in_us_during_test_period": 0,
        "bona_fide_residence_start_date": None,
        "foreign_earned_income_usd": None,
        "feie_amount_claimed_usd": 0,
        "foreign_housing_expenses_usd": None,
        "housing_exclusion_base_usd": 21264,
        "housing_exclusion_cap_usd": 39870,
        "foreign_housing_exclusion_usd": 0
    },
    "bank_accounts": [],
    "fbar_aggregate_peak_usd": 0,
    "form_8938_required": False,
    "financial_holdings": [],
    "real_estate": {
        "has_real_estate_transaction": False,
        "properties": []
    },
    "retirement_accounts": {
        "traditional_ira_contribution_usd": None,
        "roth_ira_contribution_usd": None,
        "backdoor_roth_executed": False,
        "401k_employee_contribution_usd": None,
        "401k_employer_match_usd": None,
        "roth_401k_contribution_usd": None,
        "hsa_contribution_usd": None,
        "solo_401k_contribution_usd": None,
        "sep_ira_contribution_usd": None,
        "rmd_required": False,
        "rmd_amount_usd": 0,
        "indian_epf_balance_usd": None,
        "indian_ppf_balance_usd": None,
        "indian_nps_balance_usd": None
    },
    "itemized_deductions_and_credits": {
        "use_standard_or_itemized": "auto",
        "state_and_local_taxes_paid_usd": None,
        "mortgage_interest_paid_usd": None,
        "charitable_contributions_cash_usd": None,
        "charitable_contributions_appreciated_usd": None,
        "medical_expenses_usd": None,
        "casualty_loss_federal_disaster_usd": None,
        "child_tax_credit_dependents": None,
        "credit_for_other_dependents": None,
        "child_and_dependent_care_expenses_usd": None,
        "education_credits_aotc_usd": None,
        "education_credits_llc_usd": None,
        "saver_credit_eligible": False,
        "funded_529_plan": False,
        "529_contributions_usd": None,
        "529_state_deduction_state": "",
        "qbi_deduction_eligible": False,
        "qbi_deduction_usd": 0
    }
}

def evaluate_us_rules(context: dict) -> dict:
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
    entity_type = profile.get("tax_entity_type", "individual")
    res_detail = context.get("us_residency_detail", {})
    
    # 1. Evaluate residency status
    is_corp = entity_type not in ['individual', 'sole_prop', 'farming']
    
    status = "NON_RESIDENT_ALIEN"
    start_date = None
    end_date = None
    
    if is_corp:
        is_domestic = profile.get("incorporated_in_us") is True
        if is_domestic:
            status = "DOMESTIC_ENTITY"
            start_date = "2026-01-01"
            end_date = "2026-12-31"
        else:
            status = "FOREIGN_ENTITY"
    else: # individual
        is_us_citizen = res_detail.get("is_us_citizen") is True
        is_dtaa_tie_india = res_detail.get("dtaa_treaty_residence") == "india"
        has_gc_not_surrendered = res_detail.get("has_green_card") is True and not res_detail.get("i407_surrendered_date")
        
        # SPT Calculation
        exempt_status = res_detail.get("exempt_individual_status", "none")
        prior_years = res_detail.get("exempt_prior_years_count", 0)
        is_exempt_cy = False
        if exempt_status != 'none':
            if exempt_status == 'f_student':
                is_exempt_cy = (prior_years < 5) or res_detail.get("exempt_student_closer_conn_exception") is True
            elif exempt_status == 'j_scholar':
                is_exempt_cy = (prior_years < 2) or res_detail.get("exempt_scholar_lookback_exception") is True
            elif exempt_status in ['g_diplomat', 'professional_athlete']:
                is_exempt_cy = True
                
        cy_days = 0 if is_exempt_cy else max(0, res_detail.get("us_days_current_year", 0) - res_detail.get("us_days_excluded_current", 0))
        py1_days = 0 if is_exempt_cy else max(0, res_detail.get("us_days_minus_1_year", 0) - res_detail.get("us_days_excluded_minus_1", 0))
        py2_days = 0 if is_exempt_cy else max(0, res_detail.get("us_days_minus_2_years", 0) - res_detail.get("us_days_excluded_minus_2", 0))
        
        weighted = cy_days + (py1_days / 3.0) + (py2_days / 6.0)
        spt_met = res_detail.get("us_days_current_year", 0) >= 31 and weighted >= 183
        
        res_detail["spt_day_count_weighted"] = round(weighted, 2)
        res_detail["spt_test_met"] = spt_met
        
        is_spt_met_no_closer = spt_met and not res_detail.get("closer_connection_claim")
        is_dual_status = res_detail.get("first_year_choice_election") is True or (res_detail.get("has_green_card") is True and res_detail.get("i407_surrendered_date") is not None)
        
        if is_us_citizen:
            status = "US_CITIZEN"
            start_date = "2026-01-01"
            end_date = "2026-12-31"
        elif is_dtaa_tie_india:
            status = "NON_RESIDENT_ALIEN"
        elif has_gc_not_surrendered:
            status = "RESIDENT_ALIEN"
            start_date = "2026-01-01"
            end_date = "2026-12-31"
        elif is_spt_met_no_closer:
            status = "RESIDENT_ALIEN"
            start_date = "2026-01-01"
            end_date = "2026-12-31"
        elif is_dual_status:
            status = "DUAL_STATUS"
            if res_detail.get("has_green_card"):
                start_date = res_detail.get("green_card_grant_date")
                end_date = res_detail.get("i407_surrendered_date")
        else:
            status = "NON_RESIDENT_ALIEN"

    res_detail["final_us_residency_status"] = status
    res_detail["residency_start_date"] = start_date
    res_detail["residency_end_date"] = end_date
    
    # 2. Control field visibility & alerts
    if entity_type in ["c-corp", "s-corp", "partnership", "trust"]:
        manifest["hidden_fields"].append("standard_deduction")
    else:
        manifest["visible_fields"].append("standard_deduction")

    return manifest
