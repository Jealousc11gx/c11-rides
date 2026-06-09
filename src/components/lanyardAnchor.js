function degToRad(degrees) {
  return (degrees * Math.PI) / 180
}

function getAnchorRatios({ anchorRect, isMobile }) {
  if (
    anchorRect &&
    Number.isFinite(anchorRect.left) &&
    Number.isFinite(anchorRect.top) &&
    Number.isFinite(anchorRect.width) &&
    Number.isFinite(anchorRect.height)
  ) {
    return {
      x: anchorRect.left + anchorRect.width / 2,
      y: anchorRect.top + anchorRect.height / 2,
      usesViewportPixels: true,
    }
  }

  return {
    x: isMobile ? 0.54 : 0.58,
    y: isMobile ? 0.13 : 0.12,
    usesViewportPixels: false,
  }
}

export function getAnchorPosition({ anchorRect = null, fov, isMobile, position, viewportSize }) {
  const viewportWidth = Math.max(1, viewportSize.width)
  const viewportHeight = Math.max(1, viewportSize.height)
  const aspect = Math.max(0.1, viewportWidth / viewportHeight)
  const cameraDepth = Math.abs(position[2] || 30)
  const worldHeight = 2 * cameraDepth * Math.tan(degToRad(fov) / 2)
  const worldWidth = worldHeight * aspect
  const ratios = getAnchorRatios({ anchorRect, isMobile })
  const targetXRatio = ratios.usesViewportPixels ? ratios.x / viewportWidth : ratios.x
  const targetYRatio = ratios.usesViewportPixels ? ratios.y / viewportHeight : ratios.y

  return [(targetXRatio - 0.5) * worldWidth, (0.5 - targetYRatio) * worldHeight, 0]
}
