-- ============================================================
-- AssemblyPC PostgreSQL Schema
-- Single source of truth for Admin Dashboard and Simulator
-- Database: pc_builder_simulation
-- ============================================================

BEGIN;

-- Rebuild component tables. Saved builds are kept unless you drop them manually.
DROP TABLE IF EXISTS admin_cpu CASCADE;
DROP TABLE IF EXISTS admin_gpu CASCADE;
DROP TABLE IF EXISTS admin_psu CASCADE;
DROP TABLE IF EXISTS admin_ssd CASCADE;
DROP TABLE IF EXISTS admin_hdd CASCADE;
DROP TABLE IF EXISTS admin_fan CASCADE;
DROP TABLE IF EXISTS admin_mobo CASCADE;
DROP TABLE IF EXISTS admin_ram CASCADE;
DROP TABLE IF EXISTS compatibility_test_cases CASCADE;

-- ============================================================
-- ADMIN DASHBOARD COMPONENT TABLES
-- ============================================================

CREATE TABLE admin_cpu (
    id SERIAL PRIMARY KEY,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(150) NOT NULL,
    family VARCHAR(100),
    cores VARCHAR(50),
    "baseClock" VARCHAR(50),
    "turboClock" VARCHAR(50),
    cache VARCHAR(100),
    igpu VARCHAR(150),
    tdp VARCHAR(50),
    "memSupport" VARCHAR(150),
    socket VARCHAR(50),
    released VARCHAR(50),
    price DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_gpu (
    id SERIAL PRIMARY KEY,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(150) NOT NULL,
    "memType" VARCHAR(100),
    "memCapacity" VARCHAR(100),
    "busWidth" VARCHAR(100),
    "coreClock" VARCHAR(100),
    "cudaCores" VARCHAR(100),
    tdp VARCHAR(50),
    psu VARCHAR(100),
    "formFactor" VARCHAR(100),
    release VARCHAR(50),
    price DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_psu (
    id SERIAL PRIMARY KEY,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(150) NOT NULL,
    "powerOutput" VARCHAR(100),
    "psuType" VARCHAR(100),
    efficiency VARCHAR(100),
    "inputVoltage" VARCHAR(100),
    frequency VARCHAR(100),
    cooling VARCHAR(100),
    modular VARCHAR(100),
    "mainPower" VARCHAR(100),
    "cpuPower" VARCHAR(100),
    "pcieConn" VARCHAR(150),
    "sataConn" VARCHAR(150),
    warranty VARCHAR(100),
    released VARCHAR(50),
    price DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_ssd (
    id SERIAL PRIMARY KEY,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(150) NOT NULL,
    "storageType" VARCHAR(100),
    interface VARCHAR(100),
    "formFactor" VARCHAR(100),
    capacity VARCHAR(100),
    nand VARCHAR(100),
    "readSpeed" VARCHAR(100),
    "writeSpeed" VARCHAR(100),
    "readIOPS" VARCHAR(100),
    "writeIOPS" VARCHAR(100),
    cache VARCHAR(100),
    endurance VARCHAR(100),
    power VARCHAR(100),
    encryption VARCHAR(100),
    released VARCHAR(50),
    price DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_hdd (
    id SERIAL PRIMARY KEY,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(150) NOT NULL,
    "storageType" VARCHAR(100),
    interface VARCHAR(100),
    "formFactor" VARCHAR(100),
    capacity VARCHAR(100),
    "readSpeed" VARCHAR(100),
    "writeSpeed" VARCHAR(100),
    "readIOPS" VARCHAR(100),
    "writeIOPS" VARCHAR(100),
    cache VARCHAR(100),
    power VARCHAR(100),
    encryption VARCHAR(100),
    released VARCHAR(50),
    price DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_fan (
    id SERIAL PRIMARY KEY,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(150) NOT NULL,
    dimensions VARCHAR(100),
    speed VARCHAR(100),
    airflow VARCHAR(100),
    connector VARCHAR(100),
    voltage VARCHAR(100),
    released VARCHAR(50),
    price DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_mobo (
    id SERIAL PRIMARY KEY,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(150) NOT NULL,
    "formFactor" VARCHAR(100),
    chipset VARCHAR(100),
    socket VARCHAR(50),
    "memType" VARCHAR(100),
    dimms VARCHAR(50),
    "maxMem" VARCHAR(100),
    "memSpeed" VARCHAR(150),
    "pciSlots" TEXT,
    "m2Slots" TEXT,
    usb TEXT,
    tier VARCHAR(100),
    released VARCHAR(50),
    price DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_ram (
    id SERIAL PRIMARY KEY,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(150) NOT NULL,
    "memType" VARCHAR(100),
    capacity VARCHAR(100),
    config VARCHAR(100),
    "formFactor" VARCHAR(100),
    speed VARCHAR(100),
    cas VARCHAR(100),
    voltage VARCHAR(100),
    pins VARCHAR(100),
    ecc VARCHAR(100),
    buffered VARCHAR(100),
    xmp VARCHAR(100),
    released VARCHAR(50),
    price DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saved_builds (
    build_id SERIAL PRIMARY KEY,
    build_name VARCHAR(150) NOT NULL,
    build_data JSONB NOT NULL,
    total_price DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_users (
    admin_id SERIAL PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    password_salt VARCHAR(64) NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    display_name VARCHAR(120),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE compatibility_test_cases (
    test_id SERIAL PRIMARY KEY,
    test_name VARCHAR(180) NOT NULL,
    expected_compatible BOOLEAN NOT NULL,
    expected_issues TEXT[] DEFAULT '{}',
    cpu_id INTEGER REFERENCES admin_cpu(id) ON DELETE CASCADE,
    mobo_id INTEGER REFERENCES admin_mobo(id) ON DELETE CASCADE,
    ram_id INTEGER REFERENCES admin_ram(id) ON DELETE CASCADE,
    gpu_id INTEGER REFERENCES admin_gpu(id) ON DELETE CASCADE,
    psu_id INTEGER REFERENCES admin_psu(id) ON DELETE CASCADE,
    ssd_id INTEGER REFERENCES admin_ssd(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_admin_cpu_brand ON admin_cpu (brand);
CREATE INDEX idx_admin_cpu_model ON admin_cpu (model);
CREATE INDEX idx_admin_gpu_brand ON admin_gpu (brand);
CREATE INDEX idx_admin_gpu_model ON admin_gpu (model);
CREATE INDEX idx_admin_psu_brand ON admin_psu (brand);
CREATE INDEX idx_admin_psu_model ON admin_psu (model);
CREATE INDEX idx_admin_ssd_brand ON admin_ssd (brand);
CREATE INDEX idx_admin_ssd_model ON admin_ssd (model);
CREATE INDEX idx_admin_hdd_brand ON admin_hdd (brand);
CREATE INDEX idx_admin_hdd_model ON admin_hdd (model);
CREATE INDEX idx_admin_fan_brand ON admin_fan (brand);
CREATE INDEX idx_admin_fan_model ON admin_fan (model);
CREATE INDEX idx_admin_mobo_brand ON admin_mobo (brand);
CREATE INDEX idx_admin_mobo_model ON admin_mobo (model);
CREATE INDEX idx_admin_ram_brand ON admin_ram (brand);
CREATE INDEX idx_admin_ram_model ON admin_ram (model);
CREATE INDEX idx_compatibility_test_cases_expected ON compatibility_test_cases (expected_compatible);

-- ============================================================
-- SAMPLE DATABASE DATA
-- Safe to edit in Admin Dashboard after loading.
-- ============================================================

INSERT INTO admin_cpu
(brand, model, family, cores, "baseClock", "turboClock", cache, igpu, tdp, "memSupport", socket, released, price)
VALUES
('Intel', 'Core i5-12400', 'Alder Lake', '6C/12T', '2.5 GHz', '4.4 GHz', '18 MB', 'Intel UHD 730', '65W', 'DDR4/DDR5', 'LGA1700', '2022', 9500),
('Intel', 'Core i7-13700K', 'Raptor Lake', '16C/24T', '3.4 GHz', '5.4 GHz', '30 MB', 'Intel UHD 770', '125W', 'DDR4/DDR5', 'LGA1700', '2022', 18500),
('AMD', 'Ryzen 5 5600', 'Zen 3', '6C/12T', '3.5 GHz', '4.4 GHz', '35 MB', 'None', '65W', 'DDR4', 'AM4', '2022', 7500),
('AMD', 'Ryzen 9 7900X', 'Zen 4', '12C/24T', '4.7 GHz', '5.6 GHz', '76 MB', 'Radeon Graphics', '170W', 'DDR5', 'AM5', '2022', 22000),
('TestLab', 'TEST PASS CPU LGA1700 DDR5', 'Compatibility Test', '6C/12T', '3.0 GHz', '4.6 GHz', '20 MB', 'Intel UHD Test', '65W', 'DDR5', 'LGA1700', 'Test Data', 1000),
('TestLab', 'TEST FAIL CPU AM4 Socket', 'Compatibility Test', '6C/12T', '3.6 GHz', '4.2 GHz', '32 MB', 'None', '65W', 'DDR4', 'AM4', 'Test Data', 1000);

INSERT INTO admin_mobo
(brand, model, "formFactor", chipset, socket, "memType", dimms, "maxMem", "memSpeed", "pciSlots", "m2Slots", usb, tier, released, price)
VALUES
('ASUS', 'PRIME H610M-K D4', 'Micro-ATX', 'H610', 'LGA1700', 'DDR4', '2', '64GB', '3200 MHz', '1x PCIe x16', '1', 'USB 3.2 Gen 1, USB 2.0', 'Entry', '2022', 5200),
('MSI', 'PRO B660M-A DDR4', 'Micro-ATX', 'B660', 'LGA1700', 'DDR4', '4', '128GB', '4800 MHz', '1x PCIe x16, 1x PCIe x1', '2', 'USB 3.2 Gen 2, USB 2.0', 'Mainstream', '2022', 7800),
('Gigabyte', 'B550M DS3H', 'Micro-ATX', 'B550', 'AM4', 'DDR4', '4', '128GB', '4733 MHz', '1x PCIe x16, 1x PCIe x1', '2', 'USB 3.2 Gen 1, USB 2.0', 'Mainstream', '2020', 6200),
('ASUS', 'ROG STRIX B850-E', 'ATX', 'B850', 'AM5', 'DDR5', '4', '192GB', '8000 MHz', '2x PCIe x16', '4', 'USB-C, USB 3.2 Gen 2x2', 'High End', '2025', 15500),
('TestLab', 'TEST PASS B760 DDR5 M.2 Board', 'Micro-ATX', 'B760', 'LGA1700', 'DDR5', '4', '128GB', '5600 MHz', '1x PCIe x16, 1x PCIe x1', '2', 'USB 3.2 Gen 2, USB-C', 'Compatibility Pass', 'Test Data', 1000),
('TestLab', 'TEST FAIL H610 DDR4 No M.2 Board', 'Micro-ATX', 'H610', 'LGA1700', 'DDR4', '2', '32GB', '3200 MHz', '1x PCIe x16', '0', 'USB 3.2 Gen 1', 'Compatibility Fail', 'Test Data', 1000),
('TestLab', 'TEST FAIL DDR5 No GPU Slot Board', 'Mini-ITX', 'Embedded', 'LGA1700', 'DDR5', '2', '64GB', '4800 MHz', 'None', '1', 'USB 2.0', 'Compatibility Fail', 'Test Data', 1000);

INSERT INTO admin_ram
(brand, model, "memType", capacity, config, "formFactor", speed, cas, voltage, pins, ecc, buffered, xmp, released, price)
VALUES
('Kingston', 'Fury Beast 16GB DDR4 3200', 'DDR4', '16GB', '2x8GB', 'DIMM', '3200 MHz', 'CL16', '1.35V', '288-pin', 'No', 'Unbuffered', 'XMP 2.0', '2020', 2400),
('Corsair', 'Vengeance 32GB DDR5 5600', 'DDR5', '32GB', '2x16GB', 'DIMM', '5600 MHz', 'CL36', '1.25V', '288-pin', 'No', 'Unbuffered', 'XMP 3.0', '2022', 6400),
('Kingston', 'FURY Beast 32GB DDR5 5200', 'DDR5', '32GB', '2x16GB', 'DIMM', '5200 MHz', 'CL40', '1.25V', '288-pin', 'No', 'Unbuffered', 'XMP 3.0', '2022', 5800),
('TestLab', 'TEST PASS DDR5 16GB 5600', 'DDR5', '16GB', '2x8GB', 'DIMM', '5600 MHz', 'CL36', '1.25V', '288-pin', 'No', 'Unbuffered', 'XMP 3.0', 'Test Data', 1000),
('TestLab', 'TEST FAIL DDR4 16GB 3200', 'DDR4', '16GB', '2x8GB', 'DIMM', '3200 MHz', 'CL16', '1.35V', '288-pin', 'No', 'Unbuffered', 'XMP 2.0', 'Test Data', 1000),
('TestLab', 'TEST FAIL DDR4 64GB Exceeds 32GB Board', 'DDR4', '64GB', '2x32GB', 'DIMM', '3200 MHz', 'CL18', '1.35V', '288-pin', 'No', 'Unbuffered', 'XMP 2.0', 'Test Data', 1000);

INSERT INTO admin_gpu
(brand, model, "memType", "memCapacity", "busWidth", "coreClock", "cudaCores", tdp, psu, "formFactor", release, price)
VALUES
('NVIDIA', 'GeForce GTX 1650', 'GDDR5', '4GB', '128-bit', '1485 MHz', '896', '75W', '300W', 'Dual-slot', '2019', 8500),
('NVIDIA', 'GeForce RTX 3050', 'GDDR6', '8GB', '128-bit', '1552 MHz', '2560', '130W', '450W', 'Dual-slot', '2022', 13500),
('NVIDIA', 'GeForce RTX 4060', 'GDDR6', '8GB', '128-bit', '1830 MHz', '3072', '115W', '550W', 'Dual-slot', '2023', 18000),
('NVIDIA', 'GeForce RTX 4070', 'GDDR6X', '12GB', '192-bit', '1920 MHz', '5888', '200W', '700W', 'Dual-slot', '2023', 35000),
('TestLab', 'TEST PASS RTX 3060 550W', 'GDDR6', '12GB', '192-bit', '1320 MHz', '3584', '170W', '550W', 'Dual-slot', 'Test Data', 1000),
('TestLab', 'TEST FAIL RTX 4090 850W Required', 'GDDR6X', '24GB', '384-bit', '2235 MHz', '16384', '450W', '850W', 'Triple-slot', 'Test Data', 1000);

INSERT INTO admin_psu
(brand, model, "powerOutput", "psuType", efficiency, "inputVoltage", frequency, cooling, modular, "mainPower", "cpuPower", "pcieConn", "sataConn", warranty, released, price)
VALUES
('Corsair', 'CV450 450W 80+ Bronze', '450W', 'ATX', '80+ Bronze', '100-240V', '50-60Hz', '120mm Fan', 'Non-modular', '24-pin ATX', '1x 8-pin EPS', '1x 6+2-pin', '4', '3 years', '2020', 2600),
('Corsair', 'CV550 550W 80+ Bronze', '550W', 'ATX', '80+ Bronze', '100-240V', '50-60Hz', '120mm Fan', 'Non-modular', '24-pin ATX', '1x 8-pin EPS', '2x 6+2-pin', '6', '3 years', '2020', 3100),
('Cooler Master', 'MWE 650W 80+ Bronze', '650W', 'ATX', '80+ Bronze', '100-240V', '50-60Hz', '120mm Fan', 'Non-modular', '24-pin ATX', '1x 8-pin EPS', '4x 6+2-pin', '6', '5 years', '2021', 3800),
('Corsair', 'RM850e 850W 80+ Gold', '850W', 'ATX', '80+ Gold', '100-240V', '50-60Hz', '140mm Fan', 'Fully modular', '24-pin ATX', '2x 8-pin EPS', '4x 6+2-pin', '8', '7 years', '2023', 8500),
('TestLab', 'TEST PASS 650W Gold PSU', '650W', 'ATX', '80+ Gold', '100-240V', '50-60Hz', '120mm Fan', 'Semi-modular', '24-pin ATX', '1x 8-pin EPS', '2x 6+2-pin', '6', 'Test Data', 'Test Data', 1000),
('TestLab', 'TEST FAIL 300W PSU', '300W', 'ATX', '80+', '100-240V', '50-60Hz', '80mm Fan', 'Non-modular', '24-pin ATX', '1x 4-pin CPU', 'None', '2', 'Test Data', 'Test Data', 1000);

INSERT INTO admin_ssd
(brand, model, "storageType", interface, "formFactor", capacity, nand, "readSpeed", "writeSpeed", "readIOPS", "writeIOPS", cache, endurance, power, encryption, released, price)
VALUES
('Samsung', '870 EVO 500GB SATA SSD', 'SSD', 'SATA', '2.5 inch', '500GB', 'TLC', '560 MB/s', '530 MB/s', '98000', '88000', 'DRAM', '300 TBW', '3W', 'AES 256-bit', '2021', 2500),
('Samsung', '980 1TB NVMe SSD', 'SSD', 'M.2 NVMe', 'M.2 2280', '1TB', 'TLC', '3500 MB/s', '3000 MB/s', '500000', '480000', 'HMB', '600 TBW', '5W', 'None', '2021', 4200),
('Kingston', 'NV2 500GB NVMe SSD', 'SSD', 'M.2 NVMe', 'M.2 2280', '500GB', 'QLC/TLC', '3500 MB/s', '2100 MB/s', '190000', '220000', 'HMB', '160 TBW', '5W', 'None', '2022', 2100),
('TestLab', 'TEST PASS SATA Test SSD', 'SSD', 'SATA', '2.5 inch', '500GB', 'TLC', '560 MB/s', '520 MB/s', '90000', '85000', 'DRAM', '300 TBW', '3W', 'None', 'Test Data', 1000),
('TestLab', 'TEST FAIL NVMe Needs M.2 Slot', 'SSD', 'M.2 NVMe', 'M.2 2280', '500GB', 'TLC', '3500 MB/s', '2100 MB/s', '190000', '220000', 'HMB', '160 TBW', '5W', 'None', 'Test Data', 1000);

INSERT INTO admin_hdd
(brand, model, "storageType", interface, "formFactor", capacity, "readSpeed", "writeSpeed", "readIOPS", "writeIOPS", cache, power, encryption, released, price)
VALUES
('Seagate', 'Barracuda 1TB HDD', 'HDD', 'SATA', '3.5 inch', '1TB', '210 MB/s', '190 MB/s', '120', '120', '64MB', '5.3W', 'None', '2018', 2200),
('Western Digital', 'Blue 2TB HDD', 'HDD', 'SATA', '3.5 inch', '2TB', '215 MB/s', '200 MB/s', '150', '150', '256MB', '5.6W', 'None', '2020', 3200);

INSERT INTO admin_fan
(brand, model, dimensions, speed, airflow, connector, voltage, released, price)
VALUES
('Cooler Master', 'SickleFlow 120', '120x120x25mm', '650-1800 RPM', '62', '4-pin PWM', '12V', '2020', 600),
('Corsair', 'AF120 Elite', '120x120x25mm', '400-1850 RPM', '59', '4-pin PWM', '12V', '2022', 900);

-- Compatibility checker test cases.
-- These rows point to the TestLab components above so QA can test expected PASS/FAIL builds.
INSERT INTO compatibility_test_cases
(test_name, expected_compatible, expected_issues, cpu_id, mobo_id, ram_id, gpu_id, psu_id, ssd_id, notes)
SELECT
    'PASS: LGA1700 DDR5 balanced build',
    TRUE,
    ARRAY[]::TEXT[],
    c.id, m.id, r.id, g.id, p.id, s.id,
    'Expected to pass: matching socket, DDR5 RAM, M.2 slot, GPU slot, and enough PSU wattage.'
FROM admin_cpu c, admin_mobo m, admin_ram r, admin_gpu g, admin_psu p, admin_ssd s
WHERE c.model = 'TEST PASS CPU LGA1700 DDR5'
  AND m.model = 'TEST PASS B760 DDR5 M.2 Board'
  AND r.model = 'TEST PASS DDR5 16GB 5600'
  AND g.model = 'TEST PASS RTX 3060 550W'
  AND p.model = 'TEST PASS 650W Gold PSU'
  AND s.model = 'TEST FAIL NVMe Needs M.2 Slot';

INSERT INTO compatibility_test_cases
(test_name, expected_compatible, expected_issues, cpu_id, mobo_id, ram_id, gpu_id, psu_id, ssd_id, notes)
SELECT
    'FAIL: CPU socket mismatch',
    FALSE,
    ARRAY['CPU socket mismatch']::TEXT[],
    c.id, m.id, r.id, g.id, p.id, s.id,
    'Expected to fail because AM4 CPU is paired with an LGA1700 motherboard.'
FROM admin_cpu c, admin_mobo m, admin_ram r, admin_gpu g, admin_psu p, admin_ssd s
WHERE c.model = 'TEST FAIL CPU AM4 Socket'
  AND m.model = 'TEST PASS B760 DDR5 M.2 Board'
  AND r.model = 'TEST PASS DDR5 16GB 5600'
  AND g.model = 'TEST PASS RTX 3060 550W'
  AND p.model = 'TEST PASS 650W Gold PSU'
  AND s.model = 'TEST FAIL NVMe Needs M.2 Slot';

INSERT INTO compatibility_test_cases
(test_name, expected_compatible, expected_issues, cpu_id, mobo_id, ram_id, gpu_id, psu_id, ssd_id, notes)
SELECT
    'FAIL: DDR4 RAM on DDR5 motherboard',
    FALSE,
    ARRAY['RAM type mismatch']::TEXT[],
    c.id, m.id, r.id, g.id, p.id, s.id,
    'Expected to fail because DDR4 RAM is paired with a DDR5 motherboard.'
FROM admin_cpu c, admin_mobo m, admin_ram r, admin_gpu g, admin_psu p, admin_ssd s
WHERE c.model = 'TEST PASS CPU LGA1700 DDR5'
  AND m.model = 'TEST PASS B760 DDR5 M.2 Board'
  AND r.model = 'TEST FAIL DDR4 16GB 3200'
  AND g.model = 'TEST PASS RTX 3060 550W'
  AND p.model = 'TEST PASS 650W Gold PSU'
  AND s.model = 'TEST FAIL NVMe Needs M.2 Slot';

INSERT INTO compatibility_test_cases
(test_name, expected_compatible, expected_issues, cpu_id, mobo_id, ram_id, gpu_id, psu_id, ssd_id, notes)
SELECT
    'FAIL: PSU wattage too low for GPU',
    FALSE,
    ARRAY['PSU wattage too low']::TEXT[],
    c.id, m.id, r.id, g.id, p.id, s.id,
    'Expected to fail because a 300W PSU is paired with a GPU that recommends 850W.'
FROM admin_cpu c, admin_mobo m, admin_ram r, admin_gpu g, admin_psu p, admin_ssd s
WHERE c.model = 'TEST PASS CPU LGA1700 DDR5'
  AND m.model = 'TEST PASS B760 DDR5 M.2 Board'
  AND r.model = 'TEST PASS DDR5 16GB 5600'
  AND g.model = 'TEST FAIL RTX 4090 850W Required'
  AND p.model = 'TEST FAIL 300W PSU'
  AND s.model = 'TEST FAIL NVMe Needs M.2 Slot';

INSERT INTO compatibility_test_cases
(test_name, expected_compatible, expected_issues, cpu_id, mobo_id, ram_id, gpu_id, psu_id, ssd_id, notes)
SELECT
    'FAIL: NVMe drive without M.2 slot',
    FALSE,
    ARRAY['NVMe requires M.2 slot']::TEXT[],
    c.id, m.id, r.id, g.id, p.id, s.id,
    'Expected to fail because the motherboard has zero M.2 slots and the selected SSD is NVMe.'
FROM admin_cpu c, admin_mobo m, admin_ram r, admin_gpu g, admin_psu p, admin_ssd s
WHERE c.model = 'TEST PASS CPU LGA1700 DDR5'
  AND m.model = 'TEST FAIL H610 DDR4 No M.2 Board'
  AND r.model = 'TEST FAIL DDR4 16GB 3200'
  AND g.model = 'TEST PASS RTX 3060 550W'
  AND p.model = 'TEST PASS 650W Gold PSU'
  AND s.model = 'TEST FAIL NVMe Needs M.2 Slot';

INSERT INTO compatibility_test_cases
(test_name, expected_compatible, expected_issues, cpu_id, mobo_id, ram_id, gpu_id, psu_id, ssd_id, notes)
SELECT
    'FAIL: RAM capacity exceeds motherboard limit',
    FALSE,
    ARRAY['RAM capacity exceeds motherboard maximum']::TEXT[],
    c.id, m.id, r.id, g.id, p.id, s.id,
    'Expected to fail because 64GB RAM is paired with a motherboard that supports only 32GB.'
FROM admin_cpu c, admin_mobo m, admin_ram r, admin_gpu g, admin_psu p, admin_ssd s
WHERE c.model = 'TEST PASS CPU LGA1700 DDR5'
  AND m.model = 'TEST FAIL H610 DDR4 No M.2 Board'
  AND r.model = 'TEST FAIL DDR4 64GB Exceeds 32GB Board'
  AND g.model = 'TEST PASS RTX 3060 550W'
  AND p.model = 'TEST PASS 650W Gold PSU'
  AND s.model = 'TEST PASS SATA Test SSD';

INSERT INTO compatibility_test_cases
(test_name, expected_compatible, expected_issues, cpu_id, mobo_id, ram_id, gpu_id, psu_id, ssd_id, notes)
SELECT
    'FAIL: Motherboard has no PCIe x16 GPU slot',
    FALSE,
    ARRAY['Missing PCIe x16 slot']::TEXT[],
    c.id, m.id, r.id, g.id, p.id, s.id,
    'Expected to fail because a GPU is selected but the motherboard lists no PCIe x16 slot.'
FROM admin_cpu c, admin_mobo m, admin_ram r, admin_gpu g, admin_psu p, admin_ssd s
WHERE c.model = 'TEST PASS CPU LGA1700 DDR5'
  AND m.model = 'TEST FAIL DDR5 No GPU Slot Board'
  AND r.model = 'TEST PASS DDR5 16GB 5600'
  AND g.model = 'TEST PASS RTX 3060 550W'
  AND p.model = 'TEST PASS 650W Gold PSU'
  AND s.model = 'TEST PASS SATA Test SSD';

-- Default admin login:
-- username: admin
-- password: admin123
INSERT INTO admin_users (username, password_salt, password_hash, display_name)
VALUES (
    'admin',
    'fa27e93a712761a450a7efc4c087b618',
    '4b2901e5db230eff467261c3cb1b3a84f92951e44bd101b0949db3e1f17ffacf',
    'Administrator'
)
ON CONFLICT (username) DO NOTHING;

COMMIT;
