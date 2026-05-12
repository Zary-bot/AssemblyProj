import psycopg2
from psycopg2.extras import RealDictCursor
import json
import uuid
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def get_db_connection():
    """Get a direct database connection"""
    conn = psycopg2.connect(
        host="localhost",
        database="pc_building_simulation",
        user="postgres",
        password="database",
        port="5432"
    )
    return conn


class Database:
    """Database management for PC Building Simulation"""
    
    def __init__(self):
        """Initialize database connection"""
        try:
            self.conn = get_db_connection()
            logger.info("Database initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            raise
    
    def get_all_components(self):
        """Get all available components categorized by type"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute("SELECT category, component_id, name, brand, price, specs FROM components ORDER BY category, name")
            
            rows = cursor.fetchall()
            components = {}
            
            for row in rows:
                category = row['category']
                comp_id = row['component_id']
                name = row['name']
                brand = row['brand']
                price = row['price']
                specs_json = row['specs']
                
                if category not in components:
                    components[category] = []
                
                # Handle both dict (JSONB) and string (JSON) formats
                if isinstance(specs_json, dict):
                    specs = specs_json
                elif isinstance(specs_json, str):
                    specs = json.loads(specs_json)
                else:
                    specs = {}
                
                components[category].append({
                    'id': comp_id,
                    'name': name,
                    'brand': brand,
                    'price': float(price) if price else 0,
                    'specs': specs
                })
            
            cursor.close()
            conn.close()
            return components
        except Exception as e:
            logger.error(f"Error getting all components: {e}")
            return {}
    
    def get_components_by_category(self, category):
        """Get components by category"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute(
                "SELECT component_id, name, brand, price, specs FROM components WHERE category = %s ORDER BY name",
                (category,)
            )
            
            rows = cursor.fetchall()
            components = []
            
            for row in rows:
                specs_json = row['specs']
                
                # Handle both dict (JSONB) and string (JSON) formats
                if isinstance(specs_json, dict):
                    specs = specs_json
                elif isinstance(specs_json, str):
                    specs = json.loads(specs_json)
                else:
                    specs = {}
                
                components.append({
                    'id': row['component_id'],
                    'name': row['name'],
                    'brand': row['brand'],
                    'price': float(row['price']) if row['price'] else 0,
                    'specs': specs
                })
            
            cursor.close()
            conn.close()
            return components
        except Exception as e:
            logger.error(f"Error getting components by category: {e}")
            return []
    
    def get_component_details(self, category, component_id):
        """Get detailed specs for a specific component"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute(
                "SELECT component_id, name, brand, price, power_consumption, socket, specs FROM components WHERE component_id = %s AND category = %s",
                (component_id, category)
            )
            
            row = cursor.fetchone()
            if row:
                specs_json = row['specs']
                
                # Handle both dict (JSONB) and string (JSON) formats
                if isinstance(specs_json, dict):
                    specs = specs_json
                elif isinstance(specs_json, str):
                    specs = json.loads(specs_json)
                else:
                    specs = {}
                
                return {
                    'id': row['component_id'],
                    'name': row['name'],
                    'brand': row['brand'],
                    'price': float(row['price']) if row['price'] else 0,
                    'power': row['power_consumption'],
                    'socket': row['socket'],
                    'specs': specs
                }
            
            cursor.close()
            conn.close()
            return None
        except Exception as e:
            logger.error(f"Error getting component details: {e}")
            return None
    
    def save_build(self, build_data):
        """Save a new build"""
        try:
            build_id = str(uuid.uuid4())[:8]
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute(
                """INSERT INTO builds (build_id, name, description, components, total_power, compatibility_status)
                VALUES (%s, %s, %s, %s, %s, %s)""",
                (
                    build_id,
                    build_data.get('name', 'New Build'),
                    build_data.get('description', ''),
                    json.dumps(build_data.get('components', {})),
                    build_data.get('totalPower', 0),
                    'compatible' if build_data.get('compatible', True) else 'incompatible'
                )
            )
            
            conn.commit()
            cursor.close()
            conn.close()
            logger.info(f"Build saved with ID: {build_id}")
            return build_id
        except Exception as e:
            logger.error(f"Error saving build: {e}")
            return None
    
    def get_build(self, build_id):
        """Get a specific build"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute(
                "SELECT build_id, name, description, components, total_power, compatibility_status, created_at FROM builds WHERE build_id = %s",
                (build_id,)
            )
            
            row = cursor.fetchone()
            if row:
                components_json = row['components']
                
                # Handle both dict and string formats
                if isinstance(components_json, dict):
                    components = components_json
                elif isinstance(components_json, str):
                    components = json.loads(components_json)
                else:
                    components = {}
                
                result = {
                    'id': row['build_id'],
                    'name': row['name'],
                    'description': row['description'],
                    'components': components,
                    'totalPower': row['total_power'],
                    'compatibility': row['compatibility_status'],
                    'created': row['created_at'].isoformat() if row['created_at'] else None
                }
                
                cursor.close()
                conn.close()
                return result
            
            cursor.close()
            conn.close()
            return None
        except Exception as e:
            logger.error(f"Error getting build: {e}")
            return None
    
    def get_all_builds(self):
        """Get all saved builds"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute(
                "SELECT build_id, name, description, components, total_power, compatibility_status, created_at FROM builds ORDER BY created_at DESC"
            )
            
            rows = cursor.fetchall()
            builds = []
            
            for row in rows:
                components_json = row['components']
                
                # Handle both dict and string formats
                if isinstance(components_json, dict):
                    components = components_json
                elif isinstance(components_json, str):
                    components = json.loads(components_json)
                else:
                    components = {}
                
                builds.append({
                    'id': row['build_id'],
                    'name': row['name'],
                    'description': row['description'],
                    'components': components,
                    'totalPower': row['total_power'],
                    'compatibility': row['compatibility_status'],
                    'created': row['created_at'].isoformat() if row['created_at'] else None
                })
            
            cursor.close()
            conn.close()
            return builds
        except Exception as e:
            logger.error(f"Error getting all builds: {e}")
            return []
    
    def update_build(self, build_id, build_data):
        """Update an existing build"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute(
                """UPDATE builds SET name = %s, description = %s, components = %s, 
                total_power = %s, compatibility_status = %s, updated_at = CURRENT_TIMESTAMP
                WHERE build_id = %s""",
                (
                    build_data.get('name', 'Updated Build'),
                    build_data.get('description', ''),
                    json.dumps(build_data.get('components', {})),
                    build_data.get('totalPower', 0),
                    'compatible' if build_data.get('compatible', True) else 'incompatible',
                    build_id
                )
            )
            
            rows_affected = cursor.rowcount
            conn.commit()
            cursor.close()
            conn.close()
            logger.info(f"Build {build_id} updated, rows affected: {rows_affected}")
            return rows_affected > 0
        except Exception as e:
            logger.error(f"Error updating build: {e}")
            return False
    
    def delete_build(self, build_id):
        """Delete a build"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("DELETE FROM builds WHERE build_id = %s", (build_id,))
            
            rows_affected = cursor.rowcount
            conn.commit()
            cursor.close()
            conn.close()
            logger.info(f"Build {build_id} deleted, rows affected: {rows_affected}")
            return rows_affected > 0
        except Exception as e:
            logger.error(f"Error deleting build: {e}")
            return False
    
    def calculate_stats(self, build):
        """Calculate comprehensive build statistics"""
        stats = {
            'totalCost': 0,
            'totalPower': 0,
            'componentCount': 0,
            'compatible': True,
            'issues': []
        }
        
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            for component_type, comp_id in build.items():
                if comp_id:
                    cursor.execute(
                        "SELECT price, power_consumption FROM components WHERE component_id = %s",
                        (comp_id,)
                    )
                    row = cursor.fetchone()
                    if row:
                        stats['totalCost'] += float(row['price']) if row['price'] else 0
                        stats['totalPower'] += row['power_consumption'] or 0
                        stats['componentCount'] += 1
            
            cursor.close()
            conn.close()
        except Exception as e:
            logger.error(f"Error calculating stats: {e}")
        
        return stats
    
    def calculate_total_power(self, build):
        """Calculate total power consumption of the build"""
        total_power = 0
        
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            for component_type, comp_id in build.items():
                if comp_id:
                    cursor.execute(
                        "SELECT power_consumption FROM components WHERE component_id = %s",
                        (comp_id,)
                    )
                    row = cursor.fetchone()
                    if row:
                        total_power += row['power_consumption'] or 0
            
            cursor.close()
            conn.close()
        except Exception as e:
            logger.error(f"Error calculating power: {e}")
        
        return total_power
    
    def check_compatibility(self, build):
        """Check if selected components are compatible"""
        issues = []
        is_compatible = True
        
        # Basic compatibility checks - can be expanded
        if build.get('cpu') and build.get('mb'):
            # In a real scenario, check socket compatibility
            pass
        
        if build.get('ram') and build.get('mb'):
            # Check RAM compatibility
            pass
        
        return is_compatible, issues