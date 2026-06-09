import { useEffect, useRef, useState } from 'react'

import {
  getCueProgress,
  getCueState,
  getFrameIndex,
  getFrameUrl,
  getSampleTime,
  getScrollProgress,
} from './scrollVideoTiming.js'
import GooeyNav from './GooeyNav'
import Lanyard from './Lanyard'
import TextType from './TextType'

const defaultContactCard = {
  name: 'Chen Linliang',
  code: 'L-13',
  strapLabel: 'Chen Linliang',
  role: 'PhD Candidate',
  affiliation: 'Beihang University',
  subtitle: 'AI RESEARCH / SYSTEMS BUILDER',
  tags: ['Efficient AI', 'Neuromorphic Computing'],
  email: 'hello@example.com',
}

function waitForEvent(target, successEvent, failureEvent = 'error') {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      target.removeEventListener(successEvent, onSuccess)
      target.removeEventListener(failureEvent, onFailure)
    }
    const onSuccess = () => {
      cleanup()
      resolve()
    }
    const onFailure = () => {
      cleanup()
      reject(new Error(`Failed while waiting for ${successEvent}`))
    }

    target.addEventListener(successEvent, onSuccess, { once: true })
    target.addEventListener(failureEvent, onFailure, { once: true })
  })
}

async function imageFromBlob(blob) {
  const url = URL.createObjectURL(blob)
  const image = new Image()
  image.decoding = 'async'
  image.src = url
  await image.decode()

  return { image, url }
}

async function canvasToImage(canvas, quality) {
  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/webp', quality)
  })

  if (!blob) {
    throw new Error('Cannot encode canvas frame')
  }

  return imageFromBlob(blob)
}

async function decodeVideoFrames({
  videoSrc,
  fps,
  maxWidth,
  quality,
  startTime,
  endTime,
  onFrame,
  onProgress,
  isCancelled,
}) {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = videoSrc
  video.load()

  await waitForEvent(video, 'loadedmetadata')

  if (video.readyState < 2) {
    await waitForEvent(video, 'loadeddata')
  }

  const duration = video.duration
  const sourceWidth = video.videoWidth
  const sourceHeight = video.videoHeight
  const scale = Math.min(1, maxWidth / sourceWidth)
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))
  const sampleEndTime = endTime ?? duration
  const sampleDuration = Math.max(0.001, sampleEndTime - startTime)
  const frameCount = Math.max(2, Math.ceil(sampleDuration * fps) + 1)
  const scratch = document.createElement('canvas')
  const context = scratch.getContext('2d', { alpha: false })

  scratch.width = width
  scratch.height = height

  const frames = []

  for (let index = 0; index < frameCount; index += 1) {
    if (isCancelled()) break

    const time = Math.min(
      duration - 0.02,
      getSampleTime({
        duration,
        endTime: sampleEndTime,
        frameCount,
        index,
        startTime,
      }),
    )

    if (Math.abs(video.currentTime - time) > 0.01) {
      video.currentTime = time
      await waitForEvent(video, 'seeked')
    }

    context.drawImage(video, 0, 0, width, height)
    const frame = await canvasToImage(scratch, quality)
    frames.push(frame)
    onFrame(frame, {
      duration: sampleDuration,
      height,
      width,
    })
    onProgress((index + 1) / frameCount)
  }

  video.removeAttribute('src')
  video.load()

  return {
    duration: sampleDuration,
    frames,
    height,
    width,
  }
}

async function preloadFrameSequence({ frameSequence, onFrame, onProgress, isCancelled }) {
  const frames = []

  for (let index = 0; index < frameSequence.frameCount; index += 1) {
    if (isCancelled()) break

    const image = new Image()
    image.decoding = 'async'
    image.src = getFrameUrl({
      basePath: frameSequence.basePath,
      ext: frameSequence.ext,
      index,
      pad: frameSequence.pad,
    })
    await image.decode()
    const frame = { image, url: null }
    frames.push(frame)
    onFrame(frame, {
      duration: frameSequence.duration,
      height: image.naturalHeight || 1,
      width: image.naturalWidth || 1,
    })
    onProgress((index + 1) / frameSequence.frameCount)
  }

  return {
    duration: frameSequence.duration,
    frames,
    height: frames[0]?.image.naturalHeight || 1,
    width: frames[0]?.image.naturalWidth || 1,
  }
}

async function resolveFrameSequence({ frameManifest, frameSequence }) {
  if (frameSequence) {
    return frameSequence
  }

  if (!frameManifest) {
    return null
  }

  try {
    const response = await fetch(frameManifest, {
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      return null
    }

    const manifest = await response.json()

    if (!manifest?.basePath || !manifest?.frameCount || !manifest?.duration) {
      return null
    }

    return manifest
  } catch {
    return null
  }
}

function drawCover(context, image, canvasWidth, canvasHeight) {
  const imageWidth = image.naturalWidth || image.width
  const imageHeight = image.naturalHeight || image.height
  const scale = Math.max(canvasWidth / imageWidth, canvasHeight / imageHeight)
  const drawWidth = imageWidth * scale
  const drawHeight = imageHeight * scale
  const x = (canvasWidth - drawWidth) / 2
  const y = (canvasHeight - drawHeight) / 2

  context.drawImage(image, x, y, drawWidth, drawHeight)
}

function renderIdentityName(name) {
  return Array.from(name).map((character, index) => (
    <span
      aria-hidden="true"
      className="scroll-video__identity-name-char"
      key={`${character}-${index}`}
      style={{ '--char-index': index }}
    >
      {character === ' ' ? '\u00a0' : character}
    </span>
  ))
}

export default function ScrollVideo({
  videoSrc,
  frameManifest,
  frameSequence,
  brand,
  identity,
  navItems = [],
  texts = [],
  scrollDist,
  decodeFps = 24,
  maxFrameWidth = 1280,
  frameQuality = 0.72,
  startTime = 0.35,
  endTime,
  contactCard = defaultContactCard,
  scrollCue = ['Scroll', 'to', 'begin'],
}) {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const fallbackVideoRef = useRef(null)
  const identityRef = useRef(null)
  const textRefs = useRef([])
  const frameRef = useRef(null)
  const scrollProgressRef = useRef(0)
  const sequenceRef = useRef({ duration: 10, frames: [] })
  const [duration, setDuration] = useState(10)
  const [loadProgress, setLoadProgress] = useState(0)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [scrollProgress, setScrollProgress] = useState(0)
  const [lanyardExpanded, setLanyardExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    const urls = []

    const loadFrames = async () => {
      setReady(false)
      setLoadError('')
      setLoadProgress(0)
      sequenceRef.current = { duration: 10, frames: [] }

      const addFrame = (frame, metadata) => {
        if (frame.url) urls.push(frame.url)
        sequenceRef.current = {
          ...metadata,
          frames: [...sequenceRef.current.frames, frame],
        }
        setReady(true)
      }

      try {
        const resolvedFrameSequence = await resolveFrameSequence({
          frameManifest,
          frameSequence,
        })
        const sequence = resolvedFrameSequence
          ? await preloadFrameSequence({
              frameSequence: resolvedFrameSequence,
              isCancelled: () => cancelled,
              onFrame: addFrame,
              onProgress: setLoadProgress,
            })
          : await decodeVideoFrames({
              endTime,
              fps: decodeFps,
              isCancelled: () => cancelled,
              maxWidth: maxFrameWidth,
              onFrame: addFrame,
              onProgress: setLoadProgress,
              quality: frameQuality,
              startTime,
              videoSrc,
            })

        if (cancelled) return

        sequenceRef.current = sequence
        setDuration(sequence.duration || 10)
        setReady(true)
      } catch (error) {
        if (!cancelled) {
          setLoadError(error.message)
        }
      }
    }

    loadFrames()

    return () => {
      cancelled = true
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [decodeFps, endTime, frameManifest, frameQuality, frameSequence, maxFrameWidth, startTime, videoSrc])

  useEffect(() => {
    const fallbackVideo = fallbackVideoRef.current

    if (!fallbackVideo) return undefined

    const setFallbackFrame = () => {
      if (!Number.isFinite(fallbackVideo.duration)) return
      fallbackVideo.currentTime = Math.min(startTime, fallbackVideo.duration - 0.02)
      fallbackVideo.pause()
    }

    if (fallbackVideo.readyState >= 1) {
      setFallbackFrame()
    } else {
      fallbackVideo.addEventListener('loadedmetadata', setFallbackFrame, { once: true })
    }

    return () => {
      fallbackVideo.removeEventListener('loadedmetadata', setFallbackFrame)
    }
  }, [startTime, videoSrc])

  useEffect(() => {
    const section = sectionRef.current
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d', { alpha: false })

    if (!section || !canvas || !context) return undefined

    const updateFrame = () => {
      const rect = section.getBoundingClientRect()
      const progress = getScrollProgress({
        top: rect.top,
        height: rect.height,
        viewportHeight: window.innerHeight,
      })
      const sequence = sequenceRef.current
      const frames = sequence.frames
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const canvasRect = canvas.getBoundingClientRect()
      const canvasWidth = Math.max(1, Math.round(canvasRect.width * dpr))
      const canvasHeight = Math.max(1, Math.round(canvasRect.height * dpr))

      if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
        canvas.width = canvasWidth
        canvas.height = canvasHeight
      }

      section.style.setProperty('--scroll-progress', progress.toFixed(4))

      if (Math.abs(progress - scrollProgressRef.current) > 0.02) {
        scrollProgressRef.current = progress
        setScrollProgress(progress)
      }

      if (identityRef.current) {
        identityRef.current.dataset.compact = progress > 0.16 ? 'true' : 'false'
      }

      if (frames.length > 0) {
        const frameIndex = getFrameIndex({
          frameCount: frames.length,
          progress,
        })
        const frame = frames[frameIndex]

        context.clearRect(0, 0, canvasWidth, canvasHeight)
        drawCover(context, frame.image, canvasWidth, canvasHeight)
      }

      texts.forEach((text, index) => {
        const el = textRefs.current[index]
        if (!el) return

        const state = getCueState({
          cue: text,
          duration: sequence.duration || duration,
          progress,
        })

        el.style.opacity = state.opacity
        el.style.visibility = state.opacity > 0.01 ? 'visible' : 'hidden'
        el.style.pointerEvents = state.opacity > 0.65 ? 'auto' : 'none'
        el.dataset.active = state.opacity > 0.65 ? 'true' : 'false'
        el.style.transform = `translate3d(-50%, calc(-50% + ${state.y}px), 0)`
      })

      frameRef.current = window.requestAnimationFrame(updateFrame)
    }

    frameRef.current = window.requestAnimationFrame(updateFrame)

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [duration, texts])

  const dist = scrollDist || `${Math.max(300, duration * 90)}vh`
  const displayIdentity = identity || brand
  const progressPercent = Math.round(loadProgress * 100)
  const scrollToCue = (event, item) => {
    const targetCue = item.cueId
      ? texts.find((text) => text.id === item.cueId)
      : null
    const cue = targetCue || (typeof item.time === 'number' ? { time: item.time } : null)

    if (!cue) return

    event.preventDefault()

    const section = sectionRef.current
    if (!section) return

    const rect = section.getBoundingClientRect()
    const sectionTop = window.scrollY + rect.top
    const scrollableDistance = Math.max(1, rect.height - window.innerHeight)
    const sequenceDuration = sequenceRef.current.duration || duration
    const progress = getCueProgress({
      cue,
      duration: sequenceDuration,
    })

    window.scrollTo({
      behavior: 'smooth',
      top: sectionTop + scrollableDistance * progress,
    })
  }
  const navMenuItems = navItems.flatMap((item) => {
    const linkItem = {
      ...item,
      href: item.href || `#${item.label.toLowerCase()}`,
      onClick: (event) => scrollToCue(event, item),
    }
    const shouldInsertLanyard =
      item.cueId === 'publications' || item.label.toLowerCase() === 'publications'

    if (!shouldInsertLanyard) {
      return [linkItem]
    }

    return [
      linkItem,
      {
        type: 'slot',
        key: 'lanyard',
        render: () => (
          <Lanyard
            card={contactCard}
            className="scroll-video__lanyard"
            isCompact={scrollProgress > 0.08}
            onExpandedChange={setLanyardExpanded}
          />
        ),
      },
    ]
  })
  const identityName = displayIdentity?.primary || ''

  return (
    <section
      ref={sectionRef}
      className={`scroll-video${ready ? ' scroll-video--ready' : ''}`}
      style={{ minHeight: dist }}
    >
      <div className={`scroll-video__stage${lanyardExpanded ? ' scroll-video__stage--lanyard-open' : ''}`}>
        <video
          ref={fallbackVideoRef}
          className="scroll-video__fallback"
          src={videoSrc}
          preload="auto"
          muted
          playsInline
          aria-hidden="true"
        />

        <canvas
          ref={canvasRef}
          className="scroll-video__canvas"
          aria-label="Scroll controlled feature animation"
        />

        <div className="scroll-video__shade" />

        {displayIdentity && (
          <div
            ref={identityRef}
            className="scroll-video__identity"
            data-compact="false"
            aria-label="Identity"
          >
            <span className="scroll-video__identity-lockup">
              <span className="scroll-video__identity-mark" aria-hidden="true">
                {displayIdentity.mark || '✦'}
              </span>
              <span className="scroll-video__identity-name" aria-label={identityName}>
                {renderIdentityName(identityName)}
              </span>
            </span>
            {displayIdentity.secondary && (
              <small className="scroll-video__identity-field">{displayIdentity.secondary}</small>
            )}
          </div>
        )}

        {displayIdentity?.motto?.length > 0 && (
          <p className="scroll-video__intro-motto" aria-label="Intro motto">
            {displayIdentity.motto.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
        )}

        <div className="scroll-video__scroll-cue-panel" aria-hidden="true">
          <TextType
            as="span"
            className="scroll-video__scroll-cue-type"
            cursorCharacter="|"
            speed={54}
            text={scrollCue}
          />
          <span className="scroll-video__scroll-cue-arrow">↓</span>
        </div>

        <div className="scroll-video__nav-cluster">
          {navItems.length > 0 && (
            <GooeyNav
              className="scroll-video__top-nav"
              items={navMenuItems}
            />
          )}
        </div>

        {!ready && (
          <p className="scroll-video__loading">
            {loadError || `Preparing scroll frames ${progressPercent}%`}
          </p>
        )}

        {texts.map((text, index) => (
          <div
            key={text.id || index}
            ref={(el) => {
              textRefs.current[index] = el
            }}
            className="scroll-video__text"
            style={text.style}
          >
            {text.content}
          </div>
        ))}
      </div>
    </section>
  )
}
