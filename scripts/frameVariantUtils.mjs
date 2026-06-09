export function buildSampleMap({ sourceFrameCount, sourceFps, targetFps }) {
  if (!Number.isInteger(sourceFrameCount) || sourceFrameCount < 2) {
    throw new Error('sourceFrameCount must be an integer greater than 1')
  }

  if (sourceFps <= 0 || targetFps <= 0) {
    throw new Error('sourceFps and targetFps must be positive')
  }

  if (targetFps > sourceFps) {
    throw new Error('targetFps cannot exceed sourceFps')
  }

  const sourceLastFrame = sourceFrameCount - 1
  const targetFrameCount = Math.round((sourceFrameCount - 1) * (targetFps / sourceFps)) + 1
  const targetLastFrame = targetFrameCount - 1
  const map = []

  for (let index = 0; index < targetFrameCount; index += 1) {
    const progress = targetLastFrame === 0 ? 0 : index / targetLastFrame
    map.push(Math.round(sourceLastFrame * progress))
  }

  return map
}

export function buildVariantManifest({ sourceManifest, targetFps, basePath, frameCount }) {
  return {
    ...sourceManifest,
    basePath,
    fps: targetFps,
    frameCount,
  }
}
