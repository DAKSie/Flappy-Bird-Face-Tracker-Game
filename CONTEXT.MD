# Flappy Bird: Desktop to Web Migration Guide

## Project Overview

**Current Desktop Implementation (C++17/SDL3/OpenCV)**

This is a **head-tracking Flappy Bird game** that uses computer vision to detect player head position and trigger jumps when the head crosses a vertical threshold zone. Players are ranked on a persistent scoreboard tracked per player profile.

### Core Features
- **Head Tracking**: Captures webcam feed, detects face using Haar cascade classifiers, tracks centroid with exponential smoothing
- **Zone-based Jump Trigger**: Jump detected when head centroid enters/exits a configurable Y-axis zone (120-240px from top)
- **Game Physics**: Fixed timestep physics (gravity, jump impulse), adjustable per difficulty level
- **Difficulty Scaling**: 3+ difficulty tiers with tuned parameters (gravity, jump force, gap size, scroll speed)
- **Refresh Rate Scaling**: Supports 60/144/240 Hz monitors with physics adjusted per target frame rate
- **Scoreboard System**: Per-player score persistence via Firebase Realtime Database
- **Obstacle Generation**: Procedural pipe generation with random gaps and variable spacing
- **UI/Rendering**: Simple character rendering (pixel art), game state display, restart countdown

### Performance Characteristics
- **Real-time Constraints**: Fixed-timestep 60 Hz physics loop, camera feed at display refresh rate
- **Computer Vision**: Face detection every frame with exponential smoothing for jitter reduction
- **Memory Footprint**: Minimal—runs entirely in browser
- **Camera Access**: Browser MediaDevices API with device selection
- **Latency-Sensitive**: Frame-to-jump latency critical for playability (currently <33ms target at 60 Hz)

---

## Architecture Breakdown

### Subsystem Organization

```
flappy-bird-web/
├── src/
│   ├── App.jsx                         # Main React app
│   ├── components/
│   │   ├── GameCanvas.jsx              # Canvas rendering
│   │   ├── Scoreboard.jsx              # UI display
│   │   ├── CameraPreview.jsx           # Video stream
│   │   └── Menu.jsx                    # Start screen
│   ├── hooks/
│   │   ├── useGameLoop.js              # Fixed timestep logic
│   │   ├── useCameraStream.js          # Camera access
│   │   └── useVisionWorker.js          # Face detection worker
│   ├── context/
│   │   └── GameContext.jsx             # Player profile, scores
│   ├── workers/
│   │   └── visionWorker.js             # TF.js face detection
│   ├── firebase/
│   │   └── config.js                   # Firebase initialization & exports
│   ├── utils/
│   │   ├── physics.js                  # Copy physics math from C++
│   │   └── scoreboard.js               # Firebase DB operations
│   ├── styles/
│   │   └── Game.css
│   └── main.jsx
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

### Key Design Patterns

1. **Fixed Timestep Loop**
   - Accumulator pattern: accumulates frame deltas, runs physics at fixed 60 Hz internal rate
   - Physics scaled by `hzScale()` for monitor refresh rate
   - Rendering runs at display refresh rate independently

2. **Zone-Based Jump Detection**
   - Configurable Y-axis trigger zone (ZONE_START_Y, ZONE_END_Y)
   - Debounced via state tracking (wasCentroidInZone_)
   - Jump queued when centroid crosses zone boundary, consumed by Game::fixedUpdate()

3. **Centroid Smoothing**
   - Exponential moving average: `smoothed = smoothed * (1 - α) + raw * α`
   - `centroidSmoothingAlpha_` tuned to reduce jitter without lag

4. **Difficulty Scaling**
   - Base values defined in Settings
   - DifficultyValues struct scales all physics parameters by difficulty multiplier
   - Applied per-frame in fixedUpdate()

5. **Async Event Handling**
   - Vision processing offloaded to Web Worker
   - Firebase operations use async/await pattern

---

## Firebase Integration

### Firebase Configuration
```javascript
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, child } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDAtvlMRa3Lsv7DkRGO1HXZqIaGTie19lI",
  authDomain: "testesp8266wifi-28951.firebaseapp.com",
  databaseURL: "https://testesp8266wifi-28951-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "testesp8266wifi-28951",
  storageBucket: "testesp8266wifi-28951.firebasestorage.app",
  messagingSenderId: "824733867748",
  appId: "1:824733867748:web:ec65ee320934294a6556f1"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, set, get, child };
```

### Database Operations
```javascript
import { db, ref, set, get, child } from '../firebase/config';

export const savePlayerScore = async (playerName, score) => {
  const scoreRef = ref(db, `scores/${playerName}`);
  const snapshot = await get(scoreRef);
  const currentBest = snapshot.exists() ? snapshot.val().bestScore : 0;
  if (score > currentBest) {
    await set(scoreRef, { playerName, bestScore: score, updatedAt: Date.now() });
  }
};

export const getLeaderboard = async (limit = 10) => {
  const dbRef = ref(db);
  const snapshot = await get(child(dbRef, 'scores'));
  if (snapshot.exists()) {
    const scores = Object.values(snapshot.val());
    return scores.sort((a, b) => b.bestScore - a.bestScore).slice(0, limit);
  }
  return [];
};
```

---

## Color Scheme
All UI elements must use this palette:
- **Primary Dark**: `#5E0006` (Backgrounds, headers)
- **Primary Red**: `#9B0F06` (Buttons, accents)
- **Secondary Orange**: `#D53E0F` (Highlights, warnings)
- **Light Cream**: `#EED9B9` (Text, borders, backgrounds)

---

## Critical Performance Notes

### Latency Budget (60 Hz = 16.67 ms per frame)
- **Camera capture**: <2 ms (browser native)
- **Face detection**: 30–50 ms per frame (offloaded to worker)
- **Physics update**: <1 ms (simple math)
- **Rendering**: <10 ms (Canvas 2D)
- **Total**: Target <13 ms to leave 3 ms headroom

### Vision Pipeline Bottlenecks
- **TensorFlow.js Detection**: Offloaded to Web Worker (non-blocking)
- **Frame Batching**: Skip frames if worker busy to maintain responsiveness
- **Centroid Smoothing**: Single moving average per frame—negligible cost

### Render Refresh Coordination
- Uses `requestAnimationFrame` to sync to monitor refresh rate
- Physics internally runs at 60 Hz regardless of refresh rate
- Physics `dt` scaled by `hzScale()` = `targetHz / 60.0`

---

## Web Version: Tech Stack

### Frontend
- **Framework**: React 18+ (Hooks + Context)
- **Build Tool**: Vite
- **Rendering**: Canvas 2D
- **Vision**: TensorFlow.js v4 + tfjs-coco-ssd model (WASM acceleration)
- **Database**: Firebase Realtime Database
- **State**: React Context API + localStorage
- **HTTP Client**: Fetch API

### Development Tools
- **Linting**: ESLint
- **Testing**: Vitest
- **Type Safety**: TypeScript (optional)

---

## Implementation Notes for Porting

### Physics Engine (1:1 Porting)
```javascript
bird.velocity += gravity * dt;
bird.position += bird.velocity * dt;

if (jumpQueued) {
    bird.velocity = -jumpImpulse;
    jumpQueued = false;
}
```

### Face Detection → Centroid (Web Worker)
```javascript
const detections = await model.estimateFaces(imageData);
const centroid = {
    x: detections[0].start[0] + detections[0].size[0] / 2,
    y: detections[0].start[1] + detections[0].size[1] / 2
};
```

### Zone Crossing Detection
```javascript
const IN_ZONE = (y) => y >= ZONE_START && y <= ZONE_END;
const wasInZone = ...; // prev state
const isInZone = IN_ZONE(centroidY);
if (wasInZone !== isInZone && ZONE_TOGGLE) {
    jumpQueued = true;
}
```

---

## Deployment Strategy

### Development
- **Frontend**: `npm run dev` (Vite hot-reload)
- **Testing**: Play locally at `http://localhost:5173`

### Production
- **Build**: `npm run build`
- **Deploy**: Vercel/Netlify (static hosting)
- **Database**: Firebase Realtime Database (already configured, no backend needed)

---

## Performance Targets

| Metric | Desktop (C++) | Web Target | Acceptance |
|--------|---|---|---|
| Frame latency (60 Hz) | <16.67 ms | <16.67 ms | ✓ |
| Face detection | 3–5 ms | 30–50 ms | ✓ (offloaded) |
| Frame-to-jump latency | <33 ms | <50 ms | ✓ |
| Startup time | <1 s | <3 s | ✓ |
| Memory footprint | ~50 MB | <30 MB | ✓ |