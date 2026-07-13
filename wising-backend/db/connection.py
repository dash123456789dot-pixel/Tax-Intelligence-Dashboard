import os
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from dotenv import load_dotenv

load_dotenv()

# We fallback to a default or check if it exists in the environment
DATABASE_URL = os.environ.get("DATABASE_URL")

@contextmanager
def get_connection():
    """Yields a psycopg2 connection to Neon/PostgreSQL. Commits on success, rolls back on error."""
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is not set")
    conn = psycopg2.connect(DATABASE_URL, sslmode="require")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

@contextmanager
def get_cursor():
    """Yields a RealDictCursor (rows come back as dicts keyed by column name)."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            yield cur
