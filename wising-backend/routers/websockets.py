import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from typing import Dict
from db.database import get_db
from engine.security import get_current_user_ws

router = APIRouter(
    tags=["websockets"]
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_personal_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)

manager = ConnectionManager()

@router.websocket("/ws/api/v1/broker-sync/{broker_name}")
async def broker_sync_endpoint(
    websocket: WebSocket, 
    broker_name: str,
    token: str,
    db: Session = Depends(get_db)
):
    user = await get_current_user_ws(token, db)
    if not user:
        await websocket.close(code=1008)
        return

    client_id = f"{user.id}:{broker_name}"
    await manager.connect(websocket, client_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            # Here we will receive live events from frontend if any
            # Or we can push updates from the backend when sync progresses
            
            # Simulated response for now
            await manager.send_personal_message(
                json.dumps({"status": "received", "broker": broker_name, "message": "listening for trades..."}),
                client_id
            )
            
    except WebSocketDisconnect:
        manager.disconnect(client_id)
