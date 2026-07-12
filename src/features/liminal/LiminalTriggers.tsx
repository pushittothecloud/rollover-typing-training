const phrases = [
  'expand',
  'flip it',
  'breathe',
  'push further',
  'stay with it',
  'twist the angle',
]

export function LiminalTriggers() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {phrases.map((phrase, index) => {
        const side = index % 2 === 0 ? 'left-2' : 'right-2'
        const top = `${10 + index * 13}%`
        const delay = `${index * 1.7}s`

        return (
          <span
            key={phrase}
            className={`absolute ${side} text-[10px] uppercase tracking-[0.28em] text-amber-100/10 liminal-fade`}
            style={{ top, animationDelay: delay }}
          >
            {phrase}
          </span>
        )
      })}
    </div>
  )
}
