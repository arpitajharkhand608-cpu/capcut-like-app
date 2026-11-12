/* ═══════════════════════════════════════════════════════════
   capcut-like-app — app.js (MULTI-TRACK PROFESSIONAL)
   Import → Timeline (split/trim/reorder) → Overlays → Auto-Enhance →
   Captions (manual + Auto STT) → Live Preview → High-Bitrate Export
   100% client-side. No uploads, no backend, no paid dependencies.
   ═══════════════════════════════════════════════════════════ */
'use strict';

/* ─────────────────────────────────────────────
   DOM handles
   ───────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);

const fileInput    = $('fileInput');
const addMediaBtn  = $('addMediaBtn');
const emptyImport  = $('emptyImportBtn');
const videoMeta    = $('videoMeta');

const undoBtn      = $('undoBtn');
const redoBtn      = $('redoBtn');

const clipTimeline = $('clipTimeline');
const timelineEmpty= $('timelineEmpty');
const clipEditButtons = [$('splitBtn'), $('trimInBtn'), $('trimOutBtn'), $('moveLeftBtn'), $('moveRightBtn'), $('removeClipBtn')];
const splitBtn     = $('splitBtn');
const trimInBtn    = $('trimInBtn');
const trimOutBtn   = $('trimOutBtn');
const moveLeftBtn  = $('moveLeftBtn');
const moveRightBtn = $('moveRightBtn');
const removeClipBtn= $('removeClipBtn');
const activeClipInfo = $('activeClipInfo');
const clipPool     = $('clipPool');
const lanesWrap     = $('lanesWrap');
const playheadMarker = $('playheadMarker');
const lanesInner     = $('lanesInner');
const zoomOutBtn     = $('zoomOutBtn');
const zoomInBtn      = $('zoomInBtn');
const laneA1         = $('laneA1');
const laneT1         = $('laneT1');

const bgmChip      = $('bgmChip');
const bgmName      = $('bgmName');
const removeBgmBtn = $('removeBgmBtn');
const videoVolume  = $('videoVolume');
const bgmVolume    = $('bgmVolume');
const videoVolumeVal = $('videoVolumeVal');
const bgmVolumeVal   = $('bgmVolumeVal');

const overlayList  = $('overlayList');
const overlayEmpty = $('overlayEmpty');
const overlayTools = $('overlayTools');
const overlayScale = $('overlayScale');
const overlayScaleVal = $('overlayScaleVal');
const overlayFrontBtn = $('overlayFrontBtn');
const overlayBackBtn  = $('overlayBackBtn');
const overlayDeleteBtn= $('overlayDeleteBtn');

const captionText      = $('captionText');
const captionColor     = $('captionColor');
const captionSize      = $('captionSize');
const captionSizeVal   = $('captionSizeVal');
const positionButtons  = Array.from(document.querySelectorAll('[data-position]'));
const captionStyleButtons = Array.from(document.querySelectorAll('#captionStyleGroup [data-captionstyle]'));
const watermarkEnabled = $('watermarkEnabled');
const watermarkTools   = $('watermarkTools');
const watermarkText    = $('watermarkText');
const watermarkColor   = $('watermarkColor');
const watermarkSize    = $('watermarkSize');
const watermarkSizeVal = $('watermarkSizeVal');
const watermarkOpacity = $('watermarkOpacity');
const watermarkOpacityVal = $('watermarkOpacityVal');
const watermarkPosButtons = Array.from(document.querySelectorAll('#watermarkPosGroup [data-wmpos]'));
const transitionButtons = Array.from(document.querySelectorAll('#transitionGroup [data-transition]'));
const boldToggle       = $('boldToggle');
const outlineToggle    = $('outlineToggle');
const addCaptionBtn    = $('addCaptionBtn');
const updateCaptionBtn = $('updateCaptionBtn');
const captionList      = $('captionList');
const captionEmpty     = $('captionEmpty');

const autoCaptionBtn    = $('autoCaptionBtn');
const autoCaptionLabel  = $('autoCaptionLabel');
const autoCaptionLang   = $('autoCaptionLang');
const autoCaptionStatus = $('autoCaptionStatus');

const aspectButtons  = Array.from(document.querySelectorAll('#aspectGroup [data-aspect]'));
const speedButtons   = Array.from(document.querySelectorAll('#speedGroup [data-speed]'));
const stageFrame     = $('stageFrame');

const exportBtn        = $('exportBtn');
const exportTopBtn     = $('exportTopBtn');
const exportOverlay    = $('exportOverlay');
const exportPhase      = $('exportPhase');
const exportProgressBar= $('exportProgressBar');
const exportPercent    = $('exportPercent');

const canvas       = $('previewCanvas');
const ctx          = canvas.getContext('2d', { alpha: false });
const emptyState   = $('emptyState');
const bgmAudio     = $('bgmAudio');

const playPauseBtn = $('playPauseBtn');
const playIcon     = $('playIcon');
const pauseIcon    = $('pauseIcon');
const seekBar      = $('seekBar');
const timecodeDisplay = $('timecodeDisplay');
const muteBtn      = $('muteBtn');
const volIcon      = $('volIcon');
const mutedIcon    = $('mutedIcon');

const toastEl      = $('toast');

/* ─────────────────────────────────────────────
   State
   ───────────────────────────────────────────── */
const state = {
  clips: [],               // [{ id, name, url, duration, in, out, width, height, el }]
  activeClipIndex: 0,
  hasVideo: false,         // true when ≥ 1 clip
  bgmObjectUrl: null,
  bgmLoaded: false,
  exporting: false,
  muted: false,
  captions: [],            // [{ id, text, color, size, position, bold, outline, start, end }]
  selectedCaptionId: null,
  captionPosition: 'middle',
  captionBold: true,
  captionOutline: true,
  captionStyle: 'classic',   // 'classic' | 'box' (Instagram Bold Box — reels-style pill captions)
  overlays: [],            // [{ id, name, url, x, y, width, img }]
  selectedOverlayId: null,
  aspect: '16:9',
  speed: 1,
  transition: 'none',      // 'none' | 'dissolve' | 'fade' — between consecutive clips
  watermark: {             // persistent top-layer text (handles, brands)
    enabled: false,
    text: '@capcut-like-app',
    color: '#ffffff',
    size: 26,
    opacity: 70,
    x: 0.96,               // normalized anchor (baseline left/right/center per x-zone)
    y: 0.93,
    _box: null,            // {x0,y0,x1,y1} canvas-fraction bbox for hit-testing (set at draw time)
  },
  activeRecorder: null,    // set during export → trim watchdog stops it
  clipIdSeq: 1,
  captionIdSeq: 1,
  overlayIdSeq: 1,
  pxPerSec: 120,           // horizontal pixels per second of timeline (zoom-level)
  timelineSync: false,     // guard flag to prevent scroll→seek feedback loops
};

const MAX_RENDER_WIDTH = 1280;
const ASPECT_SIZES = {
  '16:9': { w: 1280, h: 720  },
  '1:1':  { w: 960,  h: 960  },
  '9:16': { w: 720,  h: 1280 },
};
const ASPECT_RATIO_CSS = { '16:9': '16 / 9', '1:1': '1 / 1', '9:16': '9 / 16' };
const EXPORT_VIDEO_BITS = 8_000_000;   // 8 Mbps — visually lossless-ish at 720p
const EXPORT_AUDIO_BITS = 192_000;     // 192 kbps AAC/Opus
const EXPORT_FPS       = 30;
const MIN_CLIP_GAP     = 0.1;          // seconds — minimum clip length after trim/split
const UNDO_LIMIT       = 50;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const round2 = (v) => Math.round(v * 100) / 100;

/* ═════════════════════════════════════════════
   UNDO / REDO — JSON snapshot stacks
   Snapshot captures everything the user can mutate:
   clip order + in/out, captions, overlays, aspect, speed.
   Object URLs are stable refs → snapshots stay tiny.
   ═════════════════════════════════════════════ */
const undoStack = [];
const redoStack = [];
let restoring = false;

function snapshotState() {
  return JSON.stringify({
    clips: state.clips.map(c => ({
      id: c.id, name: c.name, url: c.url, duration: c.duration,
      in: c.in, out: c.out, width: c.width, height: c.height,
    })),
    active: state.activeClipIndex,
    captions: state.captions,
    overlays: state.overlays.map(o => ({
      id: o.id, name: o.name, url: o.url, x: o.x, y: o.y, width: o.width,
    })),
    aspect: state.aspect,
    speed: state.speed,
    captionStyle: state.captionStyle,
    transition: state.transition,
    watermark: {
      enabled: state.watermark.enabled,
      text: state.watermark.text,
      color: state.watermark.color,
      size: state.watermark.size,
      opacity: state.watermark.opacity,
      x: state.watermark.x,
      y: state.watermark.y,
    },
    clipIdSeq: state.clipIdSeq,
    captionIdSeq: state.captionIdSeq,
    overlayIdSeq: state.overlayIdSeq,
  });
}

/** Call BEFORE applying a mutation. */
function commit() {
  if (restoring) return;
  const snap = snapshotState();
  if (undoStack.length && undoStack[undoStack.length - 1] === snap) return;
  undoStack.push(snap);
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  redoStack.length = 0;
  updateUndoButtons();
}

function updateUndoButtons() {
  undoBtn.disabled = undoStack.length === 0;
  redoBtn.disabled = redoStack.length === 0;
}

function restoreSnapshot(json) {
  restoring = true;
  try {
    const s = JSON.parse(json);

    // ── Clips: reuse existing media elements by id (keeps decode warm), rebuild the rest
    const oldById = new Map(state.clips.map(c => [c.id, c]));
    const newClips = (s.clips || []).map(sc => {
      const old = oldById.get(sc.id);
      if (old) {
        old.in = sc.in; old.out = sc.out; old.duration = sc.duration;
        oldById.delete(sc.id);
        return old;
      }
      return createClipElement(sc);
    });
    // Dispose media elements that vanished from the snapshot
    oldById.forEach(c => { if (c.el) { c.el.pause(); c.el.removeAttribute('src'); c.el.load(); c.el.remove(); } });
    state.clips = newClips;
    state.activeClipIndex = clamp(s.active || 0, 0, Math.max(0, state.clips.length - 1));

    // ── Captions & counters
    state.captions = Array.isArray(s.captions) ? s.captions : [];
    state.clipIdSeq    = s.clipIdSeq    || 1;
    state.captionIdSeq = s.captionIdSeq || 1;
    state.overlayIdSeq = s.overlayIdSeq || 1;
    state.hasVideo = state.clips.length > 0;

    // ── Overlays: reuse loaded Image objects by id; reload the rest
    const oldOvById = new Map(state.overlays.map(o => [o.id, o]));
    state.overlays = (s.overlays || []).map(so => {
      const old = oldOvById.get(so.id);
      if (old) { Object.assign(old, so); old.img = old.img || null; if (!old.img) loadOverlayImage(old); oldOvById.delete(so.id); return old; }
      const o = { ...so, img: null };
      loadOverlayImage(o);
      return o;
    });

    // ── Format
    state.captionStyle = s.captionStyle === 'box' ? 'box' : 'classic';
    setCaptionStyleButtons(state.captionStyle);
    state.transition = (s.transition === 'dissolve' || s.transition === 'fade') ? s.transition : 'none';
    setTransitionButtons(state.transition);
    if (s.watermark && typeof s.watermark === 'object') {
      // New exports store x/y; legacy snapshots may carry a corner preset — map it forward.
      const LEGACY_WM = { tl: [0.04, 0.10], tr: [0.96, 0.10], center: [0.5, 0.55], bl: [0.04, 0.93], br: [0.96, 0.93] };
      let wmX = Number(s.watermark.x), wmY = Number(s.watermark.y);
      const legacy = LEGACY_WM[s.watermark.position];
      if (!Number.isFinite(wmX) || !Number.isFinite(wmY)) {
        wmX = legacy ? legacy[0] : 0.96;
        wmY = legacy ? legacy[1] : 0.93;
      }
      state.watermark = {
        enabled: !!s.watermark.enabled,
        text: String(s.watermark.text != null ? s.watermark.text : '@capcut-like-app'),
        color: s.watermark.color || '#ffffff',
        size: clamp(Number(s.watermark.size) || 26, 12, 72),
        opacity: clamp(Number(s.watermark.opacity) || 70, 10, 100),
        x: clamp(wmX, 0.02, 0.98),
        y: clamp(wmY, 0.02, 0.98),
        _box: null,
      };
      syncWatermarkUI();
    }
    applyAspectToCanvas();
    setAspectButtons(s.aspect || '16:9');
    setSpeed(s.speed || 1, true);

    // ── Repaint everything
    renderTimeline();
    renderOverlayList();
    renderCaptionList();
    refreshTransportBounds();
    activateClip(state.activeClipIndex, undefined, false, true);
    drawFrame();
    updateEmptiness();
  } finally {
    restoring = false;
  }
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshotState());
  restoreSnapshot(undoStack.pop());
  updateUndoButtons();
  showToast('Undo');
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshotState());
  restoreSnapshot(redoStack.pop());
  updateUndoButtons();
  showToast('Redo');
}

/* ─────────────────────────────────────────────
   Toast helper
   ───────────────────────────────────────────── */
let toastTimer = null;
function showToast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.classList.toggle('is-error', isError);
  toastEl.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 4200);
}

/* ─────────────────────────────────────────────
   Time formatting
   ───────────────────────────────────────────── */
function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '00:00';
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return String(m).padStart(2, '0') + ':' + String(rem).padStart(2, '0');
}

/* ═════════════════════════════════════════════
   WEB AUDIO — 100% AUTOMATIC enhancement chain
   videoEl ─┐
            ├─▶ highpass(80 Hz) ─▶ compressor(−18 dB · 10:1) ─▶ mixGain ─┬─▶ monitorGain ─▶ speakers
   bgmEl ───┘                                                            └─▶ exportDest ─▶ MediaRecorder
   Always in-circuit, zero manual controls. videoGain/bgmGain = user volume faders only.
   ═════════════════════════════════════════════ */
let audioCtx      = null;
let videoGain     = null;   // user "Clip audio" fader
let bgmGain       = null;   // user "BGM" fader
let monitorGain   = null;   // unity monitor bus
let exportDest    = null;   // MediaStreamAudioDestinationNode
const clipSources = new Map(); // clipId → { src, hp, comp } — tapped once per element
let bgmSourceNode = null;

function ensureAudioGraph() {
  if (audioCtx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) {
    showToast('Web Audio API is not supported. Export audio may be silent.', true);
    return;
  }
  audioCtx = new AC();

  videoGain   = audioCtx.createGain(); videoGain.gain.value   = Number(videoVolume.value) / 100;
  bgmGain     = audioCtx.createGain(); bgmGain.gain.value     = Number(bgmVolume.value) / 100;
  monitorGain = audioCtx.createGain(); monitorGain.gain.value = 1;
  exportDest  = audioCtx.createMediaStreamDestination();

  // Faders split post-enhancement: the SAME processed signal feeds monitor & export.
  videoGain.connect(monitorGain);
  videoGain.connect(exportDest);
  bgmGain.connect(monitorGain);
  bgmGain.connect(exportDest);
  monitorGain.connect(audioCtx.destination);

  // Tap BGM element (exists from page load) and every clip created so far
  tapBgmElement();
  for (const clip of state.clips) tapClipElement(clip);
}

/** Independent enhancer chain per tap point: source → HighPass(80Hz) → Compressor(−18dB·10:1) → tapGain (transition ride) → fader → tee(monitor, export). */
function buildEnhancerChain() {
  const hp = audioCtx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 80;      // kills sub-rumble, handling noise and hiss fundamental
  hp.Q.value = 0.707;

  const comp = audioCtx.createDynamicsCompressor();
  comp.threshold.value = -18;   // lift quiet speech, tame peaks — loudness normalization
  comp.knee.value      = 24;
  comp.ratio.value     = 10;
  comp.attack.value    = 0.003;
  comp.release.value   = 0.24;

  const gain = audioCtx.createGain(); // per-clip equal-power transition ride (silent until activated)
  gain.gain.value = 0;

  hp.connect(comp);
  comp.connect(gain);
  return { hp, comp, gain };
}

/** Equal-power gain rides for seamless clip transitions (preview AND export). */
function setTapGain(clipId, value) {
  const chain = clipSources.get(clipId);
  if (!chain || !audioCtx) return;
  chain.gain.gain.setTargetAtTime(clamp(value, 0, 1), audioCtx.currentTime, 0.03);
}

/** Reset every clip's tap gain to idle (active = 1, everything else = 0). */
function applyTapGains(activeIndex = state.activeClipIndex) {
  state.clips.forEach((clip, i) => setTapGain(clip.id, i === activeIndex ? 1 : 0));
}

function tapClipElement(clip) {
  if (!audioCtx || !clip.el || clipSources.has(clip.id)) return;
  try {
    const src = audioCtx.createMediaElementSource(clip.el);
    const { hp, comp, gain } = buildEnhancerChain();
    src.connect(hp);
    gain.connect(videoGain);
    clipSources.set(clip.id, { src, hp, comp, gain });
  } catch (err) {
    console.warn('clip source tap failed:', err);
  }
}

function tapBgmElement() {
  if (!audioCtx || bgmSourceNode) return;
  try {
    bgmSourceNode = audioCtx.createMediaElementSource(bgmAudio);
    const { hp, comp } = buildEnhancerChain();
    bgmSourceNode.connect(hp);
    comp.connect(bgmGain);
  } catch (err) {
    console.warn('bgm source tap failed:', err);
  }
}

async function resumeAudio() {
  ensureAudioGraph();
  if (audioCtx && audioCtx.state === 'suspended') {
    try { await audioCtx.resume(); } catch (_) { /* gesture required; retried on next tap */ }
  }
}

/* ═════════════════════════════════════════════
   TIMELINE MODEL — helpers
   ═════════════════════════════════════════════ */
function activeClip() { return state.clips[state.activeClipIndex] || null; }

function clipEffectiveDuration(clip) {
  return Math.max(0, clip.out - clip.in) / state.speed;
}

function totalEffectiveDuration() {
  return state.clips.reduce((sum, c) => sum + clipEffectiveDuration(c), 0);
}

/** Global (timeline) seconds for a clip + sourceTime inside it. */
function globalFromClip(index, sourceTime) {
  let t = 0;
  for (let i = 0; i < index; i++) t += clipEffectiveDuration(state.clips[i]);
  const clip = state.clips[index];
  if (!clip) return t;
  return t + clamp((sourceTime - clip.in) / state.speed, 0, clipEffectiveDuration(clip));
}

/** Which clip lives at global timeline second t? */
function clipAtGlobal(t) {
  let acc = 0;
  for (let i = 0; i < state.clips.length; i++) {
    const d = clipEffectiveDuration(state.clips[i]);
    if (t < acc + d || i === state.clips.length - 1) {
      return { index: i, clip: state.clips[i], sourceTime: state.clips[i].in + (t - acc) * state.speed, offset: t - acc };
    }
    acc += d;
  }
  const last = state.clips.length - 1;
  return { index: last, clip: state.clips[last], sourceTime: state.clips[last].in, offset: 0 };
}

/** Current global playhead position (seconds). */
function getGlobalTime() {
  const clip = activeClip();
  if (!clip) return 0;
  return globalFromClip(state.activeClipIndex, clip.el ? clip.el.currentTime : clip.in);
}

/* ═════════════════════════════════════════════
   CLIP CREATION / MEDIA POOL
   ═════════════════════════════════════════════ */
function loadOverlayImage(overlay) {
  const img = new Image();
  img.onload = () => { overlay.img = img; overlay.loaded = true; drawFrame(); };
  img.onerror = () => { overlay.loaded = false; showToast(`Could not decode image “${overlay.name}”.`, true); };
  img.src = overlay.url;
  overlay.img = null;
  overlay.loaded = false;
}

/* ═════════════════════════════════════════════
   FILMSTRIP THUMBNAILS — offscreen canvas capture
   Small JPEG tiles (~176×99) for each V1 clip block.
   Extracted once per clip at ~35% into the visible range,
   then served from memory (zero ongoing decode cost).
   ═════════════════════════════════════════════ */
const thumbQueue = [];
let thumbProcessing = false;
const enqueueThumbnail = (clip) => {
  if (clip.thumb || clip._thumbQueued) return;
  const isDesktop = window.matchMedia('(min-width: 768px)').matches;
  // Mobile gets smaller tiles (112x63) to keep decode+GC cost low on 1–2 GB RAM phones.
  clip._thumbQueued = true;
  thumbQueue.push({ clip, isDesktop });
  processThumbQueue();
};
const processThumbQueue = () => {
  if (thumbProcessing) return;
  const next = thumbQueue.shift();
  if (!next) return;
  const { clip, isDesktop } = next;
  if (!clip) return;
  thumbProcessing = true;
  // Sequential, throttled — Android low-RAM phones decode one video at a time, never in parallel
  generateClipThumbnail({ clip, tileW: isDesktop ? 176 : 112, tileH: isDesktop ? 99 : 63 }, () => {
    clip._thumbQueued = false;
    thumbProcessing = false;
    // Small breathing gap between heavy frame decodes
    window.setTimeout(processThumbQueue, 60);
  });
};

function generateClipThumbnail(options, done) {
  const { clip, tileW = 176, tileH = 99 } = options;
  const finish = () => { if (typeof done === 'function') done(); };
  if (clip.thumb) { finish(); return; }
  const video = clip.el;
  let painted = false;

  const paint = () => {
    if (painted || clip.thumb) { finish(); return; }
    painted = true;
    try {
      const c = document.createElement('canvas');
      c.width = tileW; c.height = tileH;
      const tctx = c.getContext('2d');
      if (!tctx) { finish(); return; }
      const vw = video.videoWidth || 320, vh = video.videoHeight || 240;
      const scale = Math.max(c.width / vw, c.height / vh); // cover
      const dw = vw * scale, dh = vh * scale;
      tctx.drawImage(video, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
      clip.thumb = c.toDataURL('image/jpeg', 0.55); // ~4–6 KB per tile
      renderTimeline();
    } catch (_) { /* detached element or decode failure — thumbnails are optional */ }
    try { video.currentTime = clip.in || 0; } catch (_) { /* nothing to rewind */ }
    finish();
  };

  const attempt = () => {
    if (clip.thumb || !video.isConnected) { finish(); return; }
    if (video.readyState >= 2 && !video.seeking) {
      const dur = Number.isFinite(video.duration) ? video.duration : 0;
      const boundary = Number.isFinite(clip.out) ? clip.out : dur;
      const at = clamp(Math.min(dur * 0.35, Math.max(0, boundary - 0.4)), 0.1, Math.max(0.1, dur - 0.1));
      video.addEventListener('seeked', paint, { once: true });
      try { video.currentTime = at; } catch (_) { video.removeEventListener('seeked', paint); paint(); }
    } else {
      video.addEventListener('loadeddata', attempt, { once: true });
      // Safety net: never hang the queue on a stuck element
      window.setTimeout(() => { if (!painted) paint(); }, 2500);
    }
  };
  attempt();
}

function createClipElement(ref) {
  const video = document.createElement('video');
  video.preload = 'metadata'; // light — only the ACTIVE clip gets upgraded to 'auto' (low-RAM rule)
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.src = ref.url;
  video.playbackRate = state.speed;
  video.load();
  clipPool.appendChild(video);

  const clip = {
    id: ref.id,
    name: ref.name,
    url: ref.url,
    duration: ref.duration || 0,
    in: ref.in != null ? ref.in : 0,
    out: ref.out != null ? ref.out : (ref.duration || 0),
    width: ref.width || 0,
    height: ref.height || 0,
    el: video,
  };

  // Media-event hub for this clip element (timeupdate/pointer-starvation-safe enough for UI)
  video.addEventListener('play', () => {
    video.playbackRate = state.speed;
    syncBgmToVideo(true);
    if (state.bgmLoaded && bgmAudio.paused) { bgmAudio.playbackRate = state.speed; bgmAudio.play().catch(() => {}); }
    updateTransportUI();
  });
  video.addEventListener('pause', () => {
    if (clip !== activeClip()) return;
    bgmAudio.pause();
    if (autoCapSession.active) stopAutoCaption(true);
    maybeStopExportRecorder();
    updateTransportUI();
  });
  video.addEventListener('timeupdate', () => {
    if (clip !== activeClip()) return;
    tickPlayhead();
    updateTransportUI();
    if (!video.paused) syncBgmToVideo(false);
  });
  video.addEventListener('ended', () => {
    if (clip !== activeClip()) return;
    if (autoCapSession.active) stopAutoCaption();
    maybeStopExportRecorder();
    updateTransportUI();
  });

  const onMeta = () => {
    clip.duration = Number.isFinite(video.duration) ? video.duration : 0;
    if (!(clip.out > clip.in)) clip.out = clip.duration;
    if (clip.out > clip.duration) clip.out = clip.duration;
    clip.width = video.videoWidth || 0;
    clip.height = video.videoHeight || 0;
    if (audioCtx) tapClipElement(clip);
    enqueueThumbnail(clip);
    refreshTransportBounds();
    renderTimeline();
    drawFrame();
  };
  video.addEventListener('loadedmetadata', onMeta);
  if (video.readyState >= 1) onMeta();

  // A corrupt file in a multi-file batch must not wedge the timeline — prune it cleanly.
  video.addEventListener('error', () => {
    const idx = state.clips.findIndex(c => c.el === video);
    if (idx === -1) return;
    const clip = state.clips[idx];
    state.clips.splice(idx, 1);

    // Detach its audio chain if it was tapped (source may already be disconnected — guarded)
    const chain = clipSources.get(clip.id);
    if (chain) {
      try { chain.src.disconnect(); } catch (_) {}
      try { chain.hp.disconnect(); } catch (_) {}
      try { chain.gain.disconnect(); } catch (_) {}
      clipSources.delete(clip.id);
    }

    video.pause();
    video.removeAttribute('src');
    video.load();
    video.remove();

    if (state.activeClipIndex >= state.clips.length) {
      state.activeClipIndex = Math.max(0, state.clips.length - 1);
    }
    updateEmptiness();
    if (state.clips.length) activateClip(state.activeClipIndex, undefined, false, true);
    refreshTransportBounds();
    renderTimeline();
    drawFrame();
    showToast(`Could not decode “${clip.name}” — removed from the timeline.`, true);
  }, { once: true });

  return clip;
}

function createVideoClipFromFile(file) {
  const url = URL.createObjectURL(file);
  const id = state.clipIdSeq++;
  const name = file.name.length > 38 ? file.name.slice(0, 35) + '…' : file.name;
  return createClipElement({ id, name, url, duration: 0 });
}

function handleVideoFiles(files) {
  if (!files || !files.length) return;
  const list = Array.from(files).filter(f =>
    f.type.startsWith('video/') || /\.(mp4|webm|mov|mkv|m4v)$/i.test(f.name));
  if (!list.length) { showToast('No video files found in that drop.', true); return; }

  commit();
  for (const file of list) state.clips.push(createVideoClipFromFile(file));
  state.hasVideo = true;
  if (state.activeClipIndex >= state.clips.length) state.activeClipIndex = 0;
  updateEmptiness();
  refreshTransportBounds();
  renderTimeline();
  activateClip(0, undefined, false, true);
  showToast(list.length === 1 ? 'Clip added to the timeline.' : `${list.length} clips added to the timeline.`);
}

/** Full emptiness pass — toggles empty state + control availability. */
function updateEmptiness() {
  const has = state.clips.length > 0;
  state.hasVideo = has;
  emptyState.hidden = has;
  playPauseBtn.disabled = !has;
  seekBar.disabled = !has;
  muteBtn.disabled = !has;
  splitBtn.disabled = !has;
  exportBtn.disabled = !has || state.exporting;
  exportTopBtn.disabled = !has || state.exporting;
  autoCaptionBtn.disabled = !has || !autoCaptionSupported();
  clipEditButtons.forEach(btn => { if (btn) btn.disabled = !has; });
  clipTimeline.parentElement.querySelector('#timelineEmpty').hidden = has;
}

/** Activate clip `index`, pause everything else, optionally start playback. */
function activateClip(index, sourceTime, autoplay = false, keepPlayhead = false) {
  if (!state.clips.length) return;
  state.activeClipIndex = clamp(index, 0, state.clips.length - 1);
  state.clips.forEach((c, i) => {
    if (i !== state.activeClipIndex && c.el && !c.el.paused) c.el.pause();
  });
  const clip = activeClip();
  if (!clip || !clip.el) return;
  clip.el.preload = 'auto'; // the active clip deserves the full buffer; the rest stay lightweight
  if (audioCtx) { tapClipElement(clip); applyTapGains(); }  // lazy tap + idle transition gains

  let t;
  if (sourceTime != null) t = sourceTime;
  else if (keepPlayhead && Number.isFinite(clip.el.currentTime)) t = clip.el.currentTime;
  else t = clip.in;
  const upper = Math.max(clip.in, Math.min(clip.out - 0.01, clip.duration - 0.01));
  try { clip.el.currentTime = clamp(t, Math.min(clip.in, upper), upper); } catch (_) { /* element not seekable yet */ }

  clip.el.playbackRate = state.speed;
  bgmAudio.playbackRate = state.speed;
  state.clips.forEach(c => { if (c.el) delete c.el.__transitionedIn; }); // pre-roll flags restart clean
  if (autoplay) {
    clip.el.play().catch(() => showToast('Tap play to start playback.', true));
    if (state.bgmLoaded && bgmAudio.paused) bgmAudio.play().catch(() => {});
  }
  renderTimeline();
  syncBgmToVideo(true);
  updateTransportUI();
}

/** Pre-roll + ride the incoming clip's audio equal-power with the outgoing one.
 *  Runs every frame (preview AND export): the incoming clip starts TRANSITION_TIME
 *  before the cut so visual and audio both crossfade — never a hard jump. */
function transitionTick() {
  if (state.transition === 'none') return;
  const clip = activeClip();
  if (!clip || !clip.el) return;
  const nextIdx = state.activeClipIndex + 1;
  const next = state.clips[nextIdx];
  if (!next || !next.el) return;

  const remaining = clip.out - clip.el.currentTime;
  const T = TRANSITION_TIME;

  if (clip.el.paused) {
    // Held while paused: freeze the incoming clip too if it was pre-rolled
    if (next.el.__transitionedIn && !next.el.paused) next.el.pause();
    return;
  }

  if (remaining <= T && remaining > -0.05) {
    if (next.el.paused && !next.el.__transitionedIn) {
      try { next.el.currentTime = next.in; } catch (_) { /* not seekable yet */ }
      next.el.playbackRate = state.speed;
      next.el.play().catch(() => { /* autoplay blocked — visual dissolve still works */ });
      next.el.__transitionedIn = true;
    }
    const p = clamp((T - Math.max(0, remaining)) / T, 0, 1);
    const ease = p * p * (3 - 2 * p);
    setTapGain(clip.id, Math.cos(ease * Math.PI / 2));
    setTapGain(next.id, Math.sin(ease * Math.PI / 2));
  }
}

/** Playhead advances across clips — checked every frame (robust under load).
 *  Advance rule: the playhead may advance only when the clip is playing, or when the
 *  media element itself ended (natural end at out == duration). A deliberate user pause
 *  parked exactly on a boundary never hijacks the transport. */
function tickPlayhead() {
  const clip = activeClip();
  if (!clip || !clip.el) return;
  transitionTick();
  const reached = clip.el.currentTime >= clip.out - 0.03;
  if (!reached) return;
  if (clip.el.paused && !clip.el.ended) return; // user parked on the boundary

  if (state.activeClipIndex < state.clips.length - 1) {
    const nextIndex = state.activeClipIndex + 1;
    const next = state.clips[nextIndex];
    activateClip(nextIndex, next.in, true);
  } else if (!clip.el.paused) {
    clip.el.currentTime = clip.out;
    clip.el.pause(); // pause handler → UI update + export stop
  }
}

/* ═════════════════════════════════════════════
   TIMELINE UI — clip blocks + inspector tools
   ═════════════════════════════════════════════ */
let lanesWidthLimit = 0;

function layoutTimeline() {
  if (!clipTimeline) return;
  const total = totalEffectiveDuration();
  const pxPerSec = clamp(state.pxPerSec || 120, 30, 420);
  const pxPerClip = 24; // min block width

  // Size the inner canvas: wide enough for all clips, filling the viewport width if short
  const naturalWidth = Math.max(1, Math.ceil(total * pxPerSec));
  const innerWidth = Math.max(naturalWidth, lanesWrap.clientWidth || 200);
  lanesInner.style.width = innerWidth + 'px';
  clipTimeline.style.width = innerWidth + 'px';

  let start = 0;
  for (const clip of state.clips) {
    const dur = clipEffectiveDuration(clip);
    const left = start * pxPerSec;
    const width = Math.max(pxPerClip, dur * pxPerSec);
    clip.x = left;
    clip.width = width;
    start += dur;
  }

  for (const clip of state.clips) {
    const btn = clipTimeline.querySelector(`[data-clip-id="${clip.id}"]`);
    if (!btn) continue;
    btn.style.left = clip.x + 'px';
    btn.style.width = clip.width + 'px';
  }
}

function renderTimeline() {
  clipTimeline.innerHTML = '';
  if (!state.clips.length) { layoutTimeline(); return; }

  // Absolute positioning with a fixed center playhead — the exact CapCut approach:
  // the playhead is pinned, the lane scrolls. No flex-grow hacks.
  state.pxPerSec = clamp(state.pxPerSec || 120, 30, 420);

  state.clips.forEach((clip, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.clipId = String(clip.id);
    btn.className = 'clip-block' + (i === state.activeClipIndex ? ' is-active' : '');
    btn.setAttribute('role', 'listitem');
    btn.setAttribute('aria-label', `Clip ${i + 1}: ${clip.name}`);

    if (clip.thumb) {
      btn.style.setProperty('--thumb', `url("${clip.thumb}")`);
      btn.classList.add('has-thumb');
    } else {
      btn.classList.add('rail-text');
    }

    btn.innerHTML =
      `<span class="clip-handle clip-handle-left" data-trim="in" aria-hidden="true">[</span>` +
      `<span class="clip-handle clip-handle-right" data-trim="out" aria-hidden="true">]</span>` +
      `<span class="clip-index">${i + 1}</span>` +
      `<span class="clip-name">${escapeHtml(clip.name)}</span>` +
      `<span class="clip-dur">${formatTime(clipEffectiveDuration(clip))}</span>`;

    btn.addEventListener('click', (e) => {
      if (dragTrimState.active) return; // ignore click after a trim drag
      commit();
      activateClip(i, clip.in, false);
      drawFrame();
    });
    clipTimeline.appendChild(btn);
  });
  layoutTimeline();

  const clip = activeClip();
  activeClipInfo.textContent = clip
    ? `Clip ${state.activeClipIndex + 1}/${state.clips.length} · “${clip.name}” · in ${clip.in.toFixed(1)}s · out ${clip.out.toFixed(1)}s · ${formatTime(clipEffectiveDuration(clip))} selected`
    : '';
  moveLeftBtn.disabled  = state.activeClipIndex <= 0 || !state.clips.length;
  moveRightBtn.disabled = state.activeClipIndex >= state.clips.length - 1 || !state.clips.length;
  trimInBtn.disabled    = !state.clips.length;
  trimOutBtn.disabled   = !state.clips.length;
  removeClipBtn.disabled = !state.clips.length;
  splitBtn.disabled = !state.clips.length || state.exporting;
  renderLanes();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function splitAtPlayhead() {
  const clip = activeClip();
  if (!clip || !clip.el) return;
  const t = clamp(clip.el.currentTime || clip.in, clip.in + MIN_CLIP_GAP, clip.out - MIN_CLIP_GAP);
  if (!(t > clip.in + MIN_CLIP_GAP && t < clip.out - MIN_CLIP_GAP)) {
    showToast('Park the playhead inside the clip, then Split.', true);
    return;
  }
  commit();
  const rightUrl = clip.url; // shared source — same object URL, separate element
  const right = createClipElement({
    id: state.clipIdSeq++,
    name: clip.name,
    url: rightUrl,
    duration: clip.duration,
    in: t,
    out: clip.out,
    width: clip.width,
    height: clip.height,
  });
  clip.out = t;
  // Hand the filmstrip thumbnail (a still of the shared source) to the right half too —
  // same underlying clip, no re-extraction cost, looks like CapCut's filmstrip cut
  if (clip.thumb) right.thumb = clip.thumb;
  state.clips.splice(state.activeClipIndex + 1, 0, right);
  renderTimeline();
  refreshTransportBounds();
  // Tactile feedback: neon flash at the cut point + micro-pop on the fresh halves
  const lanesEl = $('lanesWrap');
  if (lanesEl) {
    const total = totalEffectiveDuration() || 1;
    const xPct = clamp((globalFromClip(state.activeClipIndex, clip.out) / total) * 100, 0, 100);
    lanesEl.style.setProperty('--split-x', xPct + '%');
    lanesEl.classList.remove('split-flash');
    void lanesEl.offsetWidth; // restart animation
    lanesEl.classList.add('split-flash');
    const kids = clipTimeline.children;
    if (kids && kids[state.activeClipIndex]) kids[state.activeClipIndex].classList.add('just-split');
    if (kids && kids[state.activeClipIndex + 1]) kids[state.activeClipIndex + 1].classList.add('just-split');
    window.setTimeout(() => lanesEl.classList.remove('split-flash'), 620);
  }
  drawFrame();
  showToast('Clip split at playhead.');
}

function trimClipEdge(which) {
  const clip = activeClip();
  if (!clip || !clip.el) return;
  const t = clip.el.currentTime || 0;
  if (which === 'in') {
    if (t >= clip.out - MIN_CLIP_GAP) { showToast('Trim-in must stay before the clip end.', true); return; }
    commit();
    clip.in = round2(t);
  } else {
    if (t <= clip.in + MIN_CLIP_GAP) { showToast('Trim-out must stay after the clip start.', true); return; }
    commit();
    clip.out = round2(t);
  }
  // Keep playhead inside the new window
  try { clip.el.currentTime = clamp(clip.el.currentTime, clip.in, clip.out - 0.01); } catch (_) {}
  renderTimeline();
  refreshTransportBounds();
  syncBgmToVideo(true);
  updateTransportUI();
  drawFrame();
  showToast(which === 'in' ? 'Clip start set to playhead.' : 'Clip end set to playhead.');
}

function moveClip(delta) {
  const i = state.activeClipIndex;
  const j = i + delta;
  if (i < 0 || j < 0 || j >= state.clips.length) return;
  commit();
  const [clip] = state.clips.splice(i, 1);
  state.clips.splice(j, 0, clip);
  state.activeClipIndex = j;
  renderTimeline();
  refreshTransportBounds();
  drawFrame();
}

/* ═════════════════════════════════════════════
   TOUCH TRIM-DRAG — [ and ] handles on each clip block
   Drag with finger or mouse to adjust in/out directly on the V1 track.
   No DOM rebuild during the gesture (mobile stays at 60fps).
   ═════════════════════════════════════════════ */
const dragTrimState = { active: null };

clipTimeline.addEventListener('pointerdown', (e) => {
  const handle = e.target.closest('[data-trim]');
  if (!handle) return;
  const block = handle.closest('.clip-block');
  if (!block) return;
  e.preventDefault();
  e.stopPropagation();
  const index = Array.prototype.indexOf.call(clipTimeline.children, block);
  const clip = state.clips[index];
  if (!clip || !clip.el) return;

  commit(); // snapshot PRE-trim so one Undo restores the original bounds
  const blockWidth = Math.max(24, block.getBoundingClientRect().width);
  dragTrimState.active = {
    clip,
    edge: handle.dataset.trim,
    startX: e.clientX,
    origIn: clip.in,
    origOut: clip.out,
    secPerPx: Math.max(0.001, (clip.out - clip.in) / blockWidth),
    block,
  };
  try { block.setPointerCapture(e.pointerId); } catch (_) { /* synthetic pointers */ }
});

clipTimeline.addEventListener('pointermove', (e) => {
  const s = dragTrimState.active;
  if (!s) return;
  e.preventDefault();
  const delta = (e.clientX - s.startX) * s.secPerPx;
  const MIN = 0.1;
  if (s.edge === 'in') {
    s.clip.in = clamp(s.origIn + delta, 0, s.clip.out - MIN);
  } else {
    s.clip.out = clamp(s.origOut + delta, s.clip.in + MIN, s.clip.duration || Infinity);
  }
  // Live label update — NO DOM rebuild during the gesture
  const durEl = s.block.querySelector('.clip-dur');
  if (durEl) durEl.textContent = formatTime(clipEffectiveDuration(s.clip));
  try {
    if (s.edge === 'in') {
      s.clip.el.currentTime = s.clip.in;
    } else {
      s.clip.el.currentTime = clamp(s.clip.el.currentTime, s.clip.in, s.clip.out - 0.01);
    }
  } catch (_) { /* element not seekable yet */ }
  refreshTransportBounds();
  syncBgmToVideo(true);
  updateTransportUI();
  drawFrame();
});

const endDragTrim = () => {
  const s = dragTrimState.active;
  if (!s) return;
  dragTrimState.active = null;
  refreshTransportBounds();
  syncBgmToVideo(true);
  updateTransportUI();
  renderTimeline(); // rebuild once at gesture end
  drawFrame();
};
clipTimeline.addEventListener('pointerup', endDragTrim);
clipTimeline.addEventListener('pointercancel', endDragTrim);
clipTimeline.addEventListener('pointerleave', endDragTrim);

function removeActiveClip() {
  const i = state.activeClipIndex;
  const clip = state.clips[i];
  if (!clip) return;
  commit();
  state.clips.splice(i, 1);
  if (clip.el) { clip.el.pause(); clip.el.removeAttribute('src'); clip.el.load(); clip.el.remove(); }
  const chain = clipSources.get(clip.id);
  if (chain) { try { chain.src.disconnect(); } catch (_) {} clipSources.delete(clip.id); }
  state.activeClipIndex = clamp(i, 0, Math.max(0, state.clips.length - 1));
  updateEmptiness();
  if (state.clips.length) activateClip(state.activeClipIndex, undefined, false, true);
  renderTimeline();
  refreshTransportBounds();
  drawFrame();
  showToast('Clip removed from the timeline.');
}

/* ═════════════════════════════════════════════
   OVERLAYS — image / sticker layers
   ═════════════════════════════════════════════ */
function addImageOverlays(files) {
  if (!files || !files.length) return;
  const list = Array.from(files).filter(f =>
    f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(f.name));
  if (!list.length) { showToast('No image files found in that drop.', true); return; }
  commit();
  for (const file of list) {
    const url = URL.createObjectURL(file);
    const overlay = {
      id: state.overlayIdSeq++,
      name: file.name.length > 38 ? file.name.slice(0, 35) + '…' : file.name,
      url,
      x: 0.5, y: 0.5,   // normalized canvas center
      width: 0.25,      // fraction of canvas width
      img: null,
      loaded: false,
    };
    loadOverlayImage(overlay);
    state.overlays.push(overlay);
    state.selectedOverlayId = overlay.id;
  }
  renderOverlayList();
  drawFrame();
  showToast(list.length === 1 ? 'Overlay added — drag it on the video.' : `${list.length} overlays added.`);
}

function selectedOverlay() {
  return state.overlays.find(o => o.id === state.selectedOverlayId) || null;
}

function renderOverlayList() {
  overlayList.innerHTML = '';
  overlayEmpty.hidden = state.overlays.length !== 0;
  overlayTools.hidden = state.overlays.length === 0;

  for (const o of state.overlays) {
    const li = document.createElement('li');
    li.className = 'overlay-item' + (o.id === state.selectedOverlayId ? ' is-selected' : '');

    const thumb = document.createElement('span');
    thumb.className = 'overlay-thumb';
    thumb.style.backgroundImage = `url("${o.url}")`;

    const name = document.createElement('span');
    name.className = 'overlay-name';
    name.textContent = o.name;
    name.title = o.name;

    const size = document.createElement('span');
    size.className = 'overlay-size';
    size.textContent = Math.round(o.width * 100) + '%';

    li.append(thumb, name, size);
    li.addEventListener('click', () => {
      state.selectedOverlayId = o.id;
      renderOverlayList();
      syncOverlayToolUI();
      drawFrame();
    });
    overlayList.appendChild(li);
  }
  syncOverlayToolUI();
}

function syncOverlayToolUI() {
  const o = selectedOverlay();
  if (!o) return;
  overlayScale.value = String(Math.round(o.width * 100));
  overlayScaleVal.textContent = Math.round(o.width * 100) + '%';
}

function moveOverlay(direction) { // +1 = toward front (end of array), −1 = toward back
  const i = state.overlays.findIndex(o => o.id === state.selectedOverlayId);
  if (i < 0) return;
  const j = clamp(i + direction, 0, state.overlays.length - 1);
  if (i === j) return;
  commit();
  const [o] = state.overlays.splice(i, 1);
  state.overlays.splice(j, 0, o);
  renderOverlayList();
  drawFrame();
}

function deleteSelectedOverlay() {
  const i = state.overlays.findIndex(o => o.id === state.selectedOverlayId);
  if (i < 0) return;
  commit();
  const [o] = state.overlays.splice(i, 1);
  state.selectedOverlayId = state.overlays.length ? state.overlays[Math.min(i, state.overlays.length - 1)].id : null;
  renderOverlayList();
  drawFrame();
  showToast(`Overlay “${o.name}” removed.`);
}

/* Pointer dragging directly on the canvas — overlays AND the watermark layer */
const dragState = { kind: null, id: null, dx: 0, dy: 0, moved: false };

function canvasPointFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / rect.width,
    y: (e.clientY - rect.top) / rect.height,
  };
}

function hitWatermark(nx, ny) {
  const box = state.watermark.enabled ? state.watermark._box : null;
  if (!box) return false;
  return nx >= box.x0 && nx <= box.x1 && ny >= box.y0 && ny <= box.y1;
}

function hitTestOverlays(nx, ny) {
  // Last drawn = topmost → hit-test in reverse draw order
  const aspectWH = canvas.width / canvas.height;
  for (let i = state.overlays.length - 1; i >= 0; i--) {
    const o = state.overlays[i];
    if (!o.img) continue;
    const w = o.width;                                  // fraction of canvas width
    const hFrac = (o.img.naturalHeight / Math.max(1, o.img.naturalWidth)) * o.width * aspectWH;
    const halfW = w / 2, halfH = hFrac / 2;
    if (nx >= o.x - halfW && nx <= o.x + halfW && ny >= o.y - halfH && ny <= o.y + halfH) return o;
  }
  return null;
}

canvas.addEventListener('pointerdown', (e) => {
  if (state.exporting) return;
  const p = canvasPointFromEvent(e);

  // Watermark sits above overlays in the draw order → it wins the hit test
  if (hitWatermark(p.x, p.y)) {
    const wm = state.watermark;
    dragState.kind = 'watermark';
    dragState.id = null;
    dragState.dx = wm.x - p.x;
    dragState.dy = wm.y - p.y;
    dragState.moved = false;
    commit(); // snapshot PRE-drag position so one undo reverts the whole gesture
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* bubbling still works */ }
    return;
  }

  const hit = hitTestOverlays(p.x, p.y);
  if (!hit) return;
  dragState.kind = 'overlay';
  dragState.id = hit.id;
  dragState.dx = hit.x - p.x;
  dragState.dy = hit.y - p.y;
  dragState.moved = false;
  state.selectedOverlayId = hit.id;
  commit(); // snapshot PRE-drag position so one undo reverts the whole gesture
  renderOverlayList();
  try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* bubbling still works */ }
});

canvas.addEventListener('pointermove', (e) => {
  if (dragState.kind == null) return;
  const p = canvasPointFromEvent(e);

  if (dragState.kind === 'watermark') {
    const wm = state.watermark;
    const nx = clamp(p.x + dragState.dx, 0.02, 0.98);
    const ny = clamp(p.y + dragState.dy, 0.02, 0.98);
    if (Math.abs(nx - wm.x) > 0.001 || Math.abs(ny - wm.y) > 0.001) dragState.moved = true;
    wm.x = nx;
    wm.y = ny;
    drawFrame();
    return;
  }

  const o = state.overlays.find(ov => ov.id === dragState.id);
  if (!o) return;
  const nx = clamp(p.x + dragState.dx, -0.15, 1.15);
  const ny = clamp(p.y + dragState.dy, -0.15, 1.15);
  if (Math.abs(nx - o.x) > 0.001 || Math.abs(ny - o.y) > 0.001) dragState.moved = true;
  o.x = nx;
  o.y = ny;
  drawFrame();
});

canvas.addEventListener('pointerup', () => {
  dragState.kind = null;
  dragState.id = null;
  dragState.moved = false;
});
canvas.addEventListener('pointercancel', () => { dragState.kind = null; dragState.id = null; dragState.moved = false; });

/* ═════════════════════════════════════════════
   BGM / VOICEOVER
   ═════════════════════════════════════════════ */
function handleAudioFile(file) {
  if (!file) return;
  if (!file.type.startsWith('audio/') && !/\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(file.name)) {
    showToast('That does not look like an audio file.', true);
    return;
  }
  if (state.bgmObjectUrl) URL.revokeObjectURL(state.bgmObjectUrl);

  state.bgmObjectUrl = URL.createObjectURL(file);
  bgmAudio.src = state.bgmObjectUrl;
  bgmAudio.loop = true;
  bgmAudio.volume = 1; // gain staging happens in the Web Audio graph
  bgmAudio.playbackRate = state.speed;
  bgmAudio.load();

  state.bgmLoaded = true;
  bgmName.textContent = file.name.length > 42 ? file.name.slice(0, 39) + '…' : file.name;
  bgmChip.hidden = false;
  renderLanes();
  showToast('BGM added — it will be mixed into the export.');
}

function removeBgm() {
  bgmAudio.pause();
  bgmAudio.removeAttribute('src');
  bgmAudio.load();
  if (state.bgmObjectUrl) { URL.revokeObjectURL(state.bgmObjectUrl); state.bgmObjectUrl = null; }
  state.bgmLoaded = false;
  bgmChip.hidden = true;
  renderLanes();
  showToast('Background music removed.');
}

/** BGM position = global timeline position. */
function bgmTargetTime() {
  return getGlobalTime();
}

function syncBgmToVideo(force = false) {
  if (!state.bgmLoaded) return;
  const target = bgmTargetTime();
  const drift = Math.abs((bgmAudio.currentTime || 0) - target);
  if (force || drift > 0.25) {
    try { bgmAudio.currentTime = Math.max(0, target); } catch (_) { /* ignore seek errors */ }
  }
}

/* ═════════════════════════════════════════════
   CAPTIONS — manual + AUTO (Speech-to-Text)
   Model: { id, text, color, size, position, bold, outline, start|null, end|null }
   ═════════════════════════════════════════════ */
function readCaptionForm() {
  return {
    text: captionText.value.trim(),
    color: captionColor.value,
    size: Number(captionSize.value),
    position: state.captionPosition,
    bold: state.captionBold,
    outline: state.captionOutline,
  };
}

function addCaption() {
  const data = readCaptionForm();
  if (!data.text) { showToast('Type a caption first.', true); return; }
  commit();
  const caption = { id: state.captionIdSeq++, start: null, end: null, ...data };
  state.captions.push(caption);
  selectCaption(caption.id);
  captionText.value = '';
  renderCaptionList();
  drawFrame();
  showToast('Caption added.');
}

function updateSelectedCaption() {
  const cap = state.captions.find(c => c.id === state.selectedCaptionId);
  if (!cap) return;
  const data = readCaptionForm();
  if (!data.text) { showToast('Caption text cannot be empty.', true); return; }
  commit();
  Object.assign(cap, data);
  renderCaptionList();
  drawFrame();
  showToast('Caption updated.');
}

function selectCaption(id) {
  state.selectedCaptionId = id;
  const cap = state.captions.find(c => c.id === id);
  if (cap) {
    captionText.value    = cap.text;
    captionColor.value   = cap.color;
    captionSize.value    = String(cap.size);
    captionSizeVal.textContent = String(cap.size);
    setCaptionPosition(cap.position);
    setToggle(boldToggle, 'captionBold', cap.bold);
    setToggle(outlineToggle, 'captionOutline', cap.outline);
    addCaptionBtn.hidden = true;
    updateCaptionBtn.hidden = false;
  }
  renderCaptionList();
}

function clearCaptionSelection() {
  state.selectedCaptionId = null;
  addCaptionBtn.hidden = false;
  updateCaptionBtn.hidden = true;
  renderCaptionList();
}

function deleteCaption(id) {
  const cap = state.captions.find(c => c.id === id);
  if (!cap) return;
  commit();
  state.captions = state.captions.filter(c => c.id !== id);
  if (state.selectedCaptionId === id) {
    clearCaptionSelection();
    captionText.value = '';
  }
  renderCaptionList();
  drawFrame();
}

function setCaptionPosition(pos) {
  state.captionPosition = pos;
  positionButtons.forEach(btn => btn.classList.toggle('is-active', btn.dataset.position === pos));
}

function setCaptionStyleButtons(style) {
  captionStyleButtons.forEach(btn => {
    const active = btn.dataset.captionstyle === style;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

function setCaptionStyle(style, skipCommit = false) {
  if (style !== 'classic' && style !== 'box') return;
  if (state.captionStyle !== style && !skipCommit) commit();
  state.captionStyle = style;
  setCaptionStyleButtons(style);
  drawFrame();
  showToast(style === 'box' ? 'Caption style: Instagram Bold Box' : 'Caption style: Classic');
}

function setToggle(btn, stateKey, value) {
  state[stateKey] = value;
  btn.classList.toggle('is-active', value);
  btn.setAttribute('aria-pressed', String(value));
}

function captionVisibleAt(cap, t) {
  if (cap.start == null || cap.end == null) return true;
  return (t + 0.12) >= cap.start && t <= (cap.end + 0.35);
}

function renderCaptionList() {
  captionList.innerHTML = '';
  captionEmpty.hidden = state.captions.length !== 0;

  for (const cap of state.captions) {
    const li = document.createElement('li');
    li.className = 'caption-item' + (cap.id === state.selectedCaptionId ? ' is-selected' : '');

    const swatch = document.createElement('span');
    swatch.className = 'caption-swatch';
    swatch.style.background = cap.color;

    const text = document.createElement('span');
    text.className = 'caption-item-text';
    text.textContent = cap.text;
    text.title = cap.text;

    li.append(swatch, text);

    if (cap.start != null) {
      const time = document.createElement('span');
      time.className = 'caption-item-time';
      time.textContent = `⏱ ${formatTime(cap.start)}–${formatTime(cap.end)}`;
      li.appendChild(time);
    } else {
      const pos = document.createElement('span');
      pos.className = 'caption-item-pos';
      pos.textContent = cap.position;
      li.appendChild(pos);
    }

    const del = document.createElement('button');
    del.className = 'caption-del';
    del.type = 'button';
    del.textContent = '×';
    del.setAttribute('aria-label', 'Delete caption');
    del.addEventListener('click', (e) => { e.stopPropagation(); deleteCaption(cap.id); });

    li.addEventListener('click', () => selectCaption(cap.id));

    li.appendChild(del);
    captionList.appendChild(li);
  }
  renderLanes();
}

function wrapText(text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines = [];
  let line = words[0];
  for (let i = 1; i < words.length; i++) {
    const candidate = line + ' ' + words[i];
    if (ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = words[i];
    } else {
      line = candidate;
    }
  }
  lines.push(line);
  return lines;
}

/** Rounded-rect path (manual — ctx.roundRect is not universal on older mobile engines). */
function roundRectPath(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

const IG_CAPTION_FONT = "'Montserrat','Poppins','Arial Black','Helvetica Neue',Arial,sans-serif";

/** Instagram Bold Box: uppercased 900-weight text on a per-line translucent pill,
 *  drop shadow, centered word-wrap. High contrast on any footage. */
function drawCaptionsBoxStyle(W, H, t) {
  const margin = W * 0.07;
  const maxBlockWidth = W - margin * 2;
  const bandCounts = { top: 0, middle: 0, bottom: 0 };

  for (const cap of state.captions) {
    if (!captionVisibleAt(cap, t)) continue;

    // Font scales with canvas height (reels captions sit big and loud)
    const px = Math.max(12, Math.round((cap.size / 720) * H));
    ctx.font = `900 ${px}px ${IG_CAPTION_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    const pillPadX = Math.round(px * 0.42);
    const pillPadY = Math.round(px * 0.16);
    const lines = wrapText(cap.text.toUpperCase(), maxBlockWidth - pillPadX * 2);
    const lineHeight = px * 1.04;      // tight, reel-like leading
    const blockHeight = lines.length * lineHeight + pillPadY * 2 * lines.length;

    let baseY;
    if (cap.position === 'top') {
      baseY = H * 0.09 + bandCounts.top * (blockHeight + 14) + blockHeight * 0.5;
    } else if (cap.position === 'bottom') {
      baseY = H * 0.90 - bandCounts.bottom * (blockHeight + 14) - blockHeight * 0.5;
    } else {
      baseY = H * 0.5 + bandCounts.middle * (blockHeight + 14);
    }
    bandCounts[cap.position] += 1;

    let lineY = baseY - blockHeight / 2 + lineHeight * 0.82;
    for (const line of lines) {
      const textWidth = ctx.measureText(line).width;
      const pillW = textWidth + pillPadX * 2;
      const pillH = lineHeight + pillPadY * 2;
      const pillX = (W - pillW) / 2;
      const pillY = lineY - lineHeight * 0.82 - pillPadY;

      // Drop shadow under the pill for depth
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = Math.round(px * 0.35);
      ctx.shadowOffsetY = Math.max(2, Math.round(px * 0.08));
      ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
      roundRectPath(pillX, pillY, pillW, pillH, Math.round(pillH * 0.42));
      ctx.fill();
      ctx.restore();

      // Text with a subtle lift shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = Math.round(px * 0.18);
      ctx.shadowOffsetY = Math.max(1, Math.round(px * 0.06));
      ctx.fillStyle = cap.color;
      ctx.fillText(line, W / 2, lineY);
      ctx.restore();

      lineY += lineHeight + pillPadY * 2;
    }
  }
}

function drawCaptions() {
  if (state.captions.length === 0) return;

  const W = canvas.width, H = canvas.height;
  const t = getGlobalTime();

  if (state.captionStyle === 'box') {
    drawCaptionsBoxStyle(W, H, t);
    return;
  }

  const margin = W * 0.06;
  const maxTextWidth = W - margin * 2;
  const bandCounts = { top: 0, middle: 0, bottom: 0 };

  for (const cap of state.captions) {
    if (!captionVisibleAt(cap, t)) continue;

    // Scale font relative to canvas height (42px on a 720-tall canvas ≈ user expectation).
    const px = Math.max(10, Math.round((cap.size / 720) * H));
    ctx.font = `${cap.bold ? '800' : '500'} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    const lines = wrapText(cap.text, maxTextWidth);
    const lineHeight = px * 1.22;
    const blockHeight = lines.length * lineHeight;

    let baseY;
    if (cap.position === 'top') {
      baseY = H * 0.10 + bandCounts.top * (blockHeight + 12) + blockHeight * 0.75;
    } else if (cap.position === 'bottom') {
      baseY = H * 0.88 - bandCounts.bottom * (blockHeight + 12);
    } else {
      baseY = H * 0.5 - blockHeight / 2 + bandCounts.middle * (blockHeight + 12) + lineHeight * 0.75;
    }
    bandCounts[cap.position] += 1;

    let y = baseY - (lines.length - 1) * lineHeight;
    for (const line of lines) {
      if (cap.outline) {
        ctx.lineWidth = Math.max(2, px * 0.14);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.lineJoin = 'round';
        ctx.strokeText(line, W / 2, y);
      }
      ctx.fillStyle = cap.color;
      ctx.fillText(line, W / 2, y);
      y += lineHeight;
    }
  }
}

/* ── AUTO-CAPTION (Speech-to-Text) ─────────────────────── */
const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;

const autoCapSession = { active: false, recognition: null, lastMark: 0, addedCount: 0 };

function autoCaptionSupported() { return !!SpeechRecognitionCtor; }

function setAutoCaptionUI(listening) {
  autoCaptionBtn.classList.toggle('is-listening', listening);
  autoCaptionLabel.textContent = listening ? 'Stop Auto-Caption' : 'Auto-Caption';
  autoCaptionLang.disabled = listening;
}

async function startAutoCaption() {
  if (!state.hasVideo || state.exporting) return;
  if (!autoCaptionSupported()) {
    showToast('Web Speech API is not supported here. Use Chrome or Edge for Auto-Caption.', true);
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('Microphone access is required for Auto-Caption.', true);
    return;
  }

  await resumeAudio();
  commit(); // one undo reverts the whole transcription session

  bgmAudio.pause();
  activateClip(0, state.clips[0].in, false, true); // rewind global timeline to 0

  const rec = new SpeechRecognitionCtor();
  rec.continuous = true;
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.lang = autoCaptionLang.value;

  autoCapSession.lastMark = 0;
  autoCapSession.addedCount = 0;

  rec.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (!result.isFinal) continue;
      const text = (result[0].transcript || '').trim();
      if (!text) continue;
      const now = getGlobalTime();
      const start = round2(autoCapSession.lastMark);
      const end   = round2(Math.max(now, start + 0.4) + 0.35);
      state.captions.push({
        id: state.captionIdSeq++,
        text, color: '#ffffff', size: 40, position: 'bottom',
        bold: true, outline: true, start, end,
      });
      autoCapSession.lastMark = end;
      autoCapSession.addedCount += 1;
      renderCaptionList();
    }
  };

  rec.onerror = (event) => {
    const err = (event && event.error) || 'unknown';
    if (err === 'not-allowed' || err === 'service-not-allowed') {
      showToast('Microphone permission denied — Auto-Caption needs mic access.', true);
      stopAutoCaption();
    } else if (err !== 'no-speech' && err !== 'aborted') {
      showToast(`Auto-Caption: ${err}`, true);
    }
  };

  // Chrome stops recognition after silence even with continuous=true — restart while live.
  rec.onend = () => {
    if (autoCapSession.active) {
      try { rec.start(); } catch (_) { /* already started / shutting down */ }
    }
  };

  autoCapSession.recognition = rec;
  autoCapSession.active = true;
  setAutoCaptionUI(true);
  autoCaptionStatus.textContent = 'Listening… the timeline plays out loud. Each spoken line lands as a timed canvas caption.';

  try {
    rec.start();
  } catch (err) {
    console.error('SpeechRecognition start failed:', err);
    autoCapSession.active = false;
    setAutoCaptionUI(false);
    showToast('Could not start Auto-Caption.', true);
    return;
  }

  activateClip(0, state.clips[0].in, true); // play from the top through every clip
}

function stopAutoCaption(silent = false) {
  if (!autoCapSession.active && !autoCapSession.recognition) return;
  autoCapSession.active = false;
  const rec = autoCapSession.recognition;
  autoCapSession.recognition = null;
  if (rec) {
    rec.onend = null;
    try { rec.stop(); } catch (_) { /* already stopped */ }
  }
  pauseActiveClip();
  setAutoCaptionUI(false);
  if (!silent) {
    autoCaptionStatus.textContent = autoCapSession.addedCount > 0
      ? `Auto-Caption added ${autoCapSession.addedCount} line${autoCapSession.addedCount === 1 ? '' : 's'}. Edit, reposition or delete them below — Ctrl+Z reverts the session.`
      : 'Auto-Caption stopped. No speech detected — try again with the volume up.';
  }
}

function pauseActiveClip() {
  state.clips.forEach(c => { if (c.el && !c.el.paused) c.el.pause(); });
  bgmAudio.pause();
}

/* ═════════════════════════════════════════════
   FORMAT — aspect & speed
   ═════════════════════════════════════════════ */
function applyAspectToCanvas() {
  const size = ASPECT_SIZES[state.aspect] || ASPECT_SIZES['16:9'];
  canvas.width  = size.w;
  canvas.height = size.h;
  stageFrame.style.aspectRatio = ASPECT_RATIO_CSS[state.aspect] || '16 / 9';
}

function setAspectButtons(aspect) {
  aspectButtons.forEach(btn => {
    const active = btn.dataset.aspect === aspect;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

function setAspect(aspect, skipCommit = false) {
  if (!ASPECT_SIZES[aspect]) return;
  if (state.aspect !== aspect && !skipCommit) commit();
  state.aspect = aspect;
  setAspectButtons(aspect);
  applyAspectToCanvas();
  updateVideoMeta();
  drawFrame();
}

function setSpeed(speed, skipCommit = false) {
  const allowed = [0.5, 1, 1.5, 2];
  const next = allowed.includes(Number(speed)) ? Number(speed) : 1;
  if (state.speed !== next && !skipCommit) commit();
  state.speed = next;
  state.clips.forEach(c => { if (c.el) c.el.playbackRate = next; });
  bgmAudio.playbackRate = next;
  speedButtons.forEach(btn => {
    const active = Number(btn.dataset.speed) === next;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  refreshTransportBounds();
  updateTransportUI();
}

function setTransitionButtons(t) {
  transitionButtons.forEach(btn => {
    const active = btn.dataset.transition === t;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

function setTransition(t, skipCommit = false) {
  const ok = (t === 'dissolve' || t === 'fade') ? t : 'none';
  if (state.transition !== ok && !skipCommit) commit();
  state.transition = ok;
  setTransitionButtons(ok);
  drawFrame();
  showToast(ok === 'none' ? 'Clip transition: None (hard cut).'
          : ok === 'dissolve' ? 'Clip transition: Cross Dissolve — equal-power audio ride.'
          : 'Clip transition: Fade to Black — equal-power audio ride.');
}

const WATERMARK_PRESETS = {
  tl: [0.04, 0.10], tr: [0.96, 0.10], center: [0.5, 0.55], bl: [0.04, 0.93], br: [0.96, 0.93],
};

/** Snap the free-draggable watermark to a corner preset (position presets, not state). */
function applyWatermarkPreset(preset) {
  const p = WATERMARK_PRESETS[preset] || WATERMARK_PRESETS.br;
  state.watermark.x = p[0];
  state.watermark.y = p[1];
}

/** Reflect state.watermark into every control (used on init + undo/redo restore). */
function syncWatermarkUI() {
  const wm = state.watermark;
  watermarkEnabled.checked = wm.enabled;
  watermarkTools.hidden = !wm.enabled;
  watermarkText.value = wm.text;
  watermarkColor.value = wm.color;
  watermarkSize.value = String(wm.size);
  watermarkSizeVal.textContent = String(wm.size);
  watermarkOpacity.value = String(wm.opacity);
  watermarkOpacityVal.textContent = `${wm.opacity}%`;
  renderLanes();
}

/* ═════════════════════════════════════════════
   CANVAS RENDER LOOP (preview + export share this)
   Cover-crop + auto visual enhancement + watermark top layer.
   ═════════════════════════════════════════════ */
const TRANSITION_TIME = 0.65; // seconds for the pre-roll blend at clip boundaries

function transitionEase() {
  // Pure function of (active clip clock × incoming clip) — identical in preview & export
  const clip = activeClip();
  if (!clip || !clip.el || state.transition === 'none') return 0;
  const remaining = clip.out - clip.el.currentTime;
  if (remaining > TRANSITION_TIME || remaining <= -0.05) return 0;
  const nextIdx = state.activeClipIndex + 1;
  if (nextIdx >= state.clips.length) return 0;
  const p = clamp((TRANSITION_TIME - Math.max(0, remaining)) / TRANSITION_TIME, 0, 1);
  return p * p * (3 - 2 * p); // smoothstep ease-in-out
}

function drawVideoCover(el, W, H) {
  const vw = el.videoWidth, vh = el.videoHeight;
  if (!vw || !vh) return;
  const exporting = state.exporting; // only pays rAF filter cost during export, never in preview
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = exporting ? 'high' : 'medium';
  const scale = Math.max(W / vw, H / vh); // cover
  const dw = vw * scale, dh = vh * scale;
  if (exporting) ctx.filter = 'contrast(1.06) saturate(1.08)';
  ctx.drawImage(el, (W - dw) / 2, (H - dh) / 2, dw, dh);
  if (exporting) ctx.filter = 'none';
}

/** Free-position persistent watermark. Position = normalized anchor (x,y); the horizontal
 *  text alignment derives from the x zone (left third → left, right third → right, else center).
 *  Stores a hit-test box in fraction units so canvas pointer gestures can drag it. */
function drawWatermark(W, H) {
  const wm = state.watermark;
  if (!wm.enabled) { wm._box = null; return; }
  const text = String(wm.text || '').trim();
  if (!text) { wm._box = null; return; }

  const px = Math.max(8, Math.round((wm.size / 720) * H));
  ctx.save();
  ctx.font = `700 ${px}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
  ctx.globalAlpha = clamp(Number(wm.opacity) / 100, 0, 1);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = Math.max(2, Math.round(px * 0.18));
  ctx.shadowOffsetY = Math.max(1, Math.round(px * 0.05));
  ctx.fillStyle = wm.color;

  const fx = clamp(Number(wm.x) || 0.96, 0.02, 0.98);
  const fy = clamp(Number(wm.y) || 0.93, 0.02, 0.98);
  const align = fx < 0.36 ? 'left' : fx > 0.64 ? 'right' : 'center';
  const x = fx * W, y = fy * H;

  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
  ctx.restore();

  // Cache the fraction-space bbox for pointer hit-testing (padded for fat fingers)
  const widthPx = ctx.measureText(text).width;
  const pad = Math.max(6, px * 0.3);
  let x0px, x1px;
  if (align === 'left') { x0px = x - pad; x1px = x + widthPx + pad; }
  else if (align === 'right') { x0px = x - widthPx - pad; x1px = x + pad; }
  else { x0px = x - widthPx / 2 - pad; x1px = x + widthPx / 2 + pad; }
  wm._box = { x0: x0px / W, y0: (y - px - pad) / H, x1: x1px / W, y1: (y + px * 0.3 + pad * 0.5) / H };
}

function drawFrame() {
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // Base frame(s) — current clip, then (optionally) the incoming clip blended on top
  const clip = activeClip();
  if (clip && clip.el && clip.el.readyState >= 2) {
    drawVideoCover(clip.el, W, H);
  }

  const ease = transitionEase();
  if (ease > 0) {
    if (state.transition === 'dissolve') {
      const next = state.clips[state.activeClipIndex + 1];
      if (next && next.el && next.el.readyState >= 2) {
        ctx.save();
        ctx.globalAlpha = ease;
        drawVideoCover(next.el, W, H);
        ctx.restore();
      }
    } else if (state.transition === 'fade') {
      ctx.fillStyle = `rgba(0, 0, 0, ${ease.toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // Overlay layers (bottom → top)
  for (const o of state.overlays) {
    if (!o.img) continue;
    const w = o.width * W;
    const h = w * (o.img.naturalHeight / Math.max(1, o.img.naturalWidth));
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(o.img, o.x * W - w / 2, o.y * H - h / 2, w, h);
  }

  drawCaptions();
  drawWatermark(W, H); // topmost persistent layer
}

function renderLoop() {
  requestAnimationFrame(renderLoop); // keep the chain alive; browser auto-throttles hidden tabs
  tickPlayhead();
  if (document.hidden) return;      // no drawing on background tabs — phone stays cool, no lag
  drawFrame();
}
requestAnimationFrame(renderLoop);

/* ═════════════════════════════════════════════
   TRANSPORT — bounds & UI
   ═════════════════════════════════════════════ */
function refreshTransportBounds() {
  const total = totalEffectiveDuration();
  seekBar.min = '0';
  seekBar.max = String(Math.max(1, Math.round(total * 1000)));
  seekBar.value = String(clamp(Math.round(getGlobalTime() * 1000), 0, Math.max(1, Math.round(total * 1000))));
  timecodeDisplay.textContent = `${formatTime(getGlobalTime())} / ${formatTime(total)}`;
  videoMeta.textContent = state.clips.length
    ? `${state.clips.length} clip${state.clips.length > 1 ? 's' : ''} · ${formatTime(total)} total · ${ASPECT_SIZES[state.aspect].w}×${ASPECT_SIZES[state.aspect].h} (${state.aspect}) · auto-enhanced`
    : 'No media loaded — drop files anywhere on the stage';
}

function updateVideoMeta() {
  refreshTransportBounds();
}

function updateTimelineZoomUI() {
  const label = document.getElementById('timelineZoomLabel');
  if (label) label.textContent = `${state.pxPerSec.toFixed(0)} px/s`;
}

/** Sync the horizontal scroll so the global playhead sits at the CENTER of the visible lane. */
function syncTimelineScrollToTime() {
  if (!lanesWrap) return;
  const total = totalEffectiveDuration();
  if (total <= 0) return;
  const t = getGlobalTime();
  const target = clamp(t * state.pxPerSec - lanesWrap.clientWidth / 2, 0, Math.max(0, lanesWrap.scrollWidth - lanesWrap.clientWidth));
  state.timelineSync = true;
  lanesWrap.scrollLeft = target;
  // Scroll event fires synchronously in most browsers; clear flag right after
  window.setTimeout(() => { state.timelineSync = false; }, 50);
}

function updateTransportUI() {
  const clip = activeClip();
  const playing = clip && clip.el && !clip.el.paused && !clip.el.ended;
  playIcon.style.display  = playing ? 'none' : 'block';
  pauseIcon.style.display = playing ? 'block' : 'none';
  const total = totalEffectiveDuration();
  timecodeDisplay.textContent = `${formatTime(getGlobalTime())} / ${formatTime(total)}`;
  seekBar.max = String(Math.max(1, Math.round(total * 1000)));
  seekBar.value = String(clamp(Math.round(getGlobalTime() * 1000), 0, Math.max(1, Math.round(total * 1000))));
  if (playheadMarker) playheadMarker.style.left = '50%'; // center playhead is positional, not time-based
  updateTimelineZoomUI();
  layoutTimeline(); // recompute block geometry for current zoom + pixel ratio
  syncTimelineScrollToTime();
}

function togglePlay() {
  if (!state.hasVideo) return;
  resumeAudio();
  const clip = activeClip();
  if (!clip) return;

  const anyPlaying = state.clips.some(c => c.el && !c.el.paused && !c.el.ended);
  if (anyPlaying) {
    pauseActiveClip();
    return;
  }

  // If we're at the very end, restart from the top
  const total = totalEffectiveDuration();
  if (getGlobalTime() >= total - 0.05) {
    activateClip(0, state.clips[0].in, true);
    return;
  }

  activateClip(state.activeClipIndex, undefined, true, true);
}

playPauseBtn.addEventListener('click', togglePlay);

seekBar.addEventListener('input', () => {
  if (!state.hasVideo) return;
  const t = Number(seekBar.value) / 1000;
  const target = clipAtGlobal(t);
  activateClip(target.index, target.sourceTime, false); // seeks directly to that source time
  syncBgmToVideo(true);
  drawFrame();
  updateTransportUI();
});

muteBtn.addEventListener('click', () => {
  state.muted = !state.muted;
  if (videoGain && audioCtx) videoGain.gain.setValueAtTime(state.muted ? 0 : Number(videoVolume.value) / 100, audioCtx.currentTime);
  volIcon.style.display   = state.muted ? 'none' : 'block';
  mutedIcon.style.display = state.muted ? 'block' : 'none';
});

videoVolume.addEventListener('input', () => {
  videoVolumeVal.textContent = videoVolume.value;
  if (!state.muted && videoGain && audioCtx) {
    videoGain.gain.setValueAtTime(Number(videoVolume.value) / 100, audioCtx.currentTime);
  }
});
bgmVolume.addEventListener('input', () => {
  bgmVolumeVal.textContent = bgmVolume.value;
  if (bgmGain && audioCtx) bgmGain.gain.setValueAtTime(Number(bgmVolume.value) / 100, audioCtx.currentTime);
});

/* ═════════════════════════════════════════════
   EXPORT — global timeline → canvas + mixed audio → MediaRecorder
   Trims honoured; 8 Mbps / 192 kbps; 1280px cap
   ═════════════════════════════════════════════ */
function pickMimeType() {
  const candidates = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  if (typeof MediaRecorder === 'undefined') return { mimeType: '', ext: 'webm' };
  for (const c of candidates) {
    try { if (MediaRecorder.isTypeSupported(c)) return { mimeType: c, ext: c.includes('mp4') ? 'mp4' : 'webm' }; }
    catch (_) { /* keep trying */ }
  }
  return { mimeType: '', ext: 'webm' };
}

function setExportUI(active, percent = 0, phase = '') {
  exportOverlay.hidden = !active;
  if (active) {
    exportProgressBar.style.width = percent + '%';
    exportPercent.textContent = Math.floor(percent) + '%';
    if (phase) exportPhase.textContent = phase;
  }
  exportBtn.disabled = active || !state.hasVideo;
  exportTopBtn.disabled = active || !state.hasVideo;
  splitBtn.disabled = active || !state.clips.length;
}

/** Stop the recorder ONLY at the true end of the global timeline — never on mid-timeline
 *  pause events (clip advances pause the outgoing clip before the incoming one reaches
 *  playing state, which previously produced false positives and truncated exports). */
function maybeStopExportRecorder() {
  if (!state.exporting || !state.activeRecorder) return;
  const total = totalEffectiveDuration();
  if (getGlobalTime() >= total - 0.05) {
    try {
      if (state.activeRecorder.state !== 'inactive') state.activeRecorder.stop();
    } catch (_) { /* recorder already stopped */ }
  }
}

async function exportVideo() {
  if (!state.hasVideo || state.exporting) return;
  if (typeof MediaRecorder === 'undefined' || !canvas.captureStream) {
    showToast('MediaRecorder is not supported in this browser. Try Chrome or Firefox.', true);
    return;
  }
  if (autoCapSession.active) stopAutoCaption(true);

  state.exporting = true;
  await resumeAudio();

  const { mimeType, ext } = pickMimeType();
  const total = totalEffectiveDuration();

  // Rewind everything to global zero
  pauseActiveClip();
  bgmAudio.currentTime = 0;
  activateClip(0, state.clips[0].in, false, true);

  // Wait for the seek to land before capture starts (belt-and-braces timeout).
  await new Promise(resolve => {
    const first = state.clips[0];
    if (!first || !first.el) return resolve();
    const done = () => { first.el.removeEventListener('seeked', done); resolve(); };
    first.el.addEventListener('seeked', done);
    setTimeout(done, 400);
  });

  const canvasStream = canvas.captureStream(EXPORT_FPS);
  const tracks = [...canvasStream.getVideoTracks()];
  if (exportDest && exportDest.stream.getAudioTracks().length) {
    tracks.push(...exportDest.stream.getAudioTracks());
  }
  const combined = new MediaStream(tracks);

  let recorder;
  try {
    recorder = mimeType
      ? new MediaRecorder(combined, { mimeType, videoBitsPerSecond: EXPORT_VIDEO_BITS, audioBitsPerSecond: EXPORT_AUDIO_BITS })
      : new MediaRecorder(combined, { videoBitsPerSecond: EXPORT_VIDEO_BITS, audioBitsPerSecond: EXPORT_AUDIO_BITS });
  } catch (err) {
    console.error('MediaRecorder init failed:', err);
    state.exporting = false;
    setExportUI(false);
    showToast('Could not start the recorder on this device.', true);
    return;
  }
  state.activeRecorder = recorder;

  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

  const finished = new Promise((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `capcut-like-app-export.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      resolve();
    };
  });

  // Progress tied to the GLOBAL timeline; 60 ms backstop closes the file at the very end
  const progressTimer = setInterval(() => {
    const pct = total > 0 ? clamp((getGlobalTime() / total) * 100, 0, 99) : 0;
    setExportUI(true, pct, 'Rendering in real time — keep this tab visible');
  }, 100);
  const endWatchdog = setInterval(() => {
    if (!state.exporting) return;
    if (getGlobalTime() >= total - 0.04) {
      if (recorder.state !== 'inactive') { try { recorder.stop(); } catch (_) {} }
    }
  }, 60);

  const cleanup = () => {
    clearInterval(progressTimer);
    clearInterval(endWatchdog);
    state.exporting = false;
    state.activeRecorder = null;
    setExportUI(false);
    activateClip(0, state.clips[0] && state.clips[0].in, false, true);
    bgmAudio.currentTime = 0;
    seekBar.value = '0';
    updateTransportUI();
    drawFrame();
  };

  setExportUI(true, 0, 'Starting recorder…');
  try {
    drawFrame(); // paint a frame BEFORE capture — Chrome can drop a silent video track otherwise
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    recorder.start(250); // 250 ms chunks — bounded memory on low-RAM phones
    activateClip(0, state.clips[0].in, true);   // roll the timeline
    if (state.bgmLoaded) await bgmAudio.play().catch(() => {});
    await finished;
    showToast('Export complete — check your downloads.');
  } catch (err) {
    console.error('Export failed:', err);
    try { if (recorder.state !== 'inactive') recorder.stop(); } catch (_) { /* already stopped */ }
    showToast('Export failed — tap Export & Download again.', true);
  } finally {
    cleanup();
  }
}

/* ═════════════════════════════════════════════
   Wire up events
   ═════════════════════════════════════════════ */
/* ═════════════════════════════════════════════
   Unified media router — ONE entry point for picker & drop
   Videos → timeline clips · Images → overlay layers · Audio → BGM slot
   ═════════════════════════════════════════════ */
function routeImportedFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  const isVideo = (f) => f.type.startsWith('video/') || /\.(mp4|webm|mov|mkv|m4v)$/i.test(f.name);
  const isImage = (f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(f.name);
  const isAudio = (f) => f.type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|aac|flac|opus)$/i.test(f.name);

  const videos = files.filter(isVideo);
  const images = files.filter(isImage);
  const audios = files.filter(isAudio);

  if (videos.length) handleVideoFiles(videos);
  if (images.length) addImageOverlays(images);
  if (audios.length) handleAudioFile(audios[0]);

  const summary = [];
  if (videos.length) summary.push(`${videos.length} video${videos.length > 1 ? 's' : ''}`);
  if (images.length) summary.push(`${images.length} image${images.length > 1 ? 's' : ''}`);
  if (audios.length) summary.push('BGM');
  if (summary.length > 1) showToast(`Added: ${summary.join(' · ')}`);
  else if (summary.length === 0) showToast('No supported media in that selection (video/audio/image only).', true);
}

addMediaBtn.addEventListener('click', () => fileInput.click());
emptyImport.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  routeImportedFiles(e.target.files);
  fileInput.value = ''; // allow re-picking the same files
});
removeBgmBtn.addEventListener('click', removeBgm);

// Timeline tools
splitBtn.addEventListener('click', splitAtPlayhead);
trimInBtn.addEventListener('click', () => trimClipEdge('in'));
trimOutBtn.addEventListener('click', () => trimClipEdge('out'));
moveLeftBtn.addEventListener('click', () => moveClip(-1));
moveRightBtn.addEventListener('click', () => moveClip(+1));
removeClipBtn.addEventListener('click', removeActiveClip);

// Overlays
overlayScale.addEventListener('pointerdown', () => commit()); // snapshot pre-drag size once
overlayScale.addEventListener('input', () => {
  const o = selectedOverlay();
  if (!o) return;
  o.width = clamp(Number(overlayScale.value) / 100, 0.05, 1);
  overlayScaleVal.textContent = overlayScale.value + '%';
  // Light update: size label in the list without rebuilding the DOM (keeps slider smooth)
  const idx = state.overlays.findIndex(x => x.id === o.id);
  const sizeEl = overlayList.children[idx] && overlayList.children[idx].querySelector('.overlay-size');
  if (sizeEl) sizeEl.textContent = overlayScale.value + '%';
  drawFrame();
});
overlayScale.addEventListener('change', () => renderOverlayList());
overlayFrontBtn.addEventListener('click', () => moveOverlay(+1));
overlayBackBtn.addEventListener('click', () => moveOverlay(-1));
overlayDeleteBtn.addEventListener('click', deleteSelectedOverlay);

// Captions
captionSize.addEventListener('input', () => { captionSizeVal.textContent = captionSize.value; });
positionButtons.forEach(btn => btn.addEventListener('click', () => setCaptionPosition(btn.dataset.position)));
captionStyleButtons.forEach(btn => btn.addEventListener('click', () => setCaptionStyle(btn.dataset.captionstyle)));
boldToggle.addEventListener('click', () => setToggle(boldToggle, 'captionBold', !state.captionBold));
outlineToggle.addEventListener('click', () => setToggle(outlineToggle, 'captionOutline', !state.captionOutline));
addCaptionBtn.addEventListener('click', addCaption);
updateCaptionBtn.addEventListener('click', updateSelectedCaption);
captionText.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    if (state.selectedCaptionId) updateSelectedCaption();
    else addCaption();
  }
});

// Auto-Caption
if (!autoCaptionSupported()) {
  autoCaptionStatus.textContent = 'Auto-Caption needs the Web Speech API — available in Chrome and Edge.';
}
autoCaptionBtn.addEventListener('click', () => {
  if (autoCapSession.active) stopAutoCaption();
  else startAutoCaption();
});

// Format
aspectButtons.forEach(btn => btn.addEventListener('click', () => setAspect(btn.dataset.aspect)));
speedButtons.forEach(btn => btn.addEventListener('click', () => setSpeed(Number(btn.dataset.speed))));
transitionButtons.forEach(btn => btn.addEventListener('click', () => setTransition(btn.dataset.transition)));

// Watermark (persistent text layer) — commit BEFORE first mutation of a gesture
watermarkEnabled.addEventListener('change', () => {
  commit();
  state.watermark.enabled = watermarkEnabled.checked;
  syncWatermarkUI();
  drawFrame();
  showToast(state.watermark.enabled ? 'Watermark on.' : 'Watermark off.');
});
watermarkText.addEventListener('focus', () => commit());
watermarkText.addEventListener('input', () => {
  state.watermark.text = watermarkText.value;
  renderLanes();
  drawFrame();
});
watermarkColor.addEventListener('pointerdown', () => commit());
watermarkColor.addEventListener('input', () => {
  state.watermark.color = watermarkColor.value;
  drawFrame();
});
watermarkSize.addEventListener('pointerdown', () => commit());
watermarkSize.addEventListener('input', () => {
  state.watermark.size = clamp(Number(watermarkSize.value) || 26, 12, 72);
  watermarkSizeVal.textContent = String(state.watermark.size);
  drawFrame();
});
watermarkOpacity.addEventListener('pointerdown', () => commit());
watermarkOpacity.addEventListener('input', () => {
  state.watermark.opacity = clamp(Number(watermarkOpacity.value) || 70, 10, 100);
  watermarkOpacityVal.textContent = `${state.watermark.opacity}%`;
  drawFrame();
});
watermarkPosButtons.forEach(btn => btn.addEventListener('click', () => {
  commit(); // undo restores prior free position
  applyWatermarkPreset(btn.dataset.wmpos);
  drawFrame();
}));

// Undo / Redo
undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);
document.addEventListener('keydown', (e) => {
  const tag = (e.target && e.target.tagName) || '';
  const typing = tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT' || (e.target && e.target.isContentEditable);
  if (typing) return;
  const key = e.key.toLowerCase();

  // Scissors shortcut: S splits the active clip at the playhead
  if (key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (state.hasVideo && !state.exporting && !splitBtn.disabled) {
      e.preventDefault();
      splitAtPlayhead();
    }
    return;
  }

  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return;
  if (key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
  else if ((key === 'z' && e.shiftKey) || key === 'y') { e.preventDefault(); redo(); }
});

// Export
exportBtn.addEventListener('click', exportVideo);
exportTopBtn.addEventListener('click', exportVideo);

// Drag & drop anywhere on the stage — video / image / audio all land in the right place
['dragenter', 'dragover'].forEach(evt =>
  stageFrame.addEventListener(evt, (e) => { e.preventDefault(); stageFrame.classList.add('is-drop-target'); })
);
['dragleave', 'drop'].forEach(evt =>
  stageFrame.addEventListener(evt, (e) => { e.preventDefault(); stageFrame.classList.remove('is-drop-target'); })
);
stageFrame.addEventListener('drop', (e) => {
  const files = e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files : [];
  routeImportedFiles(files);
});

/* ═════════════════════════════════════════════
   TRACK LANES — A1 (audio) and T1 (text) mirrors
   ═════════════════════════════════════════════ */
function shorten(text, max) {
  const s = String(text);
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function renderLanes() {
  if (!laneA1 || !laneT1) return;

  // A1 — BGM chip or a ghost "+ Audio" button
  if (state.bgmLoaded) {
    const name = bgmName.textContent || 'audio';
    laneA1.innerHTML =
      `<button type="button" class="lane-chip lane-chip-audio" data-lane-action="audio" title="${escapeHtml(name)} — background music">` +
        `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>` +
        `${escapeHtml(shorten(name, 30))}</button>`;
  } else {
    laneA1.innerHTML =
      `<button type="button" class="lane-ghost" data-lane-action="audio" title="Import background music or voiceover">` +
        `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>` +
        `Audio</button>`;
  }

  // T1 — caption chips + watermark chip, or a ghost "+ Text" button
  const chips = [];
  if (state.watermark.enabled && String(state.watermark.text).trim()) {
    chips.push(
      `<button type="button" class="lane-chip lane-chip-text" data-lane-action="text" title="${escapeHtml(state.watermark.text)} — watermark">` +
        `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M5 19 16 6l3 3L10 19"/><path d="M5 19h7"/></svg>` +
        `${escapeHtml(shorten(state.watermark.text, 16))}</button>`
    );
  }
  for (const cap of state.captions.slice(0, 6)) {
    chips.push(`<button type="button" class="lane-chip lane-chip-text" data-lane-action="caption" title="${escapeHtml(cap.text)} — caption">${escapeHtml(shorten(cap.text, 16))}</button>`);
  }
  laneT1.innerHTML = chips.length
    ? chips.join('')
    : `<button type="button" class="lane-ghost" data-lane-action="text" title="Add a title or caption">` +
        `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>` +
        `Text</button>`;
}

// Lane ghost buttons: Audio → unified picker (routes audio to BGM), Text → caption panel
// A1 / T1 lane interactivity: chips and the whole lane row open their editor tool card.
if (lanesWrap) {
  lanesWrap.addEventListener('click', (e) => {
    // 1) Ghost "+" buttons on empty lanes open the picker / text editor
    const ghost = e.target.closest('.lane-ghost[data-lane-action]');
    if (ghost) {
      if (ghost.dataset.laneAction === 'audio') fileInput.click();
      else jumpToCard('card-captions');
      return;
    }
    // 2) Lane chips: audio / text / caption — open the matching editor card
    const chip = e.target.closest('.lane-chip[data-lane-action]');
    if (chip) {
      if (chip.dataset.laneAction === 'audio') jumpToCard('card-audio');
      else if (chip.dataset.laneAction === 'text') jumpToCard('card-watermark');
      else jumpToCard('card-captions');
      return;
    }
    // 3) Whole lane is a tap target for desktop users
    const laneA = e.target.closest('.lane-audio');
    if (laneA) { jumpToCard('card-audio'); return; }
    const laneT = e.target.closest('.lane-text');
    if (laneT) { jumpToCard(state.captions.length ? 'card-captions' : 'card-watermark'); }
  }, true);
}

/* ═════════════════════════════════════════════
   Quick-jump rail — scroll + flash the matching tool card
   ═════════════════════════════════════════════ */
function jumpToCard(id) {
  const card = document.getElementById(id);
  if (!card) return;
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  card.classList.remove('card-flash');
  // force reflow so the animation can replay
  void card.offsetWidth;
  card.classList.add('card-flash');
  window.setTimeout(() => card.classList.remove('card-flash'), 1100);
}

Array.from(document.querySelectorAll('.rail-btn[data-jump]')).forEach(btn => {
  btn.addEventListener('click', () => jumpToCard(btn.dataset.jump));
});

// Canvas/Platform switcher in the mobile dock — flash the top-bar aspect selector
const dockAspectBtn = $('dockAspectBtn');
if (dockAspectBtn) dockAspectBtn.addEventListener('click', () => {
  const ag = $('aspectGroup');
  if (!ag) return;
  ag.classList.remove('card-flash');
  void ag.offsetWidth;
  ag.classList.add('card-flash');
  window.setTimeout(() => ag.classList.remove('card-flash'), 1200);
});

/* ═════════════════════════════════════════════
   TOUCH PINCH-TO-ZOOM — V1 lane (two-finger scale)
   Track-level horizontal panning stays native (touch-action: pan-x);
   the gesture we own is the two-pointer pinch to scale the timeline.
   ═════════════════════════════════════════════ */
const laneV1 = $('laneV1');
const pinchPointers = new Map();
let pinchStartDistance = null;
let pinchStartZoom = 1;

function pinchDistance() {
  const pts = [...pinchPointers.values()];
  if (pts.length < 2) return 0;
  return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
}

if (laneV1) {
  laneV1.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    pinchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinchPointers.size === 2) {
      pinchStartDistance = pinchDistance();
      pinchStartZoom = state.pxPerSec;
    }
  });
  laneV1.addEventListener('pointermove', (e) => {
    if (!pinchPointers.has(e.pointerId)) return;
    pinchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinchPointers.size === 2 && pinchStartDistance > 0) {
      const d = pinchDistance();
      if (d > 10) {
        state.pxPerSec = clamp(pinchStartZoom * (d / pinchStartDistance), 30, 420);
        layoutTimeline();
        syncTimelineScrollToTime();
        updateTimelineZoomUI();
      }
    }
  });
  const endPinch = (e) => {
    pinchPointers.delete(e.pointerId);
    if (pinchPointers.size < 2) pinchStartDistance = null;
  };
  laneV1.addEventListener('pointerup', endPinch);
  laneV1.addEventListener('pointercancel', endPinch);
  laneV1.addEventListener('pointerleave', endPinch);
  // Double-tap anywhere on the lane resets zoom to default
  let lastTap = 0;
  laneV1.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'touch') return;
    const now = Date.now();
    if (now - lastTap < 320 && pinchPointers.size === 0) {
      state.pxPerSec = 120;
      layoutTimeline();
      syncTimelineScrollToTime();
      updateTimelineZoomUI();
      showToast('Timeline zoom reset.');
    }
    lastTap = now;
  });
}

// Zoom buttons (+ / −)
if (zoomInBtn) zoomInBtn.addEventListener('click', () => {
  state.pxPerSec = clamp(state.pxPerSec * 1.4, 30, 420);
  layoutTimeline();
  syncTimelineScrollToTime();
  updateTimelineZoomUI();
});
if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => {
  state.pxPerSec = clamp(state.pxPerSec / 1.4, 30, 420);
  layoutTimeline();
  syncTimelineScrollToTime();
  updateTimelineZoomUI();
});

// Scroll the lanes to scrub the global playhead (CapCut-style)
if (lanesWrap) {
  lanesWrap.addEventListener('scroll', () => {
    if (state.timelineSync) { state.timelineSync = false; return; }
    const total = totalEffectiveDuration();
    if (total <= 0) return;
    const next = clamp((lanesWrap.scrollLeft + lanesWrap.clientWidth / 2) / state.pxPerSec, 0, total);
    const target = clipAtGlobal(next);
    activateClip(target.index, target.sourceTime, false);
    syncBgmToVideo(true);
    // lightweight: only update timecode + seekbar, not the full render layout
    timecodeDisplay.textContent = `${formatTime(getGlobalTime())} / ${formatTime(total)}`;
    seekBar.value = String(clamp(Math.round(getGlobalTime() * 1000), 0, Math.max(1, Math.round(total * 1000))));
  }, { passive: true });
}

/* ═════════════════════════════════════════════
   Init — aspect canvas, SW
   ═════════════════════════════════════════════ */
setAspectButtons(state.aspect);
setCaptionStyleButtons(state.captionStyle);
setTransitionButtons(state.transition);
syncWatermarkUI();
setSpeed(state.speed, true);
applyAspectToCanvas();
updateEmptiness();
renderTimeline();
renderOverlayList();
renderCaptionList();
refreshTransportBounds();
updateUndoButtons();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('Service worker registration failed (app still works online):', err);
    });
  });
}
