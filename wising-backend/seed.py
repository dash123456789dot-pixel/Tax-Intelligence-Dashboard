import os
import sys
from sqlalchemy.orm import Session
from passlib.context import CryptContext

sys.path.insert(0, os.path.realpath("."))

from db.database import SessionLocal
from db.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed_db():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "admin1").first()
        if not user:
            new_user = User(
                username="admin1",
                email="admin1@example.com",
                password_hash=pwd_context.hash("admin1"),
                full_name="Admin User"
            )
            db.add(new_user)
            db.commit()
            print("Seeded admin1/admin1")
        else:
            print("admin1 already exists")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
