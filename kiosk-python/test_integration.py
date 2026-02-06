#!/usr/bin/env python3
"""
Test script for kiosk control features
Tests health check, control server, and LED functions
"""

import requests
import time
import sys

def test_control_server(base_url="http://localhost:8000"):
    """Test the kiosk control server endpoints"""
    
    print("=" * 60)
    print("TESTING KIOSK CONTROL SERVER")
    print("=" * 60)
    print(f"Base URL: {base_url}")
    print()
    
    # Test 1: Get status
    print("Test 1: Get Status")
    print("-" * 40)
    try:
        response = requests.get(f"{base_url}/status", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Status endpoint working")
            print(f"  Mode: {data.get('mode')}")
            print(f"  LEDs: {data.get('leds')}")
        else:
            print(f"✗ Status endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"✗ Error: {e}")
    print()
    
    # Test 2: Toggle Processing LED
    print("Test 2: Toggle Processing LED")
    print("-" * 40)
    try:
        response = requests.post(f"{base_url}/led/processing/toggle", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Processing LED toggled")
            print(f"  New state: {data.get('state')}")
        else:
            print(f"✗ Toggle failed: {response.status_code}")
    except Exception as e:
        print(f"✗ Error: {e}")
    print()
    
    # Test 3: Toggle Success LED
    print("Test 3: Toggle Success LED")
    print("-" * 40)
    try:
        response = requests.post(f"{base_url}/led/success/toggle", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Success LED toggled")
            print(f"  New state: {data.get('state')}")
        else:
            print(f"✗ Toggle failed: {response.status_code}")
    except Exception as e:
        print(f"✗ Error: {e}")
    print()
    
    # Test 4: Toggle Error LED
    print("Test 4: Toggle Error LED")
    print("-" * 40)
    try:
        response = requests.post(f"{base_url}/led/error/toggle", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Error LED toggled")
            print(f"  New state: {data.get('state')}")
        else:
            print(f"✗ Toggle failed: {response.status_code}")
    except Exception as e:
        print(f"✗ Error: {e}")
    print()
    
    # Test 5: Test all LEDs
    print("Test 5: Test All LEDs (sequence)")
    print("-" * 40)
    try:
        response = requests.post(f"{base_url}/led/test-all", timeout=5)
        if response.status_code == 200:
            print(f"✓ LED test sequence started")
            print(f"  Watch your LEDs blink in sequence!")
        else:
            print(f"✗ Test failed: {response.status_code}")
    except Exception as e:
        print(f"✗ Error: {e}")
    print()
    
    # Test 6: Set mode
    print("Test 6: Set Mode to 'slideshow'")
    print("-" * 40)
    try:
        response = requests.post(
            f"{base_url}/control/mode",
            json={'mode': 'slideshow'},
            timeout=5
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Mode changed successfully")
            print(f"  New mode: {data.get('mode')}")
        else:
            print(f"✗ Mode change failed: {response.status_code}")
    except Exception as e:
        print(f"✗ Error: {e}")
    print()
    
    # Test 7: Get status again
    print("Test 7: Verify Mode Change")
    print("-" * 40)
    try:
        response = requests.get(f"{base_url}/status", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Status retrieved")
            print(f"  Current mode: {data.get('mode')}")
        else:
            print(f"✗ Status failed: {response.status_code}")
    except Exception as e:
        print(f"✗ Error: {e}")
    print()


def test_backend_heartbeat(api_url="http://localhost:5500/api/v1"):
    """Test the backend heartbeat endpoint"""
    
    print("=" * 60)
    print("TESTING BACKEND API HEARTBEAT")
    print("=" * 60)
    print(f"API URL: {api_url}")
    print()
    
    print("Test: Send Heartbeat")
    print("-" * 40)
    
    payload = {
        'kioskId': 'test-kiosk',
        'name': 'Test Kiosk',
        'location': {
            'lat': 14.5995,
            'lng': 120.9842,
            'address': 'Test Location',
            'city': 'Manila'
        },
        'mode': 'idle',
        'leds': {
            'processing': False,
            'success': True,
            'error': False
        }
    }
    
    try:
        response = requests.post(
            f"{api_url}/kiosks/heartbeat",
            json=payload,
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Heartbeat sent successfully")
            print(f"  Response: {data}")
        else:
            print(f"✗ Heartbeat failed: {response.status_code}")
            print(f"  Response: {response.text}")
    except Exception as e:
        print(f"✗ Error: {e}")
        print(f"  Make sure backend API is running on {api_url}")
    print()
    
    # Get all kiosks
    print("Test: Get All Kiosks")
    print("-" * 40)
    try:
        response = requests.get(f"{api_url}/kiosks", timeout=10)
        if response.status_code == 200:
            data = response.json()
            kiosks = data.get('kiosks', [])
            print(f"✓ Retrieved {len(kiosks)} kiosk(s)")
            for kiosk in kiosks:
                print(f"  - {kiosk['name']} ({kiosk['status']})")
        else:
            print(f"✗ Get kiosks failed: {response.status_code}")
    except Exception as e:
        print(f"✗ Error: {e}")
    print()


def main():
    """Run all tests"""
    
    print()
    print("╔" + "=" * 58 + "╗")
    print("║" + " " * 12 + "KIOSK SYSTEM TEST SUITE" + " " * 23 + "║")
    print("╚" + "=" * 58 + "╝")
    print()
    
    # Parse command line arguments
    control_url = "http://localhost:8000"
    api_url = "http://localhost:5500/api/v1"
    
    if len(sys.argv) > 1:
        control_url = sys.argv[1]
    if len(sys.argv) > 2:
        api_url = sys.argv[2]
    
    print(f"Control Server: {control_url}")
    print(f"Backend API:    {api_url}")
    print()
    
    # Test control server
    test_control_server(control_url)
    
    time.sleep(2)
    
    # Test backend API
    test_backend_heartbeat(api_url)
    
    print("=" * 60)
    print("ALL TESTS COMPLETED")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Check if LEDs blinked during test")
    print("2. Verify backend received heartbeat")
    print("3. Open web dashboard and check kiosk appears on map")
    print("4. Test Flutter app to control kiosk remotely")
    print()


if __name__ == "__main__":
    main()
