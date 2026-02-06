# RCV Kiosk Debug Tool - Complete Setup & Testing Guide

## 🚀 Quick Start

This guide will help you get the entire kiosk debug system running and verified.

### Prerequisites
- Python 3.8+ with pip
- Node.js 16+ with npm
- Flutter 3.0+
- Backend API server

---

## 📦 Step 1: Install Python Dependencies

```bash
cd kiosk-python
pip install flask flask-cors psutil requests python-dotenv
```

**Verify installation:**
```bash
python -c "import flask, flask_cors, psutil; print('✓ All packages installed')"
```

---

## ⚙️ Step 2: Configure Environment

Create `.env` file in `kiosk-python/` directory:

```bash
# Copy the example
cp .env.monitoring .env

# Edit with your values
nano .env
```

**Required environment variables:**
```env
API_BASE_URL=http://localhost:5500/api/v1
KIOSK_ID=kiosk-001
KIOSK_LAT=14.5995
KIOSK_LNG=120.9842
KIOSK_ADDRESS=RCV Office, Manila
KIOSK_CITY=Manila
```

---

## 🔧 Step 3: Start Backend API

```bash
cd api
npm install
npm run dev
```

**Expected output:**
```
Server running on port 5500
```

**Verify backend is running:**
```bash
curl http://localhost:5500/api/v1/health
```

---

## 🖥️ Step 4: Start Python Kiosk with Monitoring

**Option A: Use the standalone monitoring app**
```bash
cd kiosk-python
python3 main_with_monitoring.py
```

**Expected output:**
```
🚀 Initializing Monitored Kiosk Application...
📡 Starting health monitoring service...
🌐 Starting remote control server on port 8000...
✅ Monitored Kiosk Application initialized successfully!
📍 Kiosk ID: kiosk-001
📡 Heartbeat: Every 30 seconds
🌐 Control Server: http://0.0.0.0:8000
```

**You should see heartbeat logs every 30 seconds:**
```
✓ Heartbeat sent successfully: idle
```

**Verify control server is running:**
```bash
curl http://localhost:8000/status
```

**Expected response:**
```json
{
  "kiosk_id": "kiosk-001",
  "status": "online",
  "mode": "idle",
  "leds": {
    "processing": false,
    "success": false,
    "error": false
  }
}
```

---

## 🧪 Step 5: Run Integration Tests

```bash
cd kiosk-python
python3 test_integration.py
```

**Expected output:**
```
🧪🧪🧪 RCV KIOSK - INTEGRATION TEST SUITE 🧪🧪🧪

===========================================================
  TESTING KIOSK CONTROL SERVER (Port 8000)
===========================================================

✅ PASS | Status Endpoint
✅ PASS | Toggle Processing LED ON
✅ PASS | Toggle Processing LED OFF
✅ PASS | Test All LEDs Sequence
✅ PASS | Change Mode to Scanner
✅ PASS | Toggle Success LED
✅ PASS | Final Status Check

📊 Control Server Tests: 7/7 passed

===========================================================
  TESTING BACKEND API HEARTBEAT (Port 5500)
===========================================================

✅ PASS | Heartbeat Sent
✅ PASS | Get All Kiosks
🟢 kiosk-001: online - RCV Office, Manila
✅ PASS | Get Specific Kiosk

📊 Backend API Tests: 3/3 passed

✅ ALL TESTS PASSED! Integration is working correctly.
```

---

## 📱 Step 6: Test Flutter Debug App

```bash
cd kiosk/kiosk-debug-tool
flutter pub get
flutter run
```

**Login credentials:**
- Email: `technician@gmail.com`
- Password: `technician@123`

**After login, you should see:**
- Kiosk information card (ID, location, status)
- 3 LED status cards (Processing, Success, Error)
- 5 control buttons (Restart, Slideshow, Scanner, OCR, Shutdown)
- Test All LEDs button at bottom

**Test LED controls:**
1. Tap on any LED card to toggle it
2. Watch the Python console - you should see:
   ```
   💡 LED Control: processing -> ON
   ```
3. Tap "Test All LEDs" button
4. All LEDs should blink in sequence

---

## 🌐 Step 7: Test Web Dashboard

```bash
cd web
npm install
npm run dev
```

**Open browser:** `http://localhost:5173`

**Navigate to Maps page:**
1. Click "Maps" in navigation
2. Look for toggle button in upper-right corner with icons:
   - 👥 Users (Agents)
   - 🖥️ Monitor (Kiosks)
3. Click 🖥️ Monitor to switch to Kiosk view

**You should see:**
- Green marker 🟢 for online kiosk at configured location
- Click marker to see info window with:
  - Kiosk ID
  - Status (online/offline)
  - Last seen timestamp
  - "Restart" button
  - "Open Debug Tool" button

**Test restart from web:**
1. Click kiosk marker
2. Click "Restart" button
3. Python console should show:
   ```
   🔄 Restart requested - restarting kiosk application...
   ```

---

## ✅ Verification Checklist

- [ ] Backend API running on port 5500
- [ ] Python kiosk running with monitoring
- [ ] Heartbeat logs appearing every 30 seconds
- [ ] Control server responding on port 8000
- [ ] All integration tests passing
- [ ] Flutter app can login and shows dashboard
- [ ] LED toggle works from Flutter app
- [ ] Web dashboard shows kiosk on map
- [ ] Restart button works from web dashboard
- [ ] Kiosk status updates in real-time

---

## 🐛 Troubleshooting

### Control server not responding
```bash
# Check if port 8000 is in use
lsof -i :8000  # Mac/Linux
netstat -ano | findstr :8000  # Windows

# Kill existing process and restart
```

### Heartbeat not sending
```bash
# Check environment variables
python3 -c "import os; from dotenv import load_dotenv; load_dotenv(); print(os.getenv('API_BASE_URL'))"

# Verify backend API is accessible
curl http://localhost:5500/api/v1/kiosks
```

### Flutter app can't connect
```bash
# Check kiosk service base URL in lib/services/kiosk_service.dart
# Should be: http://localhost:5500/api/v1 (or your server IP)

# For mobile device testing, use computer's IP instead of localhost:
# http://192.168.1.100:5500/api/v1
```

### Web dashboard not showing kiosks
```bash
# Check browser console for errors
# Verify API endpoint in src/services/kioskManagementService.ts
# Check CORS is enabled in backend API
```

---

## 🔍 Monitoring Logs

### Python Kiosk Console
```
✓ Heartbeat sent successfully: idle
💡 LED Control: processing -> ON
💡 LED Control: processing -> OFF
🔄 Restart requested - restarting kiosk application...
🔀 Mode change requested: scanner
```

### Backend API Console
```
POST /api/v1/kiosks/heartbeat 200 - 15ms
Heartbeat received from kiosk-001
GET /api/v1/kiosks 200 - 5ms
POST /api/v1/kiosks/kiosk-001/restart 200 - 8ms
```

### Flutter App Console
```
Kiosk status updated: online
LED toggled: processing = true
Restart command sent successfully
```

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    RCV Kiosk System                     │
└─────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Flutter    │         │  Web         │         │   Python     │
│   Debug App  │────────▶│  Dashboard   │◀────────│   Kiosk      │
│              │         │  (React)     │         │   Machine    │
└──────────────┘         └──────────────┘         └──────────────┘
       │                        │                         │
       │                        │                         │
       ▼                        ▼                         ▼
┌─────────────────────────────────────────────────────────┐
│              Backend API (Express + TypeScript)         │
│  • /kiosks/heartbeat - Receive health checks           │
│  • /kiosks - List all kiosks                           │
│  • /kiosks/:id/restart - Restart command               │
│  • /kiosks/:id/led - LED control                       │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  In-Memory Store │
                    │  (MVP Phase)     │
                    └──────────────────┘

Python Kiosk Components:
┌──────────────────────────────────────────────────────┐
│  Health Service (Thread)                             │
│  • Polls every 30 seconds                            │
│  • Sends: mode, LEDs, system info, location          │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  Control Server (Flask - Port 8000)                  │
│  • GET  /status                                      │
│  • POST /led/<name>/toggle                           │
│  • POST /led/test-all                                │
│  • POST /control/restart                             │
│  • POST /control/mode                                │
└──────────────────────────────────────────────────────┘
```

---

## 🎯 Next Steps

Once everything is verified working:

1. **Integrate monitoring into existing main.py**
   - Follow `INTEGRATION_EXAMPLE.py`
   - Add health service and control server initialization
   - Set up callbacks for LED control

2. **Connect GPIO LEDs** (Raspberry Pi only)
   - Update control callbacks to actually control GPIO pins
   - Use existing GPIO service from your kiosk

3. **Deploy to production**
   - Replace in-memory storage with database
   - Add authentication tokens
   - Enable HTTPS
   - Set up proper firewall rules

4. **Add real-time features**
   - WebSocket for instant status updates
   - Push notifications for offline alerts
   - Remote camera viewing

---

## 📝 Important Files

- `kiosk-python/main_with_monitoring.py` - Standalone monitored kiosk app
- `kiosk-python/services/health_service.py` - Health check polling
- `kiosk-python/services/control_server.py` - Flask HTTP control server
- `kiosk-python/test_integration.py` - Automated test script
- `kiosk-python/.env.monitoring` - Environment variables template
- `api/src/controllers/KioskController.ts` - Backend endpoints
- `web/src/components/KioskMapComponent.tsx` - Map visualization
- `kiosk/kiosk-debug-tool/lib/screens/kiosk_dashboard.dart` - Flutter UI

---

## 🤝 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all services are running
3. Run the integration test script
4. Check logs in each component's console

For questions, refer to:
- `kiosk/kiosk-debug-tool/README.md` - Flutter app docs
- `kiosk/kiosk-debug-tool/API_INTEGRATION.md` - API specifications
- `kiosk-python/INTEGRATION_EXAMPLE.py` - Integration code samples
