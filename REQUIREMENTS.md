# Requirements

Everything needed to run the Token Management System — a full-stack, real-time queue
management app with an IoT seat sensor. This is a **Node.js / JavaScript** project, so
runtime dependencies are managed by npm (`package.json` + `package-lock.json`), not by a
Python-style `requirements.txt`. This document lists everything, including the tools npm
does not install for you (MongoDB, Mosquitto, the Arduino toolchain).

---

## 1. System prerequisites (install these yourself)

| Tool | Version used / recommended | Purpose | Where to get it |
|------|----------------------------|---------|-----------------|
| Node.js | v24.19.0 (any current LTS works) | Runs the backend and builds the frontend | https://nodejs.org |
| npm | 11.17.0 (ships with Node) | Installs JS dependencies | bundled with Node |
| MongoDB | 6.x or later | Database (customers, tokens, counters, services, staff) | https://www.mongodb.com/try/download/community |
| Mosquitto | 2.x | MQTT broker — the message bus between sensor, backend, and browser | https://mosquitto.org/download/ |
| Arduino IDE | 2.x | Flashes the sonar sketch onto the Arduino Uno | https://www.arduino.cc/en/software |

Hardware for the IoT feature: **Arduino Uno**, an **HC-SR04 ultrasonic (sonar) sensor**,
jumper wires, and a USB cable to connect the Uno to the machine running the backend.

---

## 2. Backend dependencies (`token-management-backend`)

Installed automatically with `npm install` in that folder. Listed here for reference.

### Runtime dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| express | ^5.2.1 | HTTP server and REST routing |
| mongoose | ^9.9.2 | MongoDB object modeling |
| socket.io | ^4.8.3 | Pushes live events to the browser |
| mqtt | ^5.15.2 | Connects to the Mosquitto broker |
| serialport | ^13.0.0 | Reads the Arduino over USB serial |
| @serialport/parser-readline | ^13.0.0 | Splits serial input into lines |
| cors | ^2.8.6 | Allows the frontend origin to call the API |
| dotenv | ^17.4.2 | Loads environment variables from `.env` |
| jsonwebtoken | ^9.0.3 | Staff auth tokens (JWT) |
| bcryptjs | ^3.0.3 | Password hashing for staff accounts |
| axios | ^1.19.0 | HTTP client (used by `test-flow.js`) |

### Dev dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| nodemon | ^3.1.14 | Auto-restarts the server on file changes |

> Note: `serialport` includes a native binding (`@serialport/bindings-cpp`) whose install
> script is pre-approved in `package.json` under `allowScripts`. If a fresh `npm install`
> ever prompts about install scripts, run `npm approve-scripts "@serialport/bindings-cpp"`.

---

## 3. Frontend dependencies (`token-management-frontend`)

Installed automatically with `npm install` in that folder.

### Runtime dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.8 | UI library |
| react-dom | ^19.2.8 | React DOM renderer |
| react-router-dom | ^7.18.2 | Client-side routing between the views |
| axios | ^1.19.0 | Calls the backend REST API |
| socket.io-client | ^4.8.3 | Receives live queue/seat updates |
| tailwindcss | ^4.3.3 | Styling |
| @tailwindcss/vite | ^4.3.3 | Tailwind integration for Vite |

### Dev dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| vite | ^8.2.0 | Dev server and production build |
| @vitejs/plugin-react | ^6.0.4 | React support in Vite |
| eslint + plugins | ^10.x | Linting |
| @types/react, @types/react-dom | ^19.x | Type definitions for editor support |
| globals | ^17.7.0 | ESLint global definitions |

---

## 4. Environment variables

The backend reads these from `token-management-backend/.env` (see `.env.example`):

| Variable | Example | Purpose |
|----------|---------|---------|
| PORT | 5000 | Backend HTTP port |
| MONGO_URI | mongodb://localhost:27017/token_management | MongoDB connection string |
| JWT_SECRET | (long random string) | Signs staff login tokens |
| MQTT_BROKER_URL | mqtt://localhost:1883 | Mosquitto broker address (backend + sensor must match) |
| SERIAL_PORT | COM3 | COM port the Arduino Uno enumerates as (Windows Device Manager > Ports) |
| SERIAL_BAUD | 9600 | Serial speed — must match `Serial.begin()` in the sketch |
| SEAT_COUNTER_NUMBER | 1 | Which counter the physical seat sensor represents |

---

## 5. Setup and run

```bash
# 1. Backend
cd token-management-backend
npm install
# create .env from .env.example and fill in values
npm run dev          # starts on http://localhost:5000

# 2. Frontend (in a second terminal)
cd token-management-frontend
npm install
npm run dev          # Vite dev server, usually http://localhost:5173
```

Also make sure these are running/done:
- **MongoDB** service is up.
- **Mosquitto** broker is running (Windows: `net start mosquitto`).
- The **Arduino sketch** at `token-management-backend/arduino/seat_sensor/seat_sensor.ino`
  is flashed to the Uno, the Uno is plugged in, and the Arduino IDE Serial Monitor is
  **closed** (only one program can hold the COM port at a time).

---

## 6. Arduino sketch

- Source: `token-management-backend/arduino/seat_sensor/seat_sensor.ino`
- Uses only built-in Arduino core functions (`pinMode`, `digitalWrite`, `pulseIn`,
  `Serial`) — **no external libraries to install**. If the Arduino IDE reports a failed
  download of `Firmata` or `Arduino_BuiltIn`, it is unrelated to this sketch and can be
  ignored.
- Wiring: pin 10 → TRIG, pin 11 → ECHO, pin 4 → LED indicator.
