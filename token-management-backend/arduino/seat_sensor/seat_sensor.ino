/*
 * Entrance People Counter for Token Management System
 * -----------------------------------------------------
 * Ultrasonic (sonar) sensor is mounted at the entrance. Each time a person
 * walks into its detection range, ONE line is sent over serial:
 *     PERSON_IN
 *
 * The Node backend's serialBridge.js reads this line and publishes an IN event
 * to MQTT (topic: crowd/event). The OUT events come from the backend itself when
 * a token is completed. Crowd level is derived from (IN - OUT):
 *     0-3 LOW, 4-6 MEDIUM, 7+ HIGH
 *
 * Wiring (unchanged):
 *   Pin 10 -> TRIG
 *   Pin 11 -> ECHO
 *   Pin 4  -> LED indicator (HIGH while a person is in front of the sensor)
 */

const int TRIG = 10;
const int ECHO = 11;
const int LED  = 4;

// A reading closer than this many inches counts as "a person is in the doorway".
// Tune to your entrance width (aim the sensor across the doorway).
const long DETECT_THRESHOLD_IN = 40;

// Consecutive agreeing readings before we trust a change (debounce, ~100ms per loop).
// DETECT_COUNT: person must be seen this long to count as IN (filters hands/noise).
// CLEAR_COUNT:  doorway must be clear this long before the next person can count.
const int DETECT_COUNT = 3;
const int CLEAR_COUNT  = 5;

bool personPresent = false; // committed state: someone currently in front of the sensor
int  agree = 0;             // consecutive readings that disagree with committed state

void setup() {
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(LED, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  // Trigger the sonar pulse
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  // 30ms timeout so pulseIn never blocks forever if there's no echo
  long t = pulseIn(ECHO, HIGH, 30000);
  long inches = t / 74 / 2;

  // t == 0 means timeout (no echo) -> nothing nearby -> clear
  bool readingPresent = (t != 0) && (inches < DETECT_THRESHOLD_IN);

  // Debounce: flip committed state only after enough consistent disagreeing reads
  if (readingPresent != personPresent) {
    agree++;
    int needed = readingPresent ? DETECT_COUNT : CLEAR_COUNT;
    if (agree >= needed) {
      personPresent = readingPresent;
      agree = 0;
      if (personPresent) {
        Serial.println("PERSON_IN"); // one event per person entering
      }
    }
  } else {
    agree = 0;
  }

  digitalWrite(LED, personPresent ? HIGH : LOW);
  delay(100);
}
