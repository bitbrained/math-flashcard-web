# Math Fun Cards

Single-page preschool math flashcard web app optimized for touch and iOS Home Screen install.

## Features
- Large, touch-first answer buttons.
- Preschool-friendly addition/subtraction in 0-10 range.
- Positive feedback with optional speech output.
- Streak + best score tracking with local storage.
- Offline support via service worker cache.
- Web app manifest + iOS meta tags for Home Screen install.

## Run locally
Because this uses a service worker, run it from a local web server (not `file://`).

Example options:
- `npx serve .`
- `python -m http.server 8080`

Then open the shown URL on your iPhone in Safari.

## Run with Docker
Build and run with Docker Compose:
- `docker compose up --build`

Then open:
- `http://localhost:8080`
- `http://<your-mac-lan-ip>:8080` from your iPhone on the same Wi-Fi network

Stop:
- `docker compose down`

## Sideload on iOS (Home Screen)
1. Open the app URL in Safari on iPhone.
2. Tap Share.
3. Tap Add to Home Screen.
4. Launch from the new Home Screen icon.

The app should open in standalone mode and keep working offline after the first load.
