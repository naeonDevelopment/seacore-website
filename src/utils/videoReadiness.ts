/**
 * Shared utilities for video playback readiness gating.
 * Used by HeroVideoBackground and ExecutiveRoleVideoBackground.
 */

/** Minimum buffered duration (seconds) before a video is considered ready to reveal. */
export const MIN_BUFFER_SECONDS = 0.6

/** How long to wait for a first painted frame before timing out (ms). */
export const FIRST_FRAME_TIMEOUT_MS = 1500

/** Stability window: playback must run this long (ms) without a `waiting` event to be smooth-started. */
export const STABILITY_WINDOW_MS = 300

/**
 * Returns true if the video has buffered at least `minSeconds` of data,
 * or is in a high-enough readyState that playback should be smooth.
 */
export function hasSufficientBuffer(
  video: HTMLVideoElement,
  minSeconds = MIN_BUFFER_SECONDS
): boolean {
  if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return true
  try {
    if (video.buffered.length > 0) {
      return video.buffered.end(video.buffered.length - 1) >= minSeconds
    }
  } catch {
    // ignore
  }
  return false
}

/**
 * Resolves when the first video frame is painted, or rejects on timeout.
 * Prefers `requestVideoFrameCallback` when available; falls back to `playing`.
 */
export function awaitFirstPaintedFrame(
  video: HTMLVideoElement,
  timeoutMs = FIRST_FRAME_TIMEOUT_MS
): Promise<void> {
  return new Promise((resolve, reject) => {
    let done = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const finish = () => {
      if (done) return
      done = true
      if (timeoutId !== undefined) clearTimeout(timeoutId)
      resolve()
    }

    const fail = () => {
      if (done) return
      done = true
      reject(new Error('timeout_waiting_for_first_painted_frame'))
    }

    const anyVideo = video as any
    if (typeof anyVideo.requestVideoFrameCallback === 'function') {
      anyVideo.requestVideoFrameCallback(finish)
    } else {
      video.addEventListener('playing', finish, { once: true })
    }

    timeoutId = setTimeout(fail, timeoutMs)
  })
}

/**
 * Resolves after `windowMs` of continuous playback without a `waiting` event.
 * Returns `{ stable: true }` on clean window, `{ stable: false }` if a stall occurred.
 */
export function awaitPlaybackStability(
  video: HTMLVideoElement,
  windowMs = STABILITY_WINDOW_MS
): Promise<{ stable: boolean }> {
  return new Promise((resolve) => {
    let tid: ReturnType<typeof setTimeout> | undefined

    const onWaiting = () => {
      if (tid !== undefined) clearTimeout(tid)
      video.removeEventListener('waiting', onWaiting)
      resolve({ stable: false })
    }

    const onDone = () => {
      video.removeEventListener('waiting', onWaiting)
      resolve({ stable: true })
    }

    video.addEventListener('waiting', onWaiting, { once: true })
    tid = setTimeout(onDone, windowMs)
  })
}

/**
 * Returns Network Information API hints for adaptive prefetch decisions.
 */
export function getConnectionHints(): {
  saveData: boolean
  effectiveType: string | null
  downlink: number | null
} {
  if (typeof navigator === 'undefined') {
    return { saveData: false, effectiveType: null, downlink: null }
  }
  const nav = navigator as any
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection
  return {
    saveData: Boolean(conn?.saveData),
    effectiveType: conn?.effectiveType ?? null,
    downlink: conn?.downlink ?? null,
  }
}

/**
 * Returns true when the connection is constrained (2G, slow-2g, or save-data on).
 * Use to skip video loading entirely on very slow connections.
 */
export function isConstrainedConnection(): boolean {
  const { saveData, effectiveType } = getConnectionHints()
  if (saveData) return true
  if (effectiveType === 'slow-2g' || effectiveType === '2g') return true
  return false
}
