import {
  resolvePromptTarget,
  setCurrentInput,
  setTrainingFeedback,
  trainingState,
} from './state'
import { advanceTrainingPhase } from './progression'

type KeystrokeResultHandler = (isSuccess: boolean, measuredIKI: number) => void

interface KeystrokeEngineState {
  targetTimestamps: number[]
}

const engineState: KeystrokeEngineState = {
  targetTimestamps: [],
}

const resetEngineState = () => {
  engineState.targetTimestamps = []
  setCurrentInput('')
}

const normalizeKey = (key: string) => key.toLowerCase()

const isModifierKeyEvent = (event: KeyboardEvent) =>
  event.altKey || event.ctrlKey || event.metaKey

const getTargetStartIndex = (prompt: string, target: string) => prompt.indexOf(target)

const isTargetCharacterIndex = (
  characterIndex: number,
  targetStartIndex: number,
  targetLength: number,
) =>
  characterIndex >= targetStartIndex &&
  characterIndex < targetStartIndex + targetLength

const getMeasuredIKI = (timestamps: number[], targetLength: number) => {
  if (targetLength === 2) {
    return timestamps[1] - timestamps[0]
  }

  return timestamps[2] - timestamps[1]
}

export const handleKeystrokeResult: KeystrokeResultHandler = (
  isSuccess,
  measuredIKI,
) => {
  advanceTrainingPhase(isSuccess)
  setTrainingFeedback(isSuccess ? 'success' : 'failure', measuredIKI)
  console.info('Keystroke result recorded', { isSuccess, measuredIKI })
}

export const processTargetKeystroke = (
  event: KeyboardEvent,
  onResult: KeystrokeResultHandler = handleKeystrokeResult,
) => {
  if (event.repeat || isModifierKeyEvent(event)) {
    return
  }

  const prompt = trainingState.currentPrompt.toLowerCase()
  const promptTarget = resolvePromptTarget(
    trainingState.currentPrompt,
    trainingState.currentTarget,
    trainingState.history,
  )
  const target = promptTarget.toLowerCase()
  const targetStartIndex = getTargetStartIndex(prompt, target)

  if (event.key === 'Backspace') {
    event.preventDefault()

    const nextInput = trainingState.currentInput.slice(0, -1)
    setCurrentInput(nextInput)

    if (targetStartIndex === -1) {
      engineState.targetTimestamps = []
      return
    }

    const typedTargetLength = Math.max(
      0,
      Math.min(nextInput.length - targetStartIndex, target.length),
    )
    engineState.targetTimestamps = engineState.targetTimestamps.slice(0, typedTargetLength)
    return
  }

  if (event.key === ' ') {
    event.preventDefault()

    const hasCompleteTargetMeasurement = engineState.targetTimestamps.length === target.length

    if (trainingState.currentInput === prompt && hasCompleteTargetMeasurement) {
      const measuredIKI = getMeasuredIKI(engineState.targetTimestamps, target.length)
      const effectiveTargetIKI =
        trainingState.currentPhase === 'metronome'
          ? trainingState.metronomePhaseIKI
          : trainingState.targetIKI
      const isSuccess = measuredIKI <= effectiveTargetIKI

      onResult(isSuccess, measuredIKI)
    }

    resetEngineState()
    return
  }

  if (event.key.length !== 1) {
    return
  }

  event.preventDefault()

  const key = normalizeKey(event.key)
  const nextInput = `${trainingState.currentInput}${key}`

  if (nextInput.length > prompt.length) {
    return
  }

  setCurrentInput(nextInput)

  if (!prompt.startsWith(nextInput) || targetStartIndex === -1) {
    return
  }

  const characterIndex = nextInput.length - 1

  if (isTargetCharacterIndex(characterIndex, targetStartIndex, target.length)) {
    engineState.targetTimestamps.push(performance.now())
  }
}