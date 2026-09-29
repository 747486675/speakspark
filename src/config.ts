/**
 * Central brand/config. Swap these values to rebrand the whole app. The product
 * mechanics and topic bank live elsewhere; this file only holds naming and
 * copy that the spec says should be easy to replace.
 */
export const brand = {
  name: 'SpeakSpark',
  tagline: '临场应变，脱口而出。',
  // Optional author/source link. Leave empty to hide.
  authorLabel: '',
  authorUrl: '',
} as const

export const modeCopy = {
  'off-the-cuff': {
    label: '即兴开讲',
    emoji: '🧠',
    description: '几乎不准备，练习临场快速思考。',
  },
  'deep-research': {
    label: '深度准备',
    emoji: '🔍',
    description:
      '抽取话题，设定准备计时，准备好后再开始演讲计时。',
  },
} as const
