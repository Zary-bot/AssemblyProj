"""
PostgreSQL Connection Test with Debugging
"""

import psycopg2
import os
from dotenv import load_dotenv

print("=" * 60)
print("PostgreSQL Connection Diagnostic Test")
print("=" * 60)

# Load .env file
load_dotenv()
print("\n[1] Loading environment variables...")

HOST = os.getenv('DB_HOST', 'localhost')
PORT = os.getenv('DB_PORT', '5432')
USER = os.getenv('DB_USER', 'postgres')
PASSWORD = os.getenv('DB_PASSWORD', '')
DB_NAME = 'postgres'  # Connect to default postgres database first

print(f"  DB_HOST: {HOST}")
print(f"  DB_PORT: {PORT}")
print(f"  DB_USER: {USER}")
print(f"  DB_PASSWORD: {'[SET]' if PASSWORD else '[EMPTY]'}")

print("\n[2] Attempting connection to PostgreSQL...")
print(f"  Connecting to: {USER}@{HOST}:{PORT}/{DB_NAME}")

try:
    if PASSWORD:
        conn = psycopg2.connect(
            host=HOST,
            port=int(PORT),
            database=DB_NAME,
            user=USER,
            password=PASSWORD
        )
        print("  ✓ Connection successful with password 'database'")
    else:
        print("  ✗ Password is empty in .env file!")
        print("\n  Trying without password...")
        conn = psycopg2.connect(
            host=HOST,
            port=int(PORT),
            database=DB_NAME,
            user=USER
        )
        print("  ✓ Connection successful without password")
    
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    version = cursor.fetchone()
    print(f"\n[3] PostgreSQL Version:")
    print(f"  {version[0]}")
    
    cursor.close()
    conn.close()
    
    print("\n" + "=" * 60)
    print("✓ PostgreSQL connection test PASSED!")
    print("=" * 60)

except psycopg2.Error as e:
    print(f"\n  ✗ Connection failed: {e}")
    print("\n" + "=" * 60)
    print("✗ PostgreSQL connection test FAILED!")
    print("=" * 60)
    print("\nTroubleshooting steps:")
    print("1. Verify PostgreSQL is running in Xampp Control Panel")
    print("2. Check the actual password in Xampp PostgreSQL settings")
    print("3. Update DB_PASSWORD in .env file with the correct password")
    print("4. If password is empty/blank, leave DB_PASSWORD= empty in .env")
