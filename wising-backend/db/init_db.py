import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")
SCHEMA_FILE = os.path.join(os.path.dirname(__file__), "schema.sql")

def init_db():
    if not DATABASE_URL:
        print("Error: DATABASE_URL not set in environment.")
        return
        
    print("Connecting to Neon PostgreSQL...")
    conn = psycopg2.connect(DATABASE_URL, sslmode="require")
    try:
        with conn.cursor() as cur:
            print(f"Reading schema from {SCHEMA_FILE}...")
            with open(SCHEMA_FILE, "r", encoding="utf-8") as f:
                schema_sql = f.read()
            
            print("Executing schema SQL...")
            cur.execute(schema_sql)
            conn.commit()
            print("Database initialized successfully!")
    except Exception as e:
        conn.rollback()
        print(f"Error initializing database: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
