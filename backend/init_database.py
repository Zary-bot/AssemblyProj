"""
Database Initialization Script
Creates the PostgreSQL database and populates initial component data
"""

import psycopg2
from psycopg2 import sql, Error
import json
import logging
import os
from dotenv import load_dotenv

# Force load .env file
load_dotenv(override=True)

# Import config after loading .env
from backend.config import DatabaseConfig

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_database():
    """Create the PostgreSQL database if it doesn't exist"""
    try:
        # Connect to default PostgreSQL database
        connection = psycopg2.connect(
            host=DatabaseConfig.DB_HOST,
            port=DatabaseConfig.DB_PORT,
            database='postgres',
            user=DatabaseConfig.DB_USER,
            password=DatabaseConfig.DB_PASSWORD or ''  # Use empty string if password is None/empty
        )
        
        connection.autocommit = True
        cursor = connection.cursor()
        
        # Check if database exists
        cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{DatabaseConfig.DB_NAME}'")
        db_exists = cursor.fetchone()
        
        if not db_exists:
            cursor.execute(sql.SQL("CREATE DATABASE {}").format(
                sql.Identifier(DatabaseConfig.DB_NAME)
            ))
            logger.info(f"✓ Database '{DatabaseConfig.DB_NAME}' created")
            print(f"✓ Database '{DatabaseConfig.DB_NAME}' created successfully")
        else:
            logger.info(f"✓ Database '{DatabaseConfig.DB_NAME}' already exists")
            print(f"✓ Database '{DatabaseConfig.DB_NAME}' already exists")
        
        cursor.close()
        connection.close()
        return True
        
    except Error as e:
        logger.error(f"Error creating database: {e}")
        print(f"✗ Error creating database: {e}")
        return False


def create_tables():
    """Create required tables in PostgreSQL"""
    
    try:
        connection = psycopg2.connect(
            host=DatabaseConfig.DB_HOST,
            port=DatabaseConfig.DB_PORT,
            database=DatabaseConfig.DB_NAME,
            user=DatabaseConfig.DB_USER,
            password=DatabaseConfig.DB_PASSWORD or ''  # Use empty string if password is None/empty
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
        
        connection.commit()
        cursor.close()
        connection.close()
        
        print("✓ All tables created successfully!")
        return True
    
    except Error as e:
        logger.error(f"Error creating tables: {e}")
        print(f"✗ Error creating tables: {e}")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("PostgreSQL Database Initialization")
    print("=" * 60)
    
    print("\n[1/2] Creating database...")
    if create_database():
        print("\n[2/2] Creating tables...")
        if create_tables():
            print("\n" + "=" * 60)
            print("✓ Database initialization completed successfully!")
            print("=" * 60)
        else:
            print("\n✗ Failed to create tables")
    else:
        print("\n✗ Failed to create database")
