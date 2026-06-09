import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'

const anchorModuleUrl = new URL('../src/components/lanyardAnchor.js', import.meta.url)

test('maps a measured DOM anchor center into camera world coordinates', async () => {
  assert.ok(existsSync(anchorModuleUrl), 'Missing lanyardAnchor utility')

  const { getAnchorPosition } = await import(anchorModuleUrl)
  const position = getAnchorPosition({
    anchorRect: {
      height: 40,
      left: 780,
      top: 32,
      width: 40,
    },
    fov: 20,
    isMobile: false,
    position: [0, 0, 30],
    viewportSize: {
      height: 800,
      width: 1200,
    },
  })

  assert.equal(position.length, 3)
  assert.equal(Math.round(position[0] * 1000) / 1000, 2.645)
  assert.equal(Math.round(position[1] * 1000) / 1000, 4.602)
  assert.equal(position[2], 0)
})

test('falls back to the current ratio anchor when DOM measurement is unavailable', async () => {
  assert.ok(existsSync(anchorModuleUrl), 'Missing lanyardAnchor utility')

  const { getAnchorPosition } = await import(anchorModuleUrl)
  const position = getAnchorPosition({
    fov: 18,
    isMobile: false,
    position: [0, 0, 30],
    viewportSize: {
      height: 900,
      width: 1440,
    },
  })

  assert.equal(Math.round(position[0] * 1000) / 1000, 1.216)
  assert.equal(Math.round(position[1] * 1000) / 1000, 3.611)
  assert.equal(position[2], 0)
})
