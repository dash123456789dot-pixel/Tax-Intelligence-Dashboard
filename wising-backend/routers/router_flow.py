from typing import Any, Dict
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert

from db.database import get_db
from db.models.layer1 import RouterSession
from engine.security import get_current_user
from db.models.user import User

router = APIRouter(
    prefix="/api/v1/router",
    tags=["router"]
)

class RouterSubmitPayload(BaseModel):
    user_id: str
    client_id: str
    base_tax_year: str
    full_name: str | None = None
    date_of_birth: str | None = None
    primary_jurisdiction: str | None = None
    us_entity_type: str | None = None
    india_entity_type: str | None = None
    us_entity_name: str | None = None
    us_formation_date: str | None = None
    ein: str | None = None
    india_entity_name: str | None = None
    india_formation_date: str | None = None
    corp_pan: str | None = None
    cin: str | None = None
    ssn: str | None = None
    pan: str | None = None
    india_flag: bool | None = False
    us_flag: bool | None = False
    jurisdiction: str | None = 'none'
    isComplete: bool | None = False

@router.post("/submit")
def submit_router(payload: RouterSubmitPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    data_dict = payload.model_dump()
    # Map isComplete to is_complete for DB
    is_complete = data_dict.pop('isComplete', False)
    data_dict['is_complete'] = is_complete
    
    # Overwrite user_id with the authenticated user's ID
    data_dict['user_id'] = str(current_user.id)
    
    # Rename base_tax_year to financial_year to match DB, or wait, RouterSession has both?
    # Let's check layer1.py: RouterSession has financial_year as PK and base_tax_year as column
    financial_year = data_dict.get('base_tax_year', 'FY2025-26')
    data_dict['financial_year'] = financial_year

    # Extract valid columns
    from sqlalchemy.inspection import inspect
    valid_keys = {c.name for c in inspect(RouterSession).columns}
    valid_data = {k: (None if v == "" else v) for k, v in data_dict.items() if k in valid_keys}
    
    stmt = insert(RouterSession).values(**valid_data)
    
    update_dict = {k: v for k, v in valid_data.items() if k not in ('user_id', 'client_id', 'financial_year')}
    if update_dict:
        stmt = stmt.on_conflict_do_update(
            index_elements=['user_id', 'client_id', 'financial_year'],
            set_=update_dict
        )
    else:
        stmt = stmt.on_conflict_do_nothing()
        
    db.execute(stmt)
    db.commit()
    return {"status": "success", "message": "Router session saved."}
