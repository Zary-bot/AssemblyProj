"""
Database and Application Configuration
Loads environment variables and sets up database connection
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Config:
    """Base configuration"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    FLASK_DEBUG = os.getenv('FLASK_DEBUG', 0)


class DatabaseConfig:
    """PostgreSQL Database Configuration"""
    
    # Database connection parameters
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', 5432))
    DB_NAME = os.getenv('DB_NAME', 'pc_builder_simulation')
    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'database')
    
    # SQLAlchemy connection string for PostgreSQL
    SQLALCHEMY_DATABASE_URI = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    
    # SQLAlchemy options
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = True  # Set to False in production


def get_db_connection_string():
    """
    Get PostgreSQL connection string
    Returns connection string for direct psycopg2 connection
    """
    return {
        'host': DatabaseConfig.DB_HOST,
        'port': DatabaseConfig.DB_PORT,
        'database': DatabaseConfig.DB_NAME,
        'user': DatabaseConfig.DB_USER,
        'password': DatabaseConfig.DB_PASSWORD
    }
