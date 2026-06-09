import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getDecryptingRevealOrder,
  getDecryptingTextFrame,
} from '../src/components/decryptingTextUtils.js'

test('builds a start-to-end reveal order for loading copy', () => {
  assert.deepEqual(getDecryptingRevealOrder('C11 RIDES'), [0, 1, 2, 3, 4, 5, 6, 7, 8])
})

test('keeps spaces stable while unrevealed characters scramble', () => {
  const order = getDecryptingRevealOrder('C11 RIDES')
  const frame = getDecryptingTextFrame({
    characters: 'X',
    order,
    random: () => 0,
    revealedCount: 3,
    text: 'C11 RIDES',
  })

  assert.equal(frame, 'C11 XXXXX')
})

test('can reveal from the center for boot-style loading labels', () => {
  assert.deepEqual(getDecryptingRevealOrder('ABCDE', 'center'), [2, 1, 3, 0, 4])
})
