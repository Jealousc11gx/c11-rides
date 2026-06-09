const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value))

export function getScrollProgress({ top, height, viewportHeight }) {
  const scrollableDistance = Math.max(1, height - viewportHeight)
  return clamp(-top / scrollableDistance)
}

export function getFrameIndex({ progress, frameCount }) {
  const lastFrame = Math.max(0, frameCount - 1)
  return Math.min(lastFrame, Math.round(clamp(progress) * lastFrame))
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
