# AeroSketch: Build & Control — Kid-Friendly Implementation Plan

A **colorful, cartoonish, and super intuitive** airport builder and airplane playground designed specifically for a **9-year-old**—bringing his three hand-drawn notebook airports to life without cluttered menus or complicated controls.

---

## 1. Kid-First UI Principles (Zero Clutter!)

1. **Full-Screen Cartoon Playground:**
   - The airport takes up **100% of the screen** with cheerful toy-box colors, chunky dark outlines, smooth animations, and cute top-down Airbus & Boeing planes.
   - **No sidebars, no tables, and no tiny buttons.**
2. **Top Floating Bar (Only 3 Simple Pill Controls):**
   - **🗺️ Airport Picker:** Switch between his 3 hand-drawn airports (**⭐ Ca Mau Star Airport**, **⚡ Super-Fast Airport**, **🏙️ Twin-Dome Mega Hub**) or start a **➕ Blank Airport**.
   - **🛫 Fly Planes! / ✏️ Build Switch:** One big toggle at the top center.
   - **☀️/🌙 Day/Night + ✈️ My Planes Book:** One button to flip between Sunny Day and glowing Night Lights, plus a button to open his cartoon **Airbus & Boeing Sticker Book**.
3. **Friendly Pilot Speech Bubble:**
   - Instead of complicated ATC radio logs, a cheerful pilot character pops up at the top with fun one-line messages (*"Touchdown! Tap a gate so we can park our A380!"*).
4. **Clean Bottom Toy Dock:**
   - **In 🛫 Fly Planes! Mode (Just 2 Big Buttons + Tap-to-Drive):**
     - **🛬 Land New Plane!** — Lands a new Airbus or Boeing jet on the runway.
     - **🚀 Take Off!** — Sends the selected plane zooming down the runway into the sky.
     - **Tap or Drag on the Map** — Tap any gate, taxi road, or runway and the plane drives there along a glowing dotted line!
   - **In ✏️ Build Mode (5 Chunky Mario-Maker Style Stamp Buttons):**
     - **🛫 Runway** — Drag to draw a runway with automatic numbers (`18L/36R`) and yellow chevron arrows (`>>>`).
     - **🛣️ Taxi Road** — Draw yellow-striped taxi roads and fast diagonal exits.
     - **🏢 Dome & Terminals** — Stamp star terminals, glass grid domes (`T1`, `T3`), jetbridges, Cargo zones, or Helipads (`H`).
     - **🪧 Signs** — Stamp big colorful airport signs (`[A]`, `[← B →]`, `[STOP 18L]`) and a Compass Rose.
     - **📷 My Drawing** — Toggle his real notebook drawing photo underneath the canvas to trace right over his pencil lines!

---

## 2. Pre-Loaded Airports from His 3 Notebook Drawings

All 3 converted PNG drawings ([IMG_0412.png](file:///Users/andypham/Antigravity/AirportBuilder/sample-drawing/IMG_0412.png), [IMG_0414.png](file:///Users/andypham/Antigravity/AirportBuilder/sample-drawing/IMG_0414.png), [IMG_2958.png](file:///Users/andypham/Antigravity/AirportBuilder/sample-drawing/IMG_2958.png)) will be bundled as both **playable cartoon airports** and **one-click trace backgrounds**:

1. **⭐ Ca Mau Star Airport (`CA MAU XINJHEN`)** — Central **T1** 6-arm star terminal with the glass grid dome in the center, **T2**, parallel & crossing runways with `>>>` chevrons, turnaround loop, and compass rose.
2. **⚡ Super-Fast Airport (`One Airport That Is Efficient`)** — Dual parallel runways connected by super-fast diagonal exit roads, top terminal gates, bottom **CARGO** & **MILITARY** zones, control tower (`TWR`), and wind sock.
3. **🏙️ Twin-Dome Mega Hub (`T1 / T2 / T3 / T4`)** — Two giant rounded-square terminals (**T1** and **T3**) with glass grid domes, satellite concourses, central **T2A/T2B** island, helipads (`H`), and 4 parallel runways.

---

## 3. My Airplane Hangar (Cartoon Sticker Book)

A colorful popup card gallery featuring his favorite **Airbus** and **Boeing** jets with distinct top-down cartoon shapes, fun facts, and a one-click **"Fly This Plane!"** button:
- **Airbus Fleet:** `A380-800 Super Jumbo` (4 engines, double-decker), `A350-1000` (curved wingtips), `A340-600` (long 4-engine jet), `A330-900neo`, `A320neo`, `A220-300`.
- **Boeing Fleet:** `747-8 Jumbo` (4 engines, iconic upper hump), `777-9` (giant twin-engine), `787-9 Dreamliner`, `767-300ER`, `757-200`, `737 MAX 8`.

---

## 4. Planned File Structure

- `public/sample-drawings/` — `IMG_0412.png`, `IMG_0414.png`, `IMG_2958.png`
- `src/types/game.ts` — Simple data structures for Runways, TaxiRoads, Terminals/Domes, Gates, Signs, and Cartoon Planes.
- `src/data/planes.ts` — Kid-friendly Airbus & Boeing plane cards, colors, sizes, and top-down cartoon drawing shapes.
- `src/data/starterAirports.ts` — Playable cartoon versions of his 3 hand-drawn airports.
- `src/utils/sound.ts` — Fun, gentle Web Audio sound effects (landing chime, takeoff whoosh, stamp pop, radio beep).
- `src/components/AirportPlayground.tsx` — Full-screen interactive HTML5 Canvas with tap-to-drive planes, drag-to-build tools, Day/Night lights, and notebook trace overlay.
- `src/components/PlaneStickerBook.tsx` — Colorful popup modal to browse and spawn Airbus & Boeing jets.
- `src/App.tsx` — Clean floating top bar, pilot speech bubble, and bottom toy dock.
