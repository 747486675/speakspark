export type PracticeMode = 'off-the-cuff' | 'deep-research'

export type TimerPhase = 'idle' | 'research' | 'ready' | 'speech' | 'done'

export interface TopicCategory {
  id: string
  label: string
  emoji: string
  topics: string[]
}

export interface LibraryEntry {
  title: string
  url: string
}

export interface Library {
  version: number
  impromptu: Record<string, LibraryEntry[]>
  research: LibraryEntry[]
}

export interface AppState {
  mode: PracticeMode
  categoryId: string
  displayedTopic: string
  selectedTopic: string | null
  isSpinning: boolean
  timerPhase: TimerPhase
  secondsLeft: number
  speechSeconds: number
  researchSeconds: number
  muted: boolean
  settingsOpen: boolean
  /** 最近一次闪进的入场动画时长（毫秒），落定后由收尾动画接管。 */
  tickMs: number
  /** 当前显示话题自上次入场以来的版本号，用于触发 :key 重渲染。 */
  topicRevision: number
  /** 抽题开始时已经选好的最终题目（落点），用于安全收尾。 */
  pendingLanding: string | null
}

export interface PersistentSettings {
  speechSeconds: number
  researchSeconds: number
  muted: boolean
}
