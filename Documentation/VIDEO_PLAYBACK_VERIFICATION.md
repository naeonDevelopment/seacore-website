# Video Playback Verification Checklist

**Last Updated:** March 2026  
**Relates to:** `src/components/ui/HeroVideoBackground.tsx`, `ExecutiveRoleVideoBackground.tsx`

---

## SLO Targets

| Metric | Target | Measured from |
|--------|--------|---------------|
| Hero TTFF | ≤ 2 000 ms | Component mount |
| Hero smooth-start | ≤ 3 500 ms | Component mount |
| Executive TTFF | ≤ 2 000 ms | Section enters viewport |
| Executive smooth-start | ≤ 3 500 ms | Section enters viewport |
| Stall count (per session) | ≤ 2 | Per component |

---

## How to Read the Debug APIs

Open browser DevTools console on `https://fleetcore.ai/`.

```js
// Hero
__heroVideoDebug.dump()
// → { ttffMs, smoothStartMs, timeToPlayingMs, stallCount (via events), events[] }

// Executive
__executiveVideoDebug.dump()
// → { ttffMs, smoothStartMs, stallCount, totalStallMs, events[] }

// Executive loading stage
__executiveVideoDebug.stage()   // 'idle' | 'metadata' | 'full'
__executiveVideoDebug.revealed() // true once freeze-frame dissolved to video
```

---

## Testing Protocol

### 1. Baseline — fast broadband (no throttle)

1. Open Chrome DevTools → Network tab → No throttle.
2. Hard reload (`Cmd+Shift+R`).
3. **Assert:** Hero video plays within ~1 s (poster → video seamless).
4. Scroll to Executive section slowly.
5. **Assert:** Executive gradient is visible until section is near (~350 px away), then metadata loads; actual video plays on entry.
6. Run `__heroVideoDebug.dump()` → `ttffMs < 2000`, `smoothStartMs < 3500`.
7. Run `__executiveVideoDebug.dump()` after scrolling to section → same SLOs.

### 2. Fast 3G throttle

1. DevTools → Network → Fast 3G (1.5 Mbps down).
2. Hard reload.
3. **Assert Hero:** Poster (`h_h_1-firstframe.jpg`) shows instantly (preloaded). Video starts within ~3–5 s on this connection (acceptable). No blank frame or black flash.
4. **Assert Executive:** Gradient shows during scroll. Section video starts after entering viewport. No eager background fetching during hero startup.
5. **Assert sibling prefetch:** Open Network tab filtered to `.mp4`. `h_h_2.mp4` and `h_h_3.mp4` should NOT begin fetching until hero is smoothly playing.

### 3. Slow 4G (3G equivalent, ~1 Mbps)

Same assertions as Fast 3G. Pay attention to:
- Hero stall count (expect ≤ 2 from `__heroVideoDebug.dump()`).
- Executive stable `isRevealed` (no flash or stutter on first reveal).

### 4. 3G / Save-Data — Executive adaptive rendition

To manually test 3G rendition selection:
```js
// Simulate 3G connection (Chrome only)
// DevTools → Sensors → Network conditions → Custom → Downlink 1.5 Mbps
```
**Assert:** Executive uses `vid_section_experts_1.mp4` (1.5 MB) instead of `vid_section_experts1.mp4` (9.4 MB). Verify in Network tab.

To test save-data fallback:
```js
// DevTools → Network conditions → Enable "Save-Data" header
```
**Assert:** Executive section shows gradient only; no video network requests for section_experts assets.

### 5. Mobile — iOS Safari (or iPhone emulation)

1. DevTools → Device toolbar → iPhone 15.
2. Hard reload.
3. **Assert Hero:** `playsInline` prevents fullscreen; poster shows, video plays inline.
4. **Assert Executive:** Gradient freeze-frame shows; dissolves to video ~0.5 s after section enters view.
5. Check for any `AbortError` in console — expected during power-save mode; not a bug.

### 6. Background-tab behaviour

1. Load page normally.
2. Immediately switch to another tab for 30 s.
3. Return to fleetcore tab.
4. **Assert:** Hero video resumes (IntersectionObserver re-fires `resume` path). No visible stutter from cold decode.

---

## Rollback Procedure

If any regression is observed after deployment:

### Immediate rollback (code only — no infra change)

1. Revert these files to the version before this PR:
   - `src/components/ui/ExecutiveRoleVideoBackground.tsx`
   - `src/components/ui/HeroVideoBackground.tsx`
   - `index.html`
2. The shared utilities (`src/utils/videoReadiness.ts`, `src/hooks/useVideoPlaybackMetrics.ts`) are additive and safe to leave in place.

### Rollback triggers

| Symptom | Action |
|---------|--------|
| Executive section stays as gradient forever (never reveals) | Check `__executiveVideoDebug.stage()` — should reach `'full'`. Check `isConstrainedConnection()` returns false on production connection. |
| Hero first-frame flash or blank frame | Verify `h_h_1-firstframe.jpg` is accessible (`/assets/hero/h_h_1-firstframe.jpg` → 200). Check that `fetchpriority="high"` is on the poster preload in `index.html`. |
| Hero sibling videos (`h_h_2`, `h_h_3`) never preload | Check `smoothStartMs` in debug dump — if null, smooth start detection failed. Browser may be blocking the `waiting` event. |
| Increased stall count after deploy | Compare `stallCount` across sessions. If ≥ 3 average, the stability window may be too tight — increase `STABILITY_WINDOW_MS` in `videoReadiness.ts`. |
| 3G executive shows wrong video size | `getConnectionHints()` may return null `effectiveType` in that browser. Check `videoSources` useMemo output in component. |

---

## Asset Generation (run once after ffmpeg is available)

```bash
# Generate all renditions + first-frame posters
bash scripts/video/encode_renditions.sh

# Verify faststart on source files
python3 scripts/video/faststart_mp4.py public/assets/hero/h_h_1.mp4
python3 scripts/video/faststart_mp4.py public/assets/hero/h_h_2.mp4
python3 scripts/video/faststart_mp4.py public/assets/hero/h_h_3.mp4
python3 scripts/video/faststart_mp4.py public/assets/section_experts/vid_section_experts1.mp4
python3 scripts/video/faststart_mp4.py public/assets/section_experts/vid_section_experts_2.mp4
```

After generating `vid_section_experts1-firstframe.jpg`:

1. Add to `index.html`:
   ```html
   <link rel="preload" as="image"
         href="/assets/section_experts/vid_section_experts1-firstframe.jpg"
         fetchpriority="low" />
   ```
   (Low priority — below fold, poster only needs to be ready before user scrolls there.)

2. The `ExecutiveRoleVideoBackground` already reads this path and shows it gracefully if present; hides silently if missing.

---

## Network Waterfall Expected Shape

After these changes, a typical page load waterfall should look like:

```
0 ms ──── HTML
         └── fonts (preconnect warm)
         └── JS bundle
         └── h_h_1-firstframe.jpg  (fetchpriority=high, paints immediately)
         └── h_h_1.mp4             (fetchpriority=low, starts after critical path)

~300 ms → Hero poster visible
~1–2 s  → Hero video decodes + smooth-start confirmed
~2–2.3 s → h_h_2.mp4 + h_h_3.mp4 prefetch kicks off (idle callback)

[User scrolls toward Executive section]
~(scroll -350px) → vid_section_experts1.mp4 metadata fetch starts
~(scroll in view) → full fetch + play + gate
~(gate passes)   → 0.5 s dissolve from gradient to video
```

Executive section videos do NOT appear in the waterfall until scroll reaches ~350 px from the section.
