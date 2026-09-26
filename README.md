# Quip — AI-Powered Meeting Notes

Quip turns any Google account into a silent meeting bot that joins your Google Meet calls, listens, and takes notes. It authenticates once using a real browser session, then rejoins future meetings automatically with no extra setup. Every conversation is captured live and handed to an AI report generation agent that transforms the raw transcript into a clean, structured PDF decisions, action items, and who said what. No Chrome extension to install, no expensive Google Workspace plan, no data leaving your own machine.


### Download

**[⬇ Quip 1.0.0 for Debian / Ubuntu (x64) — 239 MB](https://github.com/Harsh-D-2004/Quip/releases/download/v1.0.0/quip_1.0.0_amd64.deb)**

Double-click the `.deb`, or:

```bash
sudo apt install ./quip_1.0.0_amd64.deb
```

Chromium and the Node service are bundled — no Node.js, no Docker, no Chrome
install needed. [All releases »](https://github.com/Harsh-D-2004/Quip/releases)

---

## Architecture

One installer, one launcher, no terminals and no Docker. `Quip.exe`/`quip` is the
only thing the user starts; it supervises everything below it.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Quip  (Electron)                                    the only launcher   │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  quip-desktop — main process (CommonJS)                            │  │
│  │                                                                    │  │
│  │   supervisor.js   spawn · health · restart ×3 · graceful shutdown  │  │
│  │   secrets.js      OpenRouter key → safeStorage (OS keychain)       │  │
│  │   preload.js      contextBridge → window.quip                      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│         │                                        ▲                       │
│         │ utilityProcess.fork                    │ IPC: apiBase,         │
│         │ (port handshake, api-key push)         │ service state, key    │
│         ▼                                        │                       │
│  ┌──────────────────────────────┐   ┌────────────┴───────────────────┐   │
│  │ quip-backend — service       │   │ quip-frontend — renderer       │   │
│  │ plain Node, no Electron dep  │   │ React 18 + Vite, sandboxed     │   │
│  │                              │   │ contextIsolation, no Node      │   │
│  │ Express on 127.0.0.1:0       │◄──┤                                │   │
│  │ (OS-assigned port)           │HTTP│ Login · Join · Live · Summary │   │
│  │                              │   └────────────────────────────────┘   │
│  │  ├ google_meet_bot/          │                                        │
│  │  │   browser.ts  Chromium singleton                                   │
│  │  │   bot_service.ts  join · MutationObserver → captions               │
│  │  │   bot_login.ts    headed window, saves storage-state.json          │
│  │  │   summary_service.ts  OpenRouter → JSON → PDFKit                   │
│  │  └ helpers/paths.ts  every write goes under QUIP_DATA_DIR             │
│  └──────────────┬───────────────────────────────────────────────────┘    │
└─────────────────┼────────────────────────────────────────────────────────┘
                  │ Playwright
                  ▼
        ┌───────────────────────┐        Bundled in the installer, never
        │ Chromium (OS child)   │        downloaded at runtime.
        │ headless for meetings │
        │ headed for Google login│
        └───────────┬───────────┘
                    │ HTTPS
                    ▼
        ┌───────────────────────┐        ┌────────────────────────────┐
        │ Google Meet           │        │ OpenRouter API             │
        │ joined as the bot     │        │ user's own key, per request│
        └───────────────────────┘        └────────────────────────────┘

Shipped inside the .deb        Written to ~/.config/Quip (survives upgrades)
  Electron runtime               transcripts/       captions, summary.json, PDF
  service + node_modules         storage-state.json the bot's Google session
  Playwright Chromium            secrets.json       OpenRouter key, encrypted
  React bundle (app.asar)        settings.json      model choice
                                 logs/service.log
```

**Why the service is a separate process.** It holds a Playwright `Browser` open
for the length of a meeting and writes PDFs synchronously. Playwright throws
`Target page, context or browser has been closed` as an unhandled rejection
routinely when a Meet tab navigates, and blocking file I/O on the main process
stalls window IPC. In one process that is the user's window vanishing mid-meeting
with the transcript lost. Split, the bot can die and the UI survives, reports it,
and offers a restart.

---

## Core Features

### quip-backend

| Feature                       | Detail                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| **Bot join**                  | Playwright automates a real Chrome session to enter any Google Meet link             |
| **Live caption capture**      | `MutationObserver` injected into the Meet DOM streams captions in real time          |
| **Persistent Google session** | Bot stays logged in across restarts via saved storage state in your user data dir    |
| **Auto-leave**                | Monitors participant count and leaves when the meeting ends                          |
| **AI summarisation**          | Sends full transcript to Claude (via OpenRouter) to produce structured meeting notes |
| **PDF export**                | PDFKit renders the summary to a downloadable PDF                                     |
| **REST API**                  | Express 5 exposes clean endpoints consumed by the frontend                           |
| **Bundled Chromium**          | Ships its own Playwright Chromium — nothing to install, no Chrome dependency         |

### quip-frontend

| Feature                | Detail                                                                           |
| ---------------------- | -------------------------------------------------------------------------------- |
| **Electron shell**     | Ships as a native `.deb` installer — no browser or Node.js required               |
| **Login flow**         | Guides the user through authenticating the bot's Google account once             |
| **BYO API key**        | Prompts for your own OpenRouter key and keeps it in the OS keychain              |
| **Live meeting view**  | Polls backend for real-time caption snippets and bot status                      |
| **AI summary display** | Renders structured notes: key decisions, action items, participant contributions |
| **PDF download**       | jsPDF generates a client-side PDF of the summary                                 |
| **Dark mode**          | `next-themes` provides system-aware light/dark theming                           |
| **Shadcn/Radix UI**    | Accessible, composable component library — no external CSS framework lock-in     |

---

## API Endpoints (service — `127.0.0.1` on an OS-assigned port)

| Method | Path                 | Description                         |
| ------ | -------------------- | ----------------------------------- |
| `GET`  | `/test`              | Health check                        |
| `POST` | `/bot-profile/login` | Authenticate bot's Google account   |
| `POST` | `/google-bot/join`   | Send bot into a Meet meeting        |
| `POST` | `/google-bot/leave`  | Eject bot from current meeting      |
| `GET`  | `/health`            | Supervisor health probe             |
| `GET`  | `/ai/summarize`      | Generate AI summary from transcript |
| `GET`  | `/ai/report`         | Render the summary as a PDF         |
| `GET`  | `/ai/transcript`     | Raw captions for the last meeting   |
| `GET`  | `/settings`          | Model + whether a key is configured |
| `POST` | `/settings/api-key`  | Verify and apply an OpenRouter key  |

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

- Linux x64 (Debian/Ubuntu — the installer is a `.deb`)
- Node.js 20+ (developed on 24)
- A Google account dedicated to the bot (separate from your personal account)
- An [OpenRouter](https://openrouter.ai/settings/keys) API key — **the app asks for this on first run**; no key lives in the repo or the installer

### Run locally after cloning

```bash
git clone https://github.com/Harsh-D-2004/Quip.git
cd Quip
npm install                 # root + quip-backend + quip-frontend (via postinstall)
npm run stage:browsers      # downloads Chromium for your platform (~400 MB)
npm run build               # compiles the service and the renderer
npm run dev
```

`npm run dev` starts three things together: Vite on `:8080`, `tsc --watch` on the
service, and the Electron shell once both are ready. The shell launches the
service itself — you never start it by hand, and there is no port to configure.

To run the service on its own (useful for poking at the API with `curl`):

```bash
npm --prefix quip-backend start          # picks a random free port, printed on startup
PORT=3000 npm --prefix quip-backend start # or pin one
```

### Build the Debian installer

Most people should just [download the release](https://github.com/Harsh-D-2004/Quip/releases/download/v1.0.0/quip_1.0.0_amd64.deb).
To build it yourself:

```bash
npm run dist
```

Produces `release/quip_1.0.0_amd64.deb` (~239 MB — it bundles Chromium). Install it
by double-clicking in your file manager, or:

```bash
sudo apt install ./release/quip_1.0.0_amd64.deb
```

`.deb` files are gitignored repo-wide: GitHub rejects anything over 100 MB
without Git LFS, so installers ship as Release assets instead.

Then launch **Quip** from your applications menu. To uninstall:

```bash
sudo apt remove quip     # transcripts and login are kept
```

Packaging targets Linux x64 only. Chromium is platform-specific, so the build must
run on Linux — the staging step refuses to run anywhere else.

### First run

1. Launch Quip. It asks for your **OpenRouter API key**, verifies it against
   OpenRouter, and stores it in your OS keychain — never in the app bundle. You can
   skip this and add it later from the **API key** link in the footer; only
   summaries need it.
2. Click **Login with Chrome**. A real Chrome window opens — sign in to the bot's
   Google account, then close the window. The session is saved and reused.
3. Paste any `meet.google.com/xxx-xxx-xxx` link on the **Join Meeting** page.
4. The bot joins and enables captions. **Live Meeting** streams them in.
5. Click **Leave** (or let the bot auto-leave when everyone else has) and open
   **Summary** to read and export the notes.

### Where your data lives

Everything writable sits outside the installed app, so updates and uninstalls
never touch it. It lives under `~/.config/Quip/` and holds:

| Path                  | Contents                                       |
| --------------------- | ---------------------------------------------- |
| `transcripts/`        | Captions, `summary.json` and `summary.pdf`     |
| `storage-state.json`  | The bot's saved Google session                 |
| `logs/service.log`    | Service output, useful when reporting a bug    |
| `settings.json`       | Non-secret settings (the model to summarise with) |
| `secrets.json`        | Your OpenRouter key, encrypted via the keyring |

---

## Landing site (`quip-landing`)

A standalone React site that explains Quip and serves the `.deb`. It shares the
desktop app's design tokens but has no dependency on the rest of the repo, so it
deploys on its own.

```bash
npm --prefix quip-landing install
npm --prefix quip-landing run dev        # http://localhost:5173
```

Deploy it with the root `Dockerfile`, which builds the site and serves it from
nginx on port 8080:

```bash
docker build -t quip-landing .
docker run --rm -p 8080:8080 quip-landing
```

`.dockerignore` restricts the build context to `quip-landing/` only — the desktop
app, the service and ~450 MB of staged Chromium never enter the image, which lands
at roughly 2 MB.

The installer is **not** bundled. `.deb` files are gitignored repo-wide (GitHub
rejects anything over 100 MB without Git LFS), so the download button points at
the GitHub Release asset:

```
https://github.com/Harsh-D-2004/Quip/releases/download/v1.0.0/quip_1.0.0_amd64.deb
```

That URL is the default in `quip-landing/src/site.config.ts`. For a new release,
bump it there, or override it at build time without touching the source:

```bash
docker build --build-arg VITE_DOWNLOAD_URL=<new release asset url> -t quip-landing .
```

**Deploying to Render.** A `render.yaml` blueprint is included — point Render at
the repo and it builds this Dockerfile as-is. **No environment variables need to
be set.** Render injects `PORT`, and nginx picks it up because the config ships
as a template that Render's container substitutes at startup (`listen ${PORT}`);
the download URL is baked into the bundle at build time. The health check path is
`/healthz`.

Publishing a new installer:

```bash
npm run dist                                     # -> release/quip_<version>_amd64.deb
gh release create v1.1.0 release/quip_1.1.0_amd64.deb --title "Quip 1.1.0" --latest
```

---

## Tech Stack Summary

| Layer              | quip-backend (service) | quip-desktop (shell)  | quip-frontend (renderer) |
| ------------------ | ---------------------- | --------------------- | ------------------------ |
| Language           | TypeScript (CommonJS)  | JavaScript (CommonJS) | TypeScript               |
| Runtime            | Node.js                | Electron main         | Electron renderer        |
| Framework          | Express 5              | —                     | React 18 + Vite          |
| Browser automation | Playwright 1.63        | —                     | —                        |
| UI                 | —                      | —                     | Shadcn/ui + Tailwind CSS |
| State              | —                      | —                     | React Query + hooks      |
| AI                 | OpenRouter             | —                     | —                        |
| PDF                | PDFKit                 | —                     | jsPDF                    |
| Secrets            | in-memory only         | Electron `safeStorage` | never sees the key       |
| Packaging          | —                      | electron-builder (deb) | —                       |

---

## Configuration

There is **no `.env` file to create.** The only secret is your OpenRouter key, and
the app prompts for it on first run.

Optional environment variables, all for development:

| Variable               | Applies to | Description                                                       |
| ---------------------- | ---------- | ----------------------------------------------------------------- |
| `OPEN_ROUTER_API_KEY`  | service    | Supplies the key when running the service standalone              |
| `PORT`                 | service    | Pin the service port instead of letting the OS pick one           |
| `QUIP_DATA_DIR`        | service    | Override where transcripts, logs and session state are written    |
| `QUIP_CDP_URL`         | service    | Attach to an external browser over CDP instead of bundled Chromium |
| `VITE_QUIP_API_BASE`   | renderer   | Service URL when running the UI in a plain browser tab            |
| `QUIP_OZONE_PLATFORM`  | shell      | Linux display backend; defaults to `x11` (see note below)         |

**Linux display backend.** Electron 39's Wayland backend segfaults on current
Ubuntu, so the shell forces `--ozone-platform=x11` (XWayland) and the installed
`.desktop` entry carries the flag. Set `QUIP_OZONE_PLATFORM=wayland` to opt back in
once that is fixed upstream.
