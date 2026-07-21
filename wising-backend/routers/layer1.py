import json
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert

from db.redis_client import redis_client
from db.database import get_db
from db.models.layer1 import QuarterEntry, ResidencyData
from engine.security import get_current_user
from db.models.user import User

router = APIRouter(
    prefix="/api/v1/layer1",
    tags=["layer1"]
)

class DraftPayload(BaseModel):
    financial_year: str
    data: Dict[str, Any]

class SubmitPayload(BaseModel):
    financial_year: str
    data: Dict[str, Any]

@router.post("/draft/{quarter_type}")
async def save_draft_to_redis(
    quarter_type: str, 
    payload: DraftPayload, 
    current_user: User = Depends(get_current_user)
):
    """
    Saves the transient form state to Upstash Redis to prevent data loss.
    """
    redis_key = f"session:{current_user.id}:{payload.financial_year}:layer1:{quarter_type}"
    
    # Store payload in Redis with an expiration (7 days)
    await redis_client.setex(redis_key, 7 * 24 * 60 * 60, json.dumps(payload.data))
    
    return {"status": "success", "message": f"Draft saved to Redis for {quarter_type}"}

@router.get("/draft/{quarter_type}")
async def get_draft_from_redis(
    quarter_type: str, 
    financial_year: str, 
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves the transient form state from Upstash Redis.
    """
    redis_key = f"session:{current_user.id}:{financial_year}:layer1:{quarter_type}"
    val = await redis_client.get(redis_key)
    
    if val:
        return {"data": json.loads(val)}
    
    return {"data": {}}

@router.post("/submit/{quarter_type}")
async def submit_quarter(
    quarter_type: str,
    payload: SubmitPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    UPSERTs the completed form payload into Neon DB and deletes the Redis cache.
    """
    # UPSERT into quarter_entries
    stmt_q = insert(QuarterEntry).values(
        user_id=current_user.id,
        financial_year=payload.financial_year,
        quarter_type=quarter_type,
        status='SUBMITTED'
    )
    stmt_q = stmt_q.on_conflict_do_update(
        index_elements=['user_id', 'financial_year', 'quarter_type'],
        set_=dict(status='SUBMITTED')
    ).returning(QuarterEntry.id)

    result = db.execute(stmt_q)
    quarter_id = result.scalar()

    # Process specific tables based on payload (e.g. residency)
    if 'residency' in payload.data:
        res_data = payload.data['residency']
        stmt_r = insert(ResidencyData).values(
            quarter_id=quarter_id,
            live_tracking_active=res_data.get('live_tracking_active', False),
            manual_days=res_data.get('manual_days'),
            final_india_residency_status=res_data.get('final_india_residency_status')
        )
        stmt_r = stmt_r.on_conflict_do_update(
            index_elements=['quarter_id'],
            set_=dict(
                live_tracking_active=res_data.get('live_tracking_active', False),
                manual_days=res_data.get('manual_days'),
                final_india_residency_status=res_data.get('final_india_residency_status')
            )
        )
        db.execute(stmt_r)

    db.commit()

    # DELETE Redis cache to make Neon DB the source of truth
    redis_key = f"session:{current_user.id}:{payload.financial_year}:layer1:{quarter_type}"
    await redis_client.delete(redis_key)

    return {"status": "success", "message": f"{quarter_type} submitted successfully"}

@router.get("/db/{quarter_type}")
async def get_quarter_from_db(
    quarter_type: str,
    financial_year: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    quarter = db.query(QuarterEntry).filter(
        QuarterEntry.user_id == current_user.id,
        QuarterEntry.financial_year == financial_year,
        QuarterEntry.quarter_type == quarter_type
    ).first()

    if not quarter:
        return {"data": None}

    residency = db.query(ResidencyData).filter(ResidencyData.quarter_id == quarter.id).first()
    data = {}
    if residency:
        data['residency'] = {
            'live_tracking_active': residency.live_tracking_active,
            'manual_days': residency.manual_days,
            'final_india_residency_status': residency.final_india_residency_status
        }
    return {"data": data}
