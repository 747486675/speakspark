import { reactive, watch } from 'vue'
import type { PersistentSettings } from '../types'
import { normalizeLibrary, type Library, normalizeCustomEntries, type LibraryEntry } from '../lib/library'
import { normalizeUrl } from '../lib/library'

const KEY_SPEECH = 'unprompted:speech'
const KEY_RESEARCH = 'unprompted:research'
const KEY_MUTED = 'unprompted:muted'
const KEY_LIBRARY = 'unprompted:library'
const KEY_RECENT = 'unprompted:recent'

export const SPEECH_MIN = 60
export const SPEECH_MAX = 600
export const RESEARCH_MIN = 60
export const RESEARCH_MAX = 3600
const RECENT_LIMIT = 5

const DEFAULT_SPEECH = 60
const DEFAULT_RESEARCH = 600

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage unavailable — ignore, settings just won't persist */
  }
}

function readSpeech(): number {
  const raw = safeGet(KEY_SPEECH)
  if (raw === null) return DEFAULT_SPEECH
  return clamp(Number.parseInt(raw, 10), SPEECH_MIN, SPEECH_MAX)
}

function readResearch(): number {
  const raw = safeGet(KEY_RESEARCH)
  if (raw === null) return DEFAULT_RESEARCH
  return clamp(Number.parseInt(raw, 10), RESEARCH_MIN, RESEARCH_MAX)
}

function readMuted(): boolean {
  return safeGet(KEY_MUTED) === 'true'
}

function readLibrary(): Library {
  const raw = safeGet(KEY_LIBRARY)
  if (raw === null) return normalizeLibrary(undefined)
  try {
    return normalizeLibrary(JSON.parse(raw))
  } catch {
    return normalizeLibrary(undefined)
  }
}

function readRecent(): string[] {
  const raw = safeGet(KEY_RECENT)
  if (raw === null) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : []
  } catch {
    return []
  }
}

export interface PersistentState {
  speechSeconds: number
  researchSeconds: number
  muted: boolean
  library: Library
  recentTopics: string[]
}

export function usePersistentSettings() {
  const settings = reactive<PersistentSettings>({
    speechSeconds: readSpeech(),
    researchSeconds: readResearch(),
    muted: readMuted(),
  })

  const library = reactive<Library>(readLibrary())
  const recentTopics = reactive<string[]>(readRecent())

  // Watchers for durations and mute flag — kept identical in shape to the
  // pre-existing settings so the original clamps continue to apply.
  watch(
    () => settings.speechSeconds,
    (v) => {
      const c = clamp(v, SPEECH_MIN, SPEECH_MAX)
      if (c !== v) settings.speechSeconds = c
      safeSet(KEY_SPEECH, String(c))
    },
  )

  watch(
    () => settings.researchSeconds,
    (v) => {
      const c = clamp(v, RESEARCH_MIN, RESEARCH_MAX)
      if (c !== v) settings.researchSeconds = c
      safeSet(KEY_RESEARCH, String(c))
    },
  )

  watch(() => settings.muted, (v) => safeSet(KEY_MUTED, String(v)))

  // Library 与 recent 写入时重新归一化（防止外部改了 state 写出脏数据）。
  watch(
    () => JSON.stringify(library),
    () => safeSet(KEY_LIBRARY, JSON.stringify(normalizeLibrary(library))),
  )

  watch(
    () => JSON.stringify(recentTopics),
    (snapshot) => {
      // 只在长度变化时落盘：单纯深 watch 写入会引发自循环。
      const parsed = JSON.parse(snapshot) as string[]
      safeSet(KEY_RECENT, JSON.stringify(parsed.slice(0, RECENT_LIMIT)))
    },
  )

  /** 添加一条最近抽到的题目，重复置顶，超过 RECENT_LIMIT 截断。 */
  function rememberTopic(topic: string) {
    if (!topic) return
    const next = [topic, ...recentTopics.filter((t) => t !== topic)].slice(0, RECENT_LIMIT)
    recentTopics.splice(0, recentTopics.length, ...next)
  }

  /** 在指定模式/分类下增加一条自定义题目，返回是否成功。 */
  function addEntry(
    mode: 'off-the-cuff' | 'deep-research',
    categoryId: string,
    title: string,
    url: string,
  ): { ok: boolean; message?: string } {
    const trimmed = title.trim()
    if (!trimmed) return { ok: false, message: '请输入条目内容' }
    if (mode === 'deep-research' && url.trim() && !normalizeUrl(url)) {
      return { ok: false, message: '请输入有效的网址' }
    }
    const target: LibraryEntry = { title: trimmed, url: mode === 'deep-research' ? normalizeUrl(url) : '' }
    if (mode === 'deep-research') {
      const current = normalizeCustomEntries(library.research, 'deep-research')
      if (current.some((e) => e.title.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) {
        return { ok: false, message: '已存在同名条目' }
      }
      library.research = [target, ...current]
    } else {
      const cat = library.impromptu[categoryId]
      const current = normalizeCustomEntries(cat, 'off-the-cuff')
      if (current.some((e) => e.title.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) {
        return { ok: false, message: '已存在同名条目' }
      }
      library.impromptu = { ...library.impromptu, [categoryId]: [target, ...current] }
    }
    return { ok: true }
  }

  /** 在指定模式/分类下删除一条自定义题目。 */
  function removeEntry(
    mode: 'off-the-cuff' | 'deep-research',
    categoryId: string,
    title: string,
  ) {
    const target = title.trim().toLocaleLowerCase()
    if (mode === 'deep-research') {
      library.research = normalizeCustomEntries(library.research, 'deep-research').filter(
        (e) => e.title.toLocaleLowerCase() !== target,
      )
    } else {
      const cat = normalizeCustomEntries(library.impromptu[categoryId], 'off-the-cuff')
      library.impromptu = { ...library.impromptu, [categoryId]: cat.filter((e) => e.title.toLocaleLowerCase() !== target) }
    }
  }

  return {
    settings,
    library,
    recentTopics,
    rememberTopic,
    addEntry,
    removeEntry,
  }
}

export { RECENT_LIMIT }
