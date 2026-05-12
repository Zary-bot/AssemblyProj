#!/usr/bin/env python3
"""
Integration Test Script - Verify Frontend and Backend Integration
Tests all API endpoints and verifies data flow
"""

import requests
import json
import time

API_BASE_URL = "http://localhost:5000"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_test(name, status, message=""):
    symbol = f"{Colors.GREEN}✓{Colors.RESET}" if status else f"{Colors.RED}✗{Colors.RESET}"
    print(f"{symbol} {name}")
    if message:
        print(f"  {message}")

def test_api():
    print(f"\n{Colors.BLUE}=== Frontend Integration Test ==={Colors.RESET}\n")
    
    all_passed = True
    test_build_id = None
    
    # Test 1: API Connection
    print("1. Testing API Connection...")
    try:
        response = requests.get(f"{API_BASE_URL}/api/components", timeout=5)
        print_test(
            "API Server Reachable",
            response.status_code == 200,
            f"Status: {response.status_code}"
        )
    except Exception as e:
        print_test("API Server Reachable", False, str(e))
        all_passed = False
        return
    
    # Test 2: Get Components
    print("\n2. Testing Component Loading...")
    try:
        response = requests.get(f"{API_BASE_URL}/api/components")
        data = response.json()
        comp_count = sum(len(items) for items in data.values() if isinstance(items, list))
        print_test(
            "Get All Components",
            response.status_code == 200 and comp_count > 0,
            f"Loaded {comp_count} components from {len(data)} categories"
        )
    except Exception as e:
        print_test("Get All Components", False, str(e))
        all_passed = False
    
    # Test 3: Get Components by Category
    print("\n3. Testing Category Filtering...")
    try:
        response = requests.get(f"{API_BASE_URL}/api/components/cpu")
        data = response.json()
        cpu_count = len(data) if isinstance(data, list) else 0
        print_test(
            "Get CPU Components",
            response.status_code == 200 and cpu_count > 0,
            f"Found {cpu_count} CPUs"
        )
    except Exception as e:
        print_test("Get CPU Components", False, str(e))
        all_passed = False
    
    # Test 4: Save a Build
    print("\n4. Testing Build Save...")
    try:
        build_data = {
            "name": "Test Build",
            "description": "Integration test build",
            "budget": 1500.00,
            "components": {
                "cpu": "cpu_1",
                "gpu": "gpu_1",
                "ram": "ram_1",
                "storage": "storage_1",
                "psu": "psu_1"
            }
        }
        response = requests.post(
            f"{API_BASE_URL}/api/builds",
            json=build_data,
            headers={"Content-Type": "application/json"}
        )
        result = response.json()
        build_id = result.get("id")
        test_build_id = build_id
        print_test(
            "Save Build to Database",
            response.status_code == 200 and build_id,
            f"Build ID: {build_id}"
        )
    except Exception as e:
        print_test("Save Build to Database", False, str(e))
        all_passed = False
    
    # Test 5: Load Builds List
    print("\n5. Testing Build List Loading...")
    try:
        response = requests.get(f"{API_BASE_URL}/api/builds")
        builds = response.json()
        build_count = len(builds) if isinstance(builds, list) else 0
        print_test(
            "Load All Builds",
            response.status_code == 200 and build_count > 0,
            f"Loaded {build_count} builds from database"
        )
    except Exception as e:
        print_test("Load All Builds", False, str(e))
        all_passed = False
    
    # Test 6: Load Specific Build
    print("\n6. Testing Build Retrieval...")
    try:
        if test_build_id:
            response = requests.get(f"{API_BASE_URL}/api/builds/{test_build_id}")
            build = response.json()
            print_test(
                "Load Specific Build",
                response.status_code == 200 and build.get("name"),
                f"Build: {build.get('name')} (${build.get('budget')})"
            )
    except Exception as e:
        print_test("Load Specific Build", False, str(e))
        all_passed = False
    
    # Test 7: Get Build Stats
    print("\n7. Testing Build Statistics...")
    try:
        stats_data = {
            "components": {
                "cpu": "cpu_1",
                "gpu": "gpu_1",
                "ram": "ram_1",
                "storage": "storage_1",
                "psu": "psu_1"
            }
        }
        response = requests.post(
            f"{API_BASE_URL}/api/stats",
            json=stats_data,
            headers={"Content-Type": "application/json"}
        )
        stats = response.json()
        print_test(
            "Calculate Build Stats",
            response.status_code == 200,
            f"Total Price: ${stats.get('total_price')}, Power: {stats.get('total_power')}W"
        )
    except Exception as e:
        print_test("Calculate Build Stats", False, str(e))
        all_passed = False
    
    # Test 8: Check Compatibility
    print("\n8. Testing Compatibility Check...")
    try:
        compat_data = {
            "components": {
                "cpu": "cpu_1",
                "mb": "mb1",
                "gpu": "gpu1"
            }
        }
        response = requests.post(
            f"{API_BASE_URL}/api/compatibility",
            json=compat_data,
            headers={"Content-Type": "application/json"}
        )
        compat = response.json()
        print_test(
            "Check Compatibility",
            response.status_code == 200,
            f"Status: {compat.get('compatible', 'unknown')}"
        )
    except Exception as e:
        print_test("Check Compatibility", False, str(e))
        all_passed = False
    
    # Test 9: Delete Build
    print("\n9. Testing Build Deletion...")
    try:
        if test_build_id:
            response = requests.delete(f"{API_BASE_URL}/api/builds/{test_build_id}")
            print_test(
                "Delete Build",
                response.status_code == 200 or response.status_code == 204,
                "Build removed from database"
            )
    except Exception as e:
        print_test("Delete Build", False, str(e))
        all_passed = False
    
    # Summary
    print(f"\n{Colors.BLUE}=== Test Summary ==={Colors.RESET}")
    if all_passed:
        print(f"{Colors.GREEN}✓ All tests passed! Integration is working.{Colors.RESET}")
    else:
        print(f"{Colors.YELLOW}⚠ Some tests failed. Check Flask and PostgreSQL.{Colors.RESET}")
    
    return all_passed

if __name__ == "__main__":
    try:
        test_api()
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Test interrupted by user{Colors.RESET}")
    except Exception as e:
        print(f"{Colors.RED}Test error: {e}{Colors.RESET}")
