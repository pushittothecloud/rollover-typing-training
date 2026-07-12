import { motion } from 'framer-motion'
import { scamperPrompts } from '../../data/scamperPrompts'
import type { LensKey } from '../../state/appStore'
import { useAppStore } from '../../state/appStore'

const keys = Object.keys(scamperPrompts) as LensKey[]

type ScamperDockProps = {
  visible: boolean
}

export function ScamperDock({ visible }: ScamperDockProps) {
  const activeLenses = useAppStore((state) => state.activeLenses)
  const toggleLens = useAppStore((state) => state.toggleLens)

  return (
    <motion.aside
      initial={false}
      animate={{ opacity: visible ? 1 : 0.2, x: visible ? 0 : 18 }}
      className="pointer-events-auto fixed right-4 top-1/2 z-20 -translate-y-1/2 rounded-2xl border border-stone-700 bg-stone-900/75 p-2 backdrop-blur"
    >
      <ul className="grid gap-2">
        {keys.map((key) => {
          const lens = scamperPrompts[key]
          const active = activeLenses[key]

          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => toggleLens(key, lens.prompt)}
                title={`${key} - ${lens.title}`}
                className={`h-10 w-10 rounded-lg border text-sm font-semibold transition ${
                  active
                    ? 'border-amber-400 bg-amber-400/20 text-amber-100'
                    : 'border-stone-700 bg-stone-800/70 text-stone-200 hover:border-stone-500'
                }`}
              >
                {key}
              </button>
            </li>
          )
        })}
      </ul>
    </motion.aside>
  )
}
