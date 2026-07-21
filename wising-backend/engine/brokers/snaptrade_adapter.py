import os
from typing import List, Dict, Any
from .base_broker import BaseBrokerAdapter

class SnaptradeAdapter(BaseBrokerAdapter):
    def __init__(self, db, user_id):
        super().__init__(db, user_id)
        self.client_id = os.getenv("SNAPTRADE_CLIENT_ID")
        self.consumer_key = os.getenv("SNAPTRADE_CONSUMER_KEY")

    def get_login_url(self) -> str:
        # Snaptrade uses generate_redirect_uri endpoint
        return f"https://api.snaptrade.com/api/v1/snapTrade/login?clientId={self.client_id}"

    def handle_callback(self, request_token: str) -> str:
        return "snaptrade_access_token_123"

    def sync_trades(self) -> List[Dict[str, Any]]:
        return [
            {"id": "st1", "symbol": "AAPL", "action": "BUY", "units": 5, "price": 150, "time": "2023-02-01T10:00:00Z", "currency": "USD"}
        ]

    def transform_for_capital_gains(self, raw_trades: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        transformed = []
        for trade in raw_trades:
            transformed.append({
                "trade_id": trade.get("id"),
                "asset_name": trade.get("symbol"),
                "asset_type": "STOCKS",
                "trade_type": trade.get("action"),
                "quantity": trade.get("units"),
                "price": trade.get("price"),
                "trade_date": trade.get("time"),
                "currency": trade.get("currency"),
                "exchange": "US",
                "raw_data": trade
            })
        return transformed
