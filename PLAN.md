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


## Cross-platform dual-mode (current)
- **Desktop (>=1024px)**: 3-column studio - left icon rail, center stage, right step panels, bottom multi-track timeline bar.
- **Tablet (768-1023px)**: single-column stacked, rail removed, ~150px timeline.
- **Android (<768px)**: compact top stage (~32dvh, 100dvh-safe viewport), tool panel = slide-up CapCut Mobile sheet (same DOM/ids as desktop), bottom fixed dock (Import/Audio/Text/Stickers/Captions/Speed/Canvas).
- **Dock actions**: fire jumpToCard() on each quick tool; Canvas flashes the aspect-switcher.
- **Filmstrip thumbnails**: each clip captures a 176x99 JPEG tile at ~35% duration; reused across split (same source). Every V1 block shows a real frame preview on touch and mouse.
- **Split tactile feedback**: white/neon flash at the cut point + micro-pop animation on the fresh halves. Fires on both Split button and 'S' shortcut (laneV1 pinch also exists for two-finger zoom; Ctrl+scroll is desktop's alternative).
- **Pinch-to-zoom**: two-pointer touch on the V1 lane (Pointer Events), 0.6x-3.0x; double-tap resets to 1x. timelineZoom in state multiplies flex-grow; min-width catches via .has-thumb CSS.
- **Service worker v23** - clients fetch the new build immediately.
- **Verified end-to-end** (Chromium, fresh SW): thumbnails render (has-thumb on all 3 blocks after split), split flash + pop fire, mobile dock resolves 7 thumb buttons, 0 console errors.
