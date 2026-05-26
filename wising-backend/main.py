from fastapi import FastAPI

app = FastAPI(title="Wising Backend")

@app.get("/")
def read_root():
    return {"message": "Welcome to Wising Backend API"}
