import { useEffect, useMemo, useState } from 'react'

import {
  getDecryptingRevealOrder,
  getDecryptingTextFrame,
} from './decryptingTextUtils.js'

const bootCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/%+<>[]'

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export default function DecryptingText({
  as: Tag = 'span',
  characters = bootCharacters,
  className = '',
  encryptedClassName = '',
  revealDirection = 'start',
  speed = 38,
  text,
  ...props
}) {
  const order = useMemo(
    () => getDecryptingRevealOrder(text, revealDirection),
    [revealDirection, text],
  )
  const [displayText, setDisplayText] = useState(text)
  const [revealedCount, setRevealedCount] = useState(order.length)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplayText(text)
      setRevealedCount(order.length)
      return undefined
    }

    let nextCount = 0
    setRevealedCount(0)
    setDisplayText(getDecryptingTextFrame({
      characters,
      order,
      revealedCount: 0,
      text,
    }))

    const intervalId = window.setInterval(() => {
      nextCount += 1
      setRevealedCount(nextCount)

      if (nextCount >= order.length) {
        setDisplayText(text)
        window.clearInterval(intervalId)
        return
      }

      setDisplayText(getDecryptingTextFrame({
        characters,
        order,
        revealedCount: nextCount,
        text,
      }))
    }, speed)

    return () => window.clearInterval(intervalId)
  }, [characters, order, speed, text])

  const revealed = new Set(order.slice(0, revealedCount))

  return (
    <Tag
      aria-label={text}
      className={`decrypting-text ${className}`.trim()}
      {...props}
    >
      <span className="decrypting-text__visual" aria-hidden="true">
        {Array.from(displayText).map((character, index) => (
          <span
            className={`decrypting-text__char${revealed.has(index) ? '' : ` ${encryptedClassName}`}`}
            key={`${character}-${index}`}
          >
            {character === ' ' ? '\u00a0' : character}
          </span>
        ))}
      </span>
    </Tag>
  )
}
