#!/usr/bin/env python3
"""
GPIO LED Test Script for RCV Kiosk
Tests all 3 status LEDs on Raspberry Pi GPIO pins 17, 27, 22

Usage:
    python3 test_gpio_leds.py
"""

try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
except ImportError:
    print("❌ RPi.GPIO not available!")
    print("This script must be run on a Raspberry Pi")
    print("Install with: pip3 install RPi.GPIO")
    exit(1)

import time

# Pin definitions (must match main.py)
PIN_PROCESSING = 17  # Yellow LED - Blinks during processing
PIN_SUCCESS = 27     # Green LED - Solid for success
PIN_ERROR = 22       # Red LED - Solid for errors

def setup_gpio():
    """Initialize GPIO pins"""
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)
    GPIO.setup(PIN_PROCESSING, GPIO.OUT)
    GPIO.setup(PIN_SUCCESS, GPIO.OUT)
    GPIO.setup(PIN_ERROR, GPIO.OUT)
    
    # Turn all off initially
    GPIO.output(PIN_PROCESSING, GPIO.LOW)
    GPIO.output(PIN_SUCCESS, GPIO.LOW)
    GPIO.output(PIN_ERROR, GPIO.LOW)
    
    print("✅ GPIO initialized")
    print(f"   Processing LED: GPIO {PIN_PROCESSING} (Pin 11)")
    print(f"   Success LED:    GPIO {PIN_SUCCESS} (Pin 13)")
    print(f"   Error LED:      GPIO {PIN_ERROR} (Pin 15)")
    print()

def test_individual_leds():
    """Test each LED individually"""
    print("🔍 Testing individual LEDs...")
    print()
    
    print("⚡ Testing Yellow LED (Processing - GPIO 17)...")
    GPIO.output(PIN_PROCESSING, GPIO.HIGH)
    time.sleep(2)
    GPIO.output(PIN_PROCESSING, GPIO.LOW)
    print("   ✓ Yellow LED test complete")
    time.sleep(0.5)
    
    print("✅ Testing Green LED (Success - GPIO 27)...")
    GPIO.output(PIN_SUCCESS, GPIO.HIGH)
    time.sleep(2)
    GPIO.output(PIN_SUCCESS, GPIO.LOW)
    print("   ✓ Green LED test complete")
    time.sleep(0.5)
    
    print("❌ Testing Red LED (Error - GPIO 22)...")
    GPIO.output(PIN_ERROR, GPIO.HIGH)
    time.sleep(2)
    GPIO.output(PIN_ERROR, GPIO.LOW)
    print("   ✓ Red LED test complete")
    print()

def test_blink_pattern():
    """Test blinking pattern (simulates processing state)"""
    print("🔄 Testing blink pattern (Processing LED)...")
    print("   (Should blink 5 times at 2Hz)")
    
    for i in range(5):
        GPIO.output(PIN_PROCESSING, GPIO.HIGH)
        time.sleep(0.5)  # 500ms on
        GPIO.output(PIN_PROCESSING, GPIO.LOW)
        time.sleep(0.5)  # 500ms off
    
    print("   ✓ Blink test complete")
    print()

def test_state_transitions():
    """Test realistic state transitions"""
    print("🎬 Simulating kiosk state transitions...")
    print()
    
    # Idle state
    print("💤 State: IDLE (all LEDs off)")
    time.sleep(2)
    
    # Processing state
    print("⚡ State: PROCESSING (yellow blinking)")
    for i in range(4):
        GPIO.output(PIN_PROCESSING, GPIO.HIGH)
        time.sleep(0.5)
        GPIO.output(PIN_PROCESSING, GPIO.LOW)
        time.sleep(0.5)
    
    # Success state
    print("✅ State: SUCCESS (green solid)")
    GPIO.output(PIN_SUCCESS, GPIO.HIGH)
    time.sleep(3)
    GPIO.output(PIN_SUCCESS, GPIO.LOW)
    time.sleep(0.5)
    
    # Processing again
    print("⚡ State: PROCESSING (yellow blinking)")
    for i in range(4):
        GPIO.output(PIN_PROCESSING, GPIO.HIGH)
        time.sleep(0.5)
        GPIO.output(PIN_PROCESSING, GPIO.LOW)
        time.sleep(0.5)
    
    # Error state
    print("❌ State: ERROR (red solid)")
    GPIO.output(PIN_ERROR, GPIO.HIGH)
    time.sleep(3)
    GPIO.output(PIN_ERROR, GPIO.LOW)
    
    # Back to idle
    print("💤 State: IDLE (all LEDs off)")
    time.sleep(1)
    print()

def test_all_at_once():
    """Test all LEDs on at once (should NOT happen in real app)"""
    print("🚨 Testing all LEDs simultaneously (diagnostic only)...")
    GPIO.output(PIN_PROCESSING, GPIO.HIGH)
    GPIO.output(PIN_SUCCESS, GPIO.HIGH)
    GPIO.output(PIN_ERROR, GPIO.HIGH)
    time.sleep(2)
    GPIO.output(PIN_PROCESSING, GPIO.LOW)
    GPIO.output(PIN_SUCCESS, GPIO.LOW)
    GPIO.output(PIN_ERROR, GPIO.LOW)
    print("   ✓ All LED test complete")
    print()

def cleanup():
    """Cleanup GPIO"""
    GPIO.output(PIN_PROCESSING, GPIO.LOW)
    GPIO.output(PIN_SUCCESS, GPIO.LOW)
    GPIO.output(PIN_ERROR, GPIO.LOW)
    GPIO.cleanup()
    print("🧹 GPIO cleanup complete")

def main():
    """Main test function"""
    print("=" * 50)
    print("RCV Kiosk - GPIO LED Test Script")
    print("=" * 50)
    print()
    
    try:
        setup_gpio()
        
        # Run tests
        test_individual_leds()
        test_blink_pattern()
        test_state_transitions()
        test_all_at_once()
        
        print("=" * 50)
        print("✅ All tests completed successfully!")
        print("=" * 50)
        print()
        print("If all LEDs worked correctly, your wiring is good!")
        print("You can now run the main kiosk application.")
        
    except KeyboardInterrupt:
        print("\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
    finally:
        cleanup()

if __name__ == "__main__":
    main()
