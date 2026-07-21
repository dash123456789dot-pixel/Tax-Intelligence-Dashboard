from abc import ABC, abstractmethod
from typing import List, Dict, Any
from sqlalchemy.orm import Session
import uuid

class BaseBrokerAdapter(ABC):
    def __init__(self, db: Session, user_id: uuid.UUID):
        self.db = db
        self.user_id = user_id

    @abstractmethod
    def get_login_url(self) -> str:
        """Returns the OAuth login URL for the broker."""
        pass

    @abstractmethod
    def handle_callback(self, request_token: str) -> str:
        """Handles OAuth callback and returns the access token."""
        pass

    @abstractmethod
    def sync_trades(self) -> List[Dict[str, Any]]:
        """Fetches raw trades from the broker."""
        pass

    @abstractmethod
    def transform_for_capital_gains(self, raw_trades: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Transforms raw trades into the exact Layer 1 capital gains schema."""
        pass
