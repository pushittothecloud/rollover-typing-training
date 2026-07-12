import { motion, AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'
import { useAppStore } from '../../state/appStore'

const minChars = 24

export function ToulminModal() {
  const started = useAppStore((state) => state.started)
  const toulmin = useAppStore((state) => state.toulmin)
  const setToulminField = useAppStore((state) => state.setToulminField)
  const beginDrafting = useAppStore((state) => state.beginDrafting)

  const canStart = useMemo(() => {
    return [toulmin.claim, toulmin.evidence, toulmin.warrant].every(
      (value) => value.trim().length >= minChars,
    )
  }, [toulmin.claim, toulmin.evidence, toulmin.warrant])

  return (
    <AnimatePresence>
      {!started && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-stone-950/55 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-2xl rounded-2xl border border-stone-700 bg-stone-900/95 p-6 shadow-2xl"
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <h2 className="font-serif text-2xl text-amber-50">Build Your Argument Spine</h2>
            <p className="mt-2 text-sm text-stone-300">
              Capture your Toulmin foundation before drafting. Each field needs at
              least {minChars} characters.
            </p>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.18em] text-stone-400">Claim</span>
                <textarea
                  value={toulmin.claim}
                  onChange={(event) => setToulminField('claim', event.target.value)}
                  className="h-20 rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-stone-100 outline-none transition focus:border-amber-500"
                  placeholder="What is the core argument?"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.18em] text-stone-400">Evidence</span>
                <textarea
                  value={toulmin.evidence}
                  onChange={(event) => setToulminField('evidence', event.target.value)}
                  className="h-20 rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-stone-100 outline-none transition focus:border-amber-500"
                  placeholder="What observation or data supports it?"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.18em] text-stone-400">Warrant</span>
                <textarea
                  value={toulmin.warrant}
                  onChange={(event) => setToulminField('warrant', event.target.value)}
                  className="h-20 rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-stone-100 outline-none transition focus:border-amber-500"
                  placeholder="Why does this evidence prove the claim?"
                />
              </label>
            </div>

            <button
              type="button"
              disabled={!canStart}
              onClick={beginDrafting}
              className="mt-6 w-full rounded-lg border border-amber-600/60 bg-amber-500/20 px-4 py-3 font-medium text-amber-50 transition hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Start Drafting
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
