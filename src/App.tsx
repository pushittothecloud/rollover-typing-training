import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import './App.css'
import { processTargetKeystroke } from './training/keystrokeEngine'
import { orderedTrainingTargets, targetWordBank } from './training/targets'
import {
  clearTrainingFeedback,
  getTrainingStateSnapshot,
  resolvePromptTarget,
  setTargetIKI,
  subscribeTrainingState,
} from './training/state'

const clampTargetIKI = (value: number) => Math.min(200, Math.max(20, value))

const getRotatedItems = (items: string[], activeIndex: number) => {
  if (items.length === 0) {
    return []
  }

  return [...items.slice(activeIndex), ...items.slice(0, activeIndex)]
}

const buildPreviewItems = (
  practiceItems: string[],
  activeIndex: number,
  currentTargetIndex: number,
  currentPhase: string,
  isolatedSuccessStreak: number,
) => {
  const previewItems: Array<{ item: string; state: 'active' | 'upcoming' }> = []
  const rotatedPracticeItems = getRotatedItems(practiceItems, activeIndex)

  if (currentPhase === 'isolated') {
    const isolatedRepeats = Math.max(1, 5 - isolatedSuccessStreak)

    for (let count = 0; count < isolatedRepeats; count += 1) {
      previewItems.push({
        item: rotatedPracticeItems[0] ?? orderedTrainingTargets[currentTargetIndex],
        state: count === 0 ? 'active' : 'upcoming',
      })
    }
  } else {
    rotatedPracticeItems.forEach((item, index) => {
      previewItems.push({
        item,
        state: index === 0 ? 'active' : 'upcoming',
      })
    })
  }

  let targetOffset = 0

  while (previewItems.length < 28 && targetOffset < orderedTrainingTargets.length) {
    const targetIndex = (currentTargetIndex + targetOffset) % orderedTrainingTargets.length
    const target = orderedTrainingTargets[targetIndex]
    const words = targetWordBank[target] ?? [target]

    words.forEach((word) => {
      if (previewItems.length >= 28) {
        return
      }

      const alreadyCoveredCurrentTarget =
        targetOffset === 0 && currentPhase !== 'isolated' && rotatedPracticeItems.includes(word)

      if (!alreadyCoveredCurrentTarget) {
        previewItems.push({ item: word, state: 'upcoming' })
      }
    })

    targetOffset += 1
  }

  return previewItems
}

const splitPromptByTarget = (prompt: string, target: string) => {
  const targetStartIndex = prompt.toLowerCase().indexOf(target.toLowerCase())

  if (targetStartIndex === -1) {
    return {
      before: '',
      focus: prompt,
      after: '',
    }
  }

  return {
    before: prompt.slice(0, targetStartIndex),
    focus: prompt.slice(targetStartIndex, targetStartIndex + target.length),
    after: prompt.slice(targetStartIndex + target.length),
  }
}

function App() {
  const trainingState = useSyncExternalStore(
    subscribeTrainingState,
    getTrainingStateSnapshot,
  )
  const [flashTone, setFlashTone] = useState<'idle' | 'success' | 'failure'>('idle')
  const practiceInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    practiceInputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (trainingState.feedbackSequence === 0) {
      return
    }

    setFlashTone(trainingState.feedbackTone)

    const timeoutId = window.setTimeout(() => {
      setFlashTone('idle')
      clearTrainingFeedback()
    }, 280)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [trainingState.feedbackSequence, trainingState.feedbackTone])

  const handleTargetIKIChange = (value: string) => {
    const parsedValue = Number.parseInt(value, 10)

    if (Number.isNaN(parsedValue)) {
      return
    }

    setTargetIKI(clampTargetIKI(parsedValue))
  }

  const completionCount =
    trainingState.currentPhase === 'isolated'
      ? trainingState.isolatedSuccessStreak
      : trainingState.currentPhase === 'words'
        ? trainingState.wordsCompleted
        : trainingState.mixedCompleted

  const completionGoal =
    trainingState.currentPhase === 'isolated'
      ? 5
      : 10

  const measuredIKIText =
    trainingState.lastMeasuredIKI === null
      ? 'Awaiting first completed attempt'
      : `${trainingState.lastMeasuredIKI.toFixed(1)} ms`

  const previewItems = buildPreviewItems(
    trainingState.practiceItems,
    trainingState.currentPromptIndex,
    trainingState.currentTargetIndex,
    trainingState.currentPhase,
    trainingState.isolatedSuccessStreak,
  )

  const activePrompt = trainingState.currentPrompt
  const activePromptTarget = resolvePromptTarget(
    trainingState.currentPrompt,
    trainingState.currentTarget,
    trainingState.history,
  )
  const promptParts = splitPromptByTarget(activePrompt, activePromptTarget)

  return (
    <div className={`typing-trainer-shell is-${flashTone}`}>
      <header className="shell-header">
        <p className="shell-eyebrow">Typing Trainer</p>
        <h1>Bigram and trigram timing loop</h1>
        <p className="shell-copy">
          Type the full prompt, then press space to submit. The engine measures only
          the bigram or trigram inside the prompt against your current IKI goal.
        </p>
      </header>

      <main className="shell-main" aria-label="Typing trainer">
        <section className="shell-panel shell-controls">
          <div>
            <p className="shell-label">Target IKI</p>
            <h2>{trainingState.targetIKI} ms</h2>
          </div>

          <label className="iki-control" htmlFor="target-iki-range">
            <span>Adjust goal</span>
            <input
              id="target-iki-range"
              type="range"
              min="20"
              max="200"
              step="5"
              value={trainingState.targetIKI}
              onChange={(event) => handleTargetIKIChange(event.target.value)}
            />
          </label>

          <label className="iki-number" htmlFor="target-iki-number">
            <span>Exact value</span>
            <input
              id="target-iki-number"
              type="number"
              min="20"
              max="200"
              step="1"
              value={trainingState.targetIKI}
              onChange={(event) => handleTargetIKIChange(event.target.value)}
            />
          </label>
        </section>

        <section
          className={`shell-panel prompt-panel prompt-${flashTone}`}
          onClick={(event) => {
            event.currentTarget.querySelector<HTMLInputElement>('.practice-input')?.focus()
          }}
        >
          <p className="shell-label">Current prompt</p>
          <p className="phase-pill">{trainingState.currentPhase}</p>
          <div className="practice-strip" aria-label="Upcoming practice items">
            {previewItems.map(({ item, state }, index) => (
              <span key={`${item}-${index}`} className={`practice-chip is-${state}`}>
                {item}
              </span>
            ))}
          </div>
          <div className="prompt-display" aria-live="polite">
            <span className="prompt-fragment prompt-context">{promptParts.before}</span>
            <span className="prompt-fragment prompt-focus-target">{promptParts.focus}</span>
            <span className="prompt-fragment prompt-context">{promptParts.after}</span>
          </div>
          <p className="prompt-target">Focus target: {activePromptTarget}</p>
          <p className="prompt-iki">Measured IKI: {measuredIKIText}</p>
          <div className="typed-display" aria-live="polite">
            {trainingState.currentInput || 'Start typing here'}
          </div>
          <p className="prompt-hint">
            {trainingState.currentPhase === 'isolated'
              ? 'Type the target and press space to submit each rep.'
              : 'Type the full word, but only the highlighted target is timed.'}
          </p>
          <p className="prompt-focus">This panel is live. Click here, type, then press space.</p>
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
            placeholder="Type here"
            value={trainingState.currentInput}
            onKeyDown={(event) => {
              processTargetKeystroke(event.nativeEvent)
            }}
            onChange={() => {}}
          />
        </section>

        <section className="shell-panel shell-stats">
          <div>
            <p className="shell-label">Phase progress</p>
            <h2>
              {completionCount} / {completionGoal}
            </h2>
          </div>
          <p>
            History depth: <strong>{trainingState.history.length}</strong>
          </p>
          <p>
            Queue position: <strong>{trainingState.currentTargetIndex + 1}</strong>
          </p>
        </section>
      </main>
    </div>
  )
}

export default App
