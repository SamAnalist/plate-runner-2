# Plate Runner — Camera Calibration Guide

Version: 0.2 | Date: 2025-07-03

This guide explains how to calibrate the simulation for reliable license plate
reading by an external camera.

---

## Overview

The external camera must be able to:
1. See the simulation on the monitor.
2. Focus on a specific zone where the plate appears.
3. Read the plate text reliably at the reading position.

Plate Runner provides a **Camera Focus Zone** and a **Calibration Mode** to
make this setup reproducible.

---

## 1. Physical Setup

### Monitor placement
- Use a monitor with good brightness and contrast (avoid glossy screens in bright environments).
- Set the monitor to its native resolution and disable any scaling.
- Tilt the monitor slightly away from overhead lights to reduce glare.

### Camera placement
The camera should be positioned to match the **Detector Placement** setting:

| Detector Placement | Camera position |
|---|---|
| `center_front` | Directly in front of the monitor, centered horizontally |
| `driver_front` | Slightly to the left of center |
| `passenger_front` | Slightly to the right of center |
| `center_back` | Camera behind the simulated vehicle path (rare) |
| `driver_back` | Left-rear angle |
| `passenger_back` | Right-rear angle |

### Camera angle
- The camera should be at approximately monitor height, aimed at the focus zone.
- Avoid extreme top-down or bottom-up angles.
- Distance: position the camera so the **focus zone** fills a significant
  portion of the camera frame. The plate should be large enough for the
  OCR / detection algorithm to read.

---

## 2. Opening Plate Runner

```bash
cd /path/to/plate-runner
pnpm dev          # → http://localhost:5173
```

Open in a full-screen browser window on the target monitor.

---

## 3. Entering Calibration Mode

1. In the right sidebar, scroll to **Calibration Mode** section.
2. Click **Enter Calibration**.
3. The vehicle freezes at the reading position (t≈0.46 for incoming).
4. The focus zone overlay appears automatically.

The header shows a live readability badge: **● GOOD** / **◐ PARTIAL** / **○ POOR**.

---

## 4. Adjusting the Focus Zone

The focus zone represents the area where the camera is focused.

### Using the controls

1. Open **Camera Focus Zone** section in the sidebar.
2. Adjust **X position** and **Y position** sliders to move the zone.
3. Adjust **Width** and **Height** to match your camera's field of view.
4. Watch the **readability badge** in the header: aim for **● GOOD**.

### Interpretation
- **Corner brackets** = zone boundaries.
- **IN ZONE 82%** badge = 82% of the plate is inside the zone.
- **readability: good** = ≥75% overlap — reliable plate reading expected.
- **partial** = 25–74% — marginal; adjust zone or camera angle.
- **poor** = <25% — plate likely not readable; reposition camera or adjust zone.

### Typical default values

```
xPercent:      33
yPercent:      47
widthPercent:  34
heightPercent: 24
```

These defaults capture the plate for all 6 detector placements at both directions.
Click **Reset to default position** to return to these values.

---

## 5. Testing Plate Legibility

### Short plate
1. In Calibration Mode, click **Short (ABC123)**.
2. Verify the plate is readable in the camera image.
3. Check that the text fits within the plate rectangle (it always should — enforced by the renderer).

### 12-character plate (stress test)
1. Click **12-char (ABCDEFGHIJ12)**.
2. Verify all 12 characters are legible.
3. Expected: font is smaller but still readable at reading position.
4. If the plate is too small, move the camera closer or expand the focus zone height.

### Single character (edge case)
1. Click **Single char (A)**.
2. Expected: single character is large and very legible.

---

## 6. Testing Direction + Detector Placement Combinations

For each combination you plan to use in production, repeat the following:

1. Set **Direction** and **Detector Placement** in the sidebar.
2. Calibration mode will re-center at the appropriate reading T.
3. Enable **Debug: ON** to see exact plate coordinates.
4. Verify readability badge shows **● GOOD**.

**Priority combinations for typical parking gate setups:**
- `incoming` + `center_front` → front plate, car approaching
- `incoming` + `center_back`  → rear plate, car approaching (camera behind)
- `away`     + `center_back`  → rear plate, car departing

---

## 7. Using Camera Mode for Live Testing

Once calibrated, switch to **Camera Mode** for a clean image:

1. Click **◉ Camera Mode** in the sidebar (or in View Modes).
2. All UI elements are hidden except the focus zone (if `showOverlay` is on).
3. The camera sees a clean simulation with no debug panels.
4. Press **Esc** or the small **EXIT** button to return.

### Tip: disable focus zone for production
Once the camera angle is locked, disable the overlay so the camera sees only the road and vehicle:
- In Camera Focus Zone section → toggle **Show overlay** off.
- The readability check still runs in the background (shown in Debug panel).

---

## 8. Using Fullscreen Scene

**Fullscreen Scene** expands the simulation to fill the viewport while keeping the status badge:

1. Click **⛶ Fullscreen Scene** or use the sidebar button.
2. A small status panel appears at bottom-right (plate, phase, connection mode).
3. Press **Esc** to exit.

Use Fullscreen Scene when:
- You want to see the simulation at maximum size for visual inspection.
- You are presenting the simulation but still need UI access (use Camera Mode if you don't).

---

## 9. Enabling wait_for_signal Mode for Camera Testing

For reliable plate reading with a real camera:

1. Set **Gate Mode** → **Wait Signal**.
2. Click **Start**.
3. The vehicle approaches and stops at the reading position.
4. The plate is held steady indefinitely.
5. Take your camera reading, then click **Open Gate** to continue.
6. The vehicle exits and the sequence ends.

This mode is designed for:
- Testing your detection algorithm at a stable position.
- Simulating real gate behavior where a signal (API call, button) releases the vehicle.

---

## 10. Debug Overlay Reference

Enable via **Debug: ON** in View Modes.

| Field | Description |
|---|---|
| phase | Current simulation phase |
| t | Vehicle depth (0=far, 1=near) |
| dir | Direction (incoming/away) |
| detector | Detector placement |
| gate mode | Current gate mode |
| gate | Open / Closed |
| focus zone | Enabled / disabled |
| zone | Zone position and size in % |
| plate in zone | YES / NO |
| overlap | Plate-to-zone overlap percentage |
| readability | good / partial / poor |

---

## 11. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Plate appears off-center in camera | Detector placement mismatch | Match `detectorPlacement` to actual camera position |
| Readability shows "partial" at reading position | Focus zone too small or misaligned | Adjust zone X/Y/W/H sliders |
| 12-char plate is hard to read | Camera too far | Move camera closer; or use fewer characters in production |
| Plate readable but wrong face shown | Direction/placement combo | Front plate: use `*_front`. Rear plate: use `*_back` |
| Vehicle doesn't stop for camera | Using `auto_open` mode | Switch to `wait_for_signal` |
| Focus zone overlay blocks plate | Zone is covering plate area | Adjust zone position; or toggle Show overlay off after calibration |
