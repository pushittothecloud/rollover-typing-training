import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import "./App.css"
import { processTargetKeystroke } from "./training/keystrokeEngine"
import { startMetronome, stopMetronome, updateMetronomeInterval } from "./training/metronome"
import { PROGRESSION_CONSTANTS } from "./training/progression"
import { orderedTrainingTargets, coreBigrams } from "./training/targets"
import {
  clearTrainingFeedback,
  getTrainingStateSnapshot,
  resolvePromptTarget,
  setAutoSpeedUp,
  setMetronomeStartIKI,
  setMetronomeCurrentIKI,
  subscribeTrainingState,
} from "./training/state"

const { ISOLATED_STREAK_REQUIRED, WORDS_REQUIRED, METRONOME_ISOLATED_REPS, METRONOME_WORDS_REPS } =
  PROGRESSION_CONSTANTS

const clampMetronomeStartBpm = (bpm: number) => Math.min(300, Math.max(50, bpm))
const ikiToBpm = (iki: number) => Math.round(60000 / iki)

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
    startMetronome(snap.metronomeCurrentIKI, handleBeat)
    return () => stopMetronome()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.currentPhase])

  useEffect(() => {
    if (snap.currentPhase === "metronome") updateMetronomeInterval(snap.metronomeCurrentIKI)
  }, [snap.currentPhase, snap.metronomeCurrentIKI])

  const handleMetronomeStartBpmChange = (value: string) => {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isNaN(parsed)) setMetronomeStartIKI(clampMetronomeStartBpm(parsed))
  }

  const handleMetronomeCurrentChange = (value: string) => {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isNaN(parsed)) setMetronomeCurrentIKI(parsed)
  }

  const handleAutoSpeedUpToggle = () => {
    setAutoSpeedUp(!snap.autoSpeedUp)
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
        : snap.metronomeSubPhase === "isolated"
          ? snap.metronomeRepsAtSpeed
          : snap.metronomeWordsCompleted

  const completionGoal =
    snap.currentPhase === "isolated"
      ? ISOLATED_STREAK_REQUIRED
      : snap.currentPhase === "words"
        ? WORDS_REQUIRED
        : snap.metronomeSubPhase === "isolated"
          ? METRONOME_ISOLATED_REPS
          : METRONOME_WORDS_REPS

  const buildPromptDisplay = () => {
    const inputPrompt = snap.currentPrompt
    const normalizedInputPrompt = inputPrompt.toLowerCase()
    const normalizedInput = snap.currentInput.toLowerCase()
    const isWordsPhase =
      snap.currentPhase === "words" ||
      (snap.currentPhase === "metronome" && snap.metronomeSubPhase === "words")
    const displayPrompt = inputPrompt

    const normalizedDisplayPrompt = displayPrompt.toLowerCase()
    const activePracticeWord = snap.practiceItems[snap.currentPromptIndex] ?? snap.currentTarget
    const promptTarget = (
      isWordsPhase
        ? activePracticeWord
        : resolvePromptTarget(
          inputPrompt,
          snap.currentTarget,
          snap.history,
        )
    ).toLowerCase()

    const escapedTarget = promptTarget.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const wholeWordMatch = normalizedDisplayPrompt.match(new RegExp(`\\b${escapedTarget}\\b`))
    const targetStartIndex = wholeWordMatch?.index ?? normalizedDisplayPrompt.indexOf(promptTarget)
    const targetLength = promptTarget.length

    let correctPrefixLength = 0
    const compareLength = Math.min(inputPrompt.length, snap.currentInput.length)
    while (
      correctPrefixLength < compareLength &&
      normalizedInputPrompt[correctPrefixLength] === normalizedInput[correctPrefixLength]
    ) {
      correctPrefixLength += 1
    }

    const typedLength = Math.min(snap.currentInput.length, inputPrompt.length)
    const targetEndIndex = targetStartIndex === -1 ? -1 : targetStartIndex + targetLength
    const isTargetComplete =
      targetStartIndex !== -1 &&
      correctPrefixLength >= targetEndIndex

    return (
      <>
        {Array.from(displayPrompt).map((character, index) => {
          const classes = ["typed-char"]

          if (index < correctPrefixLength) {
            classes.push("is-correct")
          } else if (index < typedLength) {
            classes.push("is-incorrect")
          } else {
            classes.push("is-untyped")
          }

          if (index === typedLength && typedLength < displayPrompt.length) {
            classes.push("is-current")
          }

          if (targetStartIndex !== -1 && index >= targetStartIndex && index < targetEndIndex) {
            if (isTargetComplete) {
              classes.push("target-complete")
            } else {
              classes.push("target-active")
            }
          }

          return (
            <span
              key={`${character}-${index}`}
              className={classes.join(" ")}
              aria-hidden="true"
            >
              {character}
            </span>
          )
        })}
      </>
    )
  }

  return (
    <div className={`typing-trainer-shell is-${flashTone}`}>
      <header className="shell-header">
        <p className="shell-eyebrow">Rollover Typing Training</p>
        <h1>{snap.currentTarget.toUpperCase()}</h1>
        <p className="shell-copy">{targetLabel}</p>
      </header>

      <main className="shell-main" aria-label="Typing trainer">
        <section className="shell-panel shell-controls">
          {snap.currentPhase === "metronome" && (
            <div className="metronome-controls">
              <p className="shell-label">Metronome Start</p>
              <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                {ikiToBpm(snap.metronomeStartIKI)} BPM
              </div>
              <label className="iki-control" htmlFor="metro-start-range">
                <span>Start tempo (50–300 BPM)</span>
                <input
                  id="metro-start-range" type="range"
                  min="50" max="300" step="10"
                  value={ikiToBpm(snap.metronomeStartIKI)}
                  onChange={(e) => handleMetronomeStartBpmChange(e.target.value)}
                />
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={snap.autoSpeedUp}
                  onChange={handleAutoSpeedUpToggle}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <span style={{ fontSize: "0.9rem" }}>Auto speed up</span>
              </label>

              <p className="shell-label" style={{ marginTop: "0.8rem" }}>Current Tempo</p>
              <div className="metronome-speed-display">
                <span className={`beat-dot ${beatActive ? "is-active" : ""}`} aria-hidden="true" />
                <span className="beat-iki">{snap.metronomeCurrentIKI} ms</span>
                <span className="beat-bpm">{ikiToBpm(snap.metronomeCurrentIKI)} BPM</span>
              </div>

              {snap.autoSpeedUp && (
                <label className="iki-control" htmlFor="metro-iki-range">
                  <span>Manual adjust (during fixed tempo)</span>
                  <input
                    id="metro-iki-range" type="range"
                    min={snap.targetIKI} max={1200} step="5"
                    value={snap.metronomeCurrentIKI}
                    onChange={(e) => handleMetronomeCurrentChange(e.target.value)}
                    disabled={snap.autoSpeedUp}
                    style={{ opacity: snap.autoSpeedUp ? 0.5 : 1 }}
                  />
                </label>
              )}

              {!snap.autoSpeedUp && (
                <label className="iki-control" htmlFor="metro-iki-range">
                  <span>Adjust tempo (ms)</span>
                  <input
                    id="metro-iki-range" type="range"
                    min={snap.targetIKI} max={1200} step="5"
                    value={snap.metronomeCurrentIKI}
                    onChange={(e) => handleMetronomeCurrentChange(e.target.value)}
                  />
                </label>
              )}
            </div>
          )}
        </section>

        <section
          className={`shell-panel prompt-panel prompt-${flashTone}`}
          onClick={(e) => { e.currentTarget.querySelector<HTMLInputElement>(".practice-input")?.focus() }}
        >
          <div className="phase-track">
            {(["isolated", "words", "metronome"] as const).map((phase) => {
              const isActive = snap.currentPhase === phase
              let label = phase === "isolated" ? "Isolated" : phase === "words" ? "Words" : "Metronome"
              if (phase === "metronome" && isActive) {
                label += ` (${snap.metronomeSubPhase === "isolated" ? "Isolated" : "Words"})`
              }
              return (
                <span key={phase} className={`phase-pill ${isActive ? "is-active" : ""}`}>
                  {label}
                </span>
              )
            })}
          </div>

          {snap.feedbackTone === "failure" && snap.lastMeasuredIKI !== null && (
            <p className="prompt-iki" title="Inter-keystroke interval—the time between your keystrokes. You exceeded your target!">
              Missed: {snap.lastMeasuredIKI.toFixed(1)} ms
            </p>
          )}

          <div className="typed-display" aria-live="polite">
            {buildPromptDisplay()}
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
              <p className="shell-label">Current path</p>
              <p style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>
                {snap.metronomeCurrentIKI} ms {snap.autoSpeedUp ? "→" : "(fixed)"} {snap.targetIKI} ms
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
