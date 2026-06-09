const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value))

export function getScrollProgress({ top, height, viewportHeight }) {
  const scrollableDistance = Math.max(1, height - viewportHeight)
  return clamp(-top / scrollableDistance)
}

export function getFrameIndex({ progress, frameCount }) {
  const lastFrame = Math.max(0, frameCount - 1)
  return Math.min(lastFrame, Math.round(clamp(progress) * lastFrame))
}

export function getFrameLoadOrder(frameCount) {
  const count = Math.max(0, Math.floor(frameCount))
  const lastFrame = count - 1
  const order = []
  const seen = new Set()
  const addFrame = (index) => {
    const frameIndex = Math.min(lastFrame, Math.max(0, Math.round(index)))

    if (!seen.has(frameIndex)) {
      seen.add(frameIndex)
      order.push(frameIndex)
    }
  }

  if (count === 0) {
    return order
  }

  addFrame(0)
  addFrame(lastFrame)

  for (let segments = 2; segments < count; segments *= 2) {
    for (let step = 1; step < segments; step += 2) {
      addFrame((lastFrame * step) / segments)
    }
  }

  for (let index = 0; index < count; index += 1) {
    addFrame(index)
  }

  return order
}

export function getInitialReadyFrameCount(frameCount) {
  const count = Math.max(0, Math.floor(frameCount))

  return Math.min(count, 9)
}

export function isFrameLoadingComplete({
  frameCount,
  loadedFrameCount,
}) {
  const total = Math.max(0, Math.floor(frameCount))
  const loaded = Math.max(0, Math.floor(loadedFrameCount))

  return total > 0 && loaded >= total
}

export function isFrameSequenceInteractive({
  loadProgress,
  ready,
  minimumProgress = 0.5,
}) {
  return Boolean(ready) && clamp(loadProgress, 0, 1) >= clamp(minimumProgress, 0, 1)
}

export function getLoadingDisplayProgress({
  loadProgress,
  completeAt = 0.5,
}) {
  const threshold = Math.max(0.001, clamp(completeAt, 0, 1))
  return clamp(loadProgress / threshold, 0, 1)
}

export function getLoadingExitTiming({
  elapsedMs,
  fadeMs,
  minimumDisplayMs,
}) {
  const elapsed = Math.max(0, Math.floor(elapsedMs))
  const fade = Math.max(0, Math.floor(fadeMs))
  const minimum = Math.max(0, Math.floor(minimumDisplayMs))
  const exitDelayMs = Math.max(0, minimum - elapsed)

  return {
    exitDelayMs,
    hideDelayMs: exitDelayMs + fade,
  }
}

export function getRenderableFrame({
  currentFrame,
  frames,
  previousTargetIndex,
  targetIndex,
}) {
  if (!Array.isArray(frames) || frames.length === 0) {
    return null
  }

  const index = Math.min(frames.length - 1, Math.max(0, targetIndex))

  if (frames[index]) {
    return frames[index]
  }

  if (currentFrame && previousTargetIndex === index) {
    return currentFrame
  }

  for (let offset = 1; offset < frames.length; offset += 1) {
    const previous = index - offset
    const next = index + offset

    if (previous >= 0 && frames[previous]) {
      return frames[previous]
    }

    if (next < frames.length && frames[next]) {
      return frames[next]
    }
  }

  return null
}

export function getCueProgress({ cue, duration }) {
  const safeDuration = Math.max(0.001, duration)
  return clamp((cue.time ?? 0) / safeDuration)
}

export function getFrameUrl({ basePath, index, pad = 4, ext = 'webp' }) {
  const paddedIndex = String(index).padStart(pad, '0')
  return `${basePath}/frame_${paddedIndex}.${ext}`
}

export function getSampleTime({
  duration,
  endTime,
  frameCount,
  index,
  startTime = 0,
}) {
  const safeDuration = Math.max(0.001, duration)
  const start = Math.min(Math.max(0, startTime), safeDuration)
  const end = Math.min(Math.max(start, endTime ?? safeDuration), safeDuration)
  const lastFrame = Math.max(1, frameCount - 1)
  const progress = Math.min(1, Math.max(0, index / lastFrame))

  return Math.round((start + (end - start) * progress) * 1000) / 1000
}

export function getCueState({ cue, duration, progress }) {
  const safeDuration = Math.max(0.001, duration)
  const startTime = cue.start ?? Math.max(0, cue.time - (cue.fade ?? 0.45))
  const holdEndTime = cue.end ?? cue.time + (cue.hold ?? 1.1)
  const fade = cue.fade ?? 0.45
  const start = startTime / safeDuration
  const peak = cue.time / safeDuration
  const holdEnd = holdEndTime / safeDuration
  const fadeEnd = (holdEndTime + fade) / safeDuration

  let opacity = 0

  if (progress >= start && progress < peak) {
    opacity = (progress - start) / Math.max(0.001, peak - start)
  } else if (progress >= peak && progress <= holdEnd) {
    opacity = 1
  } else if (progress > holdEnd && progress <= fadeEnd) {
    opacity = 1 - (progress - holdEnd) / Math.max(0.001, fadeEnd - holdEnd)
  }

  const roundedOpacity = Math.round(clamp(opacity) * 1000) / 1000

  return {
    opacity: roundedOpacity,
    y: Math.round(24 * (1 - roundedOpacity)),
  }
}
