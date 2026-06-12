# My YouTube Extension

A Chrome extension to save and summarize YouTube videos and web pages.

## Setup Instructions

### Step 1: Add Icons

The extension requires icon files to load properly. You need to add 4 icon files:

- `icons/icon16.png` (16x16 pixels)
- `icons/icon32.png` (32x32 pixels)
- `icons/icon48.png` (48x48 pixels)
- `icons/icon128.png` (128x128 pixels)

**Quick Fix:** If you don't have these icons ready:
1. Find any square PNG image (e.g., 128x128 pixels)
2. Copy it 4 times and rename them to `icon16.png`, `icon32.png`, `icon48.png`, and `icon128.png`
3. Place all 4 files in the `icons` folder

**Note:** Chrome will automatically resize them, so using the same image for all sizes will work fine for testing.

### Step 2: Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right corner)
3. Click **Load unpacked**
4. Select the `my-youtube-extension` folder from your Desktop
5. The extension should now appear in your extensions list

### Step 3: How It Works

- **content-youtube.js**: Extracts video information from YouTube pages by reading the `ytInitialPlayerResponse` variable, which contains video metadata and caption URLs
- **Transcript Fetching**: Downloads captions from YouTube's servers (works because you're logged in)
- **background.js**: Handles communication between content scripts and the popup, and sends data to the backend
- **save-from-extension**: The Supabase Edge Function that receives the data and sends it to AI for summarization

## Files

- `manifest.json` - Extension configuration
- `content-youtube.js` - YouTube-specific content extraction
- `content-generic.js` - Generic web page content extraction
- `background.js` - Background service worker
- `popup.html` - Extension popup UI
- `popup.js` - Popup functionality

## Usage

1. Navigate to any YouTube video or web page
2. Click the extension icon in Chrome's toolbar
3. Click "Save & Summarize" to save the content to your library

## Authentication

The extension requires authentication to save content. If you see an "Unauthorized" error:

1. Click the "Open Recap App" button in the popup
2. Sign in to your account in the opened tab
3. The extension will automatically detect your authentication

**Note:** The extension can extract video information and transcripts even without authentication, but you need to be signed in to save content to your library.

## Troubleshooting

### "No transcript found" Error

This can happen if:
- The video doesn't have captions/subtitles available
- The video is very new and captions haven't been generated yet
- YouTube's page structure has changed

**Solution:** The extension will still save the video metadata (title, description, etc.) even without a transcript. You can manually add notes later.

### Transcript Extraction Issues

If transcripts aren't being found:
1. Make sure you're on a YouTube video page (not the homepage or search results)
2. Wait a few seconds for the page to fully load before clicking the extension
3. Check the browser console (F12) for any error messages
4. Try refreshing the page and trying again

