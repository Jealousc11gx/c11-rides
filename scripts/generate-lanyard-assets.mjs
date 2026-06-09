import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'

globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer
      this.onloadend?.()
    })
  }
}

const outDir = new URL('../src/assets/', import.meta.url)
mkdirSync(outDir, { recursive: true })

function crc32(buffer) {
  let crc = -1

  for (const byte of buffer) {
    crc ^= byte
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }

  const result = Buffer.alloc(4)
  result.writeUInt32BE((crc ^ -1) >>> 0)

  return result
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)

  return Buffer.concat([length, typeBuffer, data, crc32(Buffer.concat([typeBuffer, data]))])
}

function writePng(path, width, height, pixelFor) {
  const rows = []

  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4)
    row[0] = 0

    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = pixelFor(x, y)
      const offset = 1 + x * 4
      row[offset] = r
      row[offset + 1] = g
      row[offset + 2] = b
      row[offset + 3] = a
    }

    rows.push(row)
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 6
  header[10] = 0
  header[11] = 0
  header[12] = 0

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(Buffer.concat(rows))),
    pngChunk('IEND', Buffer.alloc(0)),
  ])

  writeFileSync(path, png)
}

writePng(new URL('lanyard.png', outDir), 96, 12, (x, y) => {
  const stripe = Math.floor(x / 8) % 2
  const edge = y < 2 || y > 9
  const value = stripe ? 230 : 248
  const shade = edge ? 34 : 0

  return [Math.max(0, value - shade), Math.max(0, value - shade), Math.max(0, value - shade), 255]
})

const scene = new THREE.Scene()
const base = new THREE.MeshStandardMaterial({
  color: 0xf4f0e8,
  metalness: 0.18,
  name: 'base',
  roughness: 0.42,
})
const metal = new THREE.MeshStandardMaterial({
  color: 0xd7d7d7,
  metalness: 0.86,
  name: 'metal',
  roughness: 0.22,
})

const card = new THREE.Mesh(new THREE.BoxGeometry(1.62, 2.28, 0.045), base)
card.name = 'card'
card.position.set(0, 0, 0)
scene.add(card)

const clip = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.18, 0.09), metal)
clip.name = 'clip'
clip.position.set(0, 1.23, 0.025)
scene.add(clip)

const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.08), metal)
clamp.name = 'clamp'
clamp.position.set(0, 1.5, 0.04)
scene.add(clamp)

const exporter = new GLTFExporter()
const arrayBuffer = await exporter.parseAsync(scene, { binary: true })
writeFileSync(new URL('card.glb', outDir), Buffer.from(arrayBuffer))
