import { readFile } from 'node:fs/promises'
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, statSync } from 'node:fs'

import { getFrameUrl } from '../src/components/scrollVideoTiming.js'

const packageSource = await readFile(new URL('../package.json', import.meta.url), 'utf8')
const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
const scrollVideoSource = await readFile(new URL('../src/components/ScrollVideo.jsx', import.meta.url), 'utf8')
const starBorderSource = existsSync(new URL('../src/components/StarBorder.jsx', import.meta.url))
  ? await readFile(new URL('../src/components/StarBorder.jsx', import.meta.url), 'utf8')
  : ''
const starBorderCssSource = existsSync(new URL('../src/components/StarBorder.css', import.meta.url))
  ? await readFile(new URL('../src/components/StarBorder.css', import.meta.url), 'utf8')
  : ''
const textTypeSource = await readFile(new URL('../src/components/TextType.jsx', import.meta.url), 'utf8')
const decryptingTextSource = existsSync(new URL('../src/components/DecryptingText.jsx', import.meta.url))
  ? await readFile(new URL('../src/components/DecryptingText.jsx', import.meta.url), 'utf8')
  : ''
const lanyardSource = existsSync(new URL('../src/components/Lanyard.jsx', import.meta.url))
  ? await readFile(new URL('../src/components/Lanyard.jsx', import.meta.url), 'utf8')
  : ''
const lanyardSceneSource = existsSync(new URL('../src/components/LanyardScene.jsx', import.meta.url))
  ? await readFile(new URL('../src/components/LanyardScene.jsx', import.meta.url), 'utf8')
  : ''
const cssSource = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')
const extractScriptSource = await readFile(new URL('../scripts/extract-frames.swift', import.meta.url), 'utf8')
const extract2k60ScriptSource = await readFile(new URL('../scripts/extract-frames-2k60.py', import.meta.url), 'utf8')
const contentUrl = new URL('../src/content.json', import.meta.url)
const productionFrameManifestUrl = new URL('../public/frames/web_vedio/manifest.json', import.meta.url)
const contentSource = existsSync(contentUrl)
  ? await readFile(contentUrl, 'utf8')
  : '{}'
const contentJson = JSON.parse(contentSource)
const productionFrameManifest = JSON.parse(await readFile(productionFrameManifestUrl, 'utf8'))
const packageJson = JSON.parse(packageSource)

function cssRule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return cssSource.match(new RegExp(`${escaped}\\s*\\{[^}]*\\}`))?.[0] || ''
}

function requireContentPath(path) {
  const value = path.split('.').reduce((current, key) => current?.[key], contentJson)
  assert.notEqual(value, undefined, `Missing content path: ${path}`)
  return value
}

test('App wires the production WebP frame manifest before video decode fallback', () => {
  assert.match(appSource, /frameManifest=["']\/frames\/web_vedio\/manifest\.json["']/)
  assert.equal(productionFrameManifest.basePath, '/frames/web_vedio')
  assert.equal(productionFrameManifest.fps, 30)
  assert.equal(productionFrameManifest.frameCount, 291)
  assert.equal(
    getFrameUrl({
      basePath: '/frames/web_vedio',
      ext: 'webp',
      index: 7,
      pad: 4,
    }),
    '/frames/web_vedio/frame_0007.webp',
  )
})

test('editable content json is wired as the single source for page copy', () => {
  assert.ok(existsSync(contentUrl), 'Missing src/content.json')
  assert.equal(packageJson.scripts?.content, 'node scripts/open-content.mjs')
  assert.match(appSource, /import content from ['"]\.\/content\.json['"]/)
  assert.match(appSource, /identity=\{content\.identity\}/)
  assert.match(appSource, /navItems=\{content\.navItems\}/)
  assert.match(appSource, /contactCard=\{content\.contactCard\}/)
  assert.match(appSource, /scrollCue=\{content\.scrollCue\}/)
  assert.match(scrollVideoSource, /contactCard = defaultContactCard/)
  assert.match(scrollVideoSource, /scrollCue = \['Scroll', 'to', 'begin'\]/)
  assert.match(lanyardSceneSource, /import content from ['"]\.\.\/content\.json['"]/)
  assert.match(lanyardSceneSource, /const defaultCard = content\.contactCard/)

  for (const path of [
    'identity.primary',
    'identity.motto',
    'navItems',
    'sections.profile.title',
    'sections.profile.role',
    'sections.publications.items',
    'sections.projects.items',
    'sections.links.quote',
    'sections.links.items',
    'contactCard.email',
    'scrollCue',
  ]) {
    requireContentPath(path)
  }
})

test('scroll video overlay styles cover HUD, SplitText, and quote states', () => {
  for (const selector of [
    '.scroll-video__loading',
    '.scroll-video__loading--exiting',
    '.scroll-video__loading-kicker',
    '.scroll-video__loading-title',
    '.scroll-video__loading-glyph',
    '.scroll-video__loading-meter',
    '.scroll-video__loading-progress',
    '.decrypting-text__visual',
    '.decrypting-text__char',
    '.scroll-video__identity',
    '.scroll-video__identity-lockup',
    '.scroll-video__identity-name-char',
    '.scroll-video__intro-motto',
    '.scroll-video__identity[data-compact="true"]',
    '.scroll-video__scroll-cue-panel',
    '.scroll-video__top-nav',
    '.gooey-nav',
    '.split-text__unit',
    '.scroll-video__text[data-active="true"] .split-text__unit',
    '.scroll-video__quote',
    '.scroll-video__quote--animated',
  ]) {
    assert.ok(cssSource.includes(selector), `Missing selector: ${selector}`)
  }
  assert.ok(starBorderCssSource.includes('.star-border-container'), 'Missing selector: .star-border-container')

  assert.doesNotMatch(cssSource, /\.scroll-video__quote \.text-type/)
  assert.doesNotMatch(cssSource, /\.scroll-video__scanline/)
})

test('Scroll loading uses native decrypting text without adding Motion', () => {
  assert.match(scrollVideoSource, /import DecryptingText from ['"]\.\/DecryptingText['"]/)
  assert.match(scrollVideoSource, /const minimumLoadingDisplayMs = 1200/)
  assert.match(scrollVideoSource, /const loadingFadeMs = 240/)
  assert.match(scrollVideoSource, /getLoadingDisplayProgress/)
  assert.match(scrollVideoSource, /getLoadingExitTiming/)
  assert.match(scrollVideoSource, /isFrameSequenceInteractive/)
  assert.match(scrollVideoSource, /loadingExiting/)
  assert.match(scrollVideoSource, /loadingComplete/)
  assert.match(scrollVideoSource, /loadingVisible/)
  assert.match(scrollVideoSource, /setLoadingComplete\(false\)/)
  assert.match(scrollVideoSource, /setLoadingComplete\(true\)/)
  assert.match(scrollVideoSource, /setLoadingExiting\(true\)/)
  assert.match(scrollVideoSource, /const interactiveReady = isFrameSequenceInteractive\(\{[\s\S]*loadProgress,[\s\S]*ready,[\s\S]*\}\)/)
  assert.match(scrollVideoSource, /const loadingDisplayProgress = getLoadingDisplayProgress\(\{[\s\S]*loadProgress,[\s\S]*\}\)/)
  assert.match(scrollVideoSource, /if \(!interactiveReady\) \{/)
  assert.match(scrollVideoSource, /\}, \[interactiveReady\]\)/)
  assert.match(scrollVideoSource, /<DecryptingText[\s\S]*text="SYNCING RIDE FRAMES"/)
  assert.match(scrollVideoSource, /className="scroll-video__loading-title"/)
  assert.match(scrollVideoSource, /encryptedClassName="scroll-video__loading-glyph"/)
  assert.match(scrollVideoSource, /className=\{`scroll-video__loading\$\{loadingExiting \? ' scroll-video__loading--exiting' : ''\}`\}/)
  assert.match(scrollVideoSource, /style=\{\{ '--load-progress': loadingDisplayProgress \}\}/)
  assert.doesNotMatch(scrollVideoSource, /style=\{\{ '--load-progress': loadProgress \}\}/)
  assert.doesNotMatch(scrollVideoSource, /loading-percent|progressPercent/)
  assert.doesNotMatch(cssSource, /\.scroll-video__loading-percent/)
  assert.match(decryptingTextSource, /getDecryptingTextFrame/)
  assert.match(decryptingTextSource, /prefers-reduced-motion: reduce/)
  assert.doesNotMatch(packageSource, /motion\/react|framer-motion/)
  assert.doesNotMatch(decryptingTextSource, /motion\/react|framer-motion/)
})

test('App uses animated final quote and StarBorder for every final profile link', () => {
  const finalLinks = requireContentPath('sections.links.items')

  assert.match(appSource, /import StarBorder from ['"]\.\/components\/StarBorder['"]/)
  assert.doesNotMatch(appSource, /import ShinyText from ['"]\.\/components\/ShinyText['"]/)
  assert.doesNotMatch(appSource, /import TextType from ['"]\.\/components\/TextType['"]/)
  assert.match(appSource, /<SplitText[\s\S]*className="scroll-video__quote scroll-video__quote--animated"[\s\S]*mode="words"[\s\S]*text=\{sections\.links\.quote\}/)
  assert.match(appSource, /sections\.links\.items\.map\(\(link, index\) =>/)
  assert.match(appSource, /href=\{link\.href\}/)
  assert.match(appSource, /\{link\.label\}/)
  assert.equal((appSource.match(/<StarBorder/g) || []).length, 1)
  assert.equal(finalLinks[0].href, 'https://github.com/')
  assert.equal(finalLinks[1].href, 'https://scholar.google.com/')
  assert.equal(finalLinks[2].href, 'mailto:hello@example.com')
  assert.deepEqual(finalLinks.map((link) => link.label), ['GitHub', 'Scholar', 'Email'])
  assert.doesNotMatch(appSource, /<a\s+className="scroll-video__link"/)
  assert.equal(requireContentPath('sections.links.quote'), 'Per Aspera Ad Astra')
  assert.doesNotMatch(appSource, /Ad Astra Ad Aspera/)
  assert.doesNotMatch(appSource, /<ShinyText/)
  assert.doesNotMatch(appSource, /<TextType/)
  assert.doesNotMatch(appSource, /GradientText/)
  assert.ok(contentJson.navItems.some((item) => item.cueId === 'profile'))
  assert.ok(contentJson.navItems.some((item) => item.cueId === 'links'))
  assert.doesNotMatch(appSource, /brand=\{\{/)
  assert.doesNotMatch(appSource, /GradientText/)
  assert.doesNotMatch(appSource, /INIT \//)
  assert.doesNotMatch(appSource, /PROFILE \//)
  assert.doesNotMatch(appSource, /PUBLICATIONS \//)
  assert.doesNotMatch(appSource, /PROJECTS \//)
  assert.doesNotMatch(appSource, /CONTACT \//)
  assert.doesNotMatch(appSource, /Research \/ Publications \/ Projects/)
})

test('StarBorder follows the provided animated border component shape', () => {
  assert.match(starBorderSource, /as: Component = 'button'/)
  assert.match(starBorderSource, /border-gradient-bottom/)
  assert.match(starBorderSource, /border-gradient-top/)
  assert.match(starBorderSource, /inner-content/)
  assert.match(starBorderSource, /style = \{\}/)
  assert.match(starBorderSource, /<Component[\s\S]*\{\.\.\.rest\}[\s\S]*style=\{\{[\s\S]*padding: `\$\{thickness\}px 0`,[\s\S]*\.\.\.style/)
  assert.match(starBorderSource, /padding: `\$\{thickness\}px 0`/)
  assert.match(starBorderSource, /background: `radial-gradient\(circle, \$\{color\}, transparent 10%\)`/)
  assert.match(starBorderSource, /animationDuration: speed/)
  assert.doesNotMatch(starBorderSource, /\.\.\.rest\.style/)
  assert.doesNotMatch(starBorderSource, /--star-border-thickness/)
  assert.match(starBorderCssSource, /\.border-gradient-bottom/)
  assert.match(starBorderCssSource, /\.border-gradient-top/)
  assert.match(starBorderCssSource, /@keyframes star-border-slide-bottom/)
  assert.match(starBorderCssSource, /@keyframes star-border-slide-top/)
  assert.match(starBorderCssSource, /prefers-reduced-motion: reduce[\s\S]*\.border-gradient-bottom/)
})

test('Contact links keep StarBorder edges with compact dock-height capsules', () => {
  assert.match(starBorderCssSource, /\.scroll-video__links \.star-border-container\s*\{[\s\S]*min-height: 1\.34rem/)
  assert.match(starBorderCssSource, /\.scroll-video__links \.star-border-container\s*\{[\s\S]*background: rgba\(255, 255, 255, 0\.14\)/)
  assert.match(starBorderCssSource, /\.scroll-video__links \.star-border-container \.inner-content\s*\{[\s\S]*min-height: 1\.34rem/)
  assert.match(starBorderCssSource, /\.scroll-video__links \.star-border-container \.inner-content\s*\{[\s\S]*padding: 0 0\.68rem/)
  assert.match(starBorderCssSource, /\.scroll-video__links \.star-border-container \.inner-content\s*\{[\s\S]*background: transparent/)
  assert.match(starBorderCssSource, /\.scroll-video__links \.star-border-container \.inner-content\s*\{[\s\S]*box-shadow: none/)
  assert.doesNotMatch(starBorderCssSource, /\.scroll-video__links \.border-gradient-bottom,\n\.scroll-video__links \.border-gradient-top\s*\{[\s\S]*display: none/)
  assert.match(starBorderCssSource, /\.scroll-video__links \.border-gradient-bottom\s*\{[\s\S]*bottom: -7px/)
  assert.match(starBorderCssSource, /\.scroll-video__links \.border-gradient-top\s*\{[\s\S]*top: -7px/)
  assert.doesNotMatch(starBorderCssSource, /\.scroll-video__links \.star-border-container \.inner-content\s*\{[\s\S]*rgba\(3, 3, 4, 0\.72\)/)
  assert.match(cssRule('.scroll-video__link'), /min-width: 4\.35rem/)
})

test('Scroll cue is a right-bottom TypeText prompt that fades before Profile', () => {
  assert.match(scrollVideoSource, /import TextType from ['"]\.\/TextType['"]/)
  assert.match(scrollVideoSource, /className="scroll-video__scroll-cue-panel"/)
  assert.deepEqual(requireContentPath('scrollCue'), ['Scroll', 'to', 'begin'])
  assert.match(textTypeSource, /Array\.isArray\(text\)/)
  assert.match(textTypeSource, /lineDelay = 140/)
  assert.match(textTypeSource, /lineItems\.map/)
  assert.match(textTypeSource, /'--line-delay':/)
  assert.match(textTypeSource, /'--line-duration':/)
  assert.match(scrollVideoSource, /scrollCue = \['Scroll', 'to', 'begin'\]/)
  assert.match(scrollVideoSource, /<TextType[\s\S]*className="scroll-video__scroll-cue-type"[\s\S]*text=\{scrollCue\}/)
  assert.match(scrollVideoSource, /className="scroll-video__scroll-cue-arrow"/)
  assert.doesNotMatch(scrollVideoSource, /<span>Scroll down<\/span>/)

  const cueRule = cssRule('.scroll-video__scroll-cue-panel')
  assert.match(cueRule, /right: clamp\(/)
  assert.match(cueRule, /bottom: clamp\(/)
  assert.match(cueRule, /opacity: calc\(1 - var\(--scroll-cue-progress\)\)/)
  assert.match(cueRule, /--scroll-cue-progress: clamp\(0, calc\(var\(--scroll-progress, 0\) \/ 0\.12\), 1\)/)
  assert.match(cueRule, /transform: translate3d\(0, calc\(1\.25rem \* var\(--scroll-cue-progress\)\), 0\)/)
  assert.doesNotMatch(cueRule, /text-shadow/)
  assert.match(cssRule('.scroll-video__scroll-cue-type.text-type'), /font-size: clamp\(1\.32rem, 2\.8vw, 2\.35rem\)/)
  assert.match(cssRule('.scroll-video__scroll-cue-type.text-type'), /color: var\(--text-main\)/)
  assert.match(cssRule('.scroll-video__scroll-cue-type.text-type'), /flex-direction: column/)
  assert.match(cssRule('.scroll-video__scroll-cue-type.text-type'), /align-items: flex-start/)
  assert.match(cssRule('.scroll-video__scroll-cue-type.text-type'), /text-align: left/)
  assert.match(cssSource, /\.text-type__line \+ \.text-type__line/)
  assert.match(cssSource, /\.scroll-video__scroll-cue-panel \.text-type__line[\s\S]*text-type-reveal/)
  assert.match(cssRule('.scroll-video__scroll-cue-panel .text-type__line'), /var\(--line-duration, var\(--type-duration\)\)/)
  assert.match(cssRule('.scroll-video__scroll-cue-panel .text-type__line'), /steps\(var\(--line-characters, var\(--type-characters\)\)\)/)
  assert.match(cssRule('.scroll-video__scroll-cue-panel .text-type__line'), /calc\(260ms \+ var\(--line-delay, 0ms\)\)/)
  assert.match(cssRule('.scroll-video__scroll-cue-panel .text-type__line'), /line-height: 1\.14/)
  assert.match(cssRule('.scroll-video__scroll-cue-panel .text-type__line'), /padding-bottom: 0\.08em/)
  assert.match(cssRule('.scroll-video__scroll-cue-panel .text-type__cursor'), /position: absolute/)
  assert.doesNotMatch(cssRule('.scroll-video__scroll-cue-panel::before'), /box-shadow/)
  assert.doesNotMatch(cssRule('.scroll-video__scroll-cue-arrow'), /text-shadow/)
})

test('Right top navigation uses GooeyNav particles while preserving cue scrolling', () => {
  assert.match(scrollVideoSource, /import GooeyNav from ['"]\.\/GooeyNav['"]/)
  assert.match(scrollVideoSource, /const navMenuItems = navItems\.flatMap/)
  assert.match(scrollVideoSource, /<GooeyNav[\s\S]*className="scroll-video__top-nav"[\s\S]*items=\{navMenuItems\}/)
  assert.match(scrollVideoSource, /onClick: \(event\) => scrollToCue\(event, item\)/)
  assert.doesNotMatch(scrollVideoSource, /NavItemComponent \?/)
  assert.match(cssSource, /\.gooey-nav__filter/)
  assert.match(cssSource, /\.gooey-nav__particle/)
  assert.match(cssSource, /gooey-particle-move/)
  assert.match(cssSource, /\.gooey-nav__item--active/)
  assert.match(cssSource, /filter: url\("#gooey-nav-filter"\)/)
})

test('Right top card uses a real 3D lanyard with physics assets and scroll-aware toggle', () => {
  for (const dependency of [
    '@react-three/fiber',
    '@react-three/drei',
    '@react-three/rapier',
    'meshline',
  ]) {
    assert.ok(packageJson.dependencies?.[dependency], `Missing dependency: ${dependency}`)
  }

  for (const asset of [
    '../src/assets/card.glb',
  ]) {
    const assetUrl = new URL(asset, import.meta.url)
    assert.ok(existsSync(assetUrl), `Missing asset: ${asset}`)
    assert.ok(statSync(assetUrl).size > 128, `Asset is empty: ${asset}`)
  }

  assert.match(lanyardSceneSource, /import \{ Canvas, extend, useFrame \} from ['"]@react-three\/fiber['"]/)
  assert.match(lanyardSceneSource, /import \{ useGLTF, Environment, Lightformer \} from ['"]@react-three\/drei['"]/)
  assert.match(lanyardSceneSource, /Physics/)
  assert.match(lanyardSceneSource, /useRopeJoint/)
  assert.match(lanyardSceneSource, /useSphericalJoint/)
  assert.match(lanyardSceneSource, /MeshLineGeometry/)
  assert.match(lanyardSceneSource, /cardGLB/)
  assert.match(lanyardSceneSource, /function createStrapTexture/)
  assert.doesNotMatch(lanyardSource, /@react-three\/fiber/)
  assert.doesNotMatch(lanyardSource, /@react-three\/drei/)
  assert.match(lanyardSource, /const LanyardScene = lazy\(\(\) => import\(['"]\.\/LanyardScene['"]\)\)/)
  assert.match(lanyardSource, /hasInteracted/)
  assert.match(lanyardSource, /isDocked/)
  assert.match(lanyardSource, /isCompact/)
  assert.match(lanyardSource, /aria-expanded/)
  assert.match(lanyardSource, /Contact card/)
  assert.match(lanyardSource, /Escape/)
  assert.match(lanyardSource, /lanyard__backdrop/)

  assert.match(scrollVideoSource, /import Lanyard from ['"]\.\/Lanyard['"]/)
  assert.match(scrollVideoSource, /const \[scrollProgress, setScrollProgress\] = useState\(0\)/)
  assert.match(scrollVideoSource, /setScrollProgress\(progress\)/)
  assert.match(scrollVideoSource, /<Lanyard[\s\S]*className="scroll-video__lanyard"[\s\S]*isCompact=\{scrollProgress > 0\.08\}/)
  assert.match(cssSource, /\.scroll-video__lanyard/)
  assert.match(cssSource, /\.lanyard/)
  assert.match(cssSource, /\.lanyard__toggle/)
  assert.match(cssSource, /\.lanyard__backdrop/)
  assert.match(cssSource, /\.lanyard__stage/)
  assert.match(cssSource, /lanyard-drop/)
  assert.match(cssSource, /prefers-reduced-motion: reduce/)
})

test('Lanyard card has polished loading, exit animation, and enough drop room', () => {
  assert.doesNotMatch(lanyardSource, /function LanyardPreviewCard/)
  assert.match(lanyardSource, /shouldRenderStage/)
  assert.match(lanyardSource, /setShouldRenderStage\(true\)/)
  assert.match(lanyardSource, /setShouldRenderStage\(false\)/)
  assert.match(lanyardSource, /lanyard--closing/)
  assert.match(lanyardSource, /fallback=\{null\}/)
  assert.doesNotMatch(lanyardSource, /className="lanyard__fallback" aria-hidden="true" \/>/)

  assert.match(lanyardSceneSource, /function createCardTexture/)
  assert.match(lanyardSceneSource, /new THREE\.CanvasTexture/)
  assert.match(lanyardSceneSource, /const defaultCard = content\.contactCard/)
  assert.equal(requireContentPath('contactCard.name'), 'Chen Linliang')
  assert.equal(requireContentPath('contactCard.role'), 'PhD Candidate')
  assert.ok(requireContentPath('contactCard.tags').includes('Neuromorphic Computing'))

  const lanyardStageRule = cssRule('.lanyard__stage')
  assert.match(lanyardStageRule, /position: fixed/)
  assert.match(lanyardStageRule, /inset: 0/)
  assert.match(lanyardStageRule, /width: 100vw/)
  assert.match(lanyardStageRule, /height: 100svh/)
  assert.match(cssSource, /\.lanyard--closing \.lanyard__stage/)
  assert.match(cssSource, /@keyframes lanyard-retract/)
  assert.match(cssSource, /\.lanyard__stage > div/)
  assert.match(cssSource, /\.lanyard__stage canvas/)
  assert.doesNotMatch(cssSource, /\.lanyard__preview-card/)
  assert.match(cssSource, /\.lanyard__toggle-icon/)
  assert.match(cssSource, /\.lanyard--open \.lanyard__toggle-icon/)
  assert.match(cssSource, /\.scroll-video__stage:has\(\.lanyard--open\) \.scroll-video__scroll-cue-panel/)
  assert.match(cssSource, /\.scroll-video__stage:has\(\.lanyard--closing\) \.scroll-video__scroll-cue-panel/)
})

test('Lanyard stage keeps viewport geometry while physics supplies the drop motion', () => {
  const lanyardStageRule = cssRule('.lanyard__stage')
  const lanyardOpenStageRule = cssRule('.lanyard--open .lanyard__stage')
  const lanyardDockedRule = cssRule('.lanyard--docked .lanyard__stage,\n.lanyard--compact:not(.lanyard--closing) .lanyard__stage')
  const lanyardDropKeyframes = cssSource.match(/@keyframes lanyard-drop\s*\{[\s\S]*?\n\}/)?.[0] || ''
  const lanyardRetractKeyframes = cssSource.match(/@keyframes lanyard-retract\s*\{[\s\S]*?\n\}/)?.[0] || ''

  assert.match(lanyardStageRule, /position: fixed/)
  assert.match(lanyardStageRule, /inset: 0/)
  assert.doesNotMatch(lanyardStageRule, /transform:/)
  assert.doesNotMatch(lanyardStageRule, /transform-origin:/)
  assert.doesNotMatch(lanyardOpenStageRule, /transform:/)
  assert.doesNotMatch(lanyardDockedRule, /transform:/)
  assert.doesNotMatch(lanyardDropKeyframes, /transform:/)
  assert.doesNotMatch(lanyardRetractKeyframes, /transform:/)
})

test('Lanyard keeps the original anchored drop behavior without spotlight focus mode', () => {
  assert.doesNotMatch(lanyardSource, /isFocused/)
  assert.doesNotMatch(lanyardSource, /setFocused/)
  assert.doesNotMatch(lanyardSource, /lanyard--focused/)
  assert.doesNotMatch(lanyardSource, /spotlight=/)
  assert.doesNotMatch(lanyardSceneSource, /spotlight/)
  assert.doesNotMatch(lanyardSceneSource, /onFocusToggle/)
  assert.doesNotMatch(lanyardSceneSource, /anchorGroup\.current\.position\.lerp/)
  assert.doesNotMatch(lanyardSceneSource, /cardVisual\.current\.scale\.setScalar/)
  assert.doesNotMatch(lanyardSceneSource, /setNextKinematicTranslation\(\{[\s\S]*x: THREE\.MathUtils\.lerp/)
  assert.doesNotMatch(cssSource, /\.lanyard--focused/)
  assert.match(lanyardSceneSource, /type={dragged \? 'kinematicPosition' : 'dynamic'}/)
})

test('Lanyard keeps the physics scene instead of permanently switching to a static fallback', () => {
  assert.doesNotMatch(lanyardSource, /sceneUnavailable/)
  assert.doesNotMatch(lanyardSource, /setSceneUnavailable/)
  assert.doesNotMatch(lanyardSource, /onContextLost/)
  assert.match(lanyardSource, /<Suspense fallback=\{null\}>/)
  assert.match(lanyardSource, /<LanyardScene[\s\S]*isCompact=\{isCompact \|\| isDocked\}/)

  assert.doesNotMatch(lanyardSceneSource, /onContextLost/)
  assert.match(lanyardSceneSource, /canvasRetryKey/)
  assert.match(lanyardSceneSource, /setCanvasRetryKey/)
  assert.match(lanyardSceneSource, /webglcontextlost/)
  assert.match(lanyardSceneSource, /key={canvasRetryKey}/)
  assert.match(lanyardSceneSource, /function drawBarcode/)
  assert.doesNotMatch(lanyardSceneSource, /function drawPixelField/)
  assert.doesNotMatch(lanyardSceneSource, /drawPixelField\(context/)
  assert.doesNotMatch(lanyardSceneSource, /nodes\.clip\.geometry/)
  assert.doesNotMatch(lanyardSceneSource, /nodes\.clamp\.geometry/)
  assert.doesNotMatch(lanyardSceneSource, /fillText\('CL'/)
  assert.doesNotMatch(lanyardSceneSource, /portraitGradient/)
  assert.match(lanyardSceneSource, /function drawBlackHoleHalo/)
  assert.match(lanyardSceneSource, /const defaultCard = content\.contactCard/)
  assert.equal(requireContentPath('contactCard.name'), 'Chen Linliang')
  assert.equal(requireContentPath('contactCard.code'), 'L-13')
  assert.equal(requireContentPath('contactCard.subtitle'), 'AI RESEARCH / SYSTEMS BUILDER')
  assert.match(lanyardSceneSource, /map={cardTexture}/)
  assert.match(lanyardSource, /fov = 18/)
  assert.match(lanyardSource, /position = \[0, 0, 30\]/)
  assert.match(lanyardSceneSource, /function createRoundedCardGeometry/)
  assert.match(lanyardSceneSource, /import \{ getAnchorPosition \} from ['"]\.\/lanyardAnchor\.js['"]/)
  assert.match(lanyardSceneSource, /anchorRect = null/)
  assert.doesNotMatch(lanyardSceneSource, /nodes\.card\.geometry/)
  assert.match(lanyardSceneSource, /cardPresentationScale = isMobile \? 1\.28 : 1\.58/)
  assert.match(lanyardSceneSource, /scale={cardPresentationScale}/)
  assert.match(lanyardSceneSource, /function StrapHardware/)
  assert.doesNotMatch(lanyardSceneSource, /function StrapLabel/)
  assert.doesNotMatch(lanyardSceneSource, /createStrapLabelTexture/)
  assert.match(lanyardSceneSource, /displayLabel/)
  assert.match(lanyardSceneSource, /fillText\(displayLabel/)
  assert.doesNotMatch(lanyardSceneSource, /torusGeometry/)
  assert.match(lanyardSceneSource, /THREE\.MathUtils\.clamp/)
  assert.match(lanyardSceneSource, /slotWidth/)
  assert.match(lanyardSceneSource, /anchorPosition/)
  assert.match(lanyardSceneSource, /slotAnchorOffset/)
  assert.match(lanyardSceneSource, /setNextKinematicTranslation/)
  assert.match(lanyardSceneSource, /lineWidth={isMobile \? 0\.92 : 1\.08}/)
  assert.match(lanyardSceneSource, /repeat={\[-1, 1\]}/)
})

test('Lanyard trigger sits beside contact navigation and card content is configurable', () => {
  assert.match(scrollVideoSource, /const defaultContactCard = \{/)
  assert.match(scrollVideoSource, /contactCard = defaultContactCard/)
  assert.match(appSource, /contactCard=\{content\.contactCard\}/)
  assert.equal(requireContentPath('contactCard.name'), 'Chen Linliang')
  assert.equal(requireContentPath('contactCard.code'), 'L-13')
  assert.equal(requireContentPath('contactCard.strapLabel'), 'Chen Linliang')
  assert.deepEqual(requireContentPath('contactCard.tags'), ['Efficient AI', 'Neuromorphic Computing'])
  assert.match(scrollVideoSource, /<div className="scroll-video__nav-cluster">/)
  assert.match(cssSource, /\.scroll-video__nav-cluster/)
  assert.match(lanyardSource, /aria-label=\{isExpanded \? 'Hide contact card' : 'Show contact card'\}/)
  assert.match(lanyardSource, /className="lanyard__toggle-icon"/)
  assert.match(lanyardSource, /<LanyardScene[\s\S]*card=\{card\}/)
  assert.match(lanyardSceneSource, /function createCardTexture\(card\)/)
  assert.match(lanyardSceneSource, /card\.tags/)
})

test('Scroll cue hides through explicit lanyard state instead of relying only on :has', () => {
  assert.match(scrollVideoSource, /const \[lanyardExpanded, setLanyardExpanded\] = useState\(false\)/)
  assert.match(scrollVideoSource, /scroll-video__stage--lanyard-open/)
  assert.match(scrollVideoSource, /onExpandedChange=\{setLanyardExpanded\}/)
  assert.match(lanyardSource, /onExpandedChange/)
  assert.match(lanyardSource, /onExpandedChange\(isExpanded\)/)
  assert.match(cssSource, /\.scroll-video__stage--lanyard-open \.scroll-video__scroll-cue-panel/)
  assert.doesNotMatch(cssSource, /\.scroll-video__stage:has\(\.lanyard--open\) \.scroll-video__identity/)
  assert.doesNotMatch(cssSource, /\.scroll-video__stage:has\(\.lanyard--closing\) \.scroll-video__identity/)
  assert.doesNotMatch(cssSource, /\.scroll-video__stage--lanyard-open \.scroll-video__identity/)
})

test('App renders an English-only identity mark', () => {
  for (const text of [
    'Chen Linliang',
    'PhD Candidate',
    'Beihang University',
    'Efficient AI',
    'Neuromorphic Computing',
  ]) {
    assert.ok(contentSource.includes(text), `Missing personal text: ${text}`)
  }

  assert.equal(requireContentPath('identity.mark'), '✦')
  assert.match(appSource, /identity=\{content\.identity\}/)
  assert.doesNotMatch(appSource, /陈林亮/)
  assert.doesNotMatch(contentSource, /陈林亮/)
  assert.doesNotMatch(appSource, /个人信息/)
  assert.doesNotMatch(appSource, /发表/)
  assert.doesNotMatch(appSource, /项目/)
  assert.doesNotMatch(appSource, /博士研究生/)
  assert.doesNotMatch(appSource, /放 GitHub/)
  assert.doesNotMatch(appSource, /你的名字/)
  assert.doesNotMatch(appSource, /English Name/)
  assert.doesNotMatch(appSource, /University \/ Lab/)
  assert.doesNotMatch(appSource, /Current Role/)
})

test('Profile cue uses a compact role line with two research tags', () => {
  assert.match(appSource, /className="scroll-video__profile-role"/)
  assert.match(appSource, /\{sections\.profile\.role\}/)
  assert.match(appSource, /sections\.profile\.tags\.map/)
  assert.equal(requireContentPath('sections.profile.role'), 'PhD Candidate, Beihang University')
  assert.deepEqual(requireContentPath('sections.profile.tags'), ['Efficient AI', 'Neuromorphic Computing'])
  assert.doesNotMatch(appSource, /<span>PhD Candidate<\/span>/)
  assert.doesNotMatch(appSource, /<span>Beihang University<\/span>/)
  assert.match(cssSource, /\.scroll-video__profile-role/)
})

test('Content cues keep numbered section markers without chapter labels or timecode HUD', () => {
  assert.match(appSource, /function SectionMarker/)
  assert.match(appSource, /number=\{sections\.profile\.markerNumber\}/)
  assert.match(appSource, /label=\{sections\.profile\.markerLabel\}/)
  assert.equal(requireContentPath('sections.profile.markerNumber'), '01')
  assert.equal(requireContentPath('sections.profile.markerLabel'), '/ 04 Profile')
  assert.equal(requireContentPath('sections.publications.markerNumber'), '02')
  assert.equal(requireContentPath('sections.publications.markerLabel'), '/ 04 Publications')
  assert.equal(requireContentPath('sections.projects.markerNumber'), '03')
  assert.equal(requireContentPath('sections.projects.markerLabel'), '/ 04 Projects')
  assert.equal(requireContentPath('sections.links.markerNumber'), '04')
  assert.equal(requireContentPath('sections.links.markerLabel'), '/ 04 Contact')

  assert.match(cssSource, /\.scroll-video__section-marker/)
  assert.match(cssRule('.scroll-video__section-marker b'), /font-variant-numeric: tabular-nums/)
  assert.match(cssRule('.scroll-video__section-marker'), /margin-bottom: -0\.16rem/)
  assert.doesNotMatch(cssRule('.scroll-video__section-marker'), /text-shadow/)
  assert.match(cssRule('.scroll-video__section-marker b'), /rgba\(255, 255, 255, 0\.92\)/)
  assert.match(cssRule('.scroll-video__section-marker span'), /rgba\(255, 255, 255, 0\.5\)/)
  assert.doesNotMatch(appSource, /className="scroll-video__chapter"/)
  assert.doesNotMatch(cssSource, /\.scroll-video__chapter/)
  assert.doesNotMatch(appSource, /chapter/i)
  assert.doesNotMatch(cssSource, /chapter/i)
  assert.doesNotMatch(appSource, /CHAPTER ·/)
  assert.doesNotMatch(appSource, /PROFILE \//)
  assert.doesNotMatch(appSource, /PUBLICATIONS \//)
  assert.doesNotMatch(appSource, /PROJECTS \//)
  assert.doesNotMatch(appSource, /CONTACT \//)
})

test('visual system uses Helvetica, English identity mark, and restrained shiny quote', () => {
  assert.match(cssSource, /--font-en: "Helvetica Neue", Helvetica, Arial, sans-serif;/)
  assert.match(cssSource, /--font-zh: "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", sans-serif;/)
  assert.match(cssSource, /--page-black: #030304;/)
  assert.match(cssSource, /--text-main: rgba\(255, 255, 255, 0\.96\);/)
  assert.match(cssSource, /--text-soft: rgba\(255, 255, 255, 0\.72\);/)
  assert.match(cssSource, /--text-muted: rgba\(255, 255, 255, 0\.5\);/)
  assert.doesNotMatch(cssSource, /background: #000;/)
  assert.doesNotMatch(cssSource, /color: #fff;/)
  assert.match(cssSource, /\.scroll-video__identity-mark/)
  assert.match(cssSource, /\.scroll-video__identity-name/)
  assert.match(appSource, /identity=\{content\.identity\}/)
  assert.deepEqual(requireContentPath('identity.motto'), [
    'Between neurons and silicon.',
    'Small enough to move.',
    'Deep enough to endure.',
  ])
  assert.match(scrollVideoSource, /className="scroll-video__intro-motto"/)
  assert.match(scrollVideoSource, /displayIdentity\.motto\.map/)
  assert.doesNotMatch(appSource, /secondary: 'PhD Candidate, Beihang University'/)
  assert.match(cssRule('.scroll-video__identity'), /top: calc\(38%/)
  assert.match(cssRule('.scroll-video__identity-name'), /font-size: clamp\(2\.75rem, 7\.4vw, 5\.9rem\)/)
  assert.match(cssRule('.scroll-video__intro-motto'), /left: clamp\(0\.95rem, 4vw, 3\.2rem\)/)
  assert.match(cssRule('.scroll-video__intro-motto'), /bottom: clamp\(1\.35rem, 5vw, 4\.6rem\)/)
  assert.match(cssRule('.scroll-video__intro-motto'), /--intro-motto-progress: clamp\(0, calc\(var\(--scroll-progress, 0\) \/ 0\.14\), 1\)/)
  assert.match(cssRule('.scroll-video__intro-motto'), /opacity: calc\(1 - var\(--intro-motto-progress\)\)/)
  assert.match(cssSource, /\.scroll-video__scroll-cue-panel/)
  assert.match(cssSource, /--scroll-cue-progress/)
  assert.match(cssSource, /scroll-cue-bob/)
  assert.doesNotMatch(cssSource, /\.scroll-video__identity-focus/)
  assert.doesNotMatch(cssRule('.scroll-video__text'), /text-shadow/)
  assert.doesNotMatch(cssRule('.scroll-video__text[data-active="true"]'), /text-shadow/)
  assert.doesNotMatch(cssRule('.scroll-video__section-marker'), /text-shadow/)
  assert.doesNotMatch(cssRule('.scroll-video__quote'), /0 16px 44px/)

  for (const blueToken of [
    '#7cecff',
    '#7CEBFF',
    '124, 236, 255',
    '74, 219, 255',
    '198, 239, 255',
    '226, 247, 255',
  ]) {
    assert.ok(!cssSource.includes(blueToken), `Unexpected blue accent: ${blueToken}`)
  }

  assert.doesNotMatch(cssSource, /\.scroll-video__paper-list span[\s\S]*border-bottom/)
  assert.doesNotMatch(cssSource, /\.scroll-video__project-list[\s\S]*grid-template-columns/)
  assert.match(cssSource, /\.scroll-video__quote[\s\S]*place-self: center/)
  assert.doesNotMatch(cssRule('.scroll-video__quote'), /left: 50%/)
  assert.doesNotMatch(cssRule('.scroll-video__quote'), /translateX\(-50%\)/)
  assert.match(cssRule('.scroll-video__quote'), /font-family: var\(--font-en\)/)
  assert.doesNotMatch(cssSource, /\.scroll-video__quote\.shiny-text/)
  assert.doesNotMatch(cssSource, /--shiny-text-color/)
  assert.doesNotMatch(cssSource, /--shiny-text-shine-color/)
  assert.doesNotMatch(cssSource, /shiny-text-sweep/)
})

test('Contact cue starts after Projects cue fully fades out', () => {
  assert.match(appSource, /id: 'projects'[\s\S]*end: 7\.3/)
  assert.match(appSource, /id: 'links'[\s\S]*time: 8\.2/)
})

test('Profile is the first content cue after the static identity', () => {
  assert.doesNotMatch(appSource, /id: 'intro'/)
  assert.match(appSource, /id: 'profile'[\s\S]*time: 2\.4/)
  assert.match(scrollVideoSource, /duration \* 90/)
  assert.match(scrollVideoSource, /progress > 0\.16/)
})

test('Mobile identity starts below the top navigation before collapsing on scroll', () => {
  assert.match(cssSource, /@media \(max-width: 680px\) \{[\s\S]*\.scroll-video__identity \{[\s\S]*top: calc\(30% - \(\(30% - 0\.86rem\) \* var\(--identity-progress\)\)\)/)
  assert.doesNotMatch(cssSource, /@media \(max-width: 680px\) \{[\s\S]*\.scroll-video__identity \{[\s\S]*top: 0\.86rem;/)
})

test('offline frame extraction script writes a manifest for the same trimmed range ScrollVideo uses', () => {
  assert.match(extractScriptSource, /--start/)
  assert.match(extractScriptSource, /--end/)
  assert.match(extractScriptSource, /startTime/)
  assert.match(extractScriptSource, /sampleDuration/)
  assert.match(appSource, /startTime=\{0\.35\}/)
})

test('Python 2K 60fps frame extraction script documents the ffmpeg workflow', () => {
  assert.match(extract2k60ScriptSource, /ffmpeg/)
  assert.match(extract2k60ScriptSource, /ffprobe/)
  assert.match(extract2k60ScriptSource, /--fps/)
  assert.match(extract2k60ScriptSource, /default=60/)
  assert.match(extract2k60ScriptSource, /--width/)
  assert.match(extract2k60ScriptSource, /default=2560/)
  assert.match(extract2k60ScriptSource, /manifest\.json/)
  assert.match(extract2k60ScriptSource, /basePath/)
  assert.match(extract2k60ScriptSource, /frameCount/)
})

test('Lanyard lives between Publications and Projects as a measured GooeyNav slot', () => {
  assert.match(scrollVideoSource, /type: ['"]slot['"]/)
  assert.match(scrollVideoSource, /key: ['"]lanyard['"]/)
  assert.match(scrollVideoSource, /render: \(\) => \(/)
  assert.match(scrollVideoSource, /<Lanyard[\s\S]*className="scroll-video__lanyard"/)
  assert.doesNotMatch(scrollVideoSource, /<\/GooeyNav>\s*<Lanyard/)

  assert.match(appSource, /navItems=\{content\.navItems\}/)
  assert.deepEqual(contentJson.navItems.map((item) => item.label), [
    'Profile',
    'Publications',
    'Projects',
    'Contact',
  ])
  assert.match(lanyardSource, /anchorRect/)
  assert.match(lanyardSource, /getBoundingClientRect/)
  assert.match(lanyardSource, /ResizeObserver/)
  assert.match(lanyardSource, /ref=\{toggleRef\}/)
  assert.match(lanyardSource, /anchorRect=\{anchorRect\}/)

  assert.match(lanyardSceneSource, /import \{ getAnchorPosition \} from ['"]\.\/lanyardAnchor\.js['"]/)
  assert.match(lanyardSceneSource, /anchorRect = null/)
  assert.match(lanyardSceneSource, /getAnchorPosition\(\{[\s\S]*anchorRect/)
})

test('Strap name is printed into the lanyard texture instead of floating as a separate plane', () => {
  assert.match(lanyardSceneSource, /function createStrapTexture/)
  assert.match(lanyardSceneSource, /const CARD_NAME_COLOR = '#f4f4f2'/)
  assert.match(lanyardSceneSource, /displayLabel/)
  assert.match(lanyardSceneSource, /context\.fillStyle = CARD_NAME_COLOR[\s\S]*fillText\(displayLabel/)
  assert.match(lanyardSceneSource, /fillText\(displayLabel/)
  assert.doesNotMatch(lanyardSceneSource, /function StrapLabel/)
  assert.doesNotMatch(lanyardSceneSource, /<StrapLabel/)
  assert.match(lanyardSceneSource, /map={strapTexture}/)
})

test('Badge hardware shares the same top slot anchor as the physics joint', () => {
  assert.match(lanyardSceneSource, /const CARD_HEIGHT = 2\.16/)
  assert.match(lanyardSceneSource, /const CARD_TEXTURE_HEIGHT = 1440/)
  assert.match(lanyardSceneSource, /const CARD_SLOT = \{/)
  assert.match(lanyardSceneSource, /function getCardTextureYOffset/)
  assert.match(lanyardSceneSource, /slotAnchorOffset/)
  assert.match(lanyardSceneSource, /useSphericalJoint\(strapJoint, cardBody/)
  assert.match(lanyardSceneSource, /<StrapHardware[\s\S]*slotAnchorOffset=\{slotAnchorOffset\}/)
  assert.match(lanyardSceneSource, /cardPresentationScale=\{cardPresentationScale\}/)
  assert.match(lanyardSceneSource, /slotBridge/)
  assert.match(lanyardSceneSource, /slotSideGuides/)
  assert.match(lanyardSceneSource, /clampPlate/)
  assert.doesNotMatch(lanyardSceneSource, /slotProngs/)
  assert.doesNotMatch(lanyardSceneSource, /ringConnector/)
  assert.doesNotMatch(lanyardSceneSource, /torusGeometry/)
  assert.doesNotMatch(lanyardSceneSource, /anchorOffset = 1\.08/)
  assert.doesNotMatch(lanyardSceneSource, /lineWidth={isMobile \? 2\.35 : 3\.05}/)
  assert.doesNotMatch(lanyardSceneSource, /lineWidth={isMobile \? 1\.05 : 1\.38}/)
})

test('Badge clamp hardware renders on both card faces for flipped cards', () => {
  assert.match(lanyardSceneSource, /const hardwareFaces = \[/)
  assert.match(lanyardSceneSource, /key: 'front'[\s\S]*depthSign: 1/)
  assert.match(lanyardSceneSource, /key: 'back'[\s\S]*depthSign: -1/)
  assert.match(lanyardSceneSource, /function StrapHardwareSide/)
  assert.match(lanyardSceneSource, /hardwareFaces\.map/)
  assert.match(lanyardSceneSource, /position=\{\[0, slotAnchorOffset, 0\.16 \* depthSign\]\}/)
  assert.match(lanyardSceneSource, /clampPlate\.z \* depthSign/)
  assert.match(lanyardSceneSource, /returnStrapCover\.z \* depthSign/)
})

test('Badge uses one looped strap and tag pills do not hard clip long research text', () => {
  assert.match(lanyardSceneSource, /loopBand/)
  assert.match(lanyardSceneSource, /singleStrapCenter/)
  assert.match(lanyardSceneSource, /setBandPoints/)
  assert.match(lanyardSceneSource, /<BadgeStrapMesh[\s\S]*ref={loopBand}/)
  assert.doesNotMatch(lanyardSceneSource, /leftBand/)
  assert.doesNotMatch(lanyardSceneSource, /rightBand/)
  assert.doesNotMatch(lanyardSceneSource, /strapHalfSpacing/)
  assert.match(lanyardSceneSource, /context\.font = '900 36px/)
  assert.match(lanyardSceneSource, /strapNameAdvance = 340/)
  assert.match(lanyardSceneSource, /function drawTagPill/)
  assert.match(lanyardSceneSource, /fitTagFont/)
  assert.doesNotMatch(lanyardSceneSource, /Math\.min\(250, context\.measureText\(tag\)\.width \+ 36\)/)
})

test('Badge slot shows front threading and keeps research tags in one horizontal row', () => {
  assert.match(lanyardSceneSource, /function drawSlotThreading/)
  assert.match(lanyardSceneSource, /frontSlotFace/)
  assert.match(lanyardSceneSource, /backSlotFace/)
  assert.match(lanyardSceneSource, /backSlotFace = \{[\s\S]*y: slotY \+ slotHeight \+ 4/)
  assert.doesNotMatch(lanyardSceneSource, /frontSlotStraps/)
  assert.doesNotMatch(lanyardSceneSource, /backSlotReturns/)
  assert.match(lanyardSceneSource, /drawSlotThreading\(context, \{[\s\S]*slotHeight[\s\S]*slotWidth[\s\S]*slotX[\s\S]*slotY/)
  assert.match(lanyardSceneSource, /function drawTagRow/)
  assert.match(lanyardSceneSource, /cursorX/)
  assert.match(lanyardSceneSource, /drawTagPill\(context, tag, cursorX/)
  assert.doesNotMatch(lanyardSceneSource, /tagStartX \+ index \* \(tagMaxWidth \+ tagGap\)/)
  assert.doesNotMatch(lanyardSceneSource, /roundedRect\(context, slotX \+ 52, slotY \+ 25, slotWidth - 104, 20, 10\)/)
})

test('Back strap return tucks behind the clamp and hardware uses the same slot scale', () => {
  assert.match(lanyardSceneSource, /slotAnchorOffset = getCardTextureYOffset\(\{[\s\S]*scale: cardPresentationScale[\s\S]*textureY: CARD_SLOT\.y \+ CARD_SLOT\.height \/ 2/)
  assert.match(lanyardSceneSource, /slotPhysicalWidth/)
  assert.match(lanyardSceneSource, /CARD_WIDTH \* cardPresentationScale \* CARD_SLOT\.width \/ CARD_TEXTURE_WIDTH/)
  assert.match(lanyardSceneSource, /strapDepth = 0\.14/)
  assert.match(lanyardSceneSource, /returnStrapCover/)
  assert.match(lanyardSceneSource, /z: clampPlate\.z - 0\.036/)
  assert.match(lanyardSceneSource, /<mesh position=\{\[0, returnStrapCover\.y, returnStrapCover\.z \* depthSign\]\}>/)
  assert.match(lanyardSceneSource, /<boxGeometry args=\{\[returnStrapCover\.width, returnStrapCover\.height, returnStrapCover\.depth\]\}/)
})
