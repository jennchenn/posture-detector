//#include <ESP8266WiFi.h>
//#include <ESP8266HTTPClient.h>
//#include <WiFiClient.h>

const char *ssid = "REPLACE_WITH_YOUR_SSID";
const char *password = "REPLACE_WITH_YOUR_PASSWORD";
const float INPUT_VOLTAGE = 5.0;

// Your Domain name with URL path or IP address with path
const char *serverName = "https://seat-posture-detector.herokuapp.com/pressure"; 

unsigned long lastTime = 0;
// Set timer to 5 seconds (5000)
unsigned long timerDelay = 1000;

const int NUM_PINS = 7;
const uint8_t ANALOG_PINS[] = {A0, A1, A2, A3, A4, A5, A6, A7};

void setup()
{
    Serial.begin(115200);

    WiFi.begin(ssid, password);
    Serial.println("Connecting");
    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        Serial.print(".");
    }
    Serial.println("");
    Serial.print("Connected to WiFi network with IP Address: ");
    Serial.println(WiFi.localIP());

    Serial.println("Timer set to 5 seconds (timerDelay variable), it will take 5 seconds before publishing the first reading.");
}

void loop()
{
    // Send an HTTP POST request every 5 seconds
    if ((millis() - lastTime) > timerDelay)
    {
        // Check WiFi connection status
        if (WiFi.status() == WL_CONNECTED)
        {
            // set up WiFi connection
            WiFiClient client;
            HTTPClient http;

            // read sensor values
            String sensorValues;
            int value;
            float volt;

            for (int i = 0; i < NUM_PINS; i++)
            {
                value = analogRead(ANALOG_PINS[i]);
                volt = value * INPUT_VOLTAGE / 1023.0;
                sensorValues = sensorValues + i + "=" + String(volt, 6);
                if (i != NUM_PINS - 1) // check if there are more values to append
                {
                    sensorValues += "&";
                }
            }

            Serial.println(sensorValues);

            // POST data to server
            http.begin(client, serverName);
            http.addHeader("Content-Type", "application/x-www-form-urlencoded");
            int httpResponseCode = http.POST(sensorValues);
            Serial.print("HTTP Response code: ");
            Serial.println(httpResponseCode);

            // Free resources
            http.end();
        }
        else
        {
            Serial.println("WiFi Disconnected");
        }
        lastTime = millis();
    }
}
