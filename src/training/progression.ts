import {
  mutateTrainingState,
  trainingState,
  type TrainingPhase,
  type TrainingState,
} from './state'
import { orderedTrainingTargets, targetWordBank } from './targets'

const ISOLATED_STREAK_REQUIRED = 5
const WORDS_REQUIRED = 10
const MIXED_REQUIRED = 10

const shuffleItems = <T,>(items: T[]) => {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }

  return shuffled
}

const getWordsForTarget = (target: string) => targetWordBank[target] ?? [target]

const buildMixedItems = (target: string, history: string[]) => {
  const currentTargetWords = getWordsForTarget(target)
  const mixedItems = [...currentTargetWords, ...history]

  return shuffleItems(mixedItems.length > 0 ? mixedItems : [target])
}

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

  state.practiceItems = buildMixedItems(state.currentTarget, state.history)
  setActivePrompt(state, 0)
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
  state.mixedCompleted = 0
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

const completeMixedPhase = (state: TrainingState) => {
  state.history.push(state.currentTarget)
  moveToNextTarget(state)
  state.currentPhase = 'isolated'
  resetPhaseProgress(state)
  syncPracticeItems(state, state.currentPhase)
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

      state.currentPhase = 'mixed'
      state.wordsCompleted = 0
      syncPracticeItems(state, state.currentPhase)
      return state.currentPhase
    }

    if (isSuccess) {
      state.mixedCompleted += 1
      advancePracticePrompt(state)
    }

    if (state.mixedCompleted < MIXED_REQUIRED) {
      return state.currentPhase
    }

    completeMixedPhase(state)
    return state.currentPhase
  })
}

syncPracticeItems(trainingState, trainingState.currentPhase)