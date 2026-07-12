import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

type PullWordPayload = {
  nouns: string[]
  verbs: string[]
  concepts: string[]
}

type Kind = keyof PullWordPayload

const kinds: Kind[] = ['nouns', 'verbs', 'concepts']

export function PullTrigger() {
  const [pool, setPool] = useState<PullWordPayload | null>(null)
  const [word, setWord] = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    void fetch('/pull-words.json')
      .then((response) => response.json() as Promise<PullWordPayload>)
      .then((payload) => setPool(payload))
      .catch(() => {
        setPool({
          nouns: ['bridge', 'threshold', 'cartography'],
          verbs: ['invert', 'stretch', 'translate'],
          concepts: ['entropy', 'ritual', 'friction'],
        })
      })
  }, [])

  const pullWord = () => {
    if (!pool) {
      return
    }

    const kind = kinds[Math.floor(Math.random() * kinds.length)]
    const options = pool[kind]

    if (!options.length) {
      return
    }

    const nextWord = options[Math.floor(Math.random() * options.length)]
    setWord(nextWord)
    setVisible(true)

    window.setTimeout(() => {
      setVisible(false)
    }, 5000)
  }

  return (
    <>
      <button
        type="button"
        onClick={pullWord}
        className="fixed bottom-4 right-4 z-20 rounded-full border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-xs uppercase tracking-[0.2em] text-amber-100 shadow-lg shadow-amber-700/10 backdrop-blur"
      >
        Pull
      </button>

      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            className="fixed bottom-20 right-4 z-20 rounded-xl border border-amber-400/40 bg-stone-950/90 px-4 py-3 text-sm text-amber-50 shadow-xl"
          >
            {word}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
