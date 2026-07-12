import { orderedTrainingTargets } from './targets'

export const trainingPhases = ['isolated', 'words', 'metronome'] as const

export type TrainingPhase = (typeof trainingPhases)[number]

export type TrainingFeedbackTone = 'idle' | 'success' | 'failure'

export interface TrainingState {
  currentTarget: string
  currentPhase: TrainingPhase
  targetIKI: number
  metronomePhaseIKI: number
  metronomeRepsAtSpeed: number
  history: string[]
  currentTargetIndex: number
  isolatedSuccessStreak: number
  wordsCompleted: number
  practiceItems: string[]
  currentPrompt: string
  currentPromptIndex: number
  currentInput: string
  lastMeasuredIKI: number | null
  feedbackTone: TrainingFeedbackTone
  feedbackSequence: number
}

const initialTarget = orderedTrainingTargets[0]

const listeners = new Set<() => void>()

const createTrainingSnapshot = (state: TrainingState): TrainingState => ({
  ...state,
  history: [...state.history],
  practiceItems: [...state.practiceItems],
})

const METRONOME_INITIAL_MULTIPLIER = 6

export const trainingState: TrainingState = {
  currentTarget: initialTarget,
  currentPhase: 'isolated',
  targetIKI: 50,
  metronomePhaseIKI: 50 * METRONOME_INITIAL_MULTIPLIER,
  metronomeRepsAtSpeed: 0,
  history: [],
  currentTargetIndex: 0,
  isolatedSuccessStreak: 0,
  wordsCompleted: 0,
  practiceItems: [initialTarget],
  currentPrompt: initialTarget,
  currentPromptIndex: 0,
  currentInput: '',
  lastMeasuredIKI: null,
  feedbackTone: 'idle',
  feedbackSequence: 0,
}

let trainingSnapshot = createTrainingSnapshot(trainingState)

const emitTrainingState = () => {
  trainingSnapshot = createTrainingSnapshot(trainingState)
  listeners.forEach((listener) => listener())
}

export const subscribeTrainingState = (listener: () => void) => {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export const getTrainingStateSnapshot = () => trainingSnapshot

export const mutateTrainingState = <T,>(mutator: (state: TrainingState) => T) => {
  const result = mutator(trainingState)
  emitTrainingState()
  return result
}

export const setTargetIKI = (targetIKI: number) => {
  mutateTrainingState((state) => {
    state.targetIKI = targetIKI
  })
}

export const setMetronomePhaseIKI = (iki: number) => {
  mutateTrainingState((state) => {
    state.metronomePhaseIKI = Math.max(state.targetIKI, Math.min(1000, iki))
    state.metronomeRepsAtSpeed = 0
  })
}

export const setCurrentInput = (currentInput: string) => {
  mutateTrainingState((state) => {
    state.currentInput = currentInput
  })
}

export const resolvePromptTarget = (
  prompt: string,
  currentTarget: string,
  history: string[],
) => {
  const loweredPrompt = prompt.toLowerCase()
  const loweredCurrentTarget = currentTarget.toLowerCase()

  if (loweredPrompt.includes(loweredCurrentTarget)) {
    return currentTarget
  }

  const matchedHistoryTarget = [...history]
    .sort((left, right) => right.length - left.length)
    .find((historyTarget) => loweredPrompt.includes(historyTarget.toLowerCase()))

  return matchedHistoryTarget ?? currentTarget
}

export const setTrainingFeedback = (
  feedbackTone: Exclude<TrainingFeedbackTone, 'idle'>,
  lastMeasuredIKI: number,
) => {
  mutateTrainingState((state) => {
    state.feedbackTone = feedbackTone
    state.lastMeasuredIKI = lastMeasuredIKI
    state.feedbackSequence += 1
  })
}

export const clearTrainingFeedback = () => {
  mutateTrainingState((state) => {
    state.feedbackTone = 'idle'
  })
}