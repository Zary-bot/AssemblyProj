

import psycopg2
from backend.config import DatabaseConfig
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_tables():
    """Create required tables in PostgreSQL"""
    
    try:
        connection = psycopg2.connect(
            host=DatabaseConfig.DB_HOST,
            port=DatabaseConfig.DB_PORT,
            database=DatabaseConfig.DB_NAME,
            user=DatabaseConfig.DB_USER,
            password=DatabaseConfig.DB_PASSWORD
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
        
        # Create indexes for better query performance
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
        
        print("✓ Database setup completed successfully!")
        return True
    
    except psycopg2.Error as e:
        logger.error(f"Database setup error: {e}")
        print(f"✗ Database setup failed: {e}")
        return False


if __name__ == "__main__":
    print("Initializing PostgreSQL database schema...")
    create_tables()
