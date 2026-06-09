export default function TextType({
  as: Tag = 'strong',
  className = '',
  cursorCharacter = '_',
  lineDelay = 140,
  speed = 48,
  text,
}) {
  const lines = Array.isArray(text) ? text : [text]
  let elapsed = 0
  const lineItems = lines.map((line) => {
    const characters = Math.max(1, line.length)
    const duration = Math.max(220, characters * speed)
    const item = {
      characters,
      delay: elapsed,
      duration,
      line,
    }

    elapsed += duration + lineDelay

    return item
  })
  const characterCount = lineItems.reduce((total, item) => total + item.characters, 0)

  return (
    <Tag
      className={`text-type ${className}`.trim()}
      style={{
        '--type-characters': characterCount,
        '--type-duration': `${Math.max(320, elapsed - lineDelay)}ms`,
      }}
    >
      {lineItems.map((item, index) => (
        <span
          className="text-type__line"
          key={`${item.line}-${index}`}
          style={{
            '--line-characters': item.characters,
            '--line-delay': `${item.delay}ms`,
            '--line-duration': `${item.duration}ms`,
          }}
        >
          {item.line}
        </span>
      ))}
      <span className="text-type__cursor" aria-hidden="true">{cursorCharacter}</span>
    </Tag>
  )
}
