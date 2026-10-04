const state = {
  videoId: null,
  videoUrl: null,
  videoTitle: null,
  type: "summary",
};

// Your FastAPI backend
const API_URL = "http://127.0.0.1:8000/api/notes";

const titleEl = document.getElementById("videoTitle");
const idEl = document.getElementById("videoId");
const messageEl = document.getElementById("message");
const generateBtn = document.getElementById("generateBtn");

function showMessage(text, kind = "info") {
  messageEl.textContent = text;
  messageEl.className = `message show ${kind}`;
}

function parseYouTubeVideoId(urlString) {
  try {
    const url = new URL(urlString);

    // youtu.be/VIDEO_ID
    if (url.hostname === "youtu.be") {
      return url.pathname.slice(1) || null;
    }

    // youtube.com URLs
    if (
      url.hostname === "youtube.com" ||
      url.hostname === "www.youtube.com" ||
      url.hostname.endsWith(".youtube.com")
    ) {
      // youtube.com/watch?v=VIDEO_ID
      if (url.pathname === "/watch") {
        return url.searchParams.get("v");
      }

      // youtube.com/shorts/VIDEO_ID
      // youtube.com/embed/VIDEO_ID
      // youtube.com/live/VIDEO_ID
      const parts = url.pathname.split("/").filter(Boolean);

      if (["shorts", "embed", "live"].includes(parts[0])) {
        return parts[1] || null;
      }
    }
  } catch (_) {
    // Invalid URL
  }

  return null;
}

async function loadCurrentVideo() {
  titleEl.textContent = "Detecting current tab…";
  idEl.textContent = "Video ID: —";

  state.videoId = null;
  state.videoUrl = null;
  state.videoTitle = null;

  try {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    const tab = tabs[0];

    if (!tab?.url) {
      throw new Error("Could not read the active tab.");
    }

    const videoId = parseYouTubeVideoId(tab.url);

    if (!videoId) {
      titleEl.textContent = "Open a YouTube video first";
      idEl.textContent = "Video ID: not found";
      return;
    }

    state.videoId = videoId;
    state.videoUrl = tab.url;
    state.videoTitle = tab.title || "YouTube video";

    titleEl.textContent = state.videoTitle.replace(/ - YouTube$/, "");
    idEl.textContent = `Video ID: ${videoId}`;

    showMessage("YouTube video detected.", "info");
  } catch (error) {
    console.error("Video detection error:", error);

    titleEl.textContent = "Unable to detect video";
    idEl.textContent =
      error.message || "Check extension permissions.";

    showMessage(
      "Could not detect the current YouTube video.",
      "error"
    );
  }
}

/*
 * Note type selection
 *
 * Backend supports:
 * summary
 * study
 * detailed
 * flashcards
 * action
 * transcript
 */
document.querySelectorAll(".option-card").forEach((button) => {
  button.addEventListener("click", () => {
    document
      .querySelectorAll(".option-card")
      .forEach((item) => item.classList.remove("selected"));

    button.classList.add("selected");

    state.type = button.dataset.type;

    console.log("Selected note type:", state.type);
  });
});

/*
 * The backend does NOT currently support:
 * - language
 * - detail_level
 *
 * So those controls are intentionally not sent to the API.
 *
 * If your UI still contains detail buttons, we can keep them visually
 * active, but they will not affect backend generation until the backend
 * is updated to support them.
 */
document.querySelectorAll("[data-detail]").forEach((button) => {
  button.addEventListener("click", () => {
    document
      .querySelectorAll("[data-detail]")
      .forEach((item) => item.classList.remove("active"));

    button.classList.add("active");
  });
});

/*
 * Refresh current YouTube video
 */
const refreshBtn = document.getElementById("refreshBtn");

if (refreshBtn) {
  refreshBtn.addEventListener("click", loadCurrentVideo);
}

/*
 * Generate notes
 */
generateBtn.addEventListener("click", async () => {
  if (!state.videoId) {
    showMessage(
      "Please open a YouTube video in the current tab, then refresh this panel.",
      "error"
    );
    return;
  }

  /*
   * IMPORTANT:
   * This payload now exactly matches the FastAPI NotesRequest schema.
   *
   * Backend expects:
   * {
   *   video_id: string,
   *   note_type: summary|study|detailed|flashcards|action|transcript,
   *   custom_instructions: string
   * }
   */

  const extraInstructionsEl =
    document.getElementById("extraInstructions");

  const payload = {
    video_id: state.videoId,
    note_type: state.type,
    custom_instructions: extraInstructionsEl
      ? extraInstructionsEl.value.trim()
      : "",
  };

  console.log("Sending request to TubeNotes API:", payload);

  generateBtn.disabled = true;

  const buttonText =
    generateBtn.querySelector("span:first-child");

  if (buttonText) {
    buttonText.textContent = "Generating notes…";
  }

  showMessage(
    "Fetching transcript and generating your notes. This may take a moment…",
    "info"
  );

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    /*
     * Backend returns JSON errors such as:
     *
     * {
     *   "detail": "..."
     * }
     *
     * So handle errors separately before reading the PDF blob.
     */
    if (!response.ok) {
      let errorMessage = `API returned ${response.status}`;

      try {
        const errorData = await response.json();

        if (errorData?.detail) {
          errorMessage = errorData.detail;
        }
      } catch (_) {
        // Response was not JSON
        try {
          const text = await response.text();

          if (text) {
            errorMessage = text.slice(0, 300);
          }
        } catch (_) {
          // Ignore
        }
      }

      throw new Error(errorMessage);
    }

    /*
     * FastAPI returns:
     *
     * Content-Type: application/pdf
     *
     * Read the response as a Blob.
     */
    const contentType =
      response.headers.get("content-type") || "";

    if (!contentType.toLowerCase().includes("application/pdf")) {
      throw new Error(
        `Unexpected response from backend: ${contentType || "unknown content type"}`
      );
    }

    const pdfBlob = await response.blob();

    if (!pdfBlob || pdfBlob.size === 0) {
      throw new Error("The backend returned an empty PDF.");
    }

    /*
     * Try to use the filename supplied by FastAPI.
     *
     * Backend sends:
     * Content-Disposition:
     * attachment; filename="youtube-summary-VIDEO_ID.pdf"
     */
    const contentDisposition =
      response.headers.get("content-disposition") || "";

    let filename = `youtube-${state.type}-${state.videoId}.pdf`;

    const filenameMatch =
      contentDisposition.match(
        /filename\*?=(?:UTF-8''|")?([^";]+)"?/i
      );

    if (filenameMatch?.[1]) {
      try {
        filename = decodeURIComponent(filenameMatch[1]);
      } catch (_) {
        filename = filenameMatch[1];
      }
    }

    /*
     * Create a temporary object URL and download the PDF.
     */
    const objectUrl = URL.createObjectURL(pdfBlob);

    const downloadLink = document.createElement("a");
    downloadLink.href = objectUrl;
    downloadLink.download = filename;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    /*
     * Give the browser a moment to start the download before
     * releasing the object URL.
     */
    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 1000);

    showMessage(
      "Your notes PDF has been generated and downloaded.",
      "success"
    );
  } catch (error) {
    console.error("TubeNotes API error:", error);

    let message = error?.message || "Unknown error";

    /*
     * More helpful message for local backend connection failures.
     */
    if (
      error instanceof TypeError &&
      message.toLowerCase().includes("fetch")
    ) {
      message =
        "Could not connect to the TubeNotes backend. Make sure FastAPI is running at http://127.0.0.1:8000.";
    }

    showMessage(
      `Could not generate notes: ${message}`,
      "error"
    );
  } finally {
    generateBtn.disabled = false;

    if (buttonText) {
      buttonText.textContent = "Generate my notes";
    }
  }
});

/*
 * Detect the YouTube video when the popup opens.
 */
loadCurrentVideo();

