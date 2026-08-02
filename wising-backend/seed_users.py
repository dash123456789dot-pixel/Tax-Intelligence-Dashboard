import os
import sys

# Add the wising-backend directory to the python path
sys.path.insert(0, os.path.realpath("."))

from db.database import SessionLocal
from db.models.user import User
from engine.security import get_password_hash

def seed_test_users():
    db = SessionLocal()
    try:
        print("Seeding users admin1 to admin20...")
        for i in range(1, 21):
            username = f"admin{i}"
            password = f"admin{i}"
            email = f"admin{i}@example.com"
            
            # Check if user already exists
            existing_user = db.query(User).filter(User.username == username).first()
            if existing_user:
                print(f"User {username} already exists. Skipping.")
                continue
            
            hashed_pw = get_password_hash(password)
            user = User(username=username, email=email, password_hash=hashed_pw)
            db.add(user)
            print(f"Created user {username}.")
        
        db.commit()
        print("Seeding complete!")
    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_test_users()
