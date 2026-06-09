import test from 'node:test'
import assert from 'node:assert/strict'

import { buildSampleMap, buildVariantManifest } from '../scripts/frameVariantUtils.mjs'

test('builds target frame map with matching first and last source frames', () => {
  const map = buildSampleMap({
    sourceFps: 60,
    sourceFrameCount: 581,
    targetFps: 30,
  })

  assert.equal(map.length, 291)
  assert.equal(map[0], 0)
  assert.equal(map.at(-1), 580)
})

test('builds 45fps and 50fps maps from 60fps source', () => {
  assert.equal(buildSampleMap({ sourceFps: 60, sourceFrameCount: 581, targetFps: 45 }).length, 436)
  assert.equal(buildSampleMap({ sourceFps: 60, sourceFrameCount: 581, targetFps: 50 }).length, 484)
})

test('builds variant manifest without changing source duration or dimensions', () => {
  const manifest = buildVariantManifest({
    basePath: '/frames_compare/web_vedio_30',
    frameCount: 291,
    sourceManifest: {
      basePath: '/frames/web_vedio',
      duration: 9.667,
      ext: 'webp',
      frameCount: 581,
      fps: 60,
      height: 1442,
      pad: 4,
      width: 2560,
    },
    targetFps: 30,
  })

  assert.equal(manifest.basePath, '/frames_compare/web_vedio_30')
  assert.equal(manifest.frameCount, 291)
  assert.equal(manifest.fps, 30)
  assert.equal(manifest.duration, 9.667)
  assert.equal(manifest.width, 2560)
  assert.equal(manifest.height, 1442)
})
