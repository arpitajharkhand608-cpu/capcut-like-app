# PLAN — capcut-like-app (MULTI-TRACK)

Lightweight, offline-first, browser-optimized multi-track editor (PWA).
Stack: HTML5 + Tailwind CDN + Vanilla JS (Canvas, Web Audio, MediaRecorder, Web Speech API). No backend.

## Files
- index.html — top bar (brand · Undo/Redo · Export) + 7-card tool panel
                 (Import → Timeline → Audio&AutoEnhance → Overlays → Captions → Format → Export)
- style.css  — standalone fallback theme (works without the CDN)
- app.js     — multi-track engine (see below)
- sw.js      — service worker: network-first same-origin shell + CDN stale-while-revalidate
- manifest.webmanifest + icon.svg — installable PWA

## Engine
- **Timeline model**: ordered `state.clips[]` — each clip = own hidden <video> (in/out source bounds).
  Global playhead = Σ(out−in)/speed of preceding clips. `clipAtGlobal()` for seeking;
  `tickPlayhead()` (60 fps, from the render loop) auto-advances clips — safe when a clip ends
  exactly at its `out == duration` (browser-paused at natural end; detected via `el.ended`,
  never via paused-flag alone, so user pauses parked on a boundary don't hijack transport).
- **Import**: ONE unified `<input id=fileInput accept="video/*,audio/*,image/*" multiple>` + drop handler.
  `routeImportedFiles()` fans out: videos → timeline clips (appended, never overwrite),
  images → overlay layers, audio[0] → BGM slot. Metadata/durations extracted per-clip on loadedmetadata.
- **Draw**: `drawFrame()` — black fill → cover-crop active video with
  `ctx.filter='contrast(1.06) saturate(1.08)'` + `imageSmoothingQuality='high'` → (transition:
  incoming clip at globalAlpha=smoothstep or black dip-to-black) → image overlays
  (ordered, pointer-draggable) → captions (Classic / Instagram Bold Box) → **watermark** (persistent).
  Same routine for preview & export.
- **Transitions**: None | Cross Dissolve | Fade to Black. `transitionTick()` pre-rolls the
  incoming clip 0.65 s before the cut and rides BOTH tap-gains equal-power
  (`cos/sin(ease·π/2)`, smoothstep on video side) — seamless audio + video across every cut.
- **Watermark**: state.watermark {enabled,text,color,size,opacity,x,y} — FREELY DRAGGABLE on the canvas
  (hit-test via cached fraction-space bbox, pre-drag snapshot for one-undo-revert). Corner presets
  (↖ ↗ ● ↙ ↘) snap x,y; anchor-aligned rendering (zone-derived textAlign); included in undo snapshots.
- **Undo/Redo**: JSON snapshot stacks (clip order/bounds, captions, overlays, watermark, aspect,
  speed, caption style, transition) — media elements reused by id; 50-entry cap; Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y.
- **Audio**: every source → own HighPass(80Hz) → DynamicsCompressor(−18dB · 10:1) → tapGain → fader →
  tee(monitor, exportDest). Always in-circuit; zero manual controls.
- **Export**: `captureStream(30)` + mixed `exportDest` → MediaRecorder
  (H.264/VP9 @ **8 Mbps** + **192 kbps** Opus/AAC; MP4 preferred, WebM fallback).
  60 ms end-watchdog closes the file at the global timeline end; 250 ms chunks.

## Status: all features implemented and browser-verified end-to-end
Chromium-verified: multi-file import & drag-drop, split at playhead, per-clip trim in/out,
reorder, remove + undo/redo round-trip, image overlays (drag on canvas), layer ordering,
aspect crop 9:16/1:1/16:9, 0.5–2× speed, BGM + auto-enhance chain, timed captions,
multi-clip export → 720p/1280×720 MP4 (h264+opus, ~5.3 s for a 5 s 3-clip timeline),
red/bars/sticker/caption all confirmed in extracted frames, SW offline shell, zero console errors.
Note: Auto-Caption requires a real microphone (not automatable headless); it fails gracefully.
