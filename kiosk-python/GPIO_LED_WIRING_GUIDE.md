# GPIO LED Wiring Guide for RCV Kiosk

## Quick Reference

### Pin Assignments
| GPIO Pin | Physical Pin | LED Color | Purpose |
|----------|-------------|-----------|---------|
| GPIO 17 | Pin 11 | Yellow | Processing (Blinks at 2Hz) |
| GPIO 27 | Pin 13 | Green | Success (Solid) |
| GPIO 22 | Pin 15 | Red | Error (Solid) |
| GND | Pin 6, 9, 14, 20, 25, 30, 34, or 39 | - | Ground |

## Wiring Diagram

```
Raspberry Pi                      LEDs
┌─────────────────┐
│                 │
│  Pin 11 GPIO17  ├────[ 220Ω ]────>|── Yellow LED ──┐
│  Pin 13 GPIO27  ├────[ 220Ω ]────>|── Green LED  ──┤
│  Pin 15 GPIO22  ├────[ 220Ω ]────>|── Red LED    ──┤
│  Pin 6  GND     ├───────────────────────────────────┘
│                 │
└─────────────────┘

Legend:
────  Wire
[ ]   Resistor (220Ω)
>|    LED (long leg = anode, short leg = cathode)
```

## Step-by-Step Wiring

### Components Needed
- 1x Yellow LED (5mm, standard)
- 1x Green LED (5mm, standard)
- 1x Red LED (5mm, standard)
- 3x 220Ω resistors (1/4W)
- Female-to-male jumper wires (or breadboard + wires)
- (Optional) Breadboard

### Wiring Steps

#### Option 1: Direct Wiring (No Breadboard)

**Yellow LED (Processing):**
1. Connect GPIO 17 (Pin 11) to resistor
2. Connect resistor to LED long leg (anode, +)
3. Connect LED short leg (cathode, -) to GND (Pin 6)

**Green LED (Success):**
1. Connect GPIO 27 (Pin 13) to resistor
2. Connect resistor to LED long leg (anode, +)
3. Connect LED short leg (cathode, -) to GND (Pin 6)

**Red LED (Error):**
1. Connect GPIO 22 (Pin 15) to resistor
2. Connect resistor to LED long leg (anode, +)
3. Connect LED short leg (cathode, -) to GND (Pin 6)

#### Option 2: Using Breadboard

```
Breadboard Layout:

         a b c d e | f g h i j
       ┌─────────────────────────┐
     1 │ Y   Y   Y │             │  ← Yellow LED + Resistor
     2 │ R   R   R │             │  ← Yellow connects to GPIO 17
       │     │     │             │
     3 │ G   G   G │             │  ← Green LED + Resistor
     4 │ R   R   R │             │  ← Green connects to GPIO 27
       │     │     │             │
     5 │ R   R   R │             │  ← Red LED + Resistor
     6 │ R   R   R │             │  ← Red connects to GPIO 22
       │     │     │             │
    10 │ ═   ═   ═ │ ═   ═   ═   │  ← Ground rail
       └─────────────────────────┘

Y = Yellow LED
G = Green LED  
R = Red LED / Resistor
═ = Ground rail (common ground)
```

1. Insert LEDs into breadboard (long leg in +, short leg in -)
2. Insert resistors between GPIO and LED long legs
3. Connect all LED short legs to ground rail
4. Connect ground rail to RPi GND
5. Connect resistor ends to respective GPIO pins

## LED Identification

### How to Identify LED Legs
```
        Long leg (+)
           │
          ┌┴┐
         │   │  ← LED bulb
          └┬┘
           │
        Short leg (-)
```

**Alternative:** If legs are same length, look inside:
- Larger metal piece = Cathode (-)
- Smaller metal piece = Anode (+)

## Testing the Setup

### 1. Visual Test Script
Create `test_gpio_leds.py`:

```python
#!/usr/bin/env python3
import RPi.GPIO as GPIO
import time

# Pin setup
PROCESSING = 17
SUCCESS = 27
ERROR = 22

# Initialize GPIO
GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)
GPIO.setup(PROCESSING, GPIO.OUT)
GPIO.setup(SUCCESS, GPIO.OUT)
GPIO.setup(ERROR, GPIO.OUT)

print("Testing GPIO LEDs...")

# Test each LED
print("Testing Yellow (GPIO 17)...")
GPIO.output(PROCESSING, GPIO.HIGH)
time.sleep(2)
GPIO.output(PROCESSING, GPIO.LOW)

print("Testing Green (GPIO 27)...")
GPIO.output(SUCCESS, GPIO.HIGH)
time.sleep(2)
GPIO.output(SUCCESS, GPIO.LOW)

print("Testing Red (GPIO 22)...")
GPIO.output(ERROR, GPIO.HIGH)
time.sleep(2)
GPIO.output(ERROR, GPIO.LOW)

# Test blinking
print("Testing blink pattern...")
for i in range(5):
    GPIO.output(PROCESSING, GPIO.HIGH)
    time.sleep(0.5)
    GPIO.output(PROCESSING, GPIO.LOW)
    time.sleep(0.5)

print("All tests complete!")
GPIO.cleanup()
```

Run with:
```bash
python3 test_gpio_leds.py
```

### 2. Expected Results
- Yellow LED should blink 5 times (1 second cycle)
- Green LED should turn on for 2 seconds
- Red LED should turn on for 2 seconds
- All LEDs should turn off at the end

### 3. Troubleshooting

**LED doesn't light up:**
- Check LED polarity (swap if needed)
- Verify resistor is connected
- Test with multimeter (should show ~3.3V on GPIO when HIGH)

**LED is very dim:**
- Try lower resistor value (150Ω instead of 220Ω)
- Check for poor connections

**LED is too bright or hot:**
- Use higher resistor value (330Ω or 470Ω)
- Don't exceed 16mA per pin

**Permission denied error:**
```bash
sudo usermod -a -G gpio $USER
# Logout and login again
```

## Resistor Color Code Reference

### 220Ω Resistor
```
┌─────────────────┐
│ Red Red Brown   │
│  2   2   ×10    │
└─────────────────┘
= 220Ω
```

**Color Bands:**
- Band 1: Red (2)
- Band 2: Red (2)
- Band 3: Brown (×10)
- Band 4: Gold (±5% tolerance)

### Alternative Values
- 150Ω: Brown-Green-Brown
- 330Ω: Orange-Orange-Brown
- 470Ω: Yellow-Violet-Brown

## Safety Notes

⚠️ **Important:**
1. Never connect LED directly to GPIO without resistor
2. GPIO pins provide 3.3V (NOT 5V)
3. Max current per pin: 16mA
4. Total max current all pins: 50mA
5. Always use current-limiting resistors

## Integration with Main Application

The main kiosk application automatically:
1. Detects if RPi.GPIO is available
2. Initializes GPIO pins on startup
3. Controls LEDs based on kiosk state
4. Cleans up GPIO on exit

No manual intervention needed!

## Physical Mounting Ideas

### Option 1: LED Panel
Mount LEDs in a small panel visible to operators:
```
┌─────────────────────┐
│   RCV KIOSK STATUS  │
│                     │
│   ● PROCESSING      │  ← Yellow LED
│   ● SUCCESS         │  ← Green LED
│   ● ERROR           │  ← Red LED
│                     │
└─────────────────────┘
```

### Option 2: Top-Mount Strip
Mount LEDs in a strip on top of the kiosk enclosure:
```
┌──────────────────────────┐
│  ●     ●     ●           │  ← Yellow, Green, Red
└──────────────────────────┘
     ▼      ▼      ▼
   PROC   OK    ERR
```

### Option 3: Individual Labeled LEDs
Space out LEDs with labels near the screen:
```
Screen
┌─────────────┐
│             │
│   ●PROC     │  ← Yellow
│             │
│   ●OK       │  ← Green
│             │
│   ●ERR      │  ← Red
│             │
└─────────────┘
```

## Advanced: Using LED Strip or RGB LED

### Using Common Anode RGB LED
If using a single RGB LED (common anode):
- Common anode → 3.3V
- Red cathode → GPIO 22 (via resistor)
- Green cathode → GPIO 27 (via resistor)
- Blue cathode → Not used (or GPIO 17 for processing)

### WS2812B LED Strip (NeoPixels)
For advanced setup with addressable RGB LEDs:
```python
# Requires rpi_ws281x library
# GPIO 18 (PWM) for data
# Can control color and brightness programmatically
```

## Quick Start Checklist

- [ ] Obtain 3 LEDs (Yellow, Green, Red)
- [ ] Obtain 3× 220Ω resistors
- [ ] Connect Yellow LED to GPIO 17
- [ ] Connect Green LED to GPIO 27
- [ ] Connect Red LED to GPIO 22
- [ ] Connect all cathodes to GND
- [ ] Install RPi.GPIO: `pip3 install RPi.GPIO`
- [ ] Run test script to verify
- [ ] Start main kiosk application
- [ ] Observe LEDs during operation

## Done!

Your RCV Kiosk now has visual status indicators! The LEDs will automatically:
- ⚡ **Blink yellow** during processing
- ✅ **Show green** for successful scans
- ❌ **Show red** for errors or failures
- 💤 **Turn off** when idle

Enjoy your enhanced kiosk experience! 🎉
