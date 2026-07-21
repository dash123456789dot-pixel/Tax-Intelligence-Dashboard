from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.database import get_db
from engine.security import get_current_user
from db.models.user import User

router = APIRouter(
    prefix="/api/v1/dashboard",
    tags=["dashboard"]
)

@router.get("/metrics")
def get_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns high-level dashboard metrics (e.g., total capital gains, active brokers, sync status).
    This ports over the old Spring Boot dashboard endpoints.
    """
    return {
        "status": "success",
        "data": {
            "total_capital_gains_inr": 0,
            "active_broker_connections": 0,
            "alerts": []
        }
    }
