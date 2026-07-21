import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("DATABASE_URL")

conn = psycopg2.connect(url)
conn.autocommit = True
cur = conn.cursor()

cur.execute("""
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;
""")
print("All tables dropped.")
