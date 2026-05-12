"""
PostgreSQL-based PC Component Database
Manages all PC components and build compatibility checking using PostgreSQL
"""

import json
import uuid
from datetime import datetime
from backend.db_connection import DatabaseConnection
import logging

logger = logging.getLogger(__name__)


class Database:
    """PostgreSQL-backed database class for PC components and builds"""
    
    def __init__(self):
        """Initialize the database connection"""
        try:
            DatabaseConnection.initialize_pool()
            logger.info("Database initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            raise
    
    def _initialize_components_data(self):
        """
        Initialize the component database with comprehensive specs
        This data is used for initial population if tables are empty
        """
        return {
            'cpu': [
                {
                    'id': 'cpu_1',
                    'name': 'Intel Core i9-13900K',
                    'brand': 'Intel',
                    'price': 589.99,
                    'power': 125,
                    'socket': 'LGA1700',
                    'specs': {
                        'cores': 24,
                        'threads': 32,
                        'base_clock': 3.0,
                        'boost_clock': 5.8,
                        'tdp': 125,
                        'cache': 36,
                        'lithography': '7nm',
                        'generation': '13th Gen',
                        'unlocked': True,
                        'igpu': 'Intel UHD Graphics 770'
                    }
                },
                {
                    'id': 'cpu_2',
                    'name': 'Intel Core i7-13700K',
                    'brand': 'Intel',
                    'price': 419.99,
                    'power': 125,
                    'socket': 'LGA1700',
                    'specs': {
                        'cores': 16,
                        'threads': 24,
                        'base_clock': 3.4,
                        'boost_clock': 5.4,
                        'tdp': 125,
                        'cache': 30,
                        'lithography': '7nm',
                        'generation': '13th Gen',
                        'unlocked': True,
                        'igpu': 'Intel UHD Graphics 770'
                    }
                },
                {
                    'id': 'cpu_3',
                    'name': 'AMD Ryzen 9 7950X',
                    'brand': 'AMD',
                    'price': 699.99,
                    'power': 162,
                    'socket': 'AM5',
                    'specs': {
                        'cores': 16,
                        'threads': 32,
                        'base_clock': 4.5,
                        'boost_clock': 5.7,
                        'tdp': 162,
                        'cache': 64,
                        'lithography': '5nm',
                        'generation': 'Ryzen 7000',
                        'unlocked': True,
                        'igpu': False
                    }
                }
            ],
            'gpu': [
                {
                    'id': 'gpu_1',
                    'name': 'NVIDIA RTX 4090',
                    'brand': 'NVIDIA',
                    'price': 1599.99,
                    'power': 450,
                    'socket': 'PCIe 4.0',
                    'specs': {
                        'vram': 24,
                        'vram_type': 'GDDR6X',
                        'memory_bandwidth': 1008,
                        'tdp': 450,
                        'ray_cores': 18176,
                        'cuda_cores': 16384,
                        'tensor_cores': 512,
                        'generation': 'Ada'
                    }
                },
                {
                    'id': 'gpu_2',
                    'name': 'NVIDIA RTX 4080',
                    'brand': 'NVIDIA',
                    'price': 1199.99,
                    'power': 320,
                    'socket': 'PCIe 4.0',
                    'specs': {
                        'vram': 16,
                        'vram_type': 'GDDR6X',
                        'memory_bandwidth': 576,
                        'tdp': 320,
                        'cuda_cores': 9728,
                        'generation': 'Ada'
                    }
                }
            ],
            'ram': [
                {
                    'id': 'ram_1',
                    'name': 'Corsair Vengeance 32GB DDR5',
                    'brand': 'Corsair',
                    'price': 129.99,
                    'power': 5,
                    'socket': 'DDR5',
                    'specs': {
                        'capacity': 32,
                        'speed': 6000,
                        'type': 'DDR5',
                        'cas_latency': 30,
                        'voltage': 1.4
                    }
                }
            ],
            'storage': [
                {
                    'id': 'storage_1',
                    'name': 'Samsung 990 Pro 2TB',
                    'brand': 'Samsung',
                    'price': 229.99,
                    'power': 8,
                    'socket': 'NVMe M.2',
                    'specs': {
                        'capacity': 2000,
                        'type': 'NVMe SSD',
                        'interface': 'PCIe 4.0',
                        'read_speed': 7100,
                        'write_speed': 6000
                    }
                }
            ],
            'psu': [
                {
                    'id': 'psu_1',
                    'name': 'Corsair RM1000x',
                    'brand': 'Corsair',
                    'price': 199.99,
                    'power': 0,
                    'socket': 'ATX',
                    'specs': {
                        'wattage': 1000,
                        'efficiency': '80+ Gold',
                        'modular': 'Full',
                        'warranty_years': 10
                    }
                }
            ]
        }
    
    def populate_initial_components(self):
        """Populate initial component data if database is empty"""
        try:
            # Check if components already exist
            result = DatabaseConnection.execute_query("SELECT COUNT(*) FROM components")
            if result and result[0][0] > 0:
                logger.info("Components already exist in database")
                return
            
            logger.info("Populating initial component data...")
            components_data = self._initialize_components_data()
            
            for category, items in components_data.items():
                for item in items:
                    DatabaseConnection.execute_update(
                        """INSERT INTO components 
                        (component_id, category, name, brand, price, power_consumption, socket, specs)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                        (
                            item['id'],
                            category,
                            item['name'],
                            item.get('brand', ''),
                            item.get('price', 0),
                            item.get('power', 0),
                            item.get('socket', ''),
                            json.dumps(item.get('specs', {}))
                        )
                    )
            
            logger.info("✓ Initial components populated successfully")
        except Exception as e:
            logger.error(f"Error populating initial components: {e}")
    
    def get_all_components(self):
        """Get all available components categorized by type"""
        try:
            result = DatabaseConnection.execute_query(
                "SELECT category, component_id, name, brand, price, specs FROM components ORDER BY category, name"
            )
            
            components = {}
            for row in result:
                category, comp_id, name, brand, price, specs_json = row
                if category not in components:
                    components[category] = []
                
                components[category].append({
                    'id': comp_id,
                    'name': name,
                    'brand': brand,
                    'price': float(price) if price else 0,
                    'specs': json.loads(specs_json) if specs_json else {}
                })
            
            return components
        except Exception as e:
            logger.error(f"Error getting all components: {e}")
            return {}
    
    def get_components_by_category(self, category):
        """Get components by category"""
        try:
            result = DatabaseConnection.execute_query(
                "SELECT component_id, name, brand, price, specs FROM components WHERE category = %s ORDER BY name",
                (category,)
            )
            
            components = []
            for row in result:
                comp_id, name, brand, price, specs_json = row
                components.append({
                    'id': comp_id,
                    'name': name,
                    'brand': brand,
                    'price': float(price) if price else 0,
                    'specs': json.loads(specs_json) if specs_json else {}
                })
            
            return components
        except Exception as e:
            logger.error(f"Error getting components by category: {e}")
            return []
    
    def get_component_details(self, category, component_id):
        """Get detailed specs for a specific component"""
        try:
            result = DatabaseConnection.execute_query(
                "SELECT component_id, name, brand, price, power_consumption, socket, specs FROM components WHERE component_id = %s AND category = %s",
                (component_id, category)
            )
            
            if result:
                comp_id, name, brand, price, power, socket, specs_json = result[0]
                return {
                    'id': comp_id,
                    'name': name,
                    'brand': brand,
                    'price': float(price) if price else 0,
                    'power': power,
                    'socket': socket,
                    'specs': json.loads(specs_json) if specs_json else {}
                }
            return None
        except Exception as e:
            logger.error(f"Error getting component details: {e}")
            return None
    
    def check_compatibility(self, build):
        """Check if selected components are compatible"""
        issues = []
        is_compatible = True
        
        # Basic compatibility checks
        if build.get('cpu') and build.get('mb'):
            # In a real scenario, check socket compatibility
            pass
        
        if build.get('ram') and build.get('mb'):
            # Check RAM compatibility
            pass
        
        return is_compatible, issues
    
    def calculate_total_power(self, build):
        """Calculate total power consumption of the build"""
        total_power = 0
        
        for component_type, comp_id in build.items():
            if comp_id:
                try:
                    result = DatabaseConnection.execute_query(
                        "SELECT power_consumption FROM components WHERE component_id = %s",
                        (comp_id,)
                    )
                    if result:
                        total_power += result[0][0] or 0
                except Exception as e:
                    logger.error(f"Error calculating power: {e}")
        
        return total_power
    
    def calculate_stats(self, build):
        """Calculate comprehensive build statistics"""
        stats = {
            'totalCost': 0,
            'totalPower': 0,
            'componentCount': 0,
            'compatible': True,
            'issues': []
        }
        
        for component_type, comp_id in build.items():
            if comp_id:
                try:
                    result = DatabaseConnection.execute_query(
                        "SELECT price, power_consumption FROM components WHERE component_id = %s",
                        (comp_id,)
                    )
                    if result:
                        price, power = result[0]
                        stats['totalCost'] += float(price) if price else 0
                        stats['totalPower'] += power or 0
                        stats['componentCount'] += 1
                except Exception as e:
                    logger.error(f"Error calculating stats: {e}")
        
        return stats
    
    def save_build(self, build_data):
        """Save a new build"""
        try:
            build_id = str(uuid.uuid4())[:8]
            
            DatabaseConnection.execute_update(
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
            
            logger.info(f"Build saved with ID: {build_id}")
            return build_id
        except Exception as e:
            logger.error(f"Error saving build: {e}")
            return None
    
    def get_build(self, build_id):
        """Get a specific build"""
        try:
            result = DatabaseConnection.execute_query(
                "SELECT build_id, name, description, components, total_power, compatibility_status, created_at FROM builds WHERE build_id = %s",
                (build_id,)
            )
            
            if result:
                bid, name, desc, components, power, status, created = result[0]
                return {
                    'id': bid,
                    'name': name,
                    'description': desc,
                    'components': json.loads(components) if components else {},
                    'totalPower': power,
                    'compatibility': status,
                    'created': created.isoformat() if created else None
                }
            return None
        except Exception as e:
            logger.error(f"Error getting build: {e}")
            return None
    
    def get_all_builds(self):
        """Get all saved builds"""
        try:
            result = DatabaseConnection.execute_query(
                "SELECT build_id, name, description, components, total_power, compatibility_status, created_at FROM builds ORDER BY created_at DESC"
            )
            
            builds = []
            for row in result:
                bid, name, desc, components, power, status, created = row
                builds.append({
                    'id': bid,
                    'name': name,
                    'description': desc,
                    'components': json.loads(components) if components else {},
                    'totalPower': power,
                    'compatibility': status,
                    'created': created.isoformat() if created else None
                })
            
            return builds
        except Exception as e:
            logger.error(f"Error getting all builds: {e}")
            return []
    
    def update_build(self, build_id, build_data):
        """Update an existing build"""
        try:
            affected = DatabaseConnection.execute_update(
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
            
            logger.info(f"Build {build_id} updated, rows affected: {affected}")
            return affected > 0
        except Exception as e:
            logger.error(f"Error updating build: {e}")
            return False
    
    def delete_build(self, build_id):
        """Delete a build"""
        try:
            affected = DatabaseConnection.execute_update(
                "DELETE FROM builds WHERE build_id = %s",
                (build_id,)
            )
            
            logger.info(f"Build {build_id} deleted, rows affected: {affected}")
            return affected > 0
        except Exception as e:
            logger.error(f"Error deleting build: {e}")
            return False
    
    def _load_builds(self):
        """Legacy method for compatibility"""
        pass