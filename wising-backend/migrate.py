import os
from dotenv import load_dotenv

load_dotenv()

from db.database import engine, Base
from db.models.layer1 import RouterSession
from db.models.user import User

print("Dropping router_sessions table...")
RouterSession.__table__.drop(engine, checkfirst=True)
print("Recreating tables...")
Base.metadata.create_all(engine)
print("Done!")
