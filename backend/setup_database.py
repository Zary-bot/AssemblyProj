"""
setup_database.py
Initializes the PostgreSQL database with schema and sample data.
Run this ONCE before starting the app:

    python setup_database.py

"""

import os
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
from psycopg2 import sql

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "pc_builder_simulation")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "database")


def create_database_if_not_exists():
    """Create the database if it doesn't exist."""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=int(DB_PORT),
            database="postgres",
            user=DB_USER,
            password=DB_PASSWORD,
        )
        conn.autocommit = True
        cursor = conn.cursor()

        cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,))
        if not cursor.fetchone():
            print(f"Creating database: {DB_NAME}")
            cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(DB_NAME)))
            print(f"✓ Database '{DB_NAME}' created successfully")
        else:
            print(f"✓ Database '{DB_NAME}' already exists")

        cursor.close()
        conn.close()
    except Exception as e:
        print(f"✗ Error creating database: {e}")
        return False
    return True


def load_schema():
    """Load database_schema_fixed.sql into the database."""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=int(DB_PORT),
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
        )
        cursor = conn.cursor()

        schema_file = BASE_DIR / "database_schema_fixed.sql"
        with open(schema_file, "r") as f:
            schema_sql = f.read()

        print("Loading database_schema_fixed.sql (tables + sample data)...")
        cursor.execute(schema_sql)
        conn.commit()
        print("✓ Schema loaded successfully")

        cursor.close()
        conn.close()
    except Exception as e:
        print(f"✗ Error loading schema: {e}")
        return False
    return True


def verify_data():
    """Quick check that data was inserted."""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=int(DB_PORT),
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
        )
        cursor = conn.cursor()

        tables = ["admin_cpu", "admin_mobo", "admin_ram", "admin_gpu", "admin_psu", "admin_ssd", "admin_hdd", "admin_fan", "compatibility_test_cases", "admin_users", "saved_builds"]
        print("\nRow counts:")
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"  {table}: {count} rows")

        cursor.close()
        conn.close()
    except Exception as e:
        print(f"✗ Error verifying data: {e}")


if __name__ == "__main__":
    print("=" * 50)
    print("Setting up pc_builder_simulation database...")
    print("=" * 50)

    if create_database_if_not_exists():
        if load_schema():
            verify_data()
            print("\n✓ Setup complete! Run: python app.py")
        else:
            print("\n✗ Schema loading failed")
    else:
        print("\n✗ Database creation failed")
        print("\nMake sure PostgreSQL is running and your credentials are correct.")
        print(f"  Host: {DB_HOST}:{DB_PORT}")
        print(f"  User: {DB_USER}")
        print(f"  DB:   {DB_NAME}")
