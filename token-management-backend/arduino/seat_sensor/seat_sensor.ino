/*
 * Seat Sensor for Token Management System
 * -----------------------------------------
 * Ultrasonic (sonar) sensor detects whether a customer is sitting at the seat.
 * Emits ONE line over serial each time the state changes:
 *     SEAT_EMPTY     -> customer left, seat is now free
 *     SEAT_OCCUPIED  -> a customer is now sitting
 *
 * The Node backend's serialBridge.js reads these lines and publishes them to
 * MQTT (topic: seat/status). When the seat goes empty, the backend auto-completes
 * the current token and auto-calls the next customer to this counter.
 *
 * Wiring (unchanged from your original):
 *   Pin 10 -> TRIG
 *   Pin 11 -> ECHO
 *   Pin 4  -> LED indicator (HIGH when seat empty)
 */

const int TRIG = 10;
const int ECHO = 11;
const int LED  = 4;

// Distance >= this many inches means "no one sitting" (tune to your seat geometry)
const long EMPTY_THRESHOLD_IN = 4;

// How many consecutive agreeing readings before we trust a state change (debounce).
// At ~100ms/loop, 5 reads = ~0.5s of stability required. Prevents false triggers
// from someone leaning or a hand passing in front of the sensor.
const int STABLE_COUNT = 5;

bool seatEmpty = true;  // committed state
int  agree = 0;         // consecutive readings that disagree with committed state

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

  // t == 0 means timeout (no echo) -> treat as far away -> empty
  bool readingEmpty = (t == 0) || (inches >= EMPTY_THRESHOLD_IN);

  // Debounce: only flip committed state after STABLE_COUNT consistent disagreeing reads
  if (readingEmpty != seatEmpty) {
    agree++;
    if (agree >= STABLE_COUNT) {
      seatEmpty = readingEmpty;
      agree = 0;
      Serial.println(seatEmpty ? "SEAT_EMPTY" : "SEAT_OCCUPIED"); // one clean event
    }
  } else {
    agree = 0;
  }

  digitalWrite(LED, seatEmpty ? HIGH : LOW);
  delay(100);
}
