import type { LensKey } from '../state/appStore'

type LensMeta = {
  title: string
  prompt: string
  tintClass: string
}

export const scamperPrompts: Record<LensKey, LensMeta> = {
  S: {
    title: 'Substitute',
    prompt:
      'Replace one assumption in your previous sentence with a radically different one. What new path opens?',
    tintClass: 'bg-amber-900/10',
  },
  C: {
    title: 'Combine',
    prompt:
      'Fuse your current claim with one detached textlet. Draft a sentence where both ideas must coexist.',
    tintClass: 'bg-sky-900/10',
  },
  A: {
    title: 'Adapt',
    prompt:
      'Borrow a structure from another domain (music, architecture, ecology) and adapt your argument to it.',
    tintClass: 'bg-emerald-900/10',
  },
  M: {
    title: 'Modify',
    prompt:
      'Stretch one key phrase: intensify, soften, or reorder it until the meaning shifts.',
    tintClass: 'bg-rose-900/10',
  },
  P: {
    title: 'Put to Another Use',
    prompt:
      'Treat your evidence as if it served a different purpose. What argument emerges from that reuse?',
    tintClass: 'bg-orange-900/10',
  },
  E: {
    title: 'Eliminate',
    prompt:
      'Delete one comforting sentence. Continue writing without that support and see what remains essential.',
    tintClass: 'bg-zinc-900/10',
  },
  R: {
    title: 'Reverse',
    prompt:
      'Assume the opposite of your latest statement. Write the strongest possible case for the reversal.',
    tintClass: 'bg-indigo-900/10',
  },
}
