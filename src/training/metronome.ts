/**
 * Web Audio API metronome for bigram/trigram timing training.
 * Uses a look-ahead scheduler to keep the click timing precise
 * regardless of JS event loop jitter.
 */

const LOOK_AHEAD_MS = 80
const SCHEDULER_INTERVAL_MS = 20

let audioCtx: AudioContext | null = null
let schedulerHandle: ReturnType<typeof setInterval> | null = null
let visualHandle: ReturnType<typeof setInterval> | null = null
let nextClickTime = 0
let currentIntervalMs = 300
let onBeatCallback: (() => void) | null = null

const getAudioCtx = (): AudioContext => {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

const scheduleClick = (time: number) => {
  const ctx = getAudioCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.value = 1100
  gain.gain.setValueAtTime(0, time)
  gain.gain.linearRampToValueAtTime(0.35, time + 0.003)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045)
  osc.start(time)
  osc.stop(time + 0.05)
}

const runScheduler = () => {
  const ctx = getAudioCtx()
  const lookAheadSec = LOOK_AHEAD_MS / 1000

  while (nextClickTime < ctx.currentTime + lookAheadSec) {
    scheduleClick(nextClickTime)
    nextClickTime += currentIntervalMs / 1000
  }
}

export const startMetronome = (intervalMs: number, onBeat?: () => void) => {
  onBeatCallback = onBeat ?? null
  currentIntervalMs = intervalMs

  const ctx = getAudioCtx()
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }

  nextClickTime = ctx.currentTime + 0.05

  if (schedulerHandle !== null) {
    clearInterval(schedulerHandle)
  }
  schedulerHandle = setInterval(runScheduler, SCHEDULER_INTERVAL_MS)

  // Visual beat — kept in sync with audio interval
  if (visualHandle !== null) {
    clearInterval(visualHandle)
  }
  if (onBeatCallback) {
    const cb = () => onBeatCallback?.()
    cb() // fire immediately
    visualHandle = setInterval(cb, intervalMs)
  }
}

export const stopMetronome = () => {
  if (schedulerHandle !== null) {
    clearInterval(schedulerHandle)
    schedulerHandle = null
  }
  if (visualHandle !== null) {
    clearInterval(visualHandle)
    visualHandle = null
  }
  onBeatCallback = null
}

/** Update interval mid-play without stopping. Visual re-syncs on next beat. */
export const updateMetronomeInterval = (intervalMs: number) => {
  currentIntervalMs = intervalMs
  // Restart visual interval at new speed
  if (visualHandle !== null) {
    clearInterval(visualHandle)
    if (onBeatCallback) {
      const cb = () => onBeatCallback?.()
      visualHandle = setInterval(cb, intervalMs)
    }
  }
}
