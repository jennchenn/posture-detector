const String ssid = "****";
const String password = "****";

const float INPUT_VOLTAGE = 5.0;
const int NUM_PINS = 7;
const byte ANALOG_PINS[] = {A0, A1, A2, A3, A4, A5, A6, A7};
String data;

const String server = "seat-posture-detector.herokuapp.com";
const String uri = "/pressure";

void setup()
{
  Serial.begin(9600);
  Serial3.begin(9600);
  //  reset();
  boolean isConnected = connectWifi();
  while (!isConnected) {
    isConnected = connectWifi();
    delay(1000);
  }
}

// reset the esp8266 module
void reset()
{
  Serial3.println("AT+RST");
  delay(1000);
  if (Serial3.find("OK"))
    Serial.println("Module Reset");
}

// connect to your wifi network
boolean connectWifi()
{
  Serial.println("Initializing...");
  String cmd = "AT+CWJAP=\"";
  cmd += ssid;
  cmd += "\",\"";
  cmd += password;
  cmd += "\"";
  Serial3.println(cmd);
  delay(1000);
  if (Serial3.find("OK") || Serial3.find("WIFI CONNECTED"))
  {
    Serial.println("WiFi connected");
    return true;
  }
  else
  {
    Serial.println("WiFi Not connected");
    return false;
  }
}

void loop()
{
  int value;
  float volt;
  data = "";

  for (int i = 0; i < NUM_PINS; i++)
  {
    value = analogRead(ANALOG_PINS[i]);
    volt = value * INPUT_VOLTAGE / 1023.0;
    data = data + i + "=" + String(volt, 6);
    if (i != NUM_PINS - 1) // check if there are more values to append
    {
      data += "&";
    }
  }
  httppost();

  //  if ( Serial3.available() ) {
  //    Serial.write( Serial3.read() );
  //  }
  //  // listen for user input and send it to the ESP8266
  //  if ( Serial.available() ) {
  //    Serial3.write( Serial.read() );
  //  }

  delay(1000);
}

void httppost()
{
  Serial3.println("AT+CIPSTART=\"TCP\",\"" + server + "\",80"); // start a TCP connection.
  if (Serial3.find("OK"))
  {
    Serial.println("TCP connection ready");
  }
  delay(1000);

  String postRequest =
      "POST " + uri + "?" + data + " HTTP/1.1\r\n" +
      "Host: " + server + "\r\n" +
      "Accept: *" + "/" + "*\r\n" +
      "Content-Type: application/x-www-form-urlencoded\r\n" +
      "\r\n";
  //      "Content-Length: " + data.length() + "\r\n" +
  //      "\r\n" + data + "\r\n\r\n";
  Serial.println(postRequest);
  //  String postRequest =
  //    "GET " + uri + " HTTP/1.1\r\n" +
  //    "Host: " + server + "\r\n\r\n";

  String sendCmd = "AT+CIPSEND="; // determine the number of characters to be sent.
  Serial3.print(sendCmd);
  Serial3.println(postRequest.length());
  delay(500);

  if (Serial3.find(">"))
  {
    Serial.println("Sending..");
    Serial3.print(postRequest);
    while (!Serial3.find("SEND OK")) {
      delay(1000);
    }
    if (Serial3.find("SEND OK"))
    {
      Serial.println("Packet sent");
      Serial.println(Serial3.readString());
      delay(1000);
      Serial.println(Serial3.readString());
      Serial.println(Serial3.readString());
      Serial.println(Serial3.readString());
      Serial.println(Serial3.readString());
      while (Serial3.available())
      {
        String tmpResp = Serial3.readString();
        Serial.println(tmpResp);
      }
      // close the connection
      Serial3.println("AT+CIPCLOSE");
    }
  }
}
