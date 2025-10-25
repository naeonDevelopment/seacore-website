# Video Player Browser Compatibility Guide

**Last Updated:** October 25, 2025  
**Components:** `HeroVideoBackground.tsx`, `ExecutiveRoleVideoBackground.tsx`

## Overview

This document outlines the browser compatibility improvements implemented to ensure reliable video playback across all major browsers and devices, addressing autoplay policies, power-saving restrictions, and mobile compatibility.

---

## Browser Compatibility Matrix

| Feature | Chrome | Safari | Firefox | Edge | iOS Safari | Android Chrome |
|---------|--------|--------|---------|------|------------|----------------|
| Autoplay (muted) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| playsInline | ✅ | ✅ | ✅ | ✅ | ✅ Required | ✅ Required |
| Intersection Observer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| onTimeUpdate | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dynamic Duration | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Issues Identified & Solutions

### 1. **Power-Saving Interruptions (AbortError)**

**Issue:**
```
AbortError: The play() request was interrupted because video-only 
background media was paused to save power.
```

**Root Cause:**
- Browsers pause videos without audio when they're off-screen or in the background to conserve battery
- Particularly aggressive on mobile devices and laptops on battery power

**Solution Implemented:**
```typescript
// Intersection Observer to pause videos when off-screen
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          // Proactively pause when off-screen
          videoARef.current?.pause()
          videoBRef.current?.pause()
        } else {
          // Resume when back in viewport
          const activeRef = activeVideo === 'A' ? videoARef : videoBRef
          if (activeRef.current && activeRef.current.paused) {
            activeRef.current.play().catch(err => {
              console.log('Resume failed (may need user interaction):', err.message)
            })
          }
        }
      })
    },
    { threshold: 0.1, rootMargin: '50px' }
  )

  if (containerRef.current) {
    observer.observe(containerRef.current)
  }

  return () => observer.disconnect()
}, [activeVideo])
```

**Benefits:**
- Cooperates with browser power-saving features
- Prevents AbortError by pausing proactively
- Resumes playback automatically when video enters viewport
- Reduces battery consumption on mobile devices

---

### 2. **Fixed Timing vs. Dynamic Video Duration**

**Issue:**
- Hardcoded intervals (8s/12s) didn't match actual video duration
- Videos would loop multiple times before transition
- Caused visual stuttering and poor UX

**Solution Implemented:**
```typescript
// Schedule transition based on actual video duration
const scheduleNextTransition = (videoRef: React.RefObject<HTMLVideoElement>) => {
  const video = videoRef.current
  if (video && video.duration && !isNaN(video.duration)) {
    // Schedule transition 2 seconds before video ends for seamless crossfade
    // This gives time to start the next video before the current one ends
    const timeUntilEnd = (video.duration - video.currentTime) * 1000 - 2000
    
    transitionTimeoutRef.current = setTimeout(() => {
      transitionToNextVideo()
    }, Math.max(timeUntilEnd, 1000))
  }
}

// Monitor playback and reschedule if needed
const handleTimeUpdate = (videoRef, videoId) => {
  if (video && !isTransitioningRef.current) {
    // If we're past halfway and no transition scheduled, schedule one
    if (video.currentTime > video.duration / 2 && !transitionTimeoutRef.current) {
      scheduleNextTransition(videoRef)
    }
  }
}
```

**Benefits:**
- Transitions sync perfectly with video duration
- Smooth crossfades without stuttering
- Handles variable video lengths automatically
- Backup scheduling via `onTimeUpdate` ensures reliability

---

### 2.1. **Seamless Overlapping Transitions (Zero Pause)**

**Issue:**
- Sequential playback caused visible pauses between videos
- Current video would stop, then next video would start
- Created jarring visual breaks in the experience

**Solution Implemented:**
```typescript
const transitionToNextVideo = () => {
  if (isTransitioningRef.current) return
  isTransitioningRef.current = true
  
  // STEP 1: Start playing the next video FIRST (while current is still visible)
  inactiveVideoRef.current.currentTime = 0
  if (isInViewport) {
    inactiveVideoRef.current.play().catch(err => {
      console.error('▶️ Autoplay failed:', err.message)
    })
  }
  
  // STEP 2: After 100ms to ensure next video is playing, trigger crossfade
  // This creates overlapping playback for seamless transition
  setTimeout(() => {
    setActiveVideo(prev => prev === 'A' ? 'B' : 'A')  // Trigger opacity crossfade
    setCurrentVideoIndex(nextIndex)
    
    // Allow next transition after crossfade completes
    setTimeout(() => {
      isTransitioningRef.current = false
    }, 1200) // Match transition duration + buffer
  }, 100)
}
```

**Crossfade Animation:**
```tsx
<motion.video
  animate={{ opacity: activeVideo === 'A' && videoALoaded ? 1 : 0 }}
  transition={{ 
    duration: 1.5,  // Hero: 1.5s, Executive: 1.8s
    ease: 'easeInOut' 
  }}
/>
```

**Timeline of Seamless Transition:**
```
Current Video A playing
├─ T-2.0s: Schedule transition
├─ T-0.0s: Start playing Video B (opacity 0, playing behind A)
├─ T+0.1s: Begin crossfade (A: 1→0, B: 0→1) over 1.5s
├─ T+1.6s: Crossfade complete, Video B fully visible
└─ Continue: Video B now active, preload Video C
```

**Benefits:**
- ✅ **Zero pause or gap** between videos
- ✅ Both videos playing during crossfade (overlapping playback)
- ✅ Smooth, cinematic transitions
- ✅ Next video already playing before fade begins
- ✅ 2-second lead time ensures next video is loaded and ready

---

### 3. **Mobile Autoplay Restrictions**

**Issue:**
- iOS Safari blocks autoplay by default
- Requires `playsInline` attribute to prevent fullscreen
- Android Chrome has similar restrictions

**Solution Implemented:**
```tsx
<motion.video
  autoPlay
  muted
  playsInline
  webkit-playsinline="true"              // Legacy iOS support
  x5-video-player-type="h5"              // Tencent X5 browser (WeChat)
  x5-video-player-fullscreen="false"     // Prevent fullscreen on Android
  // ... other props
/>
```

**Autoplay with Graceful Fallback:**
```typescript
// Attempt autoplay after video metadata loads
const attemptAutoplay = () => {
  if (videoARef.current && !autoplayAttemptedRef.current) {
    autoplayAttemptedRef.current = true
    const playPromise = videoARef.current.play()
    
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.log('⚠️ Initial autoplay blocked:', err.message)
        // Fallback: video will play when user scrolls to it (via Intersection Observer)
      })
    }
  }
}

videoARef.current.addEventListener('loadedmetadata', attemptAutoplay, { once: true })
```

**Benefits:**
- Works on iOS Safari (inline playback)
- Compatible with Android browsers
- Supports Tencent X5 browser (popular in China)
- Graceful fallback when autoplay is blocked

---

### 4. **Race Conditions in Video Transitions**

**Issue:**
- `onEnded` loop logic conflicted with interval-based transitions
- Multiple transitions could fire simultaneously

**Solution Implemented:**
```typescript
const isTransitioningRef = useRef(false)

const transitionToNextVideo = () => {
  if (isTransitioningRef.current) return  // Guard against race conditions
  
  isTransitioningRef.current = true
  
  // ... perform transition ...
  
  // Allow next transition after delay
  setTimeout(() => {
    isTransitioningRef.current = false
  }, 1500)
}

// Video end triggers transition instead of looping
const handleVideoEnd = (_videoRef, videoId) => {
  console.log(`🏁 Video ${videoId} ended`)
  transitionToNextVideo()  // Immediate transition
}
```

**Benefits:**
- Prevents duplicate transitions
- Clean state management
- Smooth, predictable behavior

---

### 5. **Video Index Tracking (Loop Transition Fix)**

**Issue:**
- When transitioning from video 2 → video 0 (loop), the inactive element still had video 0 loaded
- Caused flashing/showing wrong video frames during transition
- `isLoaded` flag was `true` but for the WRONG video index
- Example: Video A plays video 0, Video B plays video 1, Video A should play video 2 but still has 0 loaded

**Solution Implemented:**
```typescript
// Track which video index is loaded in each element
const [videoAIndex, setVideoAIndex] = useState<number>(0)
const [videoBIndex, setVideoBIndex] = useState<number>(-1)

const preloadVideo = (videoRef, index, videoId) => {
  const currentLoadedIndex = videoId === 'A' ? videoAIndex : videoBIndex
  
  // Only load if different video index
  if (currentLoadedIndex !== index) {
    videoRef.current.src = videoSources[index]
    videoRef.current.load()
    
    // Update tracking state
    if (videoId === 'A') {
      setVideoAIndex(index)
      setVideoALoaded(false) // Reset, will be true onLoadedData
    } else {
      setVideoBIndex(index)
      setVideoBLoaded(false)
    }
  }
}

// Verify correct video before transition
const transitionToNextVideo = () => {
  const nextIndex = getNextVideoIndex(currentIndex)
  const inactiveLoadedIndex = currentActive === 'A' ? videoBIndex : videoAIndex
  
  // Only transition if CORRECT video is loaded
  if (inactiveVideoRef.current && isInactiveLoaded && inactiveLoadedIndex === nextIndex) {
    // Transition...
  } else {
    // Wrong video loaded, reload correct one
    if (inactiveLoadedIndex !== nextIndex) {
      preloadVideo(inactiveVideoRef, nextIndex, inactiveVideoId)
    }
  }
}
```

**Transition Flow with Index Tracking:**
```
Initial State:
  Video A: index 0, playing
  Video B: index -1, empty

Transition 0→1:
  Video A: index 0, fading out
  Video B: index 1, fading in ✓

Transition 1→2:
  Video A: loads index 2 (was 0) ← Index tracking prevents using stale video
  Video B: index 1, fading out
  Video A: index 2, fading in ✓

Transition 2→0 (loop):
  Video B: loads index 0 (was 1)
  Video A: index 2, fading out
  Video B: index 0, fading in ✓
```

**Benefits:**
- ✅ Eliminates video flash/flicker during transitions
- ✅ Prevents showing wrong video frames
- ✅ Correct video always loads before transition
- ✅ Automatic recovery if wrong video detected
- ✅ Clean looping without visual glitches

---

## Browser-Specific Considerations

### **Chrome & Chromium-based Browsers**
- ✅ Full support for all features
- ⚠️ Power-saving mode may pause videos on laptops
- **Solution:** Intersection Observer handles this automatically

### **Safari (Desktop & iOS)**
- ✅ Requires `playsInline` for iOS inline playback
- ✅ Requires `muted` for autoplay
- ⚠️ Aggressive power-saving on macOS
- **Solution:** All attributes properly set, Intersection Observer handles power-saving

### **Firefox**
- ✅ Full support for all features
- ⚠️ Autoplay blocked by default in privacy settings
- **Solution:** Graceful fallback to Intersection Observer playback

### **Edge**
- ✅ Full support (Chromium-based)
- Same behavior as Chrome

### **Mobile Browsers (iOS Safari, Android Chrome)**
- ✅ `playsInline` prevents fullscreen takeover
- ✅ `webkit-playsinline` for legacy iOS support
- ✅ `x5-video-player-type` for WeChat browser
- ⚠️ Autoplay may be blocked without user interaction
- **Solution:** Videos play when scrolled into viewport

---

## Testing Recommendations

### Desktop Testing
```bash
# Test in multiple browsers:
- Chrome (latest)
- Safari (latest)
- Firefox (latest)
- Edge (latest)

# Test scenarios:
1. Initial page load (autoplay behavior)
2. Scroll video off-screen and back (power-saving)
3. Background tab for 30+ seconds (background throttling)
4. Battery saver mode enabled (power-saving)
```

### Mobile Testing
```bash
# Test devices:
- iOS Safari (iPhone/iPad)
- Android Chrome
- Samsung Internet
- WeChat browser (if targeting Chinese market)

# Test scenarios:
1. Portrait and landscape orientation
2. Low power mode enabled
3. Scroll behavior
4. Page visibility changes
```

### Developer Tools Testing
```javascript
// Test in browser console:

// 1. Check video element state
const video = document.querySelector('video');
console.log({
  paused: video.paused,
  readyState: video.readyState,
  duration: video.duration,
  currentTime: video.currentTime
});

// 2. Simulate power-saving pause
video.pause();
// Video should resume when scrolled into view

// 3. Test transition timing
// Check console logs for "⏰ Scheduling transition in [X]ms"
```

---

## Performance Optimizations

### 1. **Preloading Strategy**
```typescript
// Preload next video while current is playing
const preloadVideo = (videoRef, index) => {
  if (videoRef.current && !failedVideos.has(index)) {
    const src = videoSources[index]
    if (!videoRef.current.src.includes(fileName)) {
      videoRef.current.src = src
      videoRef.current.load()
    }
  }
}
```

### 2. **Memory Management**
- Only 2 video elements in DOM at any time (dual-buffer system)
- Preloading happens during playback to distribute load
- Cleanup on component unmount

### 3. **Network Efficiency**
- `preload="auto"` for important videos
- Progressive loading while other page resources load
- Failed videos are skipped automatically

---

## Error Handling

### Comprehensive Error Recovery
```typescript
// 1. Video load errors
const handleVideoError = (videoId, index) => {
  console.log(`❌ Video ${videoId} (index ${index}) failed to load`)
  setFailedVideos(prev => new Set(prev).add(index))
  
  // Fallback to gradient background if all videos fail
  if (failedVideos.size + 1 >= videoSources.length) {
    setVideosAvailable(false)
  }
}

// 2. Autoplay errors (caught and logged, not critical)
video.play().catch(err => {
  console.log('⚠️ Initial autoplay blocked:', err.message)
})

// 3. Transition errors (prevented via guard clauses)
if (isTransitioningRef.current) return  // Prevent race conditions
```

---

## Future Considerations

### Potential Enhancements
1. **Network-aware quality switching**
   - Detect connection speed
   - Serve lower quality videos on slow connections

2. **Reduced motion support**
   - Respect `prefers-reduced-motion` media query
   - Show static images for accessibility

3. **Advanced preloading**
   - Service Worker caching
   - Predictive preloading based on scroll position

4. **Analytics integration**
   - Track autoplay success rates
   - Monitor browser-specific issues
   - Performance metrics

---

## Troubleshooting Guide

### Videos Not Playing

**Check 1: Console Errors**
```javascript
// Look for these error patterns:
- "AbortError" → Power-saving (fixed by Intersection Observer)
- "NotAllowedError" → Autoplay policy (handled with fallback)
- "NotSupportedError" → Codec/format issue (check video encoding)
```

**Check 2: Video Attributes**
```tsx
// Verify all required attributes are set:
<video
  autoPlay
  muted           // Required for autoplay
  playsInline     // Required for iOS
  preload="auto"
/>
```

**Check 3: Intersection Observer**
```javascript
// Verify observer is active
const observer = new IntersectionObserver(...);
console.log('Observer active:', !!observer);
```

### Transition Issues

**Symptom:** Videos not transitioning
```javascript
// Check:
1. Video duration is valid (not NaN or 0)
2. isTransitioningRef state
3. Timeout is being scheduled
4. Console logs show transition attempts
```

**Symptom:** Transitions too fast/slow
```javascript
// Check video duration:
const video = document.querySelector('video');
console.log('Duration:', video.duration);
// Should match actual video length
```

---

## Compliance & Standards

### HTML5 Video Specification
- ✅ Fully compliant with HTML5 video element API
- ✅ Uses standard events: `loadeddata`, `timeupdate`, `ended`, `error`
- ✅ Respects browser autoplay policies

### Accessibility (WCAG)
- ⚠️ Videos are decorative background elements
- ✅ No sound (muted)
- ✅ Page content fully accessible without videos
- ✅ Graceful degradation to gradient background

### Privacy & Performance
- ✅ No tracking or analytics in video player
- ✅ Power-efficient (pauses when off-screen)
- ✅ Network-efficient (progressive loading)
- ✅ No third-party dependencies for video playback

---

## References

### Browser Documentation
- [Chrome Autoplay Policy](https://developer.chrome.com/blog/autoplay/)
- [Safari Autoplay Policy](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/)
- [Firefox Autoplay Policy](https://hacks.mozilla.org/2019/02/firefox-66-to-block-automatically-playing-audible-video-and-audio/)
- [MDN: HTMLVideoElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement)
- [MDN: Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)

### Standards
- [WHATWG HTML Living Standard - Video](https://html.spec.whatwg.org/multipage/media.html#the-video-element)
- [W3C Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/)

---

## Changelog

### October 25, 2025 (v3 - Video Index Tracking)
- ✅ **Fixed loop transitions** - tracks which video index is loaded in each element
- ✅ Prevents showing wrong video during transitions (e.g., flashing back to video 0)
- ✅ Verifies correct video is loaded before transitioning
- ✅ Automatic reloading if wrong video detected
- ✅ State tracking: `videoAIndex` and `videoBIndex`

### October 25, 2025 (v2 - Seamless Transitions)
- ✅ **Seamless overlapping transitions** - zero pause between videos
- ✅ Next video starts playing BEFORE crossfade begins
- ✅ 2-second lead time for transition scheduling
- ✅ Longer crossfade duration (1.5s hero, 1.8s executive)
- ✅ Both videos play simultaneously during crossfade

### October 25, 2025 (v1 - Initial Improvements)
- ✅ Implemented dynamic duration-based transitions
- ✅ Added Intersection Observer for power-saving compliance
- ✅ Enhanced mobile compatibility (playsInline, x5-video attributes)
- ✅ Improved error handling and graceful fallbacks
- ✅ Fixed race conditions in transition logic
- ✅ Added comprehensive logging for debugging

### Previous Implementation
- ❌ Fixed 8s/12s intervals (inflexible)
- ❌ No viewport awareness (power issues)
- ❌ Race conditions between loop and transitions
- ❌ Sequential playback (visible pause between videos)
- ❌ Limited mobile compatibility

---

## Support

For issues or questions about video player implementation:
1. Check console logs for diagnostic information
2. Review this documentation for common issues
3. Test in multiple browsers to isolate browser-specific problems
4. Check browser version compatibility

**Component Locations:**
- `src/components/ui/HeroVideoBackground.tsx`
- `src/components/ui/ExecutiveRoleVideoBackground.tsx`

