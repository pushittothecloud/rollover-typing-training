import {
  mutateTrainingState,
  trainingState,
  type TrainingPhase,
  type TrainingState,
} from './state'
import { orderedTrainingTargets, targetWordBank } from './targets'

const ISOLATED_STREAK_REQUIRED = 5
const WORDS_REQUIRED = 10
const METRONOME_REPS_PER_STEP = 5
const METRONOME_IKI_STEP = 25
const METRONOME_INITIAL_MULTIPLIER = 6

export const PROGRESSION_CONSTANTS = {
  ISOLATED_STREAK_REQUIRED,
  WORDS_REQUIRED,
  METRONOME_REPS_PER_STEP,
} as const

const getWordsForTarget = (target: string) => targetWordBank[target] ?? [target]

const setActivePrompt = (state: TrainingState, promptIndex: number) => {
  const itemCount = state.practiceItems.length

  if (itemCount === 0) {
    state.currentPromptIndex = 0
    state.currentPrompt = state.currentTarget
    return
  }

  state.currentPromptIndex = promptIndex % itemCount
  state.currentPrompt = state.practiceItems[state.currentPromptIndex]
}

const syncPracticeItems = (state: TrainingState, phase: TrainingPhase) => {
  if (phase === 'isolated' || phase === 'metronome') {
    state.practiceItems = [state.currentTarget]
    setActivePrompt(state, 0)
    return
  }

  if (phase === 'words') {
    state.practiceItems = getWordsForTarget(state.currentTarget)
    setActivePrompt(state, 0)
    return
  }
}

const advancePracticePrompt = (state: TrainingState) => {
  if (state.currentPhase === 'isolated') {
    state.currentPrompt = state.currentTarget
    state.currentPromptIndex = 0
    return
  }

  setActivePrompt(state, state.currentPromptIndex + 1)
}

const resetPhaseProgress = (state: TrainingState) => {
  state.isolatedSuccessStreak = 0
  state.wordsCompleted = 0
  state.metronomeRepsAtSpeed = 0
}

const moveToNextTarget = (state: TrainingState) => {
  const nextIndex = state.currentTargetIndex + 1

  if (nextIndex >= orderedTrainingTargets.length) {
    state.currentTargetIndex = 0
    state.currentTarget = orderedTrainingTargets[0]
    return
  }

  state.currentTargetIndex = nextIndex
  state.currentTarget = orderedTrainingTargets[nextIndex]
}

const enterMetronomePhase = (state: TrainingState) => {
  state.currentPhase = 'metronome'
  state.wordsCompleted = 0
  state.metronomePhaseIKI = state.targetIKI * METRONOME_INITIAL_MULTIPLIER
  state.metronomeRepsAtSpeed = 0
  syncPracticeItems(state, 'metronome')
}

export const advanceTrainingPhase = (isSuccess: boolean) => {
  return mutateTrainingState((state) => {
    if (state.currentPhase === 'isolated') {
      state.isolatedSuccessStreak = isSuccess ? state.isolatedSuccessStreak + 1 : 0

      if (state.isolatedSuccessStreak < ISOLATED_STREAK_REQUIRED) {
        syncPracticeItems(state, state.currentPhase)
        return state.currentPhase
      }

      state.currentPhase = 'words'
      state.isolatedSuccessStreak = 0
      syncPracticeItems(state, state.currentPhase)
      return state.currentPhase
    }

    if (state.currentPhase === 'words') {
      if (isSuccess) {
        state.wordsCompleted += 1
        advancePracticePrompt(state)
      }

      if (state.wordsCompleted < WORDS_REQUIRED) {
        return state.currentPhase
      }

      enterMetronomePhase(state)
      return state.currentPhase
    }

    // metronome phase
    if (isSuccess) {
      state.metronomeRepsAtSpeed += 1
    } else {
      state.metronomeRepsAtSpeed = 0
    }

    if (state.metronomeRepsAtSpeed < METRONOME_REPS_PER_STEP) {
      return state.currentPhase
    }

    state.metronomeRepsAtSpeed = 0

    if (state.metronomePhaseIKI <= state.targetIKI) {
      // Completed at target speed — advance to next target
      state.history.push(state.currentTarget)
      moveToNextTarget(state)
      state.currentPhase = 'isolated'
      resetPhaseProgress(state)
      syncPracticeItems(state, 'isolated')
      return state.currentPhase
    }

    // Speed up the metronome
    state.metronomePhaseIKI = Math.max(
      state.targetIKI,
      state.metronomePhaseIKI - METRONOME_IKI_STEP,
    )
    return state.currentPhase
  })
}

syncPracticeItems(trainingState, trainingState.currentPhase)