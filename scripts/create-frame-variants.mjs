import { mkdir, readFile, rm, copyFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildSampleMap, buildVariantManifest } from './frameVariantUtils.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = path.join(root, 'public', 'frames', 'web_vedio')
const sourceManifestPath = path.join(sourceDir, 'manifest.json')
const outputRoot = path.join(root, 'public', 'frames_compare')
const targetFpsValues = [30, 45, 50]

function frameName(index, pad = 4, ext = 'webp') {
  return `frame_${String(index).padStart(pad, '0')}.${ext}`
}

async function createVariant(sourceManifest, targetFps) {
  const variantName = `web_vedio_${targetFps}`
  const outputDir = path.join(outputRoot, variantName)
  const map = buildSampleMap({
    sourceFps: sourceManifest.fps,
    sourceFrameCount: sourceManifest.frameCount,
    targetFps,
  })

  await rm(outputDir, { force: true, recursive: true })
  await mkdir(outputDir, { recursive: true })

  for (let index = 0; index < map.length; index += 1) {
    const sourceFrame = path.join(sourceDir, frameName(map[index], sourceManifest.pad, sourceManifest.ext))
    const targetFrame = path.join(outputDir, frameName(index, sourceManifest.pad, sourceManifest.ext))
    await copyFile(sourceFrame, targetFrame)
  }

  const manifest = buildVariantManifest({
    basePath: `/frames_compare/${variantName}`,
    frameCount: map.length,
    sourceManifest,
    targetFps,
  })

  await writeFile(
    path.join(outputDir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  )

  return {
    dir: path.relative(root, outputDir),
    fps: targetFps,
    frameCount: map.length,
  }
}

const sourceManifest = JSON.parse(await readFile(sourceManifestPath, 'utf8'))
const variants = []

for (const targetFps of targetFpsValues) {
  variants.push(await createVariant(sourceManifest, targetFps))
}

console.log(JSON.stringify({ variants }, null, 2))
