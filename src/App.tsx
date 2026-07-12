import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import "./App.css"
import { processTargetKeystroke } from "./training/keystrokeEngine"
import { startMetronome, stopMetronome, updateMetronomeInterval } from "./training/metronome"
import { PROGRESSION_CONSTANTS } from "./training/progression"
import { orderedTrainingTargets, coreBigrams, targetWordBank } from "./training/targets"
import {
  clearTrainingFeedback,
  getTrainingStateSnapshot,
  resolvePromptTarget,
  setMetronomePhaseIKI,
  setTargetIKI,
  subscribeTrainingState,
} from "./training/state"

const { ISOLATED_STREAK_REQUIRED, WORDS_REQUIRED, METRONOME_REPS_PER_STEP } =
  PROGRESSION_CONSTANTS

const clampTargetIKI = (value: number) => Math.min(200, Math.max(20, value))
const ikiToBpm = (iki: number) => Math.round(60000 / iki)

const getRotatedItems = (items: string[], activeIndex: number) => {
  if (items.length === 0) return []
  return [...items.slice(activeIndex), ...items.slice(0, activeIndex)]
}

const buildPreviewItems = (
  practiceItems: string[],
  activeIndex: number,
  currentTargetIndex: number,
  currentPhase: string,
  isolatedSuccessStreak: number,
) => {
  const previewItems: Array<{ item: string; state: "active" | "upcoming" }> = []
  const rotatedPracticeItems = getRotatedItems(practiceItems, activeIndex)

  if (currentPhase === "isolated" || currentPhase === "metronome") {
    const repeats = currentPhase === "isolated" ? Math.max(1, 5 - isolatedSuccessStreak) : 4
    for (let count = 0; count < repeats; count += 1) {
      previewItems.push({
        item: rotatedPracticeItems[0] ?? orderedTrainingTargets[currentTargetIndex],
        state: count === 0 ? "active" : "upcoming",
      })
    }
  } else {
    rotatedPracticeItems.forEach((item, index) => {
      previewItems.push({ item, state: index === 0 ? "active" : "upcoming" })
    })
  }

  let targetOffset = 0
  while (previewItems.length < 28 && targetOffset < orderedTrainingTargets.length) {
    const targetIndex = (currentTargetIndex + targetOffset) % orderedTrainingTargets.length
    const target = orderedTrainingTargets[targetIndex]
    const words = targetWordBank[target] ?? [target]
    words.forEach((word) => {
      if (previewItems.length >= 28) return
      const alreadyCovered =
        targetOffset === 0 && currentPhase !== "isolated" && rotatedPracticeItems.includes(word)
      if (!alreadyCovered) previewItems.push({ item: word, state: "upcoming" })
    })
    targetOffset += 1
  }
  return previewItems
}

const splitPromptByTarget = (prompt: string, target: string) => {
  const idx = prompt.toLowerCase().indexOf(target.toLowerCase())
  if (idx === -1) return { before: "", focus: prompt, after: "" }
  return {
    before: prompt.slice(0, idx),
    focus: prompt.slice(idx, idx + target.length),
    after: prompt.slice(idx + target.length),
  }
}

function App() {
  const snap = useSyncExternalStore(subscribeTrainingState, getTrainingStateSnapshot)
  const [flashTone, setFlashTone] = useState<"idle" | "success" | "failure">("idle")
  const [beatActive, setBeatActive] = useState(false)
  const beatFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const practiceInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => { practiceInputRef.current?.focus() }, [])

  useEffect(() => {
    if (snap.feedbackSequence === 0) return
    setFlashTone(snap.feedbackTone)
    const id = window.setTimeout(() => {
      setFlashTone("idle")
      clearTrainingFeedback()
    }, 280)
    return () => window.clearTimeout(id)
  }, [snap.feedbackSequence, snap.feedbackTone])

  useEffect(() => {
    if (snap.currentPhase !== "metronome") {
      stopMetronome()
      return
    }
    const handleBeat = () => {
      setBeatActive(true)
      if (beatFlashRef.current !== null) clearTimeout(beatFlashRef.current)
      beatFlashRef.current = setTimeout(() => setBeatActive(false), 90)
    }
    startMetronome(snap.metronomePhaseIKI, handleBeat)
    return () => stopMetronome()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.currentPhase])

  useEffect(() => {
    if (snap.currentPhase === "metronome") updateMetronomeInterval(snap.metronomePhaseIKI)
  }, [snap.currentPhase, snap.metronomePhaseIKI])

  const handleTargetIKIChange = (value: string) => {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isNaN(parsed)) setTargetIKI(clampTargetIKI(parsed))
  }

  const handleMetronomeIKIChange = (value: string) => {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isNaN(parsed)) setMetronomePhaseIKI(parsed)
  }

  const isBigram = snap.currentTargetIndex < coreBigrams.length
  const totalBigrams = coreBigrams.length
  const totalTrigrams = orderedTrainingTargets.length - coreBigrams.length
  const targetLabel = isBigram
    ? `Bigram ${snap.currentTargetIndex + 1} / ${totalBigrams}`
    : `Trigram ${snap.currentTargetIndex - coreBigrams.length + 1} / ${totalTrigrams}`

  const completionCount =
    snap.currentPhase === "isolated"
      ? snap.isolatedSuccessStreak
      : snap.currentPhase === "words"
        ? snap.wordsCompleted
        : snap.metronomeRepsAtSpeed

  const completionGoal =
    snap.currentPhase === "isolated"
      ? ISOLATED_STREAK_REQUIRED
      : snap.currentPhase === "words"
        ? WORDS_REQUIRED
        : METRONOME_REPS_PER_STEP

  const measuredIKIText =
    snap.lastMeasuredIKI === null
      ? "Awaiting first attempt"
      : `${snap.lastMeasuredIKI.toFixed(1)} ms`

  const previewItems = buildPreviewItems(
    snap.practiceItems,
    snap.currentPromptIndex,
    snap.currentTargetIndex,
    snap.currentPhase,
    snap.isolatedSuccessStreak,
  )

  const activePromptTarget = resolvePromptTarget(snap.currentPrompt, snap.currentTarget, snap.history)
  const promptParts = splitPromptByTarget(snap.currentPrompt, activePromptTarget)
  const metronomeMaxIKI = snap.targetIKI * 8

  return (
    <div className={`typing-trainer-shell is-${flashTone}`}>
      <header className="shell-header">
        <p className="shell-eyebrow">Rollover Typing Training</p>
        <h1>{snap.currentTarget.toUpperCase()}</h1>
        <p className="shell-copy">{targetLabel}</p>
      </header>

      <main className="shell-main" aria-label="Typing trainer">
        <section className="shell-panel shell-controls">
          <div>
            <p className="shell-label">Target IKI</p>
            <h2>{snap.targetIKI} ms</h2>
            <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>{ikiToBpm(snap.targetIKI)} BPM</p>
          </div>
          <label className="iki-control" htmlFor="target-iki-range">
            <span>Adjust goal (ms)</span>
            <input
              id="target-iki-range" type="range" min="20" max="200" step="5"
              value={snap.targetIKI} onChange={(e) => handleTargetIKIChange(e.target.value)}
            />
          </label>
          <label className="iki-number" htmlFor="target-iki-number">
            <span>Exact value</span>
            <input
              id="target-iki-number" type="number" min="20" max="200" step="1"
              value={snap.targetIKI} onChange={(e) => handleTargetIKIChange(e.target.value)}
            />
          </label>
          {snap.currentPhase === "metronome" && (
            <div className="metronome-controls">
              <p className="shell-label">Metronome</p>
              <div className="metronome-speed-display">
                <span className={`beat-dot ${beatActive ? "is-active" : ""}`} aria-hidden="true" />
                <span className="beat-iki">{snap.metronomePhaseIKI} ms</span>
                <span className="beat-bpm">{ikiToBpm(snap.metronomePhaseIKI)} BPM</span>
              </div>
              <label className="iki-control" htmlFor="metro-iki-range">
                <span>Adjust tempo</span>
                <input
                  id="metro-iki-range" type="range"
                  min={snap.targetIKI} max={metronomeMaxIKI} step="5"
                  value={snap.metronomePhaseIKI} onChange={(e) => handleMetronomeIKIChange(e.target.value)}
                />
              </label>
              <p className="metronome-hint">
                Each beat = one keystroke. Auto-speeds up every {METRONOME_REPS_PER_STEP} successful reps.
              </p>
            </div>
          )}
        </section>

        <section
          className={`shell-panel prompt-panel prompt-${flashTone}`}
          onClick={(e) => { e.currentTarget.querySelector<HTMLInputElement>(".practice-input")?.focus() }}
        >
          <div className="phase-track">
            {(["isolated", "words", "metronome"] as const).map((phase) => (
              <span key={phase} className={`phase-pill ${snap.currentPhase === phase ? "is-active" : ""}`}>
                {phase === "isolated" ? "Isolated" : phase === "words" ? "Words" : "Metronome"}
              </span>
            ))}
          </div>

          <div className="practice-strip" aria-label="Upcoming practice items">
            {previewItems.map(({ item, state }, index) => (
              <span key={`${item}-${index}`} className={`practice-chip is-${state}`}>{item}</span>
            ))}
          </div>

          <div className="prompt-display" aria-live="polite">
            <span className="prompt-fragment prompt-context">{promptParts.before}</span>
            <span className="prompt-fragment prompt-focus-target">{promptParts.focus}</span>
            <span className="prompt-fragment prompt-context">{promptParts.after}</span>
          </div>

          <p className="prompt-iki">Last IKI: {measuredIKIText}</p>

          <div className="typed-display" aria-live="polite">
            {snap.currentInput || "Start typing\u2026"}
          </div>

          <input
            ref={practiceInputRef}
            className="practice-input"
            type="text"
            inputMode="text"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            aria-label="Typing practice input"
            value={snap.currentInput}
            onKeyDown={(e) => processTargetKeystroke(e.nativeEvent)}
            onChange={() => {}}
          />
        </section>

        <section className="shell-panel shell-stats">
          <div>
            <p className="shell-label">Phase progress</p>
            <h2>{completionCount} / {completionGoal}</h2>
            <div className="progress-pips">
              {Array.from({ length: completionGoal }).map((_, i) => (
                <span key={i} className={`pip ${i < completionCount ? "is-filled" : ""}`} />
              ))}
            </div>
          </div>
          {snap.currentPhase === "metronome" && (
            <div>
              <p className="shell-label">Speed path</p>
              <p style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>
                {snap.metronomePhaseIKI} ms &rarr; {snap.targetIKI} ms
              </p>
            </div>
          )}
          <div>
            <p className="shell-label">Targets done</p>
            <p>{snap.history.length}</p>
          </div>
          <div>
            <p className="shell-label">Queue</p>
            <p>{snap.currentTargetIndex + 1} / {orderedTrainingTargets.length}</p>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
