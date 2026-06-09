import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'

const LanyardScene = lazy(() => import('./LanyardScene'))
const exitDuration = 780

export default function Lanyard({
  card = {},
  className = '',
  fov = 18,
  gravity = [0, -36, 0],
  isCompact = false,
  onExpandedChange,
  position = [0, 0, 30],
  transparent = true,
}) {
  const toggleRef = useRef(null)
  const [isDocked, setDocked] = useState(true)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [shouldRenderStage, setShouldRenderStage] = useState(false)
  const [anchorRect, setAnchorRect] = useState(null)
  const isExpanded = !isDocked && !isCompact
  const isClosing = shouldRenderStage && !isExpanded

  const measureAnchor = useCallback(() => {
    const rect = toggleRef.current?.getBoundingClientRect()

    if (!rect) return

    const nextRect = {
      height: rect.height,
      left: rect.left,
      top: rect.top,
      width: rect.width,
    }

    setAnchorRect((currentRect) => {
      if (
        currentRect &&
        Math.abs(currentRect.height - nextRect.height) < 0.5 &&
        Math.abs(currentRect.left - nextRect.left) < 0.5 &&
        Math.abs(currentRect.top - nextRect.top) < 0.5 &&
        Math.abs(currentRect.width - nextRect.width) < 0.5
      ) {
        return currentRect
      }

      return nextRect
    })
  }, [])

  useEffect(() => {
    if (isCompact) setDocked(true)
  }, [isCompact])

  useEffect(() => {
    if (onExpandedChange) {
      onExpandedChange(isExpanded)
    }
  }, [isExpanded, onExpandedChange])

  const closeCard = useCallback(() => {
    setDocked(true)
  }, [])

  useEffect(() => {
    if (isExpanded) {
      measureAnchor()
      setShouldRenderStage(true)
      return undefined
    }

    const timeout = window.setTimeout(() => setShouldRenderStage(false), exitDuration)

    return () => window.clearTimeout(timeout)
  }, [isExpanded, measureAnchor])

  useEffect(() => {
    if (!isExpanded) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeCard()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeCard, isExpanded])

  useEffect(() => {
    measureAnchor()
  }, [isCompact, measureAnchor])

  useEffect(() => {
    const node = toggleRef.current

    if (!node) return undefined

    measureAnchor()

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measureAnchor)
    resizeObserver?.observe(node)
    window.addEventListener('resize', measureAnchor)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', measureAnchor)
    }
  }, [measureAnchor])

  const handleToggle = () => {
    measureAnchor()
    setHasInteracted(true)

    if (isExpanded) {
      closeCard()
      return
    }

    setDocked(false)
  }

  return (
    <aside
      className={`lanyard${isExpanded ? ' lanyard--open' : isClosing ? ' lanyard--closing' : ' lanyard--docked'}${
        isCompact ? ' lanyard--compact' : ''
      } ${className}`.trim()}
    >
      <button
        aria-label={isExpanded ? 'Hide contact card' : 'Show contact card'}
        aria-controls="lanyard-stage"
        aria-expanded={isExpanded}
        className="lanyard__toggle"
        onClick={handleToggle}
        ref={toggleRef}
        title="Contact card"
        type="button"
      >
        <span className="lanyard__toggle-icon" aria-hidden="true" />
        <span className="lanyard__toggle-label">Contact card</span>
      </button>
      <button
        aria-hidden={!isExpanded}
        aria-label="Close contact card"
        className="lanyard__backdrop"
        onClick={closeCard}
        tabIndex={isExpanded ? 0 : -1}
        type="button"
      />
      <div className="lanyard__stage" id="lanyard-stage" aria-hidden={!isExpanded}>
        {hasInteracted && shouldRenderStage && (
          <Suspense fallback={null}>
            <LanyardScene
              anchorRect={anchorRect}
              card={card}
              fov={fov}
              gravity={gravity}
              isCompact={isCompact || isDocked}
              position={position}
              transparent={transparent}
            />
          </Suspense>
        )}
      </div>
    </aside>
  )
}
