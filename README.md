# Quip — AI-Powered Meeting Notes

Quip turns any Google account into a silent meeting bot that joins your Google Meet calls, listens, and takes notes. It authenticates once using a real browser session, then rejoins future meetings automatically with no extra setup. Every conversation is captured live and handed to an AI report generation agent that transforms the raw transcript into a clean, structured PDF decisions, action items, and who said what. No Chrome extension to install, no expensive Google Workspace plan, no data leaving your own machine.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        User's Machine                               │
│                                                                     │
│   ┌─────────────────────────────┐                                   │
│   │     quip-frontend           │                                   │
│   │   Electron + React Desktop  │                                   │
│   │                             │                                   │
│   │  ┌─────────┐ ┌───────────┐  │                                   │
│   │  │  Login  │ │  Join     │  │                                   │
│   │  │  Page   │ │  Meeting  │  │                                   │
│   │  └─────────┘ └───────────┘  │                                   │
│   │  ┌─────────┐ ┌───────────┐  │                                   │
│   │  │  Live   │ │  Summary  │  │  HTTP (localhost:3000)            │
│   │  │  View   │ │  Page     │  │◄────────────────────────────────┐ │
│   │  └─────────┘ └───────────┘  │                                 │ │
│   └─────────────────────────────┘                                 │ │
│                                                                   │ │
│   ┌──────────────────────────────────────────────────────────┐   │ │
│   │                   quip-backend                           │   │ │
│   │              Node.js + Express (port 3000)               │───┘ │
│   │                                                          │     │
│   │  ┌───────────────────────────────────────────────────┐   │     │
│   │  │            Playwright Bot Engine                  │   │     │
│   │  │                                                   │   │     │
│   │  │  1. Launch Chrome via DevTools Protocol (CDP)     │   │     │
│   │  │  2. Authenticate Google account                   │   │     │
│   │  │  3. Join Google Meet as silent participant        │   │     │
│   │  │  4. Inject MutationObserver → capture captions   │   │     │
│   │  │  5. Stream captions → transcripts/ folder        │   │     │
│   │  │  6. Detect empty room → auto-leave               │   │     │
│   │  └───────────────────────────────────────────────────┘   │     │
│   │                          │                                │     │
│   │                          ▼                                │     │
│   │  ┌───────────────────────────────────────────────────┐   │     │
│   │  │           AI Summary Service                      │   │     │
│   │  │  OpenRouter SDK → Claude (primary)                │   │     │
│   │  │  Google Generative AI (fallback/secondary)        │   │     │
│   │  │  PDFKit → export summary as PDF                   │   │     │
│   │  └───────────────────────────────────────────────────┘   │     │
│   └──────────────────────────────────────────────────────────┘     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

                          ▲  Chrome DevTools Protocol
                          │
         ┌────────────────┴──────────────────┐
         │    Steel Browser / Local Chrome    │
         │    (headless or headed instance)   │
         │    docker-compose.yml (optional)   │
         └───────────────────────────────────┘

                          ▲  HTTPS
                          │
              ┌───────────┴────────────┐
              │     Google Meet        │
              │   (joined as bot user) │
              └────────────────────────┘

                          ▲  HTTPS / REST
                          │
              ┌───────────┴────────────┐
              │   OpenRouter API       │
              │   (Claude models)      │
              └────────────────────────┘
```

---

## Core Features

### quip-backend

| Feature                       | Detail                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| **Bot join**                  | Playwright automates a real Chrome session to enter any Google Meet link             |
| **Live caption capture**      | `MutationObserver` injected into the Meet DOM streams captions in real time          |
| **Persistent Chrome profile** | Bot stays logged in across restarts via a saved Chrome profile                       |
| **Auto-leave**                | Monitors participant count and leaves when the meeting ends                          |
| **AI summarisation**          | Sends full transcript to Claude (via OpenRouter) to produce structured meeting notes |
| **PDF export**                | PDFKit renders the summary to a downloadable PDF                                     |
| **REST API**                  | Express 5 exposes clean endpoints consumed by the frontend                           |
| **Steel Browser support**     | Optionally uses Steel Browser (CDP over Docker) for isolated headless operation      |

### quip-frontend

| Feature                | Detail                                                                           |
| ---------------------- | -------------------------------------------------------------------------------- |
| **Electron shell**     | Ships as a native `.exe` / `.dmg` installer — no browser required                |
| **Login flow**         | Guides the user through authenticating the bot's Google account once             |
| **Session management** | 30-minute session token prevents stale bot connections                           |
| **Live meeting view**  | Polls backend for real-time caption snippets and bot status                      |
| **AI summary display** | Renders structured notes: key decisions, action items, participant contributions |
| **PDF download**       | jsPDF generates a client-side PDF of the summary                                 |
| **Dark mode**          | `next-themes` provides system-aware light/dark theming                           |
| **Shadcn/Radix UI**    | Accessible, composable component library — no external CSS framework lock-in     |

---

## API Endpoints (Backend — `localhost:3000`)

| Method | Path                 | Description                         |
| ------ | -------------------- | ----------------------------------- |
| `GET`  | `/test`              | Health check                        |
| `POST` | `/bot-profile/login` | Authenticate bot's Google account   |
| `POST` | `/google-bot/join`   | Send bot into a Meet meeting        |
| `POST` | `/google-bot/leave`  | Eject bot from current meeting      |
| `POST` | `/ai/summarize`      | Generate AI summary from transcript |

---

## Why Not a Chrome Extension or Google Meet API?

This is the key architectural decision behind Quip.

### Chrome Extensions — limitations

| Limitation                                                                                                             | How Quip avoids it                                                                           |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Runs only while the user's browser is open                                                                             | Backend bot runs as an independent headless process — no user browser needed                 |
| Requires user to manually install and enable the extension                                                             | Desktop app installs once; bot is fully automated                                            |
| Chrome Manifest V3 restricts background pages and long-lived connections                                               | No extension manifest constraints — bot is plain Node.js + Playwright                        |
| Extensions cannot record or stream audio/video without explicit tab capture permissions and user consent on every call | Captions are read from the live DOM (already rendered for accessibility), not via media APIs |
| Single user's browser session — cannot scale or run unattended                                                         | Bot can join multiple meetings in parallel on a server                                       |
| Must run on the same machine as the user                                                                               | Backend can be deployed remotely; frontend connects over a local or remote API               |

### Google Meet API / Google Workspace APIs — limitations

| Limitation                                                                        | How Quip avoids it                                                                              |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Google Meet REST API is restricted to Google Workspace Enterprise accounts        | No Google API key required for joining meetings                                                 |
| Live streaming and recording require domain admin approval and Workspace licenses | Bot joins as a standard Google account participant                                              |
| Google's transcription feature (Gemini in Meet) is gated behind Workspace tiers   | Quip captures captions directly from the Meet accessibility DOM                                 |
| API rate limits and quota management overhead                                     | No API quota involved in capture; only the summarisation call uses an external API (OpenRouter) |
| Vendor lock-in to Google's AI models for summarisation                            | OpenRouter lets you swap Claude, GPT-4, Gemini, or any model without changing application code  |
| Google Meet API does not provide real-time caption streaming via REST             | MutationObserver in the live DOM gives sub-second caption latency                               |

### How Quip works instead

Quip's bot is a **real Google account operating a real browser**, which means:

- It joins as a visible participant (with a configurable display name) — no hidden injection or policy violations
- It reads captions from the same accessibility text Google renders for human users
- It leaves the meeting autonomously, just like a human would
- The captured transcript is processed entirely on your own infrastructure — no audio or video leaves your machine

---

## Setup

### Prerequisites

- Node.js 18+
- A Google account dedicated to the bot (separate from your personal account)
- An [OpenRouter](https://openrouter.ai) API key (for AI summaries)

### 1 — Backend

```bash
cd quip-backend
npm install
```

Create `quip-backend/.env`:

```env
OPENROUTER_API_KEY=your_openrouter_key
GOOGLE_AI_API_KEY=your_google_ai_key        # optional fallback
PORT=3000
```

Start dev server:

```bash
npm run dev
```

**Optional — Steel Browser (Docker):**

```bash
docker compose up -d
```

### 2 — Frontend

```bash
cd quip-frontend
npm install
```

Run as a web app (connects to backend on `:3000`):

```bash
npm run dev
```

Run as an Electron desktop app:

```bash
npm run electron:dev
```

Build a distributable installer:

```bash
npm run electron:build
```

### 3 — First Run

1. Open the app and go to the **Login** page.
2. Enter the bot's Google credentials — Playwright will complete the OAuth flow and save a Chrome profile.
3. On the **Join Meeting** page, paste any `meet.google.com/xxx-xxx-xxx` link.
4. The bot joins the call. Switch to the **Live Meeting** view to watch captions stream in.
5. When the meeting ends (or you click **Leave**), open the **Summary** page to read and export the AI-generated notes.

---

## Tech Stack Summary

| Layer              | quip-backend        | quip-frontend            |
| ------------------ | ------------------- | ------------------------ |
| Language           | TypeScript          | TypeScript               |
| Runtime            | Node.js             | Electron (Chromium)      |
| Framework          | Express 5           | React 18 + Vite          |
| Browser automation | Playwright 1.56     | —                        |
| UI                 | —                   | Shadcn/ui + Tailwind CSS |
| State              | —                   | React Query + hooks      |
| AI                 | OpenRouter (Claude) | —                        |
| PDF                | PDFKit              | jsPDF                    |
| Transport          | REST / JSON         | Axios + REST             |

---

## Environment Variables

### quip-backend `.env`

| Variable             | Required | Description                                  |
| -------------------- | -------- | -------------------------------------------- |
| `OPENROUTER_API_KEY` | Yes      | API key from openrouter.ai for Claude access |
| `GOOGLE_AI_API_KEY`  | No       | Google Generative AI key (secondary model)   |
| `PORT`               | No       | Server port (default `3000`)                 |
