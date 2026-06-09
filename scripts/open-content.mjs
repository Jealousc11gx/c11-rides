import { spawnSync } from 'node:child_process'
import { access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const contentPath = fileURLToPath(new URL('../src/content.json', import.meta.url))

async function main() {
  try {
    await access(contentPath)
  } catch {
    console.error(`Missing content file: ${contentPath}`)
    process.exit(1)
  }

  if (process.argv.includes('--print-path')) {
    console.log(contentPath)
    return
  }

  const codeResult = spawnSync('code', [contentPath], { stdio: 'inherit' })

  if (codeResult.status === 0) {
    console.log('Opened src/content.json. After editing, run npm test.')
    return
  }

  const openResult = spawnSync('open', [contentPath], { stdio: 'inherit' })

  if (openResult.status === 0) {
    console.log('Opened src/content.json. After editing, run npm test.')
    return
  }

  console.error(`Could not open ${contentPath}. Open it manually, then run npm test.`)
  process.exit(1)
}

main()
