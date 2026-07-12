import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { TopAnchors } from '../components/TopAnchors'
import { scamperPrompts } from '../data/scamperPrompts'
import { WritingEditor } from '../features/editor/WritingEditor'
import { LiminalTriggers } from '../features/liminal/LiminalTriggers'
import { PullTrigger } from '../features/pull/PullTrigger'
import { ScamperDock } from '../features/scamper/ScamperDock'
import { TextletCanvas } from '../features/textlets/TextletCanvas'
import { ToulminModal } from '../features/toulmin/ToulminModal'
import { useAppStore } from '../state/appStore'

export function CognitiveWritingApp() {
  const started = useAppStore((state) => state.started)
  const activeLenses = useAppStore((state) => state.activeLenses)
  const nodes = useAppStore((state) => state.nodes)

  const [showTop, setShowTop] = useState(false)
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(false)

  const tintClass = useMemo(() => {
    const active = Object.entries(activeLenses).find(([, value]) => value)?.[0]

    if (!active) {
      return 'bg-transparent'
    }

    return scamperPrompts[active as keyof typeof scamperPrompts].tintClass
  }, [activeLenses])

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_20%,#2a2019_0%,#0a0807_52%,#030303_100%)] text-stone-100"
      onMouseMove={(event) => {
        setShowTop(event.clientY <= 34)
        setShowLeft(event.clientX <= 34)
        setShowRight(window.innerWidth - event.clientX <= 72)
      }}
    >
      <LiminalTriggers />

      <motion.div
        className={`pointer-events-none fixed inset-0 z-[1] transition ${tintClass}`}
        animate={{ opacity: tintClass === 'bg-transparent' ? 0 : 1 }}
        transition={{ duration: 0.45 }}
      />

      <TopAnchors visible={showTop && started} />
      <ScamperDock visible={showRight && started} />

      <main className="relative z-10 mx-auto grid w-[min(1300px,96vw)] grid-cols-1 gap-4 px-3 pb-20 pt-20 md:grid-cols-[1.25fr_1fr]">
        <section
          className={`transition-opacity duration-300 ${
            !showLeft && started ? 'opacity-95' : 'opacity-100'
          }`}
        >
          <WritingEditor />
        </section>

        <section>
          <h2
            className={`mb-2 text-xs uppercase tracking-[0.2em] text-stone-400 transition ${
              showLeft && started ? 'opacity-100' : 'opacity-0 md:opacity-60'
            }`}
          >
            Textlet Workspace
          </h2>
          <TextletCanvas />
          {!nodes.length && (
            <p className="mt-2 text-xs text-stone-500">
              Highlight a sentence in the editor and click Detach selection to create your first textlet.
            </p>
          )}
        </section>
      </main>

      <PullTrigger />
      <ToulminModal />
    </div>
  )
}
