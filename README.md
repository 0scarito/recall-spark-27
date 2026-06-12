# Recall Spark

A personal knowledge-retention app: capture web pages and YouTube videos with one click, turn them into AI-summarized knowledge cards, then actually retain them through spaced-repetition review, a knowledge graph, and chat over your own library. Built because reading and watching is easy — remembering is the hard part.

> Status: work in progress. The capture → summarize → review loop is wired end to end; some surfaces (graph, chat history UI) are still being finished.

## Features

- **One-click capture via browser extension** — a Manifest V3 Chrome extension extracts the current page or YouTube video (including the transcript when available) and posts it to a Supabase Edge Function, which summarizes it and files it as a knowledge card.
- **AI summarization and auto-tagging** — content is summarized with Gemini 2.5 Flash through an OpenAI-compatible gateway. YouTube videos without transcripts fall back to a Perplexity search; hard-to-scrape pages fall back to Firecrawl.
- **Knowledge card library** — dashboard with collections, drag-and-drop organization (dnd-kit), a hierarchical tag sidebar, and Postgres full-text search (generated `tsvector` column, GIN-indexed).
- **Spaced-repetition review** — an edge function generates Q&A pairs from each card's content; review sessions track ease factor, interval, and next-review date (SM-2-style scheduling), and the Review page serves only what's due.
- **Chat with your library** — ask questions scoped to a single card or across all your cards; conversation history is persisted per conversation.
- **Knowledge graph** — visualize connections between captured cards.
- **Per-user data isolation** — Supabase Auth plus row-level security policies on every table (`knowledge_cards`, `questions`, `review_sessions`, `chat_messages`).

## Stack

- **Frontend:** React 18 + TypeScript + Vite, React Router, TanStack Query, shadcn/ui (Radix primitives), Tailwind CSS, dnd-kit, Recharts
- **Backend:** Supabase — Postgres (RLS, full-text search), Auth, and six Deno Edge Functions (`save-from-extension`, `summarize-content`, `generate-questions`, `chat-knowledge`, `analyze-file`, `transcribe-audio`)
- **AI:** Gemini 2.5 Flash via an OpenAI-compatible gateway; Perplexity (YouTube metadata fallback); Firecrawl (scraping fallback)
- **Extension:** vanilla JS, Manifest V3 (`my-youtube-extension/`)
- **Edge API:** a standalone edge-runtime handler (`api/fetch-summarize.ts`) for fetch + summarize of arbitrary URLs

## Getting Started

```sh
git clone https://github.com/0scarito/recall-spark-27.git
cd recall-spark-27
npm install
npm run dev
```

The frontend expects a `.env` at the repo root pointing at your Supabase project:

```sh
VITE_SUPABASE_URL=<your-supabase-project-url>
VITE_SUPABASE_PROJECT_ID=<your-supabase-project-id>
VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>
```

Apply the SQL in `supabase/migrations/` to your project, deploy the functions in `supabase/functions/`, and set the function secrets (AI gateway key, Perplexity key, Firecrawl key) via `supabase secrets set`.

To use the capture extension, load `my-youtube-extension/` as an unpacked extension in Chrome and update the `CONFIG` block in `background.js` with your own app URL and Supabase project values.

## How it works

- **Routing** lives in `src/App.tsx`: `/` (landing) → `/home` (dashboard), `/chat`, `/graph`, `/review`, `/settings`, `/card/:id`, and `/extension-auth` (the page the extension uses to pick up an authenticated session).
- **Capture flow:** extension content scripts (`content-youtube.js`, `content-generic.js`) extract title, content, and transcript → `background.js` posts to the `save-from-extension` edge function → the function summarizes and tags the content and inserts a `knowledge_cards` row for the authenticated user.
- **Review flow:** `generate-questions` produces Q&A pairs from a card's text; each answer recorded on the Review page writes a `review_sessions` row updating ease factor, interval days, and next review date — `useQuestions.ts` filters for due cards.
- **Chat flow:** `chat-knowledge` builds the system-prompt context from either one card's full text or all card summaries, calls the model with prior turns, and persists both sides of the exchange to `chat_messages`.
- **Data model:** four RLS-protected tables keyed to `auth.uid()` — cards, generated questions, review sessions, chat messages — with full-text search over card title/summary/URL.
- **UI composition:** feature components (`Dashboard`, `KnowledgeCard`, `CollectionManager`, `TagHierarchySidebar`, `ConnectionsGraph`, `ChatInterface`) sit on top of shadcn/ui primitives in `src/components/ui/`.
