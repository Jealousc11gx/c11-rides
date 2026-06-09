import test from 'node:test'
import assert from 'node:assert/strict'

import { getTypedText, splitTextUnits } from '../src/components/textAnimation.js'

test('splits Chinese and Latin text into display characters', () => {
  assert.deepEqual(splitTextUnits('张三 Zhang', 'chars'), ['张', '三', ' ', 'Z', 'h', 'a', 'n', 'g'])
})

test('splits Latin copy into words while preserving spaces', () => {
  assert.deepEqual(splitTextUnits('Ad Astra', 'words'), ['Ad', ' ', 'Astra'])
})

test('returns the visible prefix for text type animation', () => {
  assert.equal(getTypedText('Ad Astra Ad Aspera', 8), 'Ad Astra')
  assert.equal(getTypedText('Ad Astra', -1), '')
})
