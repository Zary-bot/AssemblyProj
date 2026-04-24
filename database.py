"""
Comprehensive PC Component Database
Manages all PC components and build compatibility checking
"""

import json
import uuid
from datetime import datetime


class Database:
    """Main database class for PC components and builds"""
    
    def __init__(self):
        """Initialize the database with components and builds"""
        self.components = self._initialize_components()
        self.builds = {}
        self._load_builds()
    
    def _initialize_components(self):
        """Initialize the component database with comprehensive specs"""
        return {
            'cpu': [
                {
                    'id': 'cpu_1',
                    'name': 'Intel Core i9-13900K',
                    'brand': 'Intel',
                    'price': 589,
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
                    'price': 419,
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
                    'name': 'Intel Core i5-13600K',
                    'brand': 'Intel',
                    'price': 289,
                    'power': 125,
                    'socket': 'LGA1700',
                    'specs': {
                        'cores': 14,
                        'threads': 20,
                        'base_clock': 3.5,
                        'boost_clock': 5.1,
                        'tdp': 125,
                        'cache': 24,
                        'lithography': '7nm',
                        'generation': '13th Gen',
                        'unlocked': True,
                        'igpu': 'Intel UHD Graphics 770'
                    }
                },
                {
                    'id': 'cpu_4',
                    'name': 'AMD Ryzen 9 7950X',
                    'brand': 'AMD',
                    'price': 599,
                    'power': 120,
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
                        'igpu': None
                    }
                },
                {
                    'id': 'cpu_5',
                    'name': 'AMD Ryzen 7 7700X',
                    'brand': 'AMD',
                    'price': 399,
                    'power': 120,
                    'socket': 'AM5',
                    'specs': {
                        'cores': 8,
                        'threads': 16,
                        'base_clock': 4.5,
                        'boost_clock': 5.4,
                        'tdp': 105,
                        'cache': 32,
                        'lithography': '5nm',
                        'generation': 'Ryzen 7000',
                        'unlocked': True,
                        'igpu': None
                    }
                },
            ],
            'gpu': [
                {
                    'id': 'gpu_1',
                    'name': 'NVIDIA RTX 4090',
                    'brand': 'NVIDIA',
                    'price': 1599,
                    'power': 450,
                    'specs': {
                        'vram': 24,
                        'vram_type': 'GDDR6X',
                        'cuda_cores': 16384,
                        'tensor_cores': 512,
                        'memory_bandwidth': 576,
                        'interface': 'PCIe 4.0 x16',
                        'boost_clock': 2.52,
                        'base_clock': 2.23,
                        'tdp': 450,
                        'architecture': 'Ada',
                        'ray_tracing_cores': 512,
                        'max_power_draw': 450
                    }
                },
                {
                    'id': 'gpu_2',
                    'name': 'NVIDIA RTX 4080',
                    'brand': 'NVIDIA',
                    'price': 1199,
                    'power': 320,
                    'specs': {
                        'vram': 16,
                        'vram_type': 'GDDR6X',
                        'cuda_cores': 9728,
                        'tensor_cores': 304,
                        'memory_bandwidth': 432,
                        'interface': 'PCIe 4.0 x16',
                        'boost_clock': 2.51,
                        'base_clock': 2.21,
                        'tdp': 320,
                        'architecture': 'Ada',
                        'ray_tracing_cores': 304,
                        'max_power_draw': 320
                    }
                },
                {
                    'id': 'gpu_3',
                    'name': 'NVIDIA RTX 4070',
                    'brand': 'NVIDIA',
                    'price': 799,
                    'power': 200,
                    'specs': {
                        'vram': 12,
                        'vram_type': 'GDDR6',
                        'cuda_cores': 5888,
                        'tensor_cores': 184,
                        'memory_bandwidth': 324,
                        'interface': 'PCIe 4.0 x16',
                        'boost_clock': 2.61,
                        'base_clock': 2.31,
                        'tdp': 200,
                        'architecture': 'Ada',
                        'ray_tracing_cores': 184,
                        'max_power_draw': 200
                    }
                },
                {
                    'id': 'gpu_4',
                    'name': 'AMD Radeon RX 7900 XTX',
                    'brand': 'AMD',
                    'price': 899,
                    'power': 420,
                    'specs': {
                        'vram': 24,
                        'vram_type': 'GDDR6',
                        'stream_processors': 6144,
                        'memory_bandwidth': 576,
                        'interface': 'PCIe 4.0 x16',
                        'boost_clock': 2.5,
                        'base_clock': 2.0,
                        'tdp': 420,
                        'architecture': 'RDNA 3',
                        'ray_accelerators': 96,
                        'max_power_draw': 420
                    }
                },
            ],
            'ram': [
                {
                    'id': 'ram_1',
                    'name': 'Corsair Vengeance DDR5 64GB (32GB x2)',
                    'brand': 'Corsair',
                    'price': 249,
                    'power': 8,
                    'specs': {
                        'capacity': 64,
                        'type': 'DDR5',
                        'speed': 6000,
                        'cas_latency': 30,
                        'voltage': 1.25,
                        'form_factor': 'UDIMM',
                        'modules': 2,
                        'module_capacity': 32,
                        'ecc': False,
                        'rgb': True,
                        'warranty': '1 Year'
                    }
                },
                {
                    'id': 'ram_2',
                    'name': 'G.Skill Trident Z5 32GB (16GB x2)',
                    'brand': 'G.Skill',
                    'price': 129,
                    'power': 5,
                    'specs': {
                        'capacity': 32,
                        'type': 'DDR5',
                        'speed': 6000,
                        'cas_latency': 30,
                        'voltage': 1.25,
                        'form_factor': 'UDIMM',
                        'modules': 2,
                        'module_capacity': 16,
                        'ecc': False,
                        'rgb': True,
                        'warranty': 'Lifetime'
                    }
                },
                {
                    'id': 'ram_3',
                    'name': 'Kingston Fury Beast 32GB (16GB x2)',
                    'brand': 'Kingston',
                    'price': 99,
                    'power': 5,
                    'specs': {
                        'capacity': 32,
                        'type': 'DDR5',
                        'speed': 5600,
                        'cas_latency': 35,
                        'voltage': 1.25,
                        'form_factor': 'UDIMM',
                        'modules': 2,
                        'module_capacity': 16,
                        'ecc': False,
                        'rgb': False,
                        'warranty': '1 Year'
                    }
                },
                {
                    'id': 'ram_4',
                    'name': 'Corsair Vengeance Pro 32GB DDR4',
                    'brand': 'Corsair',
                    'price': 79,
                    'power': 5,
                    'specs': {
                        'capacity': 32,
                        'type': 'DDR4',
                        'speed': 3200,
                        'cas_latency': 16,
                        'voltage': 1.35,
                        'form_factor': 'UDIMM',
                        'modules': 2,
                        'module_capacity': 16,
                        'ecc': False,
                        'rgb': True,
                        'warranty': 'Lifetime'
                    }
                },
            ],
            'storage': [
                {
                    'id': 'ssd_1',
                    'name': 'Samsung 990 Pro 2TB',
                    'brand': 'Samsung',
                    'price': 179,
                    'power': 5,
                    'specs': {
                        'capacity': 2000,
                        'type': 'NVMe SSD',
                        'interface': 'PCIe 4.0',
                        'form_factor': 'M.2 2280',
                        'read_speed': 7100,
                        'write_speed': 6000,
                        'iops_read': 1400000,
                        'iops_write': 1000000,
                        'mtbf': 1500000,
                        'warranty': '5 Years',
                        'dram_cache': '4 GB'
                    }
                },
                {
                    'id': 'ssd_2',
                    'name': 'WD Black SN850X 1TB',
                    'brand': 'Western Digital',
                    'price': 89,
                    'power': 5,
                    'specs': {
                        'capacity': 1000,
                        'type': 'NVMe SSD',
                        'interface': 'PCIe 4.0',
                        'form_factor': 'M.2 2280',
                        'read_speed': 7100,
                        'write_speed': 6000,
                        'iops_read': 721000,
                        'iops_write': 800000,
                        'mtbf': 1750000,
                        'warranty': '5 Years',
                        'dram_cache': '512 MB'
                    }
                },
                {
                    'id': 'ssd_3',
                    'name': 'Crucial P5 Plus 1TB',
                    'brand': 'Crucial',
                    'price': 79,
                    'power': 4,
                    'specs': {
                        'capacity': 1000,
                        'type': 'NVMe SSD',
                        'interface': 'PCIe 4.0',
                        'form_factor': 'M.2 2280',
                        'read_speed': 6600,
                        'write_speed': 5000,
                        'iops_read': 680000,
                        'iops_write': 550000,
                        'mtbf': 1600000,
                        'warranty': '5 Years',
                        'dram_cache': 'No DRAM'
                    }
                },
            ],
            'motherboard': [
                {
                    'id': 'mb_1',
                    'name': 'ASUS ROG Maximus Z790 Hero',
                    'brand': 'ASUS',
                    'price': 379,
                    'power': 20,
                    'socket': 'LGA1700',
                    'specs': {
                        'form_factor': 'ATX',
                        'chipset': 'Z790',
                        'ram_slots': 4,
                        'max_ram': 192,
                        'ram_speed': 'DDR5-6400+',
                        'pcie_slots': 3,
                        'm2_slots': 4,
                        'sata_ports': 6,
                        'usb_ports': 18,
                        'network': '2.5G Ethernet',
                        'audio': 'Realtek ALC4080',
                        'vrm_phases': '16+2+1',
                        'bios': 'UEFI',
                        'warranty': '3 Years'
                    }
                },
                {
                    'id': 'mb_2',
                    'name': 'MSI MPG Z790 Edge WiFi',
                    'brand': 'MSI',
                    'price': 299,
                    'power': 20,
                    'socket': 'LGA1700',
                    'specs': {
                        'form_factor': 'ATX',
                        'chipset': 'Z790',
                        'ram_slots': 4,
                        'max_ram': 192,
                        'ram_speed': 'DDR5-6400+',
                        'pcie_slots': 3,
                        'm2_slots': 4,
                        'sata_ports': 6,
                        'usb_ports': 16,
                        'network': '2.5G Ethernet + WiFi 6E',
                        'audio': 'Realtek ALC1220',
                        'vrm_phases': '14+2+1',
                        'bios': 'UEFI',
                        'warranty': '3 Years'
                    }
                },
                {
                    'id': 'mb_3',
                    'name': 'ASUS ROG STRIX X870-E',
                    'brand': 'ASUS',
                    'price': 449,
                    'power': 20,
                    'socket': 'AM5',
                    'specs': {
                        'form_factor': 'ATX',
                        'chipset': 'X870-E',
                        'ram_slots': 2,
                        'max_ram': 192,
                        'ram_speed': 'DDR5-9200+',
                        'pcie_slots': 3,
                        'm2_slots': 4,
                        'sata_ports': 4,
                        'usb_ports': 20,
                        'network': '10G Ethernet',
                        'audio': 'Realtek ALC4080',
                        'vrm_phases': '18+2+2',
                        'bios': 'UEFI',
                        'warranty': '3 Years'
                    }
                },
                {
                    'id': 'mb_4',
                    'name': 'MSI MPG B850E Edge WiFi',
                    'brand': 'MSI',
                    'price': 299,
                    'power': 20,
                    'socket': 'AM5',
                    'specs': {
                        'form_factor': 'ATX',
                        'chipset': 'B850E',
                        'ram_slots': 2,
                        'max_ram': 192,
                        'ram_speed': 'DDR5-7200+',
                        'pcie_slots': 3,
                        'm2_slots': 4,
                        'sata_ports': 4,
                        'usb_ports': 18,
                        'network': '2.5G Ethernet + WiFi 6E',
                        'audio': 'Realtek ALC1220',
                        'vrm_phases': '12+2+1',
                        'bios': 'UEFI',
                        'warranty': '3 Years'
                    }
                },
            ],
            'psu': [
                {
                    'id': 'psu_1',
                    'name': 'Corsair RM1200x',
                    'brand': 'Corsair',
                    'price': 199,
                    'power': 1200,
                    'specs': {
                        'wattage': 1200,
                        'efficiency': '80+ Gold',
                        'certification': '80+ Gold',
                        'form_factor': 'ATX',
                        'modular': 'Fully',
                        'rails': '12V Multi-rail',
                        'cooling': '135mm Fan',
                        'protection': ['Over-voltage', 'Under-voltage', 'Over-current', 'Over-temperature'],
                        'warranty': '10 Years',
                        'dimensions': '150 x 165 x 86mm',
                        'weight': 2.7
                    }
                },
                {
                    'id': 'psu_2',
                    'name': 'EVGA SuperNOVA 1000 G6',
                    'brand': 'EVGA',
                    'price': 149,
                    'power': 1000,
                    'specs': {
                        'wattage': 1000,
                        'efficiency': '80+ Gold',
                        'certification': '80+ Gold',
                        'form_factor': 'ATX',
                        'modular': 'Fully',
                        'rails': '12V Single-rail',
                        'cooling': '140mm Fan',
                        'protection': ['Over-voltage', 'Under-voltage', 'Over-current', 'Over-temperature'],
                        'warranty': '10 Years',
                        'dimensions': '150 x 160 x 86mm',
                        'weight': 2.5
                    }
                },
                {
                    'id': 'psu_3',
                    'name': 'SeaSonic Focus GX-850',
                    'brand': 'SeaSonic',
                    'price': 119,
                    'power': 850,
                    'specs': {
                        'wattage': 850,
                        'efficiency': '80+ Gold',
                        'certification': '80+ Gold',
                        'form_factor': 'ATX',
                        'modular': 'Fully',
                        'rails': '12V Multi-rail',
                        'cooling': '135mm Fan',
                        'protection': ['Over-voltage', 'Under-voltage', 'Over-current', 'Over-temperature'],
                        'warranty': '12 Years',
                        'dimensions': '150 x 160 x 86mm',
                        'weight': 2.4
                    }
                },
                {
                    'id': 'psu_4',
                    'name': 'Corsair RM750x',
                    'brand': 'Corsair',
                    'price': 89,
                    'power': 750,
                    'specs': {
                        'wattage': 750,
                        'efficiency': '80+ Gold',
                        'certification': '80+ Gold',
                        'form_factor': 'ATX',
                        'modular': 'Fully',
                        'rails': '12V Multi-rail',
                        'cooling': '135mm Fan',
                        'protection': ['Over-voltage', 'Under-voltage', 'Over-current', 'Over-temperature'],
                        'warranty': '10 Years',
                        'dimensions': '150 x 165 x 86mm',
                        'weight': 2.3
                    }
                },
            ],
            'case': [
                {
                    'id': 'case_1',
                    'name': 'NZXT H510 Flow',
                    'brand': 'NZXT',
                    'price': 89,
                    'power': 0,
                    'specs': {
                        'form_factor': 'Mid Tower',
                        'motherboard_support': ['ATX', 'Micro-ATX', 'Mini-ITX'],
                        'gpu_length_support': 370,
                        'cooler_height': 190,
                        'psu_length': 210,
                        'drive_bays': 4,
                        'expansion_slots': 8,
                        'front_io': ['2x USB 3.1', '1x USB-C'],
                        'front_fans': '2x 120mm included',
                        'fan_support': 'Up to 6',
                        'radiator_support': '280mm (front/top)',
                        'material': 'Steel + Tempered Glass',
                        'dimensions': '210 x 435 x 375mm',
                        'weight': 4.1
                    }
                },
                {
                    'id': 'case_2',
                    'name': 'Corsair 4000D',
                    'brand': 'Corsair',
                    'price': 104,
                    'power': 0,
                    'specs': {
                        'form_factor': 'Mid Tower',
                        'motherboard_support': ['ATX', 'Micro-ATX', 'Mini-ITX'],
                        'gpu_length_support': 320,
                        'cooler_height': 170,
                        'psu_length': 200,
                        'drive_bays': 2,
                        'expansion_slots': 7,
                        'front_io': ['2x USB 3.0', '1x USB-C'],
                        'front_fans': '2x 120mm included',
                        'fan_support': 'Up to 6',
                        'radiator_support': '280mm (front/top)',
                        'material': 'Steel + Tempered Glass',
                        'dimensions': '210 x 468 x 415mm',
                        'weight': 4.3
                    }
                },
                {
                    'id': 'case_3',
                    'name': 'Lian Li Lancool 3',
                    'brand': 'Lian Li',
                    'price': 99,
                    'power': 0,
                    'specs': {
                        'form_factor': 'Mid Tower',
                        'motherboard_support': ['ATX', 'E-ATX', 'Micro-ATX', 'Mini-ITX'],
                        'gpu_length_support': 400,
                        'cooler_height': 165,
                        'psu_length': 220,
                        'drive_bays': 2,
                        'expansion_slots': 8,
                        'front_io': ['2x USB 3.0', '1x USB-C'],
                        'front_fans': '3x 120mm included',
                        'fan_support': 'Up to 8',
                        'radiator_support': '360mm (front/top)',
                        'material': 'Steel + Tempered Glass',
                        'dimensions': '208 x 475 x 429mm',
                        'weight': 4.5
                    }
                },
            ],
            'cooler': [
                {
                    'id': 'cooler_1',
                    'name': 'Noctua NH-D15',
                    'brand': 'Noctua',
                    'price': 99,
                    'power': 8,
                    'specs': {
                        'type': 'Air',
                        'sockets': ['LGA1700', 'AM5', 'LGA1150', 'AM3'],
                        'tdp_rating': 250,
                        'height': 162,
                        'width': 150,
                        'fans': '2x 140mm',
                        'noise_level': 24.6,
                        'airflow': 140,
                        'material': 'Aluminum',
                        'color': 'Brown',
                        'warranty': '6 Years'
                    }
                },
                {
                    'id': 'cooler_2',
                    'name': 'ARCTIC Liquid Freezer II 360',
                    'brand': 'ARCTIC',
                    'price': 139,
                    'power': 12,
                    'specs': {
                        'type': 'Liquid AIO',
                        'sockets': ['LGA1700', 'AM5', 'LGA1150', 'AM3'],
                        'tdp_rating': 400,
                        'radiator_size': 360,
                        'pump_power': 'PWM',
                        'fans': '3x 120mm',
                        'noise_level': 27.0,
                        'airflow': 90,
                        'material': 'Aluminum radiator',
                        'color': 'Black',
                        'warranty': '6 Years'
                    }
                },
                {
                    'id': 'cooler_3',
                    'name': 'be quiet! Dark Rock Pro 4',
                    'brand': 'be quiet!',
                    'price': 89,
                    'power': 8,
                    'specs': {
                        'type': 'Air',
                        'sockets': ['LGA1700', 'AM5', 'LGA1150', 'AM3'],
                        'tdp_rating': 280,
                        'height': 163,
                        'width': 135,
                        'fans': '2x 135mm',
                        'noise_level': 24.3,
                        'airflow': 135,
                        'material': 'Aluminum + Copper',
                        'color': 'Black',
                        'warranty': '10 Years'
                    }
                },
            ]
        }
    
    def get_all_components(self):
        """Return all components organized by category"""
        return self.components
    
    def get_components_by_category(self, category):
        """Return components by category"""
        return self.components.get(category, [])
    
    def get_component_details(self, category, component_id):
        """Get detailed specs for a specific component"""
        components = self.components.get(category, [])
        return next((comp for comp in components if comp['id'] == component_id), None)
    
    def check_compatibility(self, build):
        """
        Check if all components in a build are compatible
        Returns: tuple (is_compatible: bool, issues: list)
        """
        issues = []
        
        # Get selected components
        cpu = self._get_component(build.get('cpu'), 'cpu')
        gpu = self._get_component(build.get('gpu'), 'gpu')
        motherboard = self._get_component(build.get('motherboard'), 'motherboard')
        ram = self._get_component(build.get('ram'), 'ram')
        psu = self._get_component(build.get('psu'), 'psu')
        case = self._get_component(build.get('case'), 'case')
        cooler = self._get_component(build.get('cooler'), 'cooler')
        
        # CPU-Motherboard socket compatibility
        if cpu and motherboard:
            if cpu['socket'] != motherboard['socket']:
                issues.append(f"❌ CPU socket {cpu['socket']} incompatible with motherboard socket {motherboard['socket']}")
        
        # RAM-Motherboard compatibility
        if ram and motherboard:
            ram_type = ram['specs']['type']
            motherboard_ram = motherboard['specs']['ram_speed']
            
            if motherboard['socket'] == 'LGA1700':
                if ram_type != 'DDR5':
                    issues.append("❌ LGA1700 motherboards require DDR5 RAM")
            elif motherboard['socket'] == 'AM5':
                if ram_type not in ['DDR5', 'DDR4']:
                    issues.append("❌ AM5 motherboards support DDR4 or DDR5 RAM")
        
        # CPU-Cooler socket compatibility
        if cpu and cooler:
            cpu_socket = cpu['socket']
            cooler_sockets = cooler['specs']['sockets']
            if cpu_socket not in cooler_sockets:
                issues.append(f"❌ Cooler not compatible with {cpu_socket} socket")
            
            # Check TDP compatibility
            if cpu['specs']['tdp'] > cooler['specs']['tdp_rating']:
                issues.append(f"⚠️  CPU TDP ({cpu['specs']['tdp']}W) exceeds cooler capacity ({cooler['specs']['tdp_rating']}W)")
        
        # GPU-Case compatibility
        if gpu and case:
            gpu_length = 300  # Approximate GPU length
            case_support = case['specs']['gpu_length_support']
            if gpu_length > case_support:
                issues.append(f"❌ GPU may not fit in case (needs clearance for ~{gpu_length}mm, case supports {case_support}mm)")
        
        # PSU Power sufficiency
        if psu:
            system_power = self.calculate_total_power(build)
            psu_wattage = psu['power']
            if system_power > psu_wattage:
                issues.append(f"❌ PSU insufficient ({psu_wattage}W) for system draw ({system_power}W)")
            elif system_power > psu_wattage * 0.8:
                issues.append(f"⚠️  PSU operating at high load ({system_power}W / {psu_wattage}W)")
        
        is_compatible = len([i for i in issues if i.startswith('❌')]) == 0
        return (is_compatible, issues)
    
    def _get_component(self, component_id, category):
        """Helper to get a component by ID"""
        if not component_id:
            return None
        components = self.components.get(category, [])
        return next((comp for comp in components if comp['id'] == component_id), None)
    
    def calculate_total_power(self, build):
        """Calculate total power consumption of the build with 20% headroom"""
        total_power = 0
        
        for component_type, component_id in build.items():
            if component_id:
                component = self._get_component(component_id, component_type)
                if component and 'power' in component:
                    total_power += component['power']
        
        # Add 20% headroom for power spikes
        return int(total_power * 1.2)
    
    def calculate_stats(self, build):
        """Calculate comprehensive build statistics"""
        stats = {
            'totalPrice': 0,
            'totalPower': 0,
            'CPU': None,
            'GPU': None,
            'RAM': None,
            'Storage': None,
            'PSU': None,
            'Case': None,
            'Cooler': None,
            'components_count': 0,
            'compatibility': {'compatible': True, 'issues': []}
        }
        
        # Count components and calculate price
        for component_type, component_id in build.items():
            if component_id:
                component = self._get_component(component_id, component_type)
                if component:
                    stats['totalPrice'] += component.get('price', 0)
                    stats['components_count'] += 1
                    
                    # Map component type to stat key
                    type_map = {
                        'cpu': 'CPU',
                        'gpu': 'GPU',
                        'ram': 'RAM',
                        'storage': 'Storage',
                        'psu': 'PSU',
                        'case': 'Case',
                        'cooler': 'Cooler'
                    }
                    if component_type in type_map:
                        stats[type_map[component_type]] = {
                            'name': component['name'],
                            'brand': component['brand'],
                            'price': component['price'],
                            'id': component['id']
                        }
        
        # Calculate power
        stats['totalPower'] = self.calculate_total_power(build)
        
        # Check compatibility
        is_compatible, issues = self.check_compatibility(build)
        stats['compatibility']['compatible'] = is_compatible
        stats['compatibility']['issues'] = issues
        
        return stats
    
    def save_build(self, build_data):
        """Save a build configuration with metadata"""
        build_id = str(uuid.uuid4())[:8]
        build_data['id'] = build_id
        build_data['created_at'] = datetime.now().isoformat()
        self.builds[build_id] = build_data
        return build_id
    
    def get_build(self, build_id):
        """Get a specific build"""
        return self.builds.get(build_id)
    
    def get_all_builds(self):
        """Get all saved builds"""
        return list(self.builds.values())
    
    def delete_build(self, build_id):
        """Delete a build by ID"""
        if build_id in self.builds:
            del self.builds[build_id]
            return True
        return False
    
    def update_build(self, build_id, build_data):
        """Update an existing build"""
        if build_id in self.builds:
            self.builds[build_id].update(build_data)
            return True
        return False
    
    def _load_builds(self):
        """Load builds from storage (can be extended to use actual database)"""
        # Placeholder for database loading - currently using in-memory storage
        pass
