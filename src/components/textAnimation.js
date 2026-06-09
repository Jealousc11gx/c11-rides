export function splitTextUnits(text, mode = 'chars') {
  if (mode === 'words') {
    return text.split(/(\s+)/).filter((part) => part.length > 0)
  }

  return Array.from(text)
}

export function getTypedText(text, visibleCount) {
  return Array.from(text).slice(0, Math.max(0, visibleCount)).join('')
}
