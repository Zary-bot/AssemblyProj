"""
Populate initial components directly into PostgreSQL database
Bypasses connection pooling to handle password authentication issues
"""

import psycopg2
import json
from datetime import datetime

# Direct connection parameters
DB_HOST = 'localhost'
DB_PORT = 5432
DB_NAME = 'pc_buildersimulation_database'
DB_USER = 'postgres'
DB_PASSWORD = ''  # Empty for trust authentication

def get_components_data():
    """Return the initial components data"""
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
                    'cores': 24, 'threads': 32, 'base_clock': 3.0, 'boost_clock': 5.8,
                    'tdp': 125, 'cache': 36, 'lithography': '7nm', 'generation': '13th Gen',
                    'unlocked': True, 'igpu': 'Intel UHD Graphics 770'
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
                    'cores': 16, 'threads': 24, 'base_clock': 3.4, 'boost_clock': 5.4,
                    'tdp': 125, 'cache': 30, 'lithography': '7nm', 'generation': '13th Gen',
                    'unlocked': True, 'igpu': 'Intel UHD Graphics 770'
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
                    'cores': 16, 'threads': 32, 'base_clock': 4.5, 'boost_clock': 5.7,
                    'tdp': 162, 'cache': 64, 'lithography': '5nm', 'generation': '7000 Series',
                    'unlocked': True, 'igpu': 'Integrated Radeon Graphics'
                }
            }
        ],
        'gpu': [
            {
                'id': 'gpu_1',
                'name': 'NVIDIA GeForce RTX 4090',
                'brand': 'NVIDIA',
                'price': 1599.99,
                'power': 450,
                'socket': 'PCIe 4.0',
                'specs': {
                    'vram': 24, 'vram_type': 'GDDR6X', 'cuda_cores': 16384,
                    'boost_clock': 2.52, 'memory_bandwidth': 1008, 'tdp': 450,
                    'architecture': 'Ada', 'ray_cores': 568, 'tensor_cores': 568
                }
            },
            {
                'id': 'gpu_2',
                'name': 'NVIDIA GeForce RTX 4080',
                'brand': 'NVIDIA',
                'price': 1199.99,
                'power': 320,
                'socket': 'PCIe 4.0',
                'specs': {
                    'vram': 16, 'vram_type': 'GDDR6X', 'cuda_cores': 9728,
                    'boost_clock': 2.505, 'memory_bandwidth': 576, 'tdp': 320,
                    'architecture': 'Ada', 'ray_cores': 304, 'tensor_cores': 304
                }
            }
        ],
        'ram': [
            {
                'id': 'ram_1',
                'name': 'Corsair Vengeance DDR5 32GB',
                'brand': 'Corsair',
                'price': 149.99,
                'power': 5,
                'socket': 'DDR5',
                'specs': {
                    'capacity': 32, 'speed': 5600, 'type': 'DDR5', 'form_factor': 'DIMM',
                    'cas_latency': 36, 'voltage': 1.25, 'color': 'Black', 'rgb': True
                }
            }
        ],
        'storage': [
            {
                'id': 'storage_1',
                'name': 'Samsung 990 Pro 2TB',
                'brand': 'Samsung',
                'price': 179.99,
                'power': 8,
                'socket': 'M.2 NVMe',
                'specs': {
                    'capacity': 2000, 'type': 'NVMe SSD', 'interface': 'PCIe 4.0',
                    'read_speed': 7450, 'write_speed': 6900, 'form_factor': 'M.2 2280',
                    'durability': 1200, 'warranty': 5
                }
            }
        ],
        'psu': [
            {
                'id': 'psu_1',
                'name': 'Corsair RM1000x 1000W',
                'brand': 'Corsair',
                'price': 149.99,
                'power': 0,
                'socket': 'ATX',
                'specs': {
                    'wattage': 1000, 'efficiency': '80 Plus Gold', 'form_factor': 'ATX',
                    'modular': 'Full', 'fan_size': 135, 'warranty': 10, 'noise': 'Silent under 50% load'
                }
            }
        ]
    }

def populate_components():
    """Populate the components table"""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD or None
        )
        cursor = conn.cursor()
        
        components_data = get_components_data()
        now = datetime.now()
        
        print("=" * 60)
        print("Populating Components Table")
        print("=" * 60)
        
        total_inserted = 0
        for category, items in components_data.items():
            for item in items:
                cursor.execute("""
                    INSERT INTO components 
                    (component_id, category, name, brand, price, power_consumption, socket, specs, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (component_id) DO NOTHING
                """, (
                    item['id'],
                    category,
                    item['name'],
                    item['brand'],
                    item['price'],
                    item['power'],
                    item['socket'],
                    json.dumps(item['specs']),
                    now,
                    now
                ))
                total_inserted += cursor.rowcount
            
            print(f"✓ {len(items)} {category.upper()} components inserted")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("=" * 60)
        print(f"✓ {total_inserted} total components inserted successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"✗ Error populating components: {e}")
        raise

if __name__ == "__main__":
    populate_components()
