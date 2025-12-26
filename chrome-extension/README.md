# Recap Chrome Extension

A Chrome extension for one-click saving and summarizing of web pages and YouTube videos.

## Features

- **YouTube Transcript Extraction**: Directly extracts transcripts from YouTube pages using the `ytInitialPlayerResponse` object, bypassing all server-side blocking
- **Web Page Content Extraction**: Extracts main content from articles and web pages
- **One-Click Save**: Save any page to your Recap library with a single click
- **Automatic Summarization**: Content is automatically summarized when saved

## Installation (Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select the `chrome-extension` folder
4. The extension icon should appear in your toolbar

## How It Works

### YouTube Videos
When on a YouTube video page, the extension:
1. Injects a content script that reads the `ytInitialPlayerResponse` object
2. Extracts caption track URLs from the player response
3. Fetches the transcript directly from YouTube's caption endpoint
4. Sends the transcript + metadata to your backend for summarization

This approach works 100% of the time because:
- It runs in the user's browser context (not a server)
- It uses the same requests YouTube's own transcript button uses
- No proxy or API key needed

### Web Pages
For regular web pages, the extension:
1. Identifies the main content area (article, main, etc.)
2. Extracts clean text content
3. Gets metadata (title, description, image, etc.)
4. Sends to backend for summarization

## Files

- `manifest.json` - Extension configuration
- `background.js` - Service worker for handling messages and API calls
- `content-youtube.js` - Content script for YouTube pages
- `content-generic.js` - Content script for regular web pages
- `popup.html` / `popup.js` - Extension popup UI

## Backend Integration

The extension communicates with a Supabase Edge Function (`save-from-extension`) to:
1. Save extracted content to the database
2. Trigger AI summarization
3. Generate tags

## Icons

You'll need to create icons for the extension:
- `icons/icon16.png` (16x16)
- `icons/icon32.png` (32x32)
- `icons/icon48.png` (48x48)
- `icons/icon128.png` (128x128)

## Authentication

The extension stores the user's Supabase access token in `chrome.storage.local`. To authenticate:
1. User signs in on the main Recap web app
2. Token is passed to extension via messaging or URL parameter
3. Extension stores token for subsequent requests
