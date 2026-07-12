export const coreBigrams = [
  'th',
  'he',
  'in',
  'en',
  'nt',
  're',
  'er',
  'an',
  'on',
  'at',
  'nd',
  'ed',
] as const

export const coreTrigrams = [
  'the',
  'and',
  'tha',
  'ent',
  'ing',
  'ion',
  'for',
] as const

export const typingTargets = {
  coreBigrams,
  coreTrigrams,
} as const

export const targetWordBank: Record<string, string[]> = {
  th: ['thin', 'that', 'then', 'path', 'moth'],
  the: ['then', 'them', 'they', 'other', 'there'],
  tha: ['that', 'thank', 'thane', 'thaw', 'lethal'],
  he: ['help', 'when', 'hero', 'theme', 'wheat'],
  in: ['into', 'mint', 'final', 'single', 'index'],
  en: ['enter', 'tender', 'engine', 'dense', 'energy'],
  nt: ['until', 'entry', 'gentle', 'winter', 'paint'],
  re: ['ready', 'green', 'break', 'credit', 'return'],
  er: ['term', 'serve', 'verse', 'merit', 'herd'],
  an: ['angle', 'stand', 'planet', 'answer', 'candle'],
  on: ['only', 'stone', 'honey', 'front', 'beyond'],
  at: ['atlas', 'later', 'metal', 'water', 'static'],
  nd: ['under', 'cinder', 'window', 'wander', 'ending'],
  ed: ['edit', 'faded', 'credit', 'garden', 'ended'],
  and: ['and', 'candy', 'handle', 'wander', 'bandit'],
  ent: ['enter', 'gentle', 'rental', 'silent', 'center'],
  ing: ['sing', 'bring', 'tinge', 'finger', 'swing'],
  ion: ['lion', 'motion', 'fiction', 'pioneer', 'fusion'],
  for: ['forest', 'before', 'forget', 'format', 'comfort'],
}

const prioritizedTrigrams = ['the', 'tha'] as const

export const orderedTrainingTargets = [
  ...coreBigrams,
  ...prioritizedTrigrams,
  ...coreTrigrams.filter(
    (target) => !prioritizedTrigrams.includes(target as 'the' | 'tha'),
  ),
] as const