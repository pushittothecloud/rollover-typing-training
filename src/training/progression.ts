import {
  mutateTrainingState,
  trainingState,
  type TrainingPhase,
  type TrainingState,
} from './state'
import { orderedTrainingTargets, targetWordBank } from './targets'

const ISOLATED_STREAK_REQUIRED = 5
const WORDS_REQUIRED = 10
const METRONOME_ISOLATED_REPS = 5
const METRONOME_WORDS_REPS = 10
const METRONOME_IKI_STEP = 25

export const PROGRESSION_CONSTANTS = {
  ISOLATED_STREAK_REQUIRED,
  WORDS_REQUIRED,
  METRONOME_ISOLATED_REPS,
  METRONOME_WORDS_REPS,
} as const

const getWordsForTarget = (target: string) => targetWordBank[target] ?? [target]

const isWordsPracticePhase = (state: TrainingState) =>
  state.currentPhase === 'words' ||
  (state.currentPhase === 'metronome' && state.metronomeSubPhase === 'words')

const buildParagraphPrompt = (focusWord: string, target: string) => {
  const companionWords = getWordsForTarget(target).filter((word) => word !== focusWord)
  const companionA = companionWords[0] ?? target
  const companionB = companionWords[1] ?? focusWord

  return [
    'we',
    'thread',
    focusWord,
    'through',
    'a',
    'calm',
    'drafting',
    'line',
    'then',
    'cycle',
    companionA,
    'and',
    companionB,
    'while',
    'keeping',
    target,
    'steady',
    'across',
    'the',
    'paragraph',
    'until',
    'timing',
    'feels',
    'automatic',
  ].join(' ')
}

const setActivePrompt = (state: TrainingState, promptIndex: number) => {
  const itemCount = state.practiceItems.length

  if (itemCount === 0) {
    state.currentPromptIndex = 0
    state.currentPrompt = state.currentTarget
    return
  }

  state.currentPromptIndex = promptIndex % itemCount

  const activeItem = state.practiceItems[state.currentPromptIndex]
  state.currentPrompt = isWordsPracticePhase(state)
    ? buildParagraphPrompt(activeItem, state.currentTarget)
    : activeItem
}

const syncPracticeItems = (state: TrainingState, phase: TrainingPhase) => {
  if (phase === 'isolated') {
    state.practiceItems = [state.currentTarget]
    setActivePrompt(state, 0)
    return
  }

  if (phase === 'words') {
    state.practiceItems = getWordsForTarget(state.currentTarget)
    setActivePrompt(state, 0)
    return
  }

  // metronome phase — check subphase
  if (state.metronomeSubPhase === 'isolated') {
    state.practiceItems = [state.currentTarget]
    setActivePrompt(state, 0)
    return
  }

  // metronome words
  state.practiceItems = getWordsForTarget(state.currentTarget)
  setActivePrompt(state, 0)
}

const advancePracticePrompt = (state: TrainingState) => {
  const isIsolatedPhase = state.currentPhase === 'isolated' ||
    (state.currentPhase === 'metronome' && state.metronomeSubPhase === 'isolated')

  if (isIsolatedPhase) {
    state.currentPrompt = state.currentTarget
    state.currentPromptIndex = 0
    return
  }

  setActivePrompt(state, state.currentPromptIndex + 1)
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
  state.metronomeSubPhase = 'isolated'
  state.metronomeRepsAtSpeed = 0
  state.metronomeWordsCompleted = 0
  state.metronomeCurrentIKI = state.metronomeStartIKI
  syncPracticeItems(state, 'metronome')
}

export const advanceTrainingPhase = (isSuccess: boolean) => {
  return mutateTrainingState((state) => {
    if (state.currentPhase === 'isolated') {
      state.isolatedSuccessStreak = isSuccess ? state.isolatedSuccessStreak + 1 : 0

      if (state.isolatedSuccessStreak < ISOLATED_STREAK_REQUIRED) {
        return state.currentPhase
      }

      state.currentPhase = 'words'
      state.isolatedSuccessStreak = 0
      syncPracticeItems(state, 'words')
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
    if (state.metronomeSubPhase === 'isolated') {
      if (isSuccess) {
        state.metronomeRepsAtSpeed += 1
      } else {
        state.metronomeRepsAtSpeed = 0
      }

      if (state.metronomeRepsAtSpeed < METRONOME_ISOLATED_REPS) {
        return state.currentPhase
      }

      // Move to metronome words
      state.metronomeSubPhase = 'words'
      state.metronomeRepsAtSpeed = 0
      state.metronomeWordsCompleted = 0
      syncPracticeItems(state, 'metronome')
      return state.currentPhase
    }

    // metronome words phase
    if (isSuccess) {
      state.metronomeWordsCompleted += 1
      advancePracticePrompt(state)
    }

    if (state.metronomeWordsCompleted < METRONOME_WORDS_REPS) {
      return state.currentPhase
    }

    // Completed metronome words — check if we should speed up or finish target
    if (state.metronomeCurrentIKI <= state.targetIKI) {
      // Hit target speed — move to next target
      state.history.push(state.currentTarget)
      moveToNextTarget(state)
      state.currentPhase = 'isolated'
      state.isolatedSuccessStreak = 0
      state.wordsCompleted = 0
      state.metronomeRepsAtSpeed = 0
      state.metronomeWordsCompleted = 0
      syncPracticeItems(state, 'isolated')
      return state.currentPhase
    }

    // Still above target speed
    if (state.autoSpeedUp) {
      // Speed up and loop back to metronome/isolated
      state.metronomeCurrentIKI = Math.max(
        state.targetIKI,
        state.metronomeCurrentIKI - METRONOME_IKI_STEP,
      )
      state.metronomeSubPhase = 'isolated'
      state.metronomeRepsAtSpeed = 0
      state.metronomeWordsCompleted = 0
      syncPracticeItems(state, 'metronome')
    } else {
      // Fixed tempo — loop back to metronome/isolated
      state.metronomeSubPhase = 'isolated'
      state.metronomeRepsAtSpeed = 0
      state.metronomeWordsCompleted = 0
      syncPracticeItems(state, 'metronome')
    }

    return state.currentPhase
  })
}

syncPracticeItems(trainingState, trainingState.currentPhase)