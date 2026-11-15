# ✈️ AeroSketch: Build & Control

**A kid-friendly cartoon airport builder & ATC (Air Traffic Control) simulator.**
Designed with bold, chunky retro-arcade UI, tap-to-drive aircraft paths, magnetic heading runway auto-calculations, freehand magic building pen, gamified safety lives, and Google Gemini Vision AI blueprint scanning.

[![GitHub Repo](https://img.shields.io/badge/GitHub-takpham%2Faerosketch-blue?logo=github)](https://github.com/takpham/aerosketch)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🎮 Features

### 🛬 1. Interactive Airport Simulation (Fly Mode)
- **Tap-to-Drive Pathfinding**: Tap any airplane on runways or taxiways, then tap a glowing **P** parking stand — the pilot navigates taxi intersections with realistic nosewheel steering.
- **Runway Collisions & Lives**: If a plane touches down while another plane is still occupying the runway, an explosion animation triggers and you lose ❤️ hearts. Keep the runways clear!
- **Airplane Hangar**: Collect and inspect 12 cartoon aircraft (Airbus A320, A350, A380, BelugaXL, Concorde; Boeing 737, 747, 777X, 787; C-17 Globemaster, Cessna 172, Antonov An-225).

### 🛠️ 2. Kid-Friendly Airport Architect (Build Mode)
- **Smart Runway Heading Calculation**: Drag a line across the grass and magnetic compass headings (e.g. `18L/36R`, `09/27`) are calculated automatically.
- **Snapping Taxi Roads**: Draw connecting taxiways that snap to runways, high-speed turnoffs, and parking gates.
- **Magic Pen (Freehand Polygons)**: Draw custom terminal shapes with your finger or mouse; jetbridges automatically snap along outer walls.
- **Airport Stamp Library**: Modular stamps including 6-star terminal hubs, square domes, midfield concourses, satellite piers, control towers, helipads, and taxiway guidance signs.
- **Save & Load Blueprints**: Export your airport designs to `.json` files to save or share with friends.

### 🤖 3. AI Auto-Build from Hand-Drawn Sketches
- Upload or trace over real paper sketches using Google Gemini Vision AI (`gemini-3.8-flash`).
- Gemini scans runways, calculates angles, detects terminal concourses, and converts the pencil drawing into a playable vector cartoon airport.

---

## 🚀 Running Locally

No npm or node build steps required — pure modern HTML5, Canvas, and vanilla JavaScript:

```bash
# Clone the repository
git clone https://github.com/takpham/aerosketch.git
cd aerosketch

# Run any local HTTP server (e.g. Python)
python3 server.py
# or: python3 -m http.server 8765
```

Open [http://localhost:8765](http://localhost:8765) in your web browser.

---

## ☁️ Deployment

Deploy directly to **Vercel** with 1 click:
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/takpham/aerosketch)

---

## 📄 License
MIT © takpham
