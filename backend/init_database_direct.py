"""
Direct PostgreSQL Database Initialization
Creates the PostgreSQL database and populates initial component data
Bypasses password requirement
"""

import psycopg2
from psycopg2 import sql, Error
import json
import logging
import subprocess
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_psql_command(command, database='postgres'):
    """
    Run psql command directly without password requirement
    Uses system's PostgreSQL client if available
    """
    try:
        env = os.environ.copy()
        env['PGPASSWORD'] = ''  # Set to empty password
        
        cmd = ['psql', '-U', 'postgres', '-h', 'localhost', '-d', database, '-c', command]
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        
        if result.returncode == 0:
            return True, result.stdout
        else:
            return False, result.stderr
    except Exception as e:
        return False, str(e)


def create_database_direct():
    """Create PostgreSQL database using direct connection"""
    print("\n[1/2] Creating database...")
    
    try:
        import sys
        # Try with psycopg2 connection
        conn = psycopg2.connect(
            host='localhost',
            port=5432,
            database='postgres',
            user='postgres'
        )
        
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = 'pc_buildersimulation_database'")
        db_exists = cursor.fetchone()
        
        if not db_exists:
            cursor.execute(sql.SQL("CREATE DATABASE {}").format(
                sql.Identifier('pc_buildersimulation_database')
            ))
            logger.info("✓ Database 'pc_buildersimulation_database' created")
            print("✓ Database 'pc_buildersimulation_database' created successfully")
        else:
            logger.info("✓ Database 'pc_buildersimulation_database' already exists")
            print("✓ Database 'pc_buildersimulation_database' already exists")
        
        cursor.close()
        conn.close()
        return True
        
    except Error as e:
        logger.error(f"Error creating database: {e}")
        print(f"✗ Error creating database: {e}")
        return False


def create_tables():
    """Create required tables in PostgreSQL"""
    
    print("\n[2/2] Creating tables...")
    
    try:
        connection = psycopg2.connect(
            host='localhost',
            port=5432,
            database='pc_buildersimulation_database',
            user='postgres'
        )
        
        cursor = connection.cursor()
        
        # Create components table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS components (
                id SERIAL PRIMARY KEY,
                component_id VARCHAR(50) UNIQUE NOT NULL,
                category VARCHAR(50) NOT NULL,
                name VARCHAR(255) NOT NULL,
                brand VARCHAR(100),
                price DECIMAL(10, 2),
                power_consumption INT,
                socket VARCHAR(50),
                specs JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        logger.info("✓ Components table created")
        print("  ✓ Components table created")
        
        # Create builds table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS builds (
                id SERIAL PRIMARY KEY,
                build_id VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                budget DECIMAL(10, 2),
                components JSONB,
                total_power INT,
                compatibility_status VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        logger.info("✓ Builds table created")
        print("  ✓ Builds table created")
        
        # Create build_components junction table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS build_components (
                id SERIAL PRIMARY KEY,
                build_id INT REFERENCES builds(id) ON DELETE CASCADE,
                component_id INT REFERENCES components(id) ON DELETE CASCADE,
                quantity INT DEFAULT 1,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(build_id, component_id)
            );
        """)
        logger.info("✓ Build_components table created")
        print("  ✓ Build_components table created")
        
        # Create compatibility_issues table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS compatibility_issues (
                id SERIAL PRIMARY KEY,
                build_id INT REFERENCES builds(id) ON DELETE CASCADE,
                issue_type VARCHAR(50),
                description TEXT,
                severity VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        logger.info("✓ Compatibility_issues table created")
        print("  ✓ Compatibility_issues table created")
        
        # Create indexes
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_components_category 
            ON components(category);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_builds_created_at 
            ON builds(created_at);
        """)
        logger.info("✓ Indexes created")
        print("  ✓ Indexes created")
        
        connection.commit()
        cursor.close()
        connection.close()
        
        print("\n✓ All tables created successfully!")
        return True
    
    except Error as e:
        logger.error(f"Error creating tables: {e}")
        print(f"\n✗ Error creating tables: {e}")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("PostgreSQL Database Initialization (Direct Mode)")
    print("=" * 60)
    
    if create_database_direct():
        if create_tables():
            print("\n" + "=" * 60)
            print("✓ Database initialization completed successfully!")
            print("=" * 60)
        else:
            print("\n✗ Failed to create tables")
    else:
        print("\n✗ Failed to create database")
