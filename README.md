# TubeNotes AI — Chrome Extension UI

A Manifest V3 popup UI for a YouTube notes / summary extension. The front end detects a YouTube video ID and sends the selected options to your API.

## Files
- `manifest.json` — Chrome extension configuration
- `popup.html` — popup structure
- `styles.css` — styling
- `popup.js` — video detection, UI state, and API request placeholder

## Load in Chrome
1. Extract this folder.
2. Open `chrome://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select this folder.
5. Open a YouTube video and click the extension icon.

## Important
- This is the front-end starter, not a working notes-generation backend.
- The endpoint is currently `http://localhost:8000/api/notes`; update it to match your FastAPI route.
- If your API is hosted on another origin, configure CORS on the backend as appropriate.
- YouTube video IDs and page titles are detected locally. This UI does not extract the transcript itself; your backend needs to retrieve/process transcript data or accept transcript text.
- For production, use HTTPS and avoid exposing API secrets in extension JavaScript.
