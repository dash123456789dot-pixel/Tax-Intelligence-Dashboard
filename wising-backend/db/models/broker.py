from sqlalchemy import Column, String, ForeignKey, DateTime, func, JSON, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from ..database import Base

class BrokerConnection(Base):
    __tablename__ = 'broker_connections'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    broker_name = Column(String(100), nullable=False)
    status = Column(String(50))
    access_token = Column(String, nullable=True) # Could be encrypted
    refresh_token = Column(String, nullable=True)
    synced_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", backref="broker_connections")

class CapitalGainsTrade(Base):
    __tablename__ = 'capital_gains_trades'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    connection_id = Column(UUID(as_uuid=True), ForeignKey('broker_connections.id', ondelete='CASCADE'), nullable=True)
    broker_name = Column(String(100), nullable=False)
    
    asset_type = Column(String(50)) # Equity, MutualFund, Crypto, FO
    isin = Column(String(50))
    ticker = Column(String(50))
    
    purchase_date = Column(DateTime(timezone=True))
    purchase_value = Column(Numeric(15, 2))
    sale_date = Column(DateTime(timezone=True))
    sale_value = Column(Numeric(15, 2))
    
    raw_payload = Column(JSON) # To keep track of exactly what came from the websocket
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
