from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, DateTime, func, Numeric, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.schema import UniqueConstraint
import uuid
from ..database import Base

class RouterSession(Base):
    __tablename__ = 'router_sessions'
    __table_args__ = (UniqueConstraint('user_id', 'financial_year', name='uq_router_session'),)

    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    financial_year = Column(String(9), primary_key=True, default='FY2025-26')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Router Inputs
    base_tax_year = Column(String(4))
    full_name = Column(String(255))
    date_of_birth = Column(DateTime)
    is_indian_citizen = Column(Boolean)
    is_pio_or_oci = Column(Boolean)
    india_days = Column(Integer)
    has_india_source_income_or_assets = Column(Boolean)
    is_us_citizen = Column(Boolean)
    has_green_card = Column(Boolean)
    was_in_us_this_year = Column(Boolean)
    us_days = Column(Integer)
    has_us_source_income_or_assets = Column(Boolean)
    liable_to_tax_in_another_country = Column(Boolean)
    left_india_for_employment_this_year = Column(Boolean)

    # Derived Router Outputs
    india_flag = Column(Boolean, default=False)
    us_flag = Column(Boolean, default=False)
    jurisdiction = Column(String(20), default='none')
    is_complete = Column(Boolean, default=False)

    user = relationship("User")

class QuarterEntry(Base):
    __tablename__ = 'quarter_entries'
    __table_args__ = (UniqueConstraint('user_id', 'financial_year', 'quarter_type', name='uq_quarter_entry'),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    financial_year = Column(String(9), nullable=False)
    quarter_type = Column(String(10), nullable=False)
    status = Column(String(20), default='DRAFT')
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
class ResidencyData(Base):
    __tablename__ = 'residency_data'
    quarter_id = Column(UUID(as_uuid=True), ForeignKey('quarter_entries.id', ondelete='CASCADE'), primary_key=True)
    live_tracking_active = Column(Boolean, default=False)
    manual_days = Column(Integer)
    final_india_residency_status = Column(String(10))
