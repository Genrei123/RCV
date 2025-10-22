#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "Walang Free Wifi Dito";
const char* password = "mamamoblack";

// Ngrok URL - replace with your actual ngrok URL
const char* serverUrl = "https://3e8b3f4f31d5.ngrok-free.app/kiosk/command";

// Note: Make sure this matches your Express backend exactly!

// LED GPIO pins
const int LED_1 = 25;   // Built-in LED on most ESP32 boards
const int LED_2 = 26;
const int LED_3 = 27;

// Polling interval (milliseconds)
const unsigned long pollInterval = 2000; // Poll every 2 seconds
unsigned long lastPollTime = 0;

void setup() {
  Serial.begin(115200);
  
  // Initialize LED pins
  pinMode(LED_1, OUTPUT);
  pinMode(LED_2, OUTPUT);
  pinMode(LED_3, OUTPUT);
  
  // Turn off all LEDs initially
  digitalWrite(LED_1, LOW);
  digitalWrite(LED_2, LOW);
  digitalWrite(LED_3, LOW);
  
  // Connect to WiFi
  Serial.println();
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  
  // Flash all LEDs to indicate successful connection
  flashAllLEDs();
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      Serial.print(".");
    }
    Serial.println("\nReconnected!");
  }
  
  // Poll server at regular intervals
  unsigned long currentTime = millis();
  if (currentTime - lastPollTime >= pollInterval) {
    lastPollTime = currentTime;
    checkForCommand();
  }
}

void checkForCommand() {
  HTTPClient http;
  
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    Serial.println("Received: " + payload);
    
    // Parse JSON response
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, payload);
    
    if (error) {
      Serial.print("JSON parsing failed: ");
      Serial.println(error.c_str());
      http.end();
      return;
    }
    
    // Extract command data
    const char* action = doc["action"];
    
    // Only process if action is "control" (not "none")
    if (action != nullptr && strcmp(action, "control") == 0) {
      int ledNumber = doc["led"];
      const char* state = doc["state"];
      controlLED(ledNumber, state);
    } else {
      Serial.println("No command pending (action: none)");
    }
    
  } else if (httpCode > 0) {
    Serial.printf("HTTP Error code: %d\n", httpCode);
  } else {
    Serial.printf("HTTP Request failed: %s\n", http.errorToString(httpCode).c_str());
  }
  
  http.end();
}

void controlLED(int ledNumber, const char* state) {
  int ledPin = -1;
  
  // Map LED number to GPIO pin
  switch(ledNumber) {
    case 1:
      ledPin = LED_1;
      break;
    case 2:
      ledPin = LED_2;
      break;
    case 3:
      ledPin = LED_3;
      break;
    default:
      Serial.println("Invalid LED number");
      return;
  }
  
  // Set LED state - only respond to "on" command
  if (strcmp(state, "on") == 0) {
    digitalWrite(ledPin, HIGH);
    Serial.printf("✅ LED %d turned ON\n", ledNumber);
  } else if (strcmp(state, "off") == 0) {
    digitalWrite(ledPin, LOW);
    Serial.printf("❌ LED %d turned OFF\n", ledNumber);
  } else if (strcmp(state, "toggle") == 0) {
    int currentState = digitalRead(ledPin);
    digitalWrite(ledPin, !currentState);
    Serial.printf("🔄 LED %d toggled to %s\n", ledNumber, !currentState ? "ON" : "OFF");
  }
}

void flashAllLEDs() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_1, HIGH);
    digitalWrite(LED_2, HIGH);
    digitalWrite(LED_3, HIGH);
    delay(200);
    digitalWrite(LED_1, LOW);
    digitalWrite(LED_2, LOW);
    digitalWrite(LED_3, LOW);
    delay(200);
  }
}
