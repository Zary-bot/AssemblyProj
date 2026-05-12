import psycopg2
from psycopg2 import pool, Error
from backend.config import DatabaseConfig
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DatabaseConnection:
    """Manages PostgreSQL database connections"""
    
    _connection_pool = None
    
    @classmethod
    def initialize_pool(cls):
        """Initialize connection pool for PostgreSQL"""
        try:
            cls._connection_pool = psycopg2.pool.SimpleConnectionPool(
                1, 20,  # Minimum 1, maximum 20 connections
                host=DatabaseConfig.DB_HOST,
                port=DatabaseConfig.DB_PORT,
                database=DatabaseConfig.DB_NAME,
                user=DatabaseConfig.DB_USER,
                password=DatabaseConfig.DB_PASSWORD or ''  # Use empty string if password is None/empty
            )
            logger.info("Database connection pool initialized successfully")
        except Error as e:
            logger.error(f"Error initializing connection pool: {e}")
            raise
    
    @classmethod
    def get_connection(cls):
        """Get a connection from the pool"""
        if cls._connection_pool is None:
            cls.initialize_pool()
        
        try:
            connection = cls._connection_pool.getconn()
            logger.info("Connection acquired from pool")
            return connection
        except Error as e:
            logger.error(f"Error getting connection: {e}")
            raise
    
    @classmethod
    def release_connection(cls, connection):
        """Release connection back to the pool"""
        if cls._connection_pool is not None:
            try:
                cls._connection_pool.putconn(connection)
                logger.info("Connection released back to pool")
            except Error as e:
                logger.error(f"Error releasing connection: {e}")
    
    @classmethod
    def close_all_connections(cls):
        """Close all connections in the pool"""
        if cls._connection_pool is not None:
            try:
                cls._connection_pool.closeall()
                logger.info("All connections closed")
            except Error as e:
                logger.error(f"Error closing connections: {e}")
    
    @staticmethod
    def execute_query(query, params=None):
        """
        Execute a SELECT query and return results
        
        Args:
            query: SQL query string
            params: Query parameters (tuple or list)
        
        Returns:
            List of tuples with query results
        """
        connection = DatabaseConnection.get_connection()
        cursor = None
        
        try:
            cursor = connection.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            
            results = cursor.fetchall()
            logger.info(f"Query executed successfully, {len(results)} rows returned")
            return results
        
        except Error as e:
            logger.error(f"Error executing query: {e}")
            raise
        
        finally:
            if cursor:
                cursor.close()
            DatabaseConnection.release_connection(connection)
    
    @staticmethod
    def execute_update(query, params=None):
        """
        Execute an INSERT, UPDATE, or DELETE query
        
        Args:
            query: SQL query string
            params: Query parameters (tuple or list)
        
        Returns:
            Number of rows affected
        """
        connection = DatabaseConnection.get_connection()
        cursor = None
        
        try:
            cursor = connection.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            
            connection.commit()
            rows_affected = cursor.rowcount
            logger.info(f"Update executed successfully, {rows_affected} rows affected")
            return rows_affected
        
        except Error as e:
            connection.rollback()
            logger.error(f"Error executing update: {e}")
            raise
        
        finally:
            if cursor:
                cursor.close()
            DatabaseConnection.release_connection(connection)


def test_connection():
    """Test PostgreSQL connection"""
    try:
        connection = DatabaseConnection.get_connection()
        cursor = connection.cursor()
        cursor.execute("SELECT version();")
        db_version = cursor.fetchone()
        cursor.close()
        DatabaseConnection.release_connection(connection)
        
        logger.info(f"PostgreSQL connection successful: {db_version}")
        print(f"✓ Successfully connected to PostgreSQL")
        print(f"  Version: {db_version[0]}")
        return True
    
    except Error as e:
        logger.error(f"PostgreSQL connection failed: {e}")
        print(f"✗ Failed to connect to PostgreSQL: {e}")
        return False
