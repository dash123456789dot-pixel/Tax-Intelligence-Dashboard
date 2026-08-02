from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, DateTime, func, Numeric, JSON, Float, Date
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.schema import UniqueConstraint
import uuid
from ..database import Base

class RouterSession(Base):
    __tablename__ = 'router_sessions'
    __table_args__ = (UniqueConstraint('user_id', 'client_id', 'financial_year', name='uq_router_session'),)

    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    client_id = Column(String(255), primary_key=True)
    financial_year = Column(String(9), primary_key=True, default='FY2025-26')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    base_tax_year = Column(String(9))
    full_name = Column(String(255))
    date_of_birth = Column(Date)

    primary_jurisdiction = Column(String(50))
    us_entity_type = Column(String(50))
    india_entity_type = Column(String(50))
    us_entity_name = Column(String(255))
    us_formation_date = Column(Date)
    ein = Column(String(50))
    india_entity_name = Column(String(255))
    india_formation_date = Column(Date)
    corp_pan = Column(String(50))
    cin = Column(String(50))
    ssn = Column(String(50))
    pan = Column(String(50))

    india_flag = Column(Boolean, default=False)
    us_flag = Column(Boolean, default=False)
    jurisdiction = Column(String(20), default='none')
    is_complete = Column(Boolean, default=False)

    user = relationship("User")

class QuarterEntry(Base):
    __tablename__ = 'quarter_entries'
    __table_args__ = (UniqueConstraint('user_id', 'client_id', 'financial_year', 'quarter_type', name='uq_quarter_entry'),)
    client_id = Column(String(255))

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    financial_year = Column(String(9), nullable=False)
    quarter_type = Column(String(10), nullable=False)
    status = Column(String(20), default='DRAFT')
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class ProfileData(Base):
    __tablename__ = 'layer1_profile'
    client_id = Column(String(255))
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'), primary_key=True)
    tax_regime = Column(String(10))
    entity_type = Column(String(50))
    date_of_birth = Column(DateTime)
    residential_status = Column(String(10))

class ResidencyData(Base):
    __tablename__ = 'residency_data'
    client_id = Column(String(255))
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'), primary_key=True)
    live_tracking_active = Column(Boolean, default=False)
    manual_days = Column(Integer)
    final_india_residency_status = Column(String(10))

class ResidencyTrip(Base):
    __tablename__ = 'residency_trips'
    client_id = Column(String(255))
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'))
    arrival_date = Column(DateTime)
    departure_date = Column(DateTime)
    purpose = Column(String(100))
    country = Column(String(100))

class SalaryData(Base):
    __tablename__ = 'layer1_salary'
    client_id = Column(String(255))
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'), primary_key=True)
    has_salary_income = Column(Boolean)
    salary_income_inr = Column(Numeric)
    exempt_allowances_inr = Column(Numeric)
    perquisites_inr = Column(Numeric)
    profit_in_lieu_inr = Column(Numeric)
    gross_salary_inr = Column(Numeric)
    pt_paid_inr = Column(Numeric)
    entertainment_allowance_inr = Column(Numeric)
    standard_deduction_inr = Column(Numeric)
    net_taxable_salary_inr = Column(Numeric)
    employer_type = Column(String(50))
    is_pwd = Column(Boolean)
    basic_da_inr = Column(Numeric)
    rent_paid_inr = Column(Numeric)
    metro_city = Column(Boolean)
    hra_received_inr = Column(Numeric)
    lta_received_inr = Column(Numeric)
    lta_exempt_inr = Column(Numeric)
    children_education_received_inr = Column(Numeric)
    children_education_exempt_inr = Column(Numeric)
    hostel_received_inr = Column(Numeric)
    hostel_exempt_inr = Column(Numeric)
    transport_received_inr = Column(Numeric)
    transport_exempt_inr = Column(Numeric)
    is_eligible_for_esop_deferral = Column(Boolean)

    esop_perquisite_inr = Column(Numeric)
    employer_nps_contribution_inr = Column(Numeric)
    prior_employer_salary_inr = Column(Numeric)
    pwd_transport_allowance_received_inr = Column(Numeric)
    conveyance_allowance_received_inr = Column(Numeric)
    conveyance_actual_expenditure_inr = Column(Numeric)
    tour_travel_allowance_received_inr = Column(Numeric)
    tour_travel_actual_expenditure_inr = Column(Numeric)
    daily_allowance_received_inr = Column(Numeric)
    daily_actual_expenditure_inr = Column(Numeric)


class SalaryEsopEvent(Base):
    __tablename__ = 'layer1_salary_esop'
    client_id = Column(String(255))
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'))
    grant_date = Column(Date)
    exercise_date = Column(Date)
    fmv_at_exercise_inr = Column(Numeric)
    exercise_price_inr = Column(Numeric)
    shares_exercised = Column(Numeric)

    employer_name = Column(String(255))
    vesting_or_exercise_date = Column(Date)
    perquisite_value_inr = Column(Numeric)


class HousePropertyData(Base):
    __tablename__ = 'layer1_house_property'
    client_id = Column(String(255))
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'), primary_key=True)
    has_house_property_income = Column(Boolean)

class HouseProperty(Base):
    __tablename__ = 'layer1_hp_properties'
    client_id = Column(String(255))
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'))
    property_type = Column(String(50))
    co_owned = Column(Boolean)
    my_share = Column(Numeric)
    ownership_status = Column(String(50))
    buyer_pan = Column(String(20))
    tenant_pan = Column(String(20))
    rent_received = Column(Numeric)
    municipal_taxes = Column(Numeric)
    nav = Column(Numeric)
    standard_deduction = Column(Numeric)
    interest_paid = Column(Numeric)
    pre_construction_interest = Column(Numeric)
    net_income = Column(Numeric)

    property_use = Column(String(50))
    gross_annual_value_inr = Column(Numeric)
    tenant_tds_deducted_inr = Column(Numeric)
    is_self_occupied_with_loan = Column(Boolean)
    co_owner_share_percent = Column(Numeric)
    financial_values_represent = Column(String(50))


class BusinessData(Base):
    __tablename__ = 'layer1_business'
    client_id = Column(String(255))
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'), primary_key=True)
    has_business_income = Column(Boolean)
    profession_type = Column(String(100))
    gst_registered = Column(Boolean)
    gstin = Column(String(50))
    turnover_cash = Column(Numeric)
    turnover_bank = Column(Numeric)
    books_maintained = Column(Boolean)
    receipts_profession = Column(Numeric)
    gross_receipts = Column(Numeric)
    expenses_total = Column(Numeric)
    depreciation = Column(Numeric)
    net_profit = Column(Numeric)

class BusinessEntry(Base):
    __tablename__ = 'layer1_business_entries'
    client_id = Column(String(255))
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'))
    nature = Column(String(100))
    amount_inr = Column(Numeric)

class BusinessPartnerFirm(Base):
    __tablename__ = 'layer1_business_firms'
    client_id = Column(String(255))
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'))
    firm_pan = Column(String(20))
    salary_interest_inr = Column(Numeric)

class BusinessGoodsVehicle(Base):
    __tablename__ = 'layer1_business_vehicles'
    client_id = Column(String(255))
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'))
    vehicle_number = Column(String(50))
    tonnage = Column(Numeric)
    months_owned = Column(Integer)
    presumptive_income_inr = Column(Numeric)

class CapitalGainsData(Base):
    __tablename__ = 'layer1_capital_gains'
    client_id = Column(String(255))
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'), primary_key=True)
    has_capital_gains = Column(Boolean)

class CapitalGainsProperty(Base):
    __tablename__ = 'layer1_cg_property'
    client_id = Column(String(255))
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'))
    sell_date = Column(Date)
    buy_date = Column(Date)
    sell_value = Column(Numeric)
    stamp_duty_value = Column(Numeric)
    buy_value = Column(Numeric)
    brokerage = Column(Numeric)

    is_joint_property = Column(Boolean)
    ownership_percentage = Column(Numeric)
    is_inherited = Column(Boolean)
    original_owner_acquisition_date = Column(Date)
    original_owner_cost = Column(Numeric)
    original_owner_cost_currency = Column(String(10))
    cg_exemption_section = Column(String(50))
    cg_exempt_invest_amount = Column(Numeric)
    cg_exempt_invest_date = Column(Date)
    cg_deposited_in_cgas = Column(Boolean)
    address = Column(String(255))
    pincode = Column(String(20))
    pre_2001_fmv_inr = Column(Numeric)
    transfer_expenses_inr = Column(Numeric)


class CapitalGainsPropertyImprovement(Base):
    __tablename__ = 'layer1_cg_property_imp'
    client_id = Column(String(255))
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey('layer1_cg_property.id', ondelete='CASCADE'))
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'))
    year = Column(String(20))
    cost = Column(Numeric)

class CapitalGainsBuyback(Base):
    __tablename__ = 'layer1_cg_buyback'
    client_id = Column(String(255))
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'))
    company_name = Column(String(200))
    buyback_date = Column(Date)
    shares_tendered = Column(Numeric)
    buyback_price_per_share = Column(Numeric)
    deemed_dividend_inr = Column(Numeric)

    isin = Column(String(50))
    is_listed = Column(Boolean)
    is_promoter = Column(Boolean)
    tender_or_open_market = Column(String(50))
    consideration_received_inr = Column(Numeric)
    original_cost_inr = Column(Numeric)
    original_acquisition_date = Column(Date)


class CapitalGainsFinancialTx(Base):
    __tablename__ = 'layer1_cg_financial'
    client_id = Column(String(255))
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'))
    asset_type = Column(String(50))
    isin = Column(String(50))
    sell_date = Column(Date)
    buy_date = Column(Date)
    quantity = Column(Numeric)
    sell_price = Column(Numeric)
    buy_price = Column(Numeric)
    brokerage = Column(Numeric)

    is_specified_foreign_exchange_asset = Column(Boolean)
    investment_income_this_year = Column(Numeric)
    fmv_31jan2018_per_unit_inr = Column(Numeric)
    stt_paid = Column(Numeric)
    nri_exit_type = Column(String(50))


class CapitalGainsCommodityTx(Base):
    __tablename__ = 'layer1_cg_commodity'
    client_id = Column(String(255))
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'))
    commodity_name = Column(String(100))
    sell_date = Column(Date)
    buy_date = Column(Date)
    quantity = Column(Numeric)
    sell_price = Column(Numeric)
    buy_price = Column(Numeric)

    is_maturity_redemption = Column(Boolean)


class CapitalGainsUnlistedTx(Base):
    __tablename__ = 'layer1_cg_unlisted'
    client_id = Column(String(255))
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'))
    company_name = Column(String(200))
    sell_date = Column(Date)
    buy_date = Column(Date)
    quantity = Column(Numeric)
    sell_price = Column(Numeric)
    buy_price = Column(Numeric)

    fmv_valuation_report_date = Column(Date)
    original_investment_currency = Column(String(10))
    original_cost_in_foreign_currency = Column(Numeric)


class OtherSourcesData(Base):
    __tablename__ = 'layer1_other_sources'
    client_id = Column(String(255))
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'), primary_key=True)
    has_other_sources_income = Column(Boolean)
    interest_savings_inr = Column(Numeric)
    interest_fd_rd_inr = Column(Numeric)
    interest_fd_rd_tds_inr = Column(Numeric)
    interest_bonds_inr = Column(Numeric)
    interest_bonds_tds_inr = Column(Numeric)
    interest_on_it_refund_inr = Column(Numeric)
    dividend_inr = Column(Numeric)
    dividend_tds_inr = Column(Numeric)
    gifts_above_50k_inr = Column(Numeric)
    local_authority_s10_20_inr = Column(Numeric)
    spousal_clubbing_s64_inr = Column(Numeric)
    minor_child_exemption_inr = Column(Numeric)
    lic_maturity_inr = Column(Numeric)
    lic_maturity_tds_inr = Column(Numeric)
    miscellaneous_income_inr = Column(Numeric)
    angel_tax_premium_inr = Column(Numeric)
    exempt_interest_ppf_epf_inr = Column(Numeric)
    taxable_epf_interest_inr = Column(Numeric)
    exempt_pf_withdrawal_inr = Column(Numeric)
    exempt_nps_withdrawal_inr = Column(Numeric)
    taxable_nps_withdrawal_inr = Column(Numeric)
    family_pension_gross_inr = Column(Numeric)
    winnings_lottery_gaming_inr = Column(Numeric)
    online_gaming_winnings_inr = Column(Numeric)
    unexplained_income_115BBE_inr = Column(Numeric)
    has_agricultural_income = Column(Boolean)
    agricultural_income_inr = Column(Numeric)

class ForeignAssetsData(Base):
    __tablename__ = 'layer1_foreign_assets'
    client_id = Column(String(255))
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'), primary_key=True)
    has_foreign_assets = Column(Boolean)
    total_lrs_remitted_this_fy_inr = Column(Numeric)
    lrs_purpose = Column(String(255))
    has_received_foreign_income = Column(Boolean)

class ForeignAssetRow(Base):
    __tablename__ = 'layer1_fa_rows'
    client_id = Column(String(255))
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'))
    country = Column(String(100))
    asset_category = Column(String(100))
    asset_status = Column(String(100))
    initial_value = Column(Numeric)
    peak_balance = Column(Numeric)
    closing_balance = Column(Numeric)
    gross_proceeds = Column(Numeric)
    income_foreign = Column(Numeric)
    tax_foreign = Column(Numeric)
    conversion_rate = Column(Numeric)
    dtaa_applied = Column(Boolean)

class DtaaData(Base):
    __tablename__ = 'layer1_dtaa'
    client_id = Column(String(255))
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'), primary_key=True)
    tax_residency_country = Column(String(100))
    trc_status = Column(Boolean)
    has_permanent_establishment_in_india = Column(Boolean)

class DtaaElection(Base):
    __tablename__ = 'layer1_dtaa_elections'
    client_id = Column(String(255))
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'))
    income_type = Column(String(100))
    article_number = Column(String(50))
    treaty_rate = Column(Numeric)
    trc_applies = Column(Boolean)
    form_10f_applies = Column(Boolean)
    pe_declaration_applies = Column(Boolean)

class ComplianceData(Base):
    __tablename__ = 'layer1_compliance'
    client_id = Column(String(255))
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'), primary_key=True)
    form_10f_is_filed = Column(Boolean)
    form_10f_ack_number = Column(String(100))
    s197_is_available = Column(Boolean)
    s197_rate = Column(Numeric)
    s197_start = Column(Date)
    s197_end = Column(Date)
    s197_covered_types = Column(JSON) # Storing array of strings as JSON
    chapter_xiia_elected = Column(Boolean)
    trc_document_uploaded = Column(Boolean)
    trc_validity_start = Column(Date)
    trc_validity_end = Column(Date)

class BankAccountsData(Base):
    __tablename__ = 'layer1_bank_accounts'
    client_id = Column(String(255))
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'), primary_key=True)
    cumulative_repatriated_usd = Column(Numeric)
    pending_repatriation_inr = Column(Numeric)
    tds_deducted_on_nro_balance = Column(Boolean)

class BankAccountRow(Base):
    __tablename__ = 'layer1_bank_rows'
    client_id = Column(String(255))
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'))
    bank_name = Column(String(200))
    account_number = Column(String(100))
    ifsc = Column(String(20))
    account_type = Column(String(50))
    is_primary = Column(Boolean)

class DeductionsData(Base):
    __tablename__ = 'layer1_deductions'
    client_id = Column(String(255))
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'), primary_key=True)
    
    # 80C
    s80c_epf = Column(Numeric)
    s80c_ppf = Column(Numeric)
    s80c_elss = Column(Numeric)
    s80c_lic = Column(Numeric)
    s80c_home_loan = Column(Numeric)
    s80c_nsc = Column(Numeric)
    s80c_tuition = Column(Numeric)
    s80c_sukanya = Column(Numeric)
    s80c_fd = Column(Numeric)
    s80c_stamp_duty = Column(Numeric)
    
    # 80CCC/80CCD1
    s80ccc_lic_annuity = Column(Numeric)
    s80ccd1_nps = Column(Numeric)
    
    # 80CCD1B
    s80ccd1b_nps = Column(Numeric)
    
    # 80D
    s80d_self_family_premium = Column(Numeric)
    s80d_self_family_preventive = Column(Numeric)
    s80d_parents_premium = Column(Numeric)
    s80d_parents_senior = Column(Boolean)
    s80d_parents_preventive = Column(Numeric)
    s80d_parents_medical = Column(Numeric)
    s80d_parents_health_insurance = Column(Boolean)
    
    # 80DD
    s80dd_has_disabled_dependents = Column(Boolean)
    s80dd_disability_percentage = Column(Numeric)
    
    # 80DDB
    s80ddb_has_disease = Column(Boolean)
    s80ddb_patient_category = Column(String(50))
    s80ddb_medical_expenses = Column(Numeric)
    
    # 80U
    s80u_has_disability = Column(Boolean)
    s80u_disability_percentage = Column(Numeric)
    
    # 80GG
    s80gg_has_rent_paid_no_hra = Column(Boolean)
    s80gg_rent_paid = Column(Numeric)
    
    # 80GGB/GGC
    s80ggb_ggc_political = Column(Numeric)
    
    # 80TTA/TTB
    s80tta_ttb_applicable = Column(String(50))
    s80tta_ttb_savings = Column(Numeric)
    s80tta_ttb_fd_rd = Column(Numeric)
    
    # 80E / 80EEA
    s80e_education_loan = Column(Numeric)
    s80eea_ee_affordable_home = Column(Numeric)
    s80eea_ee_sanction_date = Column(Date)
    
    # 80M
    s80m_dividend_income = Column(Numeric)
    s80m_dividend_distributed = Column(Numeric)
    s80m_dividend = Column(Numeric)
    
    # Others
    s80iac = Column(Numeric)
    s80la = Column(Numeric)
    s80p = Column(Numeric)
    s80qqb = Column(Numeric)
    s80rrb = Column(Numeric)

class Deductions80GRow(Base):
    __tablename__ = 'layer1_80g_rows'
    client_id = Column(String(255))
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'))
    donee_pan = Column(String(20))
    donee_name = Column(String(200))
    amount = Column(Numeric)
    category = Column(String(100))

class LossesAndCreditsData(Base):
    __tablename__ = 'layer1_losses_credits'
    client_id = Column(String(255))
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'), primary_key=True)
    has_brought_forward_losses = Column(Boolean)
    s79_shareholding_change = Column(Boolean)
    unabsorbed_depreciation_cf = Column(Numeric)
    unabsorbed_dep_additional = Column(Numeric)
    tds_already_deducted = Column(Numeric)
    advance_tax_q1 = Column(Numeric)
    advance_tax_q2 = Column(Numeric)
    advance_tax_q3 = Column(Numeric)
    advance_tax_q4 = Column(Numeric)
    form_26as_uploaded = Column(Boolean)

class BroughtForwardLoss(Base):
    __tablename__ = 'layer1_bf_losses'
    client_id = Column(String(255))
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'))
    category = Column(String(100)) # 'business', 'speculative', 'stcg', 'ltcg', 'hp'
    fy = Column(String(20))
    amount_inr = Column(Numeric)
    was_filed_before_due_date = Column(Boolean)
    attributable_to_additional_dep_inr = Column(Numeric)
