import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getCueProgress,
  getCueState,
  getFrameIndex,
  getFrameLoadOrder,
  getInitialReadyFrameCount,
  getFrameUrl,
  getRenderableFrame,
  getSampleTime,
  getScrollProgress,
} from '../src/components/scrollVideoTiming.js'

test('maps the sticky section scroll range to a clamped 0..1 progress value', () => {
  const section = {
    top: 100,
    height: 3000,
    viewportHeight: 1000,
  }

  assert.equal(getScrollProgress(section), 0)
  assert.equal(getScrollProgress({ ...section, top: -1000 }), 0.5)
  assert.equal(getScrollProgress({ ...section, top: -2400 }), 1)
})

test('computes cue opacity and vertical offset around the target video time', () => {
  const cue = { time: 3, fade: 0.5, hold: 1 }
  const duration = 10

  assert.deepEqual(getCueState({ cue, duration, progress: 0.2 }), {
    opacity: 0,
    y: 24,
  })

  assert.deepEqual(getCueState({ cue, duration, progress: 0.3 }), {
    opacity: 1,
    y: 0,
  })

  assert.deepEqual(getCueState({ cue, duration, progress: 0.425 }), {
    opacity: 0.5,
    y: 12,
  })
})

test('maps a nav cue to the peak scroll progress instead of the fade-in range', () => {
  assert.equal(
    getCueProgress({
      cue: { id: 'profile', time: 2.4, fade: 0.5 },
      duration: 10,
    }),
    0.24,
  )
})

test('keeps the intro cue hidden when jumping directly to Profile', () => {
  const duration = 10
  const intro = { id: 'intro', time: 0.7, end: 1.5 }
  const profileProgress = getCueProgress({
    cue: { id: 'profile', time: 2.4 },
    duration,
  })

  assert.deepEqual(getCueState({ cue: intro, duration, progress: profileProgress }), {
    opacity: 0,
    y: 24,
  })
})

test('maps progress to a valid frame index', () => {
  assert.equal(getFrameIndex({ progress: -0.2, frameCount: 120 }), 0)
  assert.equal(getFrameIndex({ progress: 0.5, frameCount: 120 }), 60)
  assert.equal(getFrameIndex({ progress: 1.2, frameCount: 120 }), 119)
})

test('loads timeline keyframes before filling every sequential frame', () => {
  const order = getFrameLoadOrder(581)

  assert.deepEqual(order.slice(0, 9), [
    0,
    580,
    290,
    145,
    435,
    73,
    218,
    363,
    508,
  ])
  assert.equal(new Set(order).size, 581)
  assert.equal(order.length, 581)
})

test('waits for timeline keyframes before marking the sequence ready', () => {
  assert.equal(getInitialReadyFrameCount(436), 9)
  assert.equal(getInitialReadyFrameCount(4), 4)
  assert.equal(getInitialReadyFrameCount(0), 0)
})

test('keeps manifest frame slots stable while frames are still loading', () => {
  const frames = Array.from({ length: 581 }, () => null)
  frames[0] = { id: 'frame-0' }
  frames[290] = { id: 'frame-290' }
  frames[580] = { id: 'frame-580' }

  assert.equal(getFrameIndex({ progress: 0.5, frameCount: frames.length }), 290)
  assert.equal(getRenderableFrame({ frames, targetIndex: 290 }).id, 'frame-290')
  assert.equal(getRenderableFrame({ frames, targetIndex: 291 }).id, 'frame-290')
  assert.equal(getRenderableFrame({ frames, targetIndex: 579 }).id, 'frame-580')
})

test('does not advance frames just because later images finished loading', () => {
  const frames = Array.from({ length: 581 }, () => null)
  frames[100] = { id: 'frame-100' }
  const currentFrame = getRenderableFrame({ frames, targetIndex: 580 })
  const framesAfterMoreLoaded = [...frames]
  framesAfterMoreLoaded[101] = { id: 'frame-101' }

  assert.equal(currentFrame.id, 'frame-100')
  assert.equal(
    getRenderableFrame({
      currentFrame,
      frames: framesAfterMoreLoaded,
      previousTargetIndex: 580,
      targetIndex: 580,
    }).id,
    'frame-100',
  )

  framesAfterMoreLoaded[580] = { id: 'frame-580' }
  assert.equal(
    getRenderableFrame({
      currentFrame,
      frames: framesAfterMoreLoaded,
      previousTargetIndex: 580,
      targetIndex: 580,
    }).id,
    'frame-580',
  )
})

test('builds padded frame URLs from a sequence config', () => {
  assert.equal(
    getFrameUrl({
      basePath: '/frames/web_vedio',
      index: 7,
      pad: 4,
      ext: 'webp',
    }),
    '/frames/web_vedio/frame_0007.webp',
  )
})

test('maps frame samples across a trimmed video range', () => {
  assert.equal(
    getSampleTime({
      duration: 10,
      endTime: 9.5,
      frameCount: 10,
      index: 0,
      startTime: 0.5,
    }),
    0.5,
  )
  assert.equal(
    getSampleTime({
      duration: 10,
      endTime: 9.5,
      frameCount: 10,
      index: 9,
      startTime: 0.5,
    }),
    9.5,
  )
})
