from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from db.database import get_db
from db.models.broker import BrokerConnection
from engine.security import get_current_user
from db.models.user import User

from engine.brokers.zerodha_adapter import ZerodhaAdapter
from engine.brokers.snaptrade_adapter import SnaptradeAdapter

router = APIRouter(
    prefix="/api/v1/broker-accounts",
    tags=["brokers"]
)

@router.get("/")
def list_broker_connections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    connections = db.query(BrokerConnection).filter(BrokerConnection.user_id == current_user.id).all()
    return {"connections": connections}

@router.post("/connect/{broker_name}")
def connect_broker(
    broker_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if broker_name.lower() == "zerodha":
        adapter = ZerodhaAdapter(db, current_user.id)
    elif broker_name.lower() == "snaptrade":
        adapter = SnaptradeAdapter(db, current_user.id)
    else:
        raise HTTPException(status_code=400, detail="Unsupported broker")
    login_url = adapter.get_login_url()
    return {"loginUrl": login_url, "instructions": f"Complete login for {broker_name}"}

@router.post("/callback/{broker_name}")
def broker_callback(
    broker_name: str,
    request_token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if broker_name.lower() == "zerodha":
        adapter = ZerodhaAdapter(db, current_user.id)
    elif broker_name.lower() == "snaptrade":
        adapter = SnaptradeAdapter(db, current_user.id)
    else:
        raise HTTPException(status_code=400, detail="Unsupported broker")

    try:
        access_token = adapter.handle_callback(request_token)
        
        # Save or update connection
        connection = db.query(BrokerConnection).filter(
            BrokerConnection.user_id == current_user.id,
            BrokerConnection.broker_name == broker_name
        ).first()

        if not connection:
            connection = BrokerConnection(
                user_id=current_user.id,
                broker_name=broker_name
            )
            db.add(connection)
        
        connection.status = "CONNECTED"
        connection.access_token = access_token
        db.commit()

        return {"status": "success", "message": f"{broker_name} connected successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/manual-sync")
def manual_sync(
    broker_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Placeholder endpoint for manual broker sync.
    Triggered when the user clicks 'Sync Now' on the frontend.
    """
    # Logic to fetch new trades via API rather than WebSocket
    return {"status": "success", "message": f"Manual sync initiated for {broker_name}"}
