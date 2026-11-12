# capcut-like-app

A lightweight, **100% free**, maintenance-free, browser-optimized CapCut-style video editor. Runs entirely on-device (PWA) — no backend, no upload, no watermark, no account. Built for low-RAM phones (e.g. Redmi 7A) as well as desktop.

## Features

1. **Add Media** — ONE unified picker (`Add Media` → `accept="video/*,audio/*,image/*" multiple`) *and* drag & drop: videos stack on the timeline, images become overlay layers, audio becomes the BGM/voiceover track. Mixed multi-type selection supported.
2. **Multi-Clip Timeline** — imported clips play back-to-back. **Split** at the playhead, per-clip **Trim In/Out**, **reorder** with ◀ ▶, remove clips. Undo/Redo across every timeline action, watermark edits and caption changes (`Ctrl+Z` / `Ctrl+Y`).
3. **Auto Enhance (zero knobs)** — every video/audio source is routed through HighPass 80 Hz → DynamicsCompressor (−18 dB · 10:1). Always on, applied to preview and export.
4. **Audio Mix** — clip volume fader + BGM/voiceover fader (the exported mix is the monitor mix).
5. **Overlays & Captions** — multiple image/sticker layers with drag-on-canvas positioning and ordering; captions (Classic & Instagram Bold Box styles) **plus one-click Auto-Caption** (time-synced, Web Speech API).
6. **Text / Watermark layer** — persistent top-layer text (@handles, brand marks): enable/disable, text, color, size, opacity, corner placement (↖ ↗ ● ↙ ↘). Burned into every frame of preview and export.
7. **Format** — aspect crop 16:9 / 1:1 / 9:16 · playback speed 0.5×–2× · **clip transitions**: None · Cross Dissolve · Fade to Black — smooth equal-power audio ride across every cut, live in preview and export.
8. **Export** — rendered on-device via MediaRecorder (H.264/VP9 @ 8 Mbps + 192 kbps audio), ≤ 1280 px cap, MP4 or WebM depending on browser.

## Quick start (local)

Service workers require `http(s)` or `localhost` — opening `index.html` via `file://` works for editing but skips offline caching.

```bash
# any static server works — pick one:
python -m http.server 8080
# or
npx serve .
```

Open `http://localhost:8080`.

> First visit needs internet **once** to fetch the Tailwind CDN; the service worker caches it, after that the app is fully usable offline. `style.css` is also a complete standalone theme, so the UI survives even without the CDN.

## Deploy (free hosting)

**GitHub Pages**
```bash
git init && git add . && git commit -m "capcut-like-app"
git remote add origin <your-repo-url> && git push -u origin main
# Repo → Settings → Pages → Deploy from branch → main / root
```

**Firebase Hosting**
```bash
npm i -g firebase-tools   # or: npx firebase-tools
firebase login
firebase init hosting     # public dir: .  ·  single-page: No
firebase deploy
```

No build step, no environment variables, no server code — just these static files.

## How it works (architecture in 30 seconds)

```
<video> ──MediaElementSource──▶ videoGain ─┬─▶ monitorGain ─▶ speakers (preview)
                                            └─▶ exportDest (MediaStreamAudioDestination)
<audio> ─MediaElementSource────▶ bgmGain ───┘                     │
<canvas> ──drawImage(video) + captions── captureStream(30fps) ────┤
                                                                  ▼
                                                    MediaRecorder ─▶ Blob ─▶ download
```

- **Preview = export canvas.** Both render the same `drawFrame()` routine, so captions and scaling match 1:1 (AC-4). BGM is tapped into the same Web Audio graph used for the monitor path and synced to the video clock on play/seek — the export bus carries the mixed signal (AC-3).
- **Low-RAM safe.** Render resolution is capped at 1280 px wide, object URLs are used everywhere (never `FileReader`), media is released before new files load, and the recorder writes 250 ms chunks.
- **Offline-ready.** `sw.js` precaches the shell and caches the Tailwind CDN at runtime (stale-while-revalidate).

## Browser support

| Feature | Chrome Android | Firefox | Safari iOS 15+ | Edge |
|---|---|---|---|---|
| Canvas capture + MediaRecorder | ✅ (WebM) | ✅ (WebM) | ⚠️ partial (MP4 on 16.4+) | ✅ |
| Web Audio mixing | ✅ | ✅ | ✅ | ✅ |
| PWA install | ✅ | ✅ | ✅ (Add to Home Screen) | ✅ |

Export container: the app probes `MediaRecorder.isTypeSupported()` and picks the best available — `video/mp4` if possible, otherwise `video/webm`.

## Acceptance criteria map

- **AC-1** — 1280 px render cap, object URLs, zero dependencies bundled, ~30 KB of first-party JS.
- **AC-2** — No backend, no build, no paid APIs; SW precache + CDN runtime cache; Git/Firebase-ready.
- **AC-3** — Single Web Audio graph; `exportDest` receives `videoGain (through per-clip HighPass → Compressor → equal-power transition tap-gains) + bgmGain`; BGM loop synced to global timeline position on play/seek; enhancement always in-circuit.
- **AC-4** — Captions are drawn on the canvas each frame (Classic & Instagram Bold Box styles); manual captions are untimed (full duration) while Auto-Caption lines carry `start/end` — identical in preview and export.
- **Trim/Crop/Transitions** — per-clip in/out bounds; cover-math crop; clip transitions (None / Cross Dissolve / Fade to Black) pre-roll the incoming clip 0.65 s before each cut with an equal-power audio ride — rendered through the same canvas the export records.
- **Tier export cap** — `videoBitsPerSecond: 8_000_000`, `audioBitsPerSecond: 192_000`.

## File map

```
index.html            markup (Tailwind CDN as enhancement)
style.css             standalone fallback theme — app works without CDN
app.js                editor logic (import, mix, captions, export)
sw.js                 service worker (offline)
manifest.webmanifest  PWA manifest
icon.svg              app icon
```
