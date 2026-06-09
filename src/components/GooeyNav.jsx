import { useEffect, useRef, useState } from 'react'

const noise = (amount = 1) => amount / 2 - Math.random() * amount

function getXY(distance, pointIndex, totalPoints) {
  const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180)

  return [distance * Math.cos(angle), distance * Math.sin(angle)]
}

export default function GooeyNav({
  animationTime = 520,
  className = '',
  colors = [1, 2, 3, 1, 2, 3, 4],
  initialActiveIndex = 0,
  items,
  particleCount = 12,
  particleDistances = [42, 8],
  particleR = 84,
  timeVariance = 220,
}) {
  const containerRef = useRef(null)
  const navRef = useRef(null)
  const filterRef = useRef(null)
  const textRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex)

  const createParticle = (index, duration) => {
    const rotate = noise(particleR / 10)

    return {
      color: colors[Math.floor(Math.random() * colors.length)],
      end: getXY(particleDistances[1] + noise(7), particleCount - index, particleCount),
      rotate: rotate > 0 ? (rotate + particleR / 20) * 10 : (rotate - particleR / 20) * 10,
      scale: 1 + noise(0.2),
      start: getXY(particleDistances[0], particleCount - index, particleCount),
      time: duration,
    }
  }

  const updateEffectPosition = (element) => {
    if (!containerRef.current || !filterRef.current || !textRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const rect = element.getBoundingClientRect()
    const styles = {
      height: `${rect.height}px`,
      left: `${rect.x - containerRect.x}px`,
      top: `${rect.y - containerRect.y}px`,
      width: `${rect.width}px`,
    }

    Object.assign(filterRef.current.style, styles)
    Object.assign(textRef.current.style, styles)
    textRef.current.textContent = element.textContent
  }

  const makeParticles = () => {
    if (!filterRef.current) return

    const element = filterRef.current
    const bubbleTime = animationTime * 2 + timeVariance
    element.style.setProperty('--time', `${bubbleTime}ms`)
    element.querySelectorAll('.gooey-nav__particle').forEach((particle) => particle.remove())
    element.classList.remove('is-active')

    for (let index = 0; index < particleCount; index += 1) {
      const duration = animationTime * 2 + noise(timeVariance * 2)
      const particle = createParticle(index, duration)

      window.setTimeout(() => {
        const particleEl = document.createElement('span')
        const pointEl = document.createElement('span')

        particleEl.className = 'gooey-nav__particle'
        particleEl.style.setProperty('--start-x', `${particle.start[0]}px`)
        particleEl.style.setProperty('--start-y', `${particle.start[1]}px`)
        particleEl.style.setProperty('--end-x', `${particle.end[0]}px`)
        particleEl.style.setProperty('--end-y', `${particle.end[1]}px`)
        particleEl.style.setProperty('--time', `${particle.time}ms`)
        particleEl.style.setProperty('--scale', `${particle.scale}`)
        particleEl.style.setProperty('--color', `var(--gooey-nav-color-${particle.color})`)
        particleEl.style.setProperty('--rotate', `${particle.rotate}deg`)
        pointEl.className = 'gooey-nav__point'
        particleEl.appendChild(pointEl)
        element.appendChild(particleEl)

        window.requestAnimationFrame(() => element.classList.add('is-active'))
        window.setTimeout(() => particleEl.remove(), particle.time)
      }, 24)
    }
  }

  const handleSelect = (event, index) => {
    const item = items[index]
    const itemElement = event.currentTarget.parentElement

    item?.onClick?.(event)
    if (!itemElement) return

    if (activeIndex === index) {
      updateEffectPosition(itemElement)
      return
    }

    setActiveIndex(index)
    updateEffectPosition(itemElement)

    if (textRef.current) {
      textRef.current.classList.remove('is-active')
      void textRef.current.offsetWidth
      textRef.current.classList.add('is-active')
    }

    makeParticles()
  }

  useEffect(() => {
    if (!navRef.current || !containerRef.current) return undefined

    const activeItem = navRef.current.querySelectorAll('.gooey-nav__item')[activeIndex]
    if (activeItem) {
      updateEffectPosition(activeItem)
      textRef.current?.classList.add('is-active')
    }

    const resizeObserver = new ResizeObserver(() => {
      const currentItem = navRef.current?.querySelectorAll('.gooey-nav__item')[activeIndex]
      if (currentItem) updateEffectPosition(currentItem)
    })

    resizeObserver.observe(containerRef.current)

    return () => resizeObserver.disconnect()
  }, [activeIndex])

  return (
    <div className={`gooey-nav ${className}`.trim()} ref={containerRef}>
      <svg className="gooey-nav__svg" aria-hidden="true" focusable="false">
        <filter id="gooey-nav-filter">
          <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="6" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            result="goo"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8"
          />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
      </svg>
      <nav className="gooey-nav__nav" aria-label="Primary">
        <ul className="gooey-nav__list" ref={navRef}>
          {items.map((item, index) => {
            if (item.type === 'slot') {
              return (
                <li className="gooey-nav__item gooey-nav__item--slot" key={item.key}>
                  {item.render?.()}
                </li>
              )
            }

            return (
              <li
                className={`gooey-nav__item${activeIndex === index ? ' gooey-nav__item--active' : ''}`}
                key={item.label}
              >
                <a
                  className="gooey-nav__link"
                  href={item.href}
                  onClick={(event) => handleSelect(event, index)}
                >
                  {item.label}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
      <span className="gooey-nav__effect gooey-nav__filter" ref={filterRef} />
      <span className="gooey-nav__effect gooey-nav__text" ref={textRef} />
    </div>
  )
}
