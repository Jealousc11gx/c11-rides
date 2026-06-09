import { Canvas, extend, useFrame } from '@react-three/fiber'
import { useGLTF, Environment, Lightformer } from '@react-three/drei'
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
} from '@react-three/rapier'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

import content from '../content.json'
import cardGLB from '../assets/card.glb'
import { getAnchorPosition } from './lanyardAnchor.js'
extend({ MeshLineGeometry, MeshLineMaterial })

const defaultCard = content.contactCard

const CARD_WIDTH = 1.62
const CARD_HEIGHT = 2.16
const CARD_RADIUS = 0.13
const CARD_TEXTURE_WIDTH = 1024
const CARD_TEXTURE_HEIGHT = 1440
const CARD_NAME_COLOR = '#f4f4f2'
const CARD_SLOT = {
  height: 72,
  width: 276,
  y: 102,
}

function createRoundedCardGeometry(width = CARD_WIDTH, height = CARD_HEIGHT, radius = CARD_RADIUS) {
  const x = -width / 2
  const y = -height / 2
  const shape = new THREE.Shape()

  shape.moveTo(x + radius, y)
  shape.lineTo(x + width - radius, y)
  shape.quadraticCurveTo(x + width, y, x + width, y + radius)
  shape.lineTo(x + width, y + height - radius)
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  shape.lineTo(x + radius, y + height)
  shape.quadraticCurveTo(x, y + height, x, y + height - radius)
  shape.lineTo(x, y + radius)
  shape.quadraticCurveTo(x, y, x + radius, y)

  const geometry = new THREE.ShapeGeometry(shape, 24)
  const positions = geometry.attributes.position
  const uvs = []

  for (let index = 0; index < positions.count; index += 1) {
    uvs.push((positions.getX(index) - x) / width, (positions.getY(index) - y) / height)
  }

  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.computeVertexNormals()

  return geometry
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.arcTo(x + width, y, x + width, y + height, radius)
  context.arcTo(x + width, y + height, x, y + height, radius)
  context.arcTo(x, y + height, x, y, radius)
  context.arcTo(x, y, x + width, y, radius)
  context.closePath()
}

function getCardTextureYOffset({ scale, textureY }) {
  return ((CARD_TEXTURE_HEIGHT / 2 - textureY) / CARD_TEXTURE_HEIGHT) * CARD_HEIGHT * scale
}

function drawBarcode(context, x, y, width, height) {
  const bars = [8, 3, 5, 11, 4, 4, 9, 2, 7, 5, 3, 10, 4, 8, 3, 6, 12, 4, 5, 3, 9, 6]
  let cursor = x

  context.fillStyle = '#f4f4f2'
  for (const [index, barWidth] of bars.entries()) {
    if (index % 2 === 0) {
      context.fillRect(cursor, y, barWidth, height)
    }
    cursor += barWidth
  }

  context.fillRect(x + width - 74, y, 10, height)
  context.fillRect(x + width - 48, y, 5, height)
  context.fillRect(x + width - 24, y, 12, height)
}

function drawBlackHoleHalo(context) {
  const centerX = 408
  const centerY = 620

  const core = context.createRadialGradient(centerX, centerY, 20, centerX, centerY, 300)
  core.addColorStop(0, 'rgba(0, 0, 0, 0.96)')
  core.addColorStop(0.24, 'rgba(2, 3, 5, 0.82)')
  core.addColorStop(0.42, 'rgba(255, 247, 214, 0.12)')
  core.addColorStop(0.58, 'rgba(255, 126, 213, 0.08)')
  core.addColorStop(0.78, 'rgba(67, 211, 255, 0.06)')
  core.addColorStop(1, 'rgba(0, 0, 0, 0)')
  context.fillStyle = core
  context.fillRect(36, 210, 820, 760)

  const halo = context.createLinearGradient(70, 388, 884, 744)
  halo.addColorStop(0, 'rgba(77, 219, 255, 0)')
  halo.addColorStop(0.18, 'rgba(77, 219, 255, 0.44)')
  halo.addColorStop(0.38, 'rgba(255, 99, 213, 0.34)')
  halo.addColorStop(0.58, 'rgba(255, 214, 115, 0.42)')
  halo.addColorStop(0.78, 'rgba(101, 130, 255, 0.24)')
  halo.addColorStop(1, 'rgba(77, 219, 255, 0)')
  context.strokeStyle = halo
  context.lineCap = 'square'
  context.lineWidth = 30
  context.beginPath()
  context.ellipse(centerX, centerY, 520, 150, -0.56, 0.18, Math.PI * 1.34)
  context.stroke()

  context.lineWidth = 4
  for (let ring = 0; ring < 9; ring += 1) {
    context.strokeStyle = `rgba(244,244,242,${0.15 - ring * 0.012})`
    context.beginPath()
    context.ellipse(centerX, centerY, 390 + ring * 34, 112 + ring * 13, -0.56, 0.2, Math.PI * 1.32)
    context.stroke()
  }

  const pixelColors = [
    'rgba(93, 213, 255, 0.64)',
    'rgba(255, 121, 215, 0.58)',
    'rgba(255, 219, 126, 0.62)',
    'rgba(151, 132, 255, 0.52)',
  ]

  for (let index = 0; index < 58; index += 1) {
    const angle = 0.28 + index * 0.066
    const radiusX = 390 + (index % 7) * 16
    const radiusY = 116 + (index % 5) * 9
    const x = centerX + Math.cos(angle) * radiusX
    const y = centerY + Math.sin(angle) * radiusY
    const width = 8 + (index % 4) * 7
    const height = 4 + (index % 3) * 4

    context.fillStyle = pixelColors[index % pixelColors.length]
    context.fillRect(x, y, width, height)
  }

  context.fillStyle = 'rgba(0, 0, 0, 0.72)'
  context.beginPath()
  context.ellipse(centerX - 8, centerY + 4, 176, 68, -0.42, 0, Math.PI * 2)
  context.fill()
}

function drawSlotThreading(context, { slotHeight, slotWidth, slotX, slotY }) {
  const strapWidth = 58
  const singleStrapCenter = slotX + slotWidth / 2
  const frontSlotFace = {
    height: slotHeight + 154,
    width: strapWidth,
    x: singleStrapCenter - strapWidth / 2,
    y: slotY - 118,
  }
  const backSlotFace = {
    height: 74,
    width: strapWidth + 24,
    x: singleStrapCenter - strapWidth / 2 - 12,
    y: slotY + slotHeight + 4,
  }

  context.save()

  const recess = context.createLinearGradient(0, slotY, 0, slotY + slotHeight)
  recess.addColorStop(0, 'rgba(0, 0, 0, 0.96)')
  recess.addColorStop(0.5, 'rgba(8, 10, 11, 0.94)')
  recess.addColorStop(1, 'rgba(0, 0, 0, 0.9)')
  context.fillStyle = recess
  roundedRect(context, slotX, slotY, slotWidth, slotHeight, 30)
  context.fill()

  context.fillStyle = 'rgba(0, 0, 0, 0.52)'
  roundedRect(context, backSlotFace.x, backSlotFace.y, backSlotFace.width, backSlotFace.height, 12)
  context.fill()

  const strapGradient = context.createLinearGradient(frontSlotFace.x, 0, frontSlotFace.x + frontSlotFace.width, 0)

  strapGradient.addColorStop(0, '#050607')
  strapGradient.addColorStop(0.5, '#101316')
  strapGradient.addColorStop(1, '#030304')
  context.fillStyle = strapGradient
  roundedRect(context, frontSlotFace.x, frontSlotFace.y, frontSlotFace.width, frontSlotFace.height, 8)
  context.fill()

  context.fillStyle = 'rgba(91, 212, 255, 0.28)'
  context.fillRect(frontSlotFace.x + frontSlotFace.width - 5, frontSlotFace.y + 6, 3, frontSlotFace.height - 12)
  context.fillStyle = 'rgba(255, 124, 213, 0.22)'
  context.fillRect(frontSlotFace.x + 2, frontSlotFace.y + 6, 3, frontSlotFace.height - 12)

  context.strokeStyle = 'rgba(244, 244, 242, 0.56)'
  context.lineWidth = 7
  roundedRect(context, slotX, slotY, slotWidth, slotHeight, 30)
  context.stroke()
  context.strokeStyle = 'rgba(93, 213, 255, 0.16)'
  context.lineWidth = 2
  roundedRect(context, slotX + 11, slotY + 11, slotWidth - 22, slotHeight - 22, 22)
  context.stroke()
  context.restore()
}

function fitTagFont(context, text, maxWidth) {
  let fontSize = 31

  while (fontSize > 21) {
    context.font = `780 ${fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`

    if (context.measureText(text).width <= maxWidth) {
      return fontSize
    }

    fontSize -= 1
  }

  return fontSize
}

function drawTagPill(context, tag, x, y, maxWidth) {
  const height = 58
  const horizontalPadding = 46
  const fontSize = fitTagFont(context, tag, maxWidth - horizontalPadding)
  const textWidth = context.measureText(tag).width
  const width = Math.min(maxWidth, Math.max(158, textWidth + horizontalPadding))

  context.save()
  context.shadowColor = 'rgba(93, 213, 255, 0.22)'
  context.shadowBlur = 18
  context.strokeStyle = 'rgba(244,244,242,0.3)'
  context.lineWidth = 4
  roundedRect(context, x, y, width, height, 28)
  context.stroke()
  context.shadowBlur = 0
  context.fillStyle = 'rgba(247,245,239,0.88)'
  context.font = `780 ${fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`
  context.fillText(tag, x + 23, y + 39)
  context.restore()

  return width
}

function drawTagRow(context, tags, x, y, maxWidth) {
  const tagGap = 22
  const visibleTags = tags.slice(0, 3)
  const naturalWidths = visibleTags.map((tag) => {
    context.font = '780 31px "Helvetica Neue", Helvetica, Arial, sans-serif'
    return Math.max(158, context.measureText(tag).width + 46)
  })
  const naturalRowWidth = naturalWidths.reduce((total, width) => total + width, 0) + tagGap * (visibleTags.length - 1)
  const fallbackWidth = (maxWidth - tagGap * Math.max(0, visibleTags.length - 1)) / Math.max(1, visibleTags.length)
  let cursorX = x

  visibleTags.forEach((tag, index) => {
    const width = drawTagPill(context, tag, cursorX, y, naturalRowWidth <= maxWidth ? naturalWidths[index] : fallbackWidth)
    cursorX += width + tagGap
  })
}

function createCardTexture(card) {
  const resolvedCard = card || defaultCard
  const tags = card?.tags?.length ? card.tags : defaultCard.tags
  const cardName = resolvedCard.name || defaultCard.name
  const cardRole = resolvedCard.role || defaultCard.role
  const cardAffiliation = resolvedCard.affiliation || defaultCard.affiliation
  const cardSubtitle = resolvedCard.subtitle || defaultCard.subtitle
  const cardEmail = resolvedCard.email || defaultCard.email
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  canvas.width = CARD_TEXTURE_WIDTH
  canvas.height = CARD_TEXTURE_HEIGHT

  const background = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  background.addColorStop(0, '#050608')
  background.addColorStop(0.48, '#090b0e')
  background.addColorStop(1, '#12161a')
  context.fillStyle = background
  context.fillRect(0, 0, canvas.width, canvas.height)

  drawBlackHoleHalo(context)

  const topFade = context.createLinearGradient(0, 0, 0, 520)
  topFade.addColorStop(0, 'rgba(0, 0, 0, 0.42)')
  topFade.addColorStop(1, 'rgba(0, 0, 0, 0)')
  context.fillStyle = topFade
  context.fillRect(0, 0, canvas.width, 520)

  context.strokeStyle = 'rgba(244,244,242,0.2)'
  context.lineWidth = 7
  roundedRect(context, 42, 42, 940, 1356, 54)
  context.stroke()

  context.strokeStyle = 'rgba(93, 213, 255, 0.16)'
  context.lineWidth = 2
  roundedRect(context, 66, 66, 892, 1308, 42)
  context.stroke()

  const slotWidth = CARD_SLOT.width
  const slotHeight = CARD_SLOT.height
  const slotX = (canvas.width - slotWidth) / 2
  const slotY = CARD_SLOT.y

  drawSlotThreading(context, {
    slotHeight,
    slotWidth,
    slotX,
    slotY,
  })

  context.fillStyle = CARD_NAME_COLOR
  context.font = '900 104px "Helvetica Neue", Helvetica, Arial, sans-serif'
  context.letterSpacing = '0px'
  context.fillText(cardName, 82, 330)

  context.fillStyle = 'rgba(244,244,242,0.38)'
  context.fillRect(82, 366, 520, 8)
  context.fillRect(82, 394, 312, 6)

  context.fillStyle = 'rgba(244,244,242,0.84)'
  context.font = '840 38px "Helvetica Neue", Helvetica, Arial, sans-serif'
  cardSubtitle.split('/').slice(0, 2).forEach((line, index) => {
    context.fillText(line.trim().toUpperCase(), 86, 472 + index * 48)
  })

  context.fillStyle = 'rgba(255, 255, 255, 0.07)'
  context.fillRect(78, 682, 868, 1)
  context.fillRect(78, 1204, 868, 1)

  context.fillStyle = CARD_NAME_COLOR
  context.font = '900 82px "Helvetica Neue", Helvetica, Arial, sans-serif'
  context.fillText(cardName, 86, 930)

  context.fillStyle = 'rgba(247,245,239,0.7)'
  context.font = '780 38px "Helvetica Neue", Helvetica, Arial, sans-serif'
  context.fillText(`${cardRole} / ${cardAffiliation}`, 86, 990)

  const tagStartX = 86
  drawTagRow(context, tags, tagStartX, 1042, canvas.width - tagStartX * 2)

  context.fillStyle = 'rgba(244,244,242,0.62)'
  context.font = '700 24px "Helvetica Neue", Helvetica, Arial, sans-serif'
  context.fillText('PERSONAL WEB / BLACK-HOLE INTERFACE', 82, 1248)
  context.fillText(`MAIL / ${cardEmail.toUpperCase()}`, 82, 1288)

  drawBarcode(context, 82, 1320, 820, 52)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 16
  texture.needsUpdate = true

  return texture
}

function createStrapTexture(card = defaultCard) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  const displayLabel = card.strapLabel || card.name || defaultCard.name

  canvas.width = 1024
  canvas.height = 112

  const base = context.createLinearGradient(0, 0, 0, canvas.height)
  base.addColorStop(0, '#030304')
  base.addColorStop(0.44, '#101316')
  base.addColorStop(0.56, '#050607')
  base.addColorStop(1, '#020203')
  context.fillStyle = base
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.fillStyle = 'rgba(255, 255, 255, 0.08)'
  for (let x = 0; x < canvas.width; x += 18) {
    context.fillRect(x, 0, 2, canvas.height)
  }

  context.fillStyle = 'rgba(91, 212, 255, 0.22)'
  context.fillRect(0, 7, canvas.width, 5)
  context.fillStyle = 'rgba(255, 124, 213, 0.2)'
  context.fillRect(0, canvas.height - 12, canvas.width, 5)
  context.fillStyle = 'rgba(255, 255, 255, 0.16)'
  context.fillRect(0, 18, canvas.width, 2)
  context.fillRect(0, canvas.height - 21, canvas.width, 2)

  context.save()
  const strapNameAdvance = 340

  context.font = '900 36px "Helvetica Neue", Helvetica, Arial, sans-serif'
  context.letterSpacing = '0px'
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.globalAlpha = 0.94
  context.shadowColor = 'rgba(244, 244, 242, 0.28)'
  context.shadowBlur = 8
  context.lineWidth = 5
  context.strokeStyle = 'rgba(0, 0, 0, 0.62)'
  context.fillStyle = CARD_NAME_COLOR
  for (let x = 42; x < canvas.width + strapNameAdvance; x += strapNameAdvance) {
    context.strokeText(displayLabel, x, 58)
    context.fillText(displayLabel, x, 58)
  }
  context.restore()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.needsUpdate = true

  return texture
}

const hardwareFaces = [
  { key: 'front', depthSign: 1 },
  { key: 'back', depthSign: -1 },
]

function StrapHardwareSide({ cardPresentationScale, depthSign, isMobile, slotAnchorOffset, strapGuideOffset }) {
  const slotPhysicalWidth = CARD_WIDTH * cardPresentationScale * CARD_SLOT.width / CARD_TEXTURE_WIDTH
  const slotBridge = {
    height: isMobile ? 0.06 : 0.07,
    width: slotPhysicalWidth * 0.92,
  }
  const clampPlate = {
    depth: 0.045,
    height: isMobile ? 0.075 : 0.09,
    width: slotBridge.width + (isMobile ? 0.1 : 0.12),
    y: -0.034,
    z: 0.058,
  }
  const returnStrapCover = {
    depth: 0.038,
    height: isMobile ? 0.23 : 0.28,
    width: isMobile ? 0.13 : 0.155,
    y: isMobile ? -0.062 : -0.072,
    z: clampPlate.z - 0.036,
  }
  const slotSideGuides = [-strapGuideOffset, strapGuideOffset]

  return (
    <group position={[0, slotAnchorOffset, 0.16 * depthSign]}>
      <mesh position={[0, 0.028, 0.04 * depthSign]}>
        <boxGeometry args={[slotBridge.width, slotBridge.height, 0.07]} />
        <meshStandardMaterial color="#cdd2cf" metalness={0.9} roughness={0.18} />
      </mesh>
      <mesh position={[0, clampPlate.y, clampPlate.z * depthSign]}>
        <boxGeometry args={[clampPlate.width, clampPlate.height, clampPlate.depth]} />
        <meshStandardMaterial color="#f4f5f1" metalness={0.78} roughness={0.2} />
      </mesh>
      <mesh position={[0, returnStrapCover.y, returnStrapCover.z * depthSign]}>
        <boxGeometry args={[returnStrapCover.width, returnStrapCover.height, returnStrapCover.depth]} />
        <meshStandardMaterial color="#050607" metalness={0.18} roughness={0.52} />
      </mesh>
      {slotSideGuides.map((x) => (
        <mesh key={x} position={[x, -0.012, 0.072 * depthSign]}>
          <boxGeometry args={[0.052, 0.155, 0.052]} />
          <meshStandardMaterial color="#ecefeb" metalness={0.82} roughness={0.18} />
        </mesh>
      ))}
    </group>
  )
}

function StrapHardware(props) {
  return hardwareFaces.map((face) => (
    <StrapHardwareSide
      {...props}
      depthSign={face.depthSign}
      key={face.key}
    />
  ))
}

function setBandPoints(bandRef, curve, { segments, strapDepth, xOffset }) {
  if (!bandRef.current) return

  const points = curve.getPoints(segments).map((point) => new THREE.Vector3(point.x + xOffset, point.y, strapDepth))
  bandRef.current.geometry.setPoints(points)
}

const BadgeStrapMesh = forwardRef(function BadgeStrapMesh({ isMobile, strapTexture }, ref) {
  return (
    <mesh ref={ref}>
      <meshLineGeometry />
      <meshLineMaterial
        color="#ffffff"
        depthTest
        lineWidth={isMobile ? 0.92 : 1.08}
        map={strapTexture}
        repeat={[-1, 1]}
        resolution={isMobile ? [800, 1200] : [1200, 1200]}
        transparent
        useMap
      />
    </mesh>
  )
})

function Band({
  anchorPosition,
  card = defaultCard,
  isCompact = false,
  isMobile = false,
  maxSpeed = 50,
  minSpeed = 8,
}) {
  const loopBand = useRef(null)
  const fixed = useRef(null)
  const j1 = useRef(null)
  const j2 = useRef(null)
  const strapJoint = useRef(null)
  const cardBody = useRef(null)
  const vec = new THREE.Vector3()
  const ang = new THREE.Vector3()
  const rot = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const segmentProps = {
    angularDamping: 4,
    canSleep: true,
    colliders: false,
    linearDamping: 4,
    type: 'dynamic',
  }
  const cardTexture = useMemo(() => createCardTexture(card), [card])
  const strapTexture = useMemo(() => createStrapTexture(card), [card])
  const cardGeometry = useMemo(() => createRoundedCardGeometry(), [])
  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]),
  )
  const [dragged, drag] = useState(false)
  const [hovered, hover] = useState(false)
  const cardPresentationScale = isMobile ? 1.28 : 1.58
  const slotAnchorOffset = getCardTextureYOffset({
    scale: cardPresentationScale,
    textureY: CARD_SLOT.y + CARD_SLOT.height / 2,
  })
  const cardRestY = (isCompact ? -0.82 : -0.98) - slotAnchorOffset
  const strapDepth = 0.14
  const singleStrapCenter = 0
  const strapGuideOffset = isMobile ? 0.045 : 0.055

  useEffect(() => {
    return () => {
      cardTexture.dispose()
      strapTexture.dispose()
      cardGeometry.dispose()
    }
  }, [cardGeometry, cardTexture, strapTexture])

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 0.56])
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 0.56])
  useRopeJoint(j2, strapJoint, [[0, 0, 0], [0, 0, 0], 0.46])
  useSphericalJoint(strapJoint, cardBody, [
    [0, 0, 0],
    [0, slotAnchorOffset, 0],
  ])

  useEffect(() => {
    if (!hovered) return undefined

    document.body.style.cursor = dragged ? 'grabbing' : 'grab'

    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [dragged, hovered])

  useFrame((state, delta) => {
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera)
      dir.copy(vec).sub(state.camera.position).normalize()
      vec.add(dir.multiplyScalar(state.camera.position.length()))
      ;[cardBody, j1, j2, strapJoint, fixed].forEach((ref) => ref.current?.wakeUp())
      const nextX = vec.x - dragged.x
      const nextY = vec.y - dragged.y
      const nextZ = vec.z - dragged.z
      const limitX = Math.max(1, state.viewport.width / 2 - (isMobile ? 0.66 : 1.08))
      const limitTop = Math.max(1, state.viewport.height / 2 - (isMobile ? 0.74 : 1.08))
      const limitBottom = -Math.max(1, state.viewport.height / 2 - (isMobile ? 1.2 : 1.32))

      cardBody.current?.setNextKinematicTranslation({
        x: THREE.MathUtils.clamp(nextX, -limitX, limitX),
        y: THREE.MathUtils.clamp(nextY, limitBottom, limitTop),
        z: THREE.MathUtils.clamp(nextZ, -0.62, 0.62),
      })
    }

    if (
      !fixed.current ||
      !j1.current ||
      !j2.current ||
      !strapJoint.current ||
      !cardBody.current ||
      !loopBand.current
    ) {
      return
    }

    ;[j1, j2].forEach((ref) => {
      if (!ref.current.lerped) {
        ref.current.lerped = new THREE.Vector3().copy(ref.current.translation())
      }

      const distance = Math.max(0.1, Math.min(1, ref.current.lerped.distanceTo(ref.current.translation())))
      ref.current.lerped.lerp(ref.current.translation(), delta * (minSpeed + distance * (maxSpeed - minSpeed)))
    })

    curve.points[0].copy(strapJoint.current.translation())
    curve.points[1].copy(j2.current.lerped)
    curve.points[2].copy(j1.current.lerped)
    curve.points[3].copy(fixed.current.translation())
    setBandPoints(loopBand, curve, {
      segments: isMobile ? 16 : 32,
      strapDepth,
      xOffset: singleStrapCenter,
    })

    ang.copy(cardBody.current.angvel())
    rot.copy(cardBody.current.rotation())
    cardBody.current.setAngvel({
      x: ang.x - rot.x * 0.35,
      y: ang.y - rot.y * 0.25,
      z: ang.z - rot.z * 0.35,
    })
  })

  curve.curveType = 'chordal'
  return (
    <>
      <group position={anchorPosition}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0, -0.34, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.08]} />
        </RigidBody>
        <RigidBody position={[0, -0.68, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.08]} />
        </RigidBody>
        <RigidBody position={[0, isCompact ? -0.82 : -0.98, 0]} ref={strapJoint} {...segmentProps}>
          <BallCollider args={[0.08]} />
        </RigidBody>
        <RigidBody
          position={[0, cardRestY, 0]}
          ref={cardBody}
          {...segmentProps}
          type={dragged ? 'kinematicPosition' : 'dynamic'}
        >
          <CuboidCollider args={[0.81, 1.08, 0.04]} />
          <group
            onPointerDown={(event) => {
              event.target.setPointerCapture(event.pointerId)
              drag(new THREE.Vector3().copy(event.point).sub(vec.copy(cardBody.current.translation())))
            }}
            onPointerOut={() => hover(false)}
            onPointerOver={() => hover(true)}
            onPointerUp={(event) => {
              event.target.releasePointerCapture(event.pointerId)
              drag(false)
            }}
            position={[0, 0, -0.02]}
            scale={cardPresentationScale}
          >
            <mesh geometry={cardGeometry}>
              <meshPhysicalMaterial
                clearcoat={isMobile ? 0.25 : 0.9}
                clearcoatRoughness={0.18}
                color="#ffffff"
                map={cardTexture}
                metalness={0.18}
                roughness={0.42}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
          <StrapHardware
            cardPresentationScale={cardPresentationScale}
            isMobile={isMobile}
            slotAnchorOffset={slotAnchorOffset}
            strapGuideOffset={strapGuideOffset}
          />
        </RigidBody>
      </group>
      <BadgeStrapMesh isMobile={isMobile} ref={loopBand} strapTexture={strapTexture} />
    </>
  )
}

export default function LanyardScene({
  anchorRect = null,
  card = defaultCard,
  fov = 20,
  gravity = [0, -36, 0],
  isCompact = false,
  position = [0, 0, 30],
  transparent = true,
}) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  const [viewportSize, setViewportSize] = useState(() => ({
    height: typeof window === 'undefined' ? 720 : window.innerHeight,
    width: typeof window === 'undefined' ? 1280 : window.innerWidth,
  }))
  const [canvasRetryKey, setCanvasRetryKey] = useState(0)
  const retryCountRef = useRef(0)
  const retryTimeoutRef = useRef(null)
  const anchorPosition = useMemo(
    () => getAnchorPosition({ anchorRect, fov, isMobile, position, viewportSize }),
    [anchorRect, fov, isMobile, position, viewportSize],
  )

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
      setViewportSize({
        height: window.innerHeight,
        width: window.innerWidth,
      })
    }

    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current !== null) {
        window.clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  return (
    <Canvas
      key={canvasRetryKey}
      camera={{ fov, position }}
      dpr={[1, isMobile ? 1.25 : 1.75]}
      gl={{ alpha: transparent, antialias: !isMobile }}
      style={{ height: '100%', width: '100%' }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color(0x030304), transparent ? 0 : 1)
        gl.domElement.addEventListener(
          'webglcontextlost',
          (event) => {
            event.preventDefault()

            if (retryCountRef.current >= 2) {
              return
            }

            retryCountRef.current += 1
            retryTimeoutRef.current = window.setTimeout(() => {
              setCanvasRetryKey((key) => key + 1)
            }, 120)
          },
          { once: true },
        )
      }}
    >
      <ambientLight intensity={Math.PI} />
      <Physics gravity={gravity} timeStep={isMobile ? 1 / 30 : 1 / 60}>
        <Band
          anchorPosition={anchorPosition}
          card={card}
          isCompact={isCompact}
          isMobile={isMobile}
        />
      </Physics>
      <Environment blur={0.75}>
        <Lightformer
          color="white"
          intensity={2}
          position={[0, -1, 5]}
          rotation={[0, 0, Math.PI / 3]}
          scale={[100, 0.1, 1]}
        />
        <Lightformer
          color="white"
          intensity={3}
          position={[-1, -1, 1]}
          rotation={[0, 0, Math.PI / 3]}
          scale={[100, 0.1, 1]}
        />
        <Lightformer
          color="white"
          intensity={3}
          position={[1, 1, 1]}
          rotation={[0, 0, Math.PI / 3]}
          scale={[100, 0.1, 1]}
        />
        <Lightformer
          color="white"
          intensity={8}
          position={[-10, 0, 14]}
          rotation={[0, Math.PI / 2, Math.PI / 3]}
          scale={[100, 10, 1]}
        />
      </Environment>
    </Canvas>
  )
}

useGLTF.preload(cardGLB)
