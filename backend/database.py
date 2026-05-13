"""
database.py
PostgreSQL connection only.

Do not put sample/static component data here.
"""

import os
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "pc_builder_simulation")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "database")


def get_db_connection():
    """Return a new PostgreSQL connection."""
    if not DB_NAME:
        raise RuntimeError("DB_NAME is missing. Add DB_NAME=pc_builder_simulation in backend/.env")

    if not DB_PASSWORD:
        raise RuntimeError("DB_PASSWORD is missing. Add DB_PASSWORD=database in backend/.env")

    return psycopg2.connect(
        host=DB_HOST,
        port=int(DB_PORT),
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
    )
