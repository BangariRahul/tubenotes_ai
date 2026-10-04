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

## Connect your backend
In `popup.js`, change `API_URL` to your endpoint. The current request sends JSON shaped like:

```json
{
  "video_id": "YouTube video ID",
  "video_url": "Full URL",
  "video_title": "Tab title",
  "note_type": "summary",
  "language": "English",
  "detail_level": "balanced",
  "extra_instructions": ""
}
```

Suggested note types: `summary`, `study`, `detailed`, `flashcards`, `action`, `transcript`.

The example expects either:
- a direct `application/pdf` response, or
- JSON with `pdf_url` (opens it in a new tab), or `download_url` (download support may require adding the `downloads` permission).

For a JSON response containing generated note text, add a preview/result panel and render the text safely with `textContent`.

## Important
- This is the front-end starter, not a working notes-generation backend.
- The endpoint is currently `http://localhost:8000/api/notes`; update it to match your FastAPI route.
- If your API is hosted on another origin, configure CORS on the backend as appropriate.
- YouTube video IDs and page titles are detected locally. This UI does not extract the transcript itself; your backend needs to retrieve/process transcript data or accept transcript text.
- For production, use HTTPS and avoid exposing API secrets in extension JavaScript.
