#include <WiFi.h>
#include <WebServer.h>

// WiFi Access Point credentials (ESP32 creates its own WiFi network)
const char* ap_ssid = "2222";     // WiFi name your phone will see
const char* ap_password = "Collectives2222";          // Password (min 8 characters)

// LED pins
const int LED1_PIN = 25;   // GPIO 25
const int LED2_PIN = 26;   // GPIO 26
const int LED3_PIN = 27;   // GPIO 27

// Web server on port 80
WebServer server(80);

// LED states
bool led1State = false;
bool led2State = false;
bool led3State = false;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n=== ESP32 LED Controller Starting ===");
  
  // Initialize LED pins
  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
  pinMode(LED3_PIN, OUTPUT);
  
  // Turn on all LEDs initially (power-on indication)
  digitalWrite(LED1_PIN, HIGH);
  digitalWrite(LED2_PIN, HIGH);
  digitalWrite(LED3_PIN, HIGH);
  
  led1State = true;
  led2State = true;
  led3State = true;
  
  Serial.println("All LEDs turned ON at startup");
  
  // Create WiFi Access Point
  Serial.println("\nCreating WiFi Access Point...");
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ap_ssid, ap_password);
  
  delay(100);
  
  IPAddress IP = WiFi.softAPIP();
  Serial.println("✓ Access Point Created!");
  Serial.println("====================================");
  Serial.print("WiFi Name (SSID): ");
  Serial.println(ap_ssid);
  Serial.print("WiFi Password: ");
  Serial.println(ap_password);
  Serial.print("IP Address: ");
  Serial.println(IP);
  Serial.println("====================================");
  
  // Set up server routes
  server.on("/led1", handleLED1);
  server.on("/led2", handleLED2);
  server.on("/led3", handleLED3);
  server.onNotFound(handleNotFound);
  
  // Start server
  server.begin();
  Serial.println("HTTP server started\n");
  Serial.println("Instructions:");
  Serial.println("1. Connect your phone to WiFi: ESP32_LED_Control");
  Serial.println("2. Use password: 12345678");
  Serial.println("3. Open Flutter app and use IP: 192.168.4.1");
  Serial.println("====================================\n");
}

void loop() {
  server.handleClient();
}

void handleLED1() {
  if (server.hasArg("state")) {
    String state = server.arg("state");
    if (state == "on") {
      led1State = true;
      digitalWrite(LED1_PIN, HIGH);
      Serial.println("LED 1 turned ON");
    } else if (state == "off") {
      led1State = false;
      digitalWrite(LED1_PIN, LOW);
      Serial.println("LED 1 turned OFF");
    }
    server.send(200, "text/plain", "LED 1: " + state);
  } else {
    server.send(400, "text/plain", "Missing state parameter");
  }
}

void handleLED2() {
  if (server.hasArg("state")) {
    String state = server.arg("state");
    if (state == "on") {
      led2State = true;
      digitalWrite(LED2_PIN, HIGH);
      Serial.println("LED 2 turned ON");
    } else if (state == "off") {
      led2State = false;
      digitalWrite(LED2_PIN, LOW);
      Serial.println("LED 2 turned OFF");
    }
    server.send(200, "text/plain", "LED 2: " + state);
  } else {
    server.send(400, "text/plain", "Missing state parameter");
  }
}

void handleLED3() {
  if (server.hasArg("state")) {
    String state = server.arg("state");
    if (state == "on") {
      led3State = true;
      digitalWrite(LED3_PIN, HIGH);
      Serial.println("LED 3 turned ON");
    } else if (state == "off") {
      led3State = false;
      digitalWrite(LED3_PIN, LOW);
      Serial.println("LED 3 turned OFF");
    }
    server.send(200, "text/plain", "LED 3: " + state);
  } else {
    server.send(400, "text/plain", "Missing state parameter");
  }
}

void handleNotFound() {
  server.send(404, "text/plain", "Not Found");
}