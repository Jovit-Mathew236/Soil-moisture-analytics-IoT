#ifdef ESP32
#include <WiFi.h>
#include <AsyncTCP.h>
#include <SPIFFS.h>
#else
#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <Hash.h>
#include <ESPAsyncTCP.h>
#include <FS.h>
#endif

#include <ESPAsyncWebServer.h>
#include <WebSocketsServer.h>
#include <TimeLib.h> // Include Time library for timestamp

const char* ssid = "wifi";
const char* password = "ashin1234";

AsyncWebServer server(80);
WebSocketsServer webSocket = WebSocketsServer(81);

const int soilPin = A0; // Define GPIO pin 15 for analog input (ADC channel A3)
const int ledPin = 15;   // GPIO pin number for relay control
int ledCount = 0;       // Counter for LED activations
bool ledOn = false;     // Flag to track LED state
const int MAX_READINGS = 5; // Maximum number of moisture readings to store per month
float moistureReadings[MAX_READINGS]; // Array to store moisture readings

void printLocalTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("No time available (yet)");
    return;
  }
  Serial.println(&timeinfo, "%A, %B %d %Y %H:%M:%S");
}

void handleRoot(AsyncWebServerRequest *request) {
  request->send(SPIFFS, "/index.html");
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.printf("[%u] Disconnected!\n", num);
      break;
    case WStype_CONNECTED:
      Serial.printf("[%u] Connected from url: %s\n", num, payload);
      break;
  }
}

void setup() {
  Serial.begin(9600);
  pinMode(ledPin, OUTPUT);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi..");
  }
  Serial.println(WiFi.localIP());

  // Configure NTP time synchronization
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");

  server.on("/", HTTP_GET, handleRoot);

  server.on("/soilmoisture_ledcount_data", HTTP_GET, [] (AsyncWebServerRequest *request) {
    // Prepare the JSON response
    String response = "{";

    // Get the current time
    time_t now = time(nullptr);
    struct tm timeinfo;
    localtime_r(&now, &timeinfo);

    // Add moisture data
    response += "\"moistureData\": [{";
    response += "\"name\": \"" + String(monthShortStr(timeinfo.tm_mon + 1)) + " " + String(timeinfo.tm_year + 1900) + "\",";
    response += "\"data\": [";

    for (int i = 0; i < MAX_READINGS; i++) {
        response += String(moistureReadings[i], 2); // Round to 2 decimal places
        if (i < MAX_READINGS - 1) {
            response += ",";
        }
    }

    response += "]";

    // Add LED count data
    response += "}],\"ledCountData\": [{";
    response += "\"name\": \"" + String(monthShortStr(timeinfo.tm_mon + 1)) + " " + String(timeinfo.tm_year + 1900) + "\",";
    response += "\"y\": " + String(ledCount);
    response += "}]}";

    // Create the response object
    AsyncWebServerResponse *responseObj = request->beginResponse(200, "application/json", response);
    responseObj->addHeader("Access-Control-Allow-Origin", "*"); // Add CORS header
    request->send(responseObj); // Send the response
});


  server.begin();

  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
}

void loop() {
  webSocket.loop(); // Handle WebSocket events

  int sensor_analog = analogRead(soilPin);
  Serial.print("Raw Analog Reading: ");
//  Serial.println(sensor_analog);

  float moisturePercentage = (100.0 - ((float)sensor_analog / 4095.0) * 100.0);
  Serial.println(moisturePercentage);
  // Shift the existing moisture readings to the right
  for (int i = MAX_READINGS - 1; i > 0; i--) {
    moistureReadings[i] = moistureReadings[i - 1];
  }
  // Store the latest moisture reading
  moistureReadings[0] = moisturePercentage;

  if (moisturePercentage > 10.0 && !ledOn) {
    digitalWrite(ledPin, HIGH); // Turn on LED if moisture is greater than 50%
    ledCount++; // Increment LED count
    ledOn = true; // Set LED state flag
  } else if (moisturePercentage < 5.0 && ledOn) {
    digitalWrite(ledPin, LOW);  // Turn off LED if moisture is not greater than 50%
    ledOn = false; // Reset LED state flag
  }

  webSocket.broadcastTXT(String(moisturePercentage).c_str());

  delay(1000);
}
