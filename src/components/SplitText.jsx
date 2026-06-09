import { splitTextUnits } from './textAnimation.js'

export default function SplitText({
  as: Tag = 'strong',
  className = '',
  mode = 'chars',
  stagger = 22,
  text,
}) {
  const units = splitTextUnits(text, mode)

  return (
    <Tag className={`split-text ${className}`.trim()} aria-label={text}>
      {units.map((unit, index) => (
        <span
          aria-hidden="true"
          className="split-text__unit"
          key={`${unit}-${index}`}
          style={{ '--unit-delay': `${index * stagger}ms` }}
        >
          {unit === ' ' ? '\u00a0' : unit}
        </span>
      ))}
    </Tag>
  )
}
