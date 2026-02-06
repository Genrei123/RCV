# RCV Kiosk Debug Tool MVP

A comprehensive administrator tool for debugging and controlling RCV Kiosk machines, built with Flutter for mobile/desktop access and integrated with the web dashboard.

## 🎯 Features

### Flutter Debug App
- **Secure Login**: Administrator-only access with email/password authentication
- **Real-time Monitoring**: Live status updates of kiosk machines every 5 seconds
- **LED Control**: Test and toggle individual LED indicators
  - Processing LED (Yellow)
  - Success LED (Green)
  - Error LED (Red)
- **Remote Control**: 
  - Restart kiosk application
  - Force different modes (Scanner, OCR, Slideshow)
  - Shutdown kiosk machine
- **Status Dashboard**: 
  - Online/Offline status
  - Last seen timestamp
  - Current operating mode
  - LED status indicators

### Web Integration (Maps.tsx)
- **Dual View Tabs**: Switch between Inspectors and Kiosk Machines
- **Interactive Map**: See all kiosk locations on Google Maps
- **Status Indicators**: Visual markers for online/offline kiosks
- **Quick Actions**: Restart kiosks directly from the map
- **Real-time Stats**: View online/offline counts at a glance

## 📁 Project Structure

```
kiosk-debug-tool/
├── lib/
│   ├── main.dart                 # App entry point
│   ├── screens/
│   │   ├── login_screen.dart     # Authentication screen
│   │   └── kiosk_dashboard.dart  # Main control dashboard
│   ├── services/
│   │   ├── auth_service.dart     # Authentication service
│   │   └── kiosk_service.dart    # Kiosk API communication
│   ├── widgets/
│   │   ├── led_status_card.dart  # LED indicator widget
│   │   ├── control_button_card.dart # Control action buttons
│   │   └── kiosk_info_card.dart  # Status information card
│   └── theme/
│       └── app_theme.dart        # RCV brand colors & styling
├── pubspec.yaml                  # Dependencies
└── README.md                     # This file

web/
├── src/
│   ├── pages/
│   │   └── MapsWithKiosks.tsx    # Map page with kiosk view
│   ├── components/
│   │   └── KioskMapComponent.tsx # Kiosk map component
│   └── services/
│       └── kioskManagementService.ts # Kiosk API service
```

## 🚀 Getting Started

### Flutter App Setup

1. **Navigate to the debug tool directory**:
   ```bash
   cd kiosk/kiosk-debug-tool
   ```

2. **Install dependencies**:
   ```bash
   flutter pub get
   ```

3. **Configure API endpoint**:
   Edit `lib/services/auth_service.dart` and `lib/services/kiosk_service.dart`:
   ```dart
   // Update these URLs to match your environment
   static const String _apiBaseUrl = 'http://your-api-server:5500/api/v1';
   static const String _kioskApiUrl = 'http://192.168.1.100:8000';
   ```

4. **Run the app**:
   ```bash
   # For Android
   flutter run

   # For iOS
   flutter run

   # For Desktop (Windows/Mac/Linux)
   flutter run -d windows
   flutter run -d macos
   flutter run -d linux

   # For Web
   flutter run -d chrome
   ```

### Web Integration Setup

1. **Install dependencies** (if not already done):
   ```bash
   cd web
   npm install
   ```

2. **Configure environment variables**:
   Create or update `.env`:
   ```
   VITE_API_BASE_URL=http://your-api-server:5500/api/v1
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

3. **Import the new page in your routes**:
   ```typescript
   // In your router configuration
   import { MapsWithKiosks } from "@/pages/MapsWithKiosks";
   
   // Add route
   { path: "/maps", element: <MapsWithKiosks /> }
   ```

## 🔧 Configuration

### Kiosk Machine Requirements

Your kiosk machines need to expose these endpoints:

```
GET  /status              - Returns kiosk status and LED states
POST /led/:name/toggle    - Toggle specific LED (processing|success|error)
POST /led/test-all        - Test all LEDs sequentially
POST /control/restart     - Restart kiosk application
POST /control/shutdown    - Shutdown kiosk machine
POST /control/mode        - Change operating mode
```

Example `/status` response:
```json
{
  "mode": "scanner",
  "leds": {
    "processing": false,
    "success": true,
    "error": false
  }
}
```

### Backend API Requirements

Your backend needs these endpoints:

```
POST /auth/login          - Authenticate admin users
GET  /kiosks              - List all kiosk machines
GET  /kiosks/:id          - Get specific kiosk details
POST /kiosks/:id/restart  - Restart kiosk remotely
POST /kiosks/:id/mode     - Set kiosk mode
POST /kiosks/:id/led/:name/toggle - Toggle LED
POST /kiosks/:id/led/test-all - Test all LEDs
POST /kiosks/:id/shutdown - Shutdown kiosk
```

## 🎨 Design

The app follows the RCV brand guidelines:
- **Primary Green**: `#005440`
- **Success Green**: `#4CAF50`
- **Error Red**: `#F44336`
- **Warning Orange**: `#FF9800`
- **Accent Teal**: `#00BFA5`

All UI components are designed for:
- Touch-friendly interactions
- Clear visual feedback
- Consistent spacing and typography
- Material Design 3 principles

## 📱 Screens

### 1. Login Screen
- Email and password authentication
- Form validation
- Loading states
- Error handling

### 2. Kiosk Dashboard
- Real-time status monitoring
- LED status cards with toggle switches
- Control action buttons
- Confirmation dialogs for destructive actions
- Pull-to-refresh functionality

### 3. Map View (Web)
- Tabbed interface (Inspectors / Kiosks)
- Interactive Google Maps
- Info windows with quick actions
- Search functionality
- Online/Offline statistics

## 🔐 Security

- Admin-only access with authentication
- Token-based session management
- Secure credential storage (SharedPreferences)
- Confirmation dialogs for critical actions

## 🛠️ Development

### Mock Data
The app includes mock data for development/testing:
- 3 sample kiosk machines (2 online, 1 offline)
- Located in Manila, Makati, and Quezon City
- Different modes and LED states

To disable mock data and use real APIs, ensure your backend endpoints are properly configured.

### Testing
```bash
# Run tests
flutter test

# Run with coverage
flutter test --coverage
```

## 📦 Dependencies

Flutter packages:
- `provider` - State management
- `http` - API communication
- `shared_preferences` - Persistent storage
- `flutter_animate` - Smooth animations

Web packages:
- `react-google-maps/api` - Google Maps integration
- `lucide-react` - Icons
- UI components from your existing library

## 🚨 Troubleshooting

### Kiosk not connecting
1. Check network connectivity
2. Verify kiosk API endpoint URL
3. Ensure kiosk is powered on and running
4. Check firewall settings

### Authentication failing
1. Verify API_BASE_URL is correct
2. Check admin credentials
3. Ensure backend auth service is running

### Map not loading
1. Verify Google Maps API key
2. Enable Maps JavaScript API in Google Cloud Console
3. Check browser console for errors

## 📝 Notes

- This is a **prototype MVP** - production deployment requires additional security hardening
- All new files are created separately to avoid affecting existing functionality
- The Flutter app can be deployed on mobile, desktop, or web platforms
- Web integration is non-invasive and can be enabled/disabled easily

## 🔄 Next Steps

1. Implement backend API endpoints for kiosk management
2. Add kiosk registration flow
3. Implement push notifications for offline alerts
4. Add analytics and logging
5. Deploy to production environment

## 📞 Support

For issues or questions, contact the development team or refer to the main RCV documentation.
