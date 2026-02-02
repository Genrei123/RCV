# RCV Kiosk - GPIO LED Visual Guide

## Pin Layout on Raspberry Pi

```
Raspberry Pi GPIO Header (40-pin)
View from top (components facing up)

    3.3V  [ 1] [ 2]  5V
   GPIO2  [ 3] [ 4]  5V
   GPIO3  [ 5] [ 6]  GND      ← Connect all LED cathodes here
   GPIO4  [ 7] [ 8]  GPIO14
     GND  [ 9] [10]  GPIO15
GPIO17 → [11] [12]  GPIO18   ← Yellow LED (Processing)
 GPIO27 → [13] [14]  GND      ← Green LED (Success)
 GPIO22 → [15] [16]  GPIO23   ← Red LED (Error)
    3.3V [17] [18]  GPIO24
  GPIO10 [19] [20]  GND
   GPIO9 [21] [22]  GPIO25
  GPIO11 [23] [24]  GPIO8
     GND [25] [26]  GPIO7
   GPIO0 [27] [28]  GPIO1
   GPIO5 [29] [30]  GND
   GPIO6 [31] [32]  GPIO12
  GPIO13 [33] [34]  GND
  GPIO19 [35] [36]  GPIO16
  GPIO26 [37] [38]  GPIO20
     GND [39] [40]  GPIO21
```

## Breadboard Connection Diagram

```
Raspberry Pi                Breadboard                     LEDs
                           ┌─────────────────┐
GPIO17 (Pin 11) ─────────┤ a1  220Ω  a2─a3 ├────>|── Yellow
                          │                 │
GPIO27 (Pin 13) ─────────┤ b1  220Ω  b2─b3 ├────>|── Green
                          │                 │
GPIO22 (Pin 15) ─────────┤ c1  220Ω  c2─c3 ├────>|── Red
                          │                 │
GND (Pin 6)     ─────────┤ Ground Rail -── │────────Common GND
                          └─────────────────┘

Legend:
────  Wire
[ ]   Resistor
>|    LED (anode on left, cathode on right)
```

## Physical LED Arrangement Ideas

### Option 1: Status Panel (Recommended)
```
┌────────────────────────┐
│  RCV KIOSK STATUS      │
│                        │
│  ●  PROCESSING         │ ← Yellow LED (Blinks)
│  ●  SCAN OK            │ ← Green LED (Solid)
│  ●  ERROR              │ ← Red LED (Solid)
│                        │
└────────────────────────┘
```

### Option 2: Linear Strip
```
┌──────────────────────────────────┐
│  [●]  PROC   [●]  OK   [●]  ERR  │
│  Yellow      Green      Red      │
└──────────────────────────────────┘
```

### Option 3: Traffic Light Style
```
   ┌───┐
   │ ● │  ← Red (Error)
   ├───┤
   │ ● │  ← Yellow (Processing)
   ├───┤
   │ ● │  ← Green (Success)
   └───┘
```

## Complete Wiring Steps

### Materials Checklist
```
□ 1× Yellow LED (5mm, 20mA max)
□ 1× Green LED (5mm, 20mA max)
□ 1× Red LED (5mm, 20mA max)
□ 3× 220Ω resistors (1/4W, 5%)
□ 1× Breadboard (optional but recommended)
□ 4× Female-to-male jumper wires
  OR 7× jumper wires if using breadboard
```

### Step 1: Identify LED Polarity
```
     ANODE (+)              or         Flat edge
    Long leg                      ┌────┐
       │                          │ ▓  │
      ┌┴┐                         │  ▓ │
     │ █ │  ← LED                 └────┘
      └┬┘                           │
       │                         Round edge
   Short leg
  CATHODE (-)
```

### Step 2: Wire Yellow LED (Processing)
```
1. Insert 220Ω resistor into breadboard row 1
2. Insert Yellow LED into same row
   - Long leg (anode) to resistor
   - Short leg (cathode) to ground rail
3. Connect GPIO 17 (Pin 11) to resistor
4. Connect ground rail to Pi GND (Pin 6)
```

### Step 3: Wire Green LED (Success)
```
1. Insert 220Ω resistor into breadboard row 2
2. Insert Green LED into same row
   - Long leg (anode) to resistor
   - Short leg (cathode) to ground rail
3. Connect GPIO 27 (Pin 13) to resistor
```

### Step 4: Wire Red LED (Error)
```
1. Insert 220Ω resistor into breadboard row 3
2. Insert Red LED into same row
   - Long leg (anode) to resistor
   - Short leg (cathode) to ground rail
3. Connect GPIO 22 (Pin 15) to resistor
```

### Step 5: Test!
```bash
python3 test_gpio_leds.py
```

## LED Behavior in Action

### Scenario 1: Valid QR Certificate Scan
```
State Timeline:

[0s] Idle
     ○ Yellow  ○ Green  ○ Red

[1s] QR Code Detected → Processing
     ◉ Yellow  ○ Green  ○ Red    ← Blinks
     ○ Yellow  ○ Green  ○ Red
     ◉ Yellow  ○ Green  ○ Red
     ○ Yellow  ○ Green  ○ Red

[3s] Certificate Valid → Success
     ○ Yellow  ◉ Green  ○ Red    ← Solid for 30s

[33s] Return to Idle
     ○ Yellow  ○ Green  ○ Red
```

### Scenario 2: Fake Product Detected
```
State Timeline:

[0s] Idle
     ○ Yellow  ○ Green  ○ Red

[1s] OCR Capture → Processing
     ◉ Yellow  ○ Green  ○ Red    ← Blinks
     ○ Yellow  ○ Green  ○ Red
     ◉ Yellow  ○ Green  ○ Red

[5s] Product Analysis → Error
     ○ Yellow  ○ Green  ◉ Red    ← Solid for 30s

[35s] Return to Idle
     ○ Yellow  ○ Green  ○ Red
```

## Resistor Value Selection

### Standard Values
```
Resistor    Brightness    Current    Use Case
────────    ──────────    ───────    ────────
150Ω        Very Bright   ~12mA      Bright room
220Ω        Bright        ~10mA      Recommended
330Ω        Medium        ~7mA       Normal use
470Ω        Dim           ~5mA       Low power
```

### Color Code Guide
```
220Ω Resistor:
┌─────────────────────┐
│ RED RED BROWN GOLD  │
│  2   2   ×10   ±5%  │
└─────────────────────┘

150Ω: Brown-Green-Brown
330Ω: Orange-Orange-Brown
470Ω: Yellow-Violet-Brown
```

## Mounting Ideas

### Desktop Enclosure
```
Side View:
┌──────────────┐
│   Screen     │
│ ┌──────────┐ │
│ │          │ │
│ └──────────┘ │
│              │
│  ●●●  ← LEDs │
└──────────────┘
```

### Wall-Mount Kiosk
```
Front View:
┌────────────────┐
│  ●●●  ← LEDs   │  ← Top mounted
├────────────────┤
│                │
│     Screen     │
│                │
├────────────────┤
│    Scanner     │
└────────────────┘
```

### Acrylic LED Panel
```
3D View:

Clear Acrylic Panel
┌─────────────────┐
│ ●   ●   ●       │  ← LEDs shine through
│ │   │   │       │
│ └───┴───┘       │
└────┬────────────┘
     │
  Wires to Pi
```

## Troubleshooting Decision Tree

```
LED not working?
│
├─ No LED lights up at all
│  ├─ Check power: Is Pi powered on?
│  ├─ Check GPIO permissions: Run 'groups | grep gpio'
│  └─ Check RPi.GPIO installed: 'pip3 show RPi.GPIO'
│
├─ One LED doesn't work
│  ├─ Check LED polarity (try flipping it)
│  ├─ Check resistor connection
│  ├─ Test with multimeter (GPIO should show 3.3V)
│  └─ Try different LED (could be burned out)
│
├─ LED very dim
│  ├─ Use lower resistor (150Ω instead of 220Ω)
│  └─ Check for loose connections
│
├─ LED very bright or hot
│  ├─ Use higher resistor (330Ω or 470Ω)
│  └─ Check you didn't skip the resistor!
│
└─ Blinking not working
   ├─ Check console for errors
   ├─ Verify processing state is reached
   └─ Test with: python3 test_gpio_leds.py
```

## Safety Warnings

```
⚠️  NEVER connect LED directly to GPIO without resistor
    → Will damage GPIO pin and/or LED

⚠️  GPIO pins are 3.3V, NOT 5V
    → Don't use 5V LEDs or components

⚠️  Max current per pin: 16mA
    → Use 220Ω or higher resistors

⚠️  Total max current all pins: 50mA
    → Don't drive too many LEDs

✅  Always use current-limiting resistors
✅  Double-check polarity before powering on
✅  Test with multimeter if unsure
```

## Quick Commands Reference

```bash
# Test GPIO LEDs
python3 test_gpio_leds.py

# Check GPIO status
gpio readall

# Start kiosk application
python3 main.py

# Check RPi.GPIO installation
pip3 show RPi.GPIO

# Install dependencies
pip3 install -r requirements.txt

# Add user to GPIO group
sudo usermod -a -G gpio $USER
```

## Expected Console Output

When kiosk runs correctly, you'll see:
```
✅ GPIO LEDs initialized (Pins: 17, 27, 22)
💤 All LEDs OFF (idle)

[User scans QR code]
🔄 Processing LED blinking (GPIO 17)

[Certificate verified]
✅ Success LED ON (GPIO 27)
💤 All LEDs OFF (idle)

[User scans fake product]
🔄 Processing LED blinking (GPIO 17)
❌ Error LED ON (GPIO 22)
💤 All LEDs OFF (idle)
```

---

## Final Checklist

Installation:
- [ ] Raspberry Pi with 40-pin GPIO header
- [ ] 3 LEDs obtained (Yellow, Green, Red)
- [ ] 3× 220Ω resistors obtained
- [ ] Breadboard and wires ready
- [ ] RPi.GPIO library installed
- [ ] User added to GPIO group (logged out/in)

Wiring:
- [ ] Yellow LED → GPIO 17 via 220Ω resistor
- [ ] Green LED → GPIO 27 via 220Ω resistor  
- [ ] Red LED → GPIO 22 via 220Ω resistor
- [ ] All cathodes → Common GND
- [ ] Polarity checked (long leg = +)

Testing:
- [ ] Ran test script: `python3 test_gpio_leds.py`
- [ ] All 3 LEDs light individually
- [ ] Yellow LED blinks correctly
- [ ] No errors in console

Deployment:
- [ ] Main app runs: `python3 main.py`
- [ ] LEDs respond to kiosk states
- [ ] OCR scanning works
- [ ] Camera reload works
- [ ] LEDs clean up on exit

🎉 **You're ready to go!**

---

*For more details, see:*
- *INVESTIGATION_SUMMARY.md - Full results*
- *GPIO_LED_WIRING_GUIDE.md - Detailed instructions*
- *KIOSK_IMPROVEMENTS.md - Technical documentation*
