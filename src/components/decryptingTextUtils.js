export function getDecryptingRevealOrder(textOrLength, revealDirection = 'start') {
  const length = Math.max(
    0,
    typeof textOrLength === 'number'
      ? Math.floor(textOrLength)
      : String(textOrLength ?? '').length,
  )

  if (revealDirection === 'end') {
    return Array.from({ length }, (_, index) => length - index - 1)
  }

  if (revealDirection === 'center') {
    const middle = Math.floor((length - 1) / 2)
    const order = []

    for (let offset = 0; order.length < length; offset += 1) {
      const left = middle - offset
      const right = middle + offset

      if (left >= 0) {
        order.push(left)
      }

      if (offset > 0 && right < length) {
        order.push(right)
      }
    }

    return order
  }

  return Array.from({ length }, (_, index) => index)
}

export function getDecryptingTextFrame({
  characters,
  order,
  random = Math.random,
  revealedCount,
  text,
}) {
  const sourceText = String(text ?? '')
  const glyphs = String(characters || sourceText || ' ').split('')
  const revealed = new Set(order.slice(0, Math.max(0, revealedCount)))

  return Array.from(sourceText)
    .map((character, index) => {
      if (character === ' ') return ' '
      if (revealed.has(index)) return character

      const glyphIndex = Math.min(
        glyphs.length - 1,
        Math.max(0, Math.floor(random() * glyphs.length)),
      )

      return glyphs[glyphIndex] || character
    })
    .join('')
}
