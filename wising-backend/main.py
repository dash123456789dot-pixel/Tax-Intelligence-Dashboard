from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.layer1 import router as layer1_router
from routers.auth import router as auth_router
from routers.broker import router as broker_router
from routers.websockets import router as ws_router
from routers.dashboard import router as dashboard_router
from routers.router_flow import router as router_flow_router

app = FastAPI(title="Wising Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(layer1_router)
app.include_router(auth_router)
app.include_router(broker_router)
app.include_router(ws_router)
app.include_router(dashboard_router)
app.include_router(router_flow_router)
@app.get("/")
def read_root():
    return {"message": "Welcome to Wising Backend API"}
