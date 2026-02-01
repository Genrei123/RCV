# Quick Start Guide - RCV Kiosk with GPIO LEDs

## 🚀 Installation (5 minutes)

### 1. Install System Dependencies
```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr python3-dev python3-pip
```

### 2. Install Python Packages
```bash
cd ~/RCV/kiosk-python
pip3 install -r requirements.txt
```

### 3. Setup GPIO Permissions
```bash
sudo usermod -a -G gpio $USER
# IMPORTANT: Logout and login again for this to take effect!
```

---

## 🔌 Hardware Setup (10 minutes)

### Materials Needed
- 1× Yellow LED
- 1× Green LED
- 1× Red LED
- 3× 220Ω resistors
- Jumper wires
- Breadboard (optional)

### Wiring
```
GPIO 17 (Pin 11) ──[ 220Ω ]──>|── Yellow LED ── GND
GPIO 27 (Pin 13) ──[ 220Ω ]──>|── Green LED  ── GND
GPIO 22 (Pin 15) ──[ 220Ω ]──>|── Red LED    ── GND
                                               │
                                           Pi GND (Pin 6)
```

**Important:** LED long leg (+) goes to resistor, short leg (-) goes to GND

---

## ✅ Testing (2 minutes)

### Test GPIO LEDs
```bash
python3 test_gpio_leds.py
```

**Expected:**
- ✅ All 3 LEDs light up individually
- ✅ Yellow LED blinks 5 times
- ✅ State transitions work
- ✅ No errors in console

---

## 🎬 Run the Kiosk

```bash
python3 main.py
```

---

## 💡 LED Status Guide

| LED State | Meaning |
|-----------|---------|
| **Yellow Blinking** | Processing/Scanning in progress |
| **Green Solid** | Success! (Valid certificate or authentic product) |
| **Red Solid** | Error or fake product detected |
| **All Off** | Idle, ready for scanning |

---

## 🔧 Troubleshooting

### GPIO not working?
```bash
# Check permissions
groups | grep gpio

# Re-add if needed
sudo usermod -a -G gpio $USER
# Then logout/login
```

### LED not lighting?
- Check LED polarity (try flipping it)
- Verify resistor is connected
- Test with: `python3 test_gpio_leds.py`

### Camera issues?
- Click "RELOAD" button in app
- Check camera connection
- Test with: `raspistill -o test.jpg`

---

## 📚 Documentation

- **INVESTIGATION_SUMMARY.md** - Complete findings
- **GPIO_VISUAL_GUIDE.md** - Wiring diagrams
- **GPIO_LED_WIRING_GUIDE.md** - Detailed instructions
- **KIOSK_IMPROVEMENTS.md** - Technical documentation

---

## 🎯 Key Features Verified

✅ **OCR Functionality** - Working correctly with Tesseract  
✅ **Camera Reload** - Already implemented, working  
✨ **GPIO LED Indicators** - NEW! Full status feedback

---

## 🆘 Quick Help

**OCR not extracting text?**
- Ensure good lighting
- Hold label steady
- Check Tesseract: `tesseract --version`

**Camera frozen?**
- Click orange "RELOAD" button in app

**LEDs not working?**
- Run: `python3 test_gpio_leds.py`
- Check wiring and polarity

---

That's it! Your kiosk is ready to go! 🎉
