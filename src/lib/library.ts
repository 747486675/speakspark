/**
 * 题库模型：每个分类存完整条目列表（用户自定义的会与内置合并后保存），
 * 切换分类/模式时取回对应列表。版本号用来做老格式迁移。
 */

import { categories, getCategory, offTheCuffCategories } from '../data/topics'

export type PracticeMode = 'off-the-cuff' | 'deep-research'

export interface LibraryEntry {
  title: string
  url: string
}

export interface Library {
  version: number
  impromptu: Record<string, LibraryEntry[]>
  research: LibraryEntry[]
}

export const LIBRARY_VERSION = 2

/** 库的总条目上限，防止单分类无限膨胀拖慢首屏。 */
export const LIBRARY_ENTRY_LIMIT = 100

function createDefaultImpromptuLibrary(): Record<string, LibraryEntry[]> {
  return Object.fromEntries(
    offTheCuffCategories.map((category) => [
      category.id,
      normalizeCustomEntries(category.topics, 'off-the-cuff'),
    ]),
  )
}

/**
 * 把任意来源的数据归一化成当前版本的库。
 * 旧版只保存用户追加项，这里把它们合并到内置题库中完成迁移。
 */
export function normalizeLibrary(value: unknown): Library {
  const defaults = createDefaultImpromptuLibrary()
  if (isLibraryV2(value)) {
    return {
      version: LIBRARY_VERSION,
      impromptu: Object.fromEntries(
        offTheCuffCategories.map((category) => [
          category.id,
          normalizeCustomEntries(value.impromptu?.[category.id], 'off-the-cuff'),
        ]),
      ),
      research: normalizeCustomEntries(value.research, 'deep-research'),
    }
  }

  const legacy = normalizeCustomCollections(value)
  const general = offTheCuffCategories[0]
  if (general) {
    defaults[general.id] = normalizeCustomEntries(
      [...legacy['off-the-cuff'], ...defaults[general.id]],
      'off-the-cuff',
    )
  }
  const deepResearch = categories.find((c) => c.id === 'deep-research')
  return {
    version: LIBRARY_VERSION,
    impromptu: defaults,
    research: normalizeCustomEntries(
      [...legacy['deep-research'], ...(deepResearch?.topics ?? [])],
      'deep-research',
    ),
  }
}

function isLibraryV2(value: unknown): value is Library {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<Library>
  return v.version === LIBRARY_VERSION && typeof v.impromptu === 'object' && Array.isArray(v.research)
}

export function getLibraryEntries(
  library: Library,
  mode: PracticeMode,
  categoryId: string,
): LibraryEntry[] {
  const normalized = normalizeLibrary(library)
  if (mode === 'deep-research') return normalized.research
  const validCategoryId = offTheCuffCategories.some((c) => c.id === categoryId)
    ? categoryId
    : offTheCuffCategories[0]?.id ?? 'general'
  return normalized.impromptu[validCategoryId] ?? []
}

/**
 * 把任意形态的输入归一化成 LibraryEntry 数组。
 * 接受 string[] 或 { title, url }[]；同一标题忽略；超长截断；URL 协议校验。
 */
export function normalizeCustomEntries(
  value: unknown,
  mode: PracticeMode,
  limit: number = LIBRARY_ENTRY_LIMIT,
): LibraryEntry[] {
  if (!Array.isArray(value)) return []
  const normalizedMode: PracticeMode = mode === 'deep-research' ? 'deep-research' : 'off-the-cuff'
  const seen = new Set<string>()
  const entries: LibraryEntry[] = []
  const max = Math.max(1, Math.round(Number(limit) || LIBRARY_ENTRY_LIMIT))
  for (const item of value) {
    const source: { title?: unknown; url?: unknown } =
      typeof item === 'string' ? { title: item } : (item as { title?: unknown; url?: unknown })
    if (!source || typeof source.title !== 'string' || !source.title.trim()) continue
    const title = source.title.trim()
    const key = title.toLocaleLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    entries.push({
      title,
      url: normalizedMode === 'deep-research' ? normalizeUrl(source.url) : '',
    })
    if (entries.length >= max) break
  }
  return entries
}

export function normalizeCustomCollections(value: unknown): Record<PracticeMode, LibraryEntry[]> {
  const v = (value ?? {}) as Record<string, unknown>
  return {
    'off-the-cuff': normalizeCustomEntries(v['off-the-cuff'], 'off-the-cuff'),
    'deep-research': normalizeCustomEntries(v['deep-research'], 'deep-research'),
  }
}

/**
 * 新增一条自定义条目。新条目放首位；同名旧条目被踢出。
 * 返回的是新数组（不可变风格），不会修改原 entries。
 */
export function addCustomEntry(
  entries: readonly LibraryEntry[],
  rawEntry: { title: string; url?: string },
  mode: PracticeMode,
  limit: number = LIBRARY_ENTRY_LIMIT,
): LibraryEntry[] {
  const next = normalizeCustomEntries([rawEntry], mode, 1)[0]
  const current = normalizeCustomEntries(entries, mode, limit)
  if (!next) return current
  return [
    next,
    ...current.filter((item) => item.title.toLocaleLowerCase() !== next.title.toLocaleLowerCase()),
  ].slice(0, Math.max(1, Math.round(Number(limit) || LIBRARY_ENTRY_LIMIT)))
}

export function removeCustomEntry(
  entries: readonly LibraryEntry[],
  title: string,
  mode: PracticeMode,
): LibraryEntry[] {
  const target = typeof title === 'string' ? title.trim().toLocaleLowerCase() : ''
  return normalizeCustomEntries(entries, mode).filter(
    (item) => item.title.toLocaleLowerCase() !== target,
  )
}

/** 给定 topic 名，从 research 条目里查对应的 URL（深研模式才用得到）。 */
export function getTopicUrl(topic: string, researchEntries: readonly LibraryEntry[]): string {
  if (typeof topic !== 'string') return ''
  return normalizeCustomEntries(researchEntries, 'deep-research').find(
    (item) => item.title === topic,
  )?.url ?? ''
}

/**
 * 规范化 URL：自动补全协议头；非 http(s) 或解析失败一律视为空。
 */
export function normalizeUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return ''
  const raw = value.trim()
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const parsed = new URL(candidate)
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) return ''
    return candidate
  } catch {
    return ''
  }
}

/**
 * 经典动作：给定分类 ID 与模式，返回「内置 + 用户自定义」去重后的全部 topic 字符串。
 * 这是 ActionBar 抽题时真正用的列表。
 */
export function getActiveTopics(
  mode: PracticeMode,
  categoryId: string,
  customEntries: readonly LibraryEntry[] = [],
): string[] {
  const customTitles = normalizeCustomEntries(customEntries, mode).map((item) => item.title)
  const builtIn =
    mode === 'deep-research'
      ? (getCategory('deep-research')?.topics ?? [])
      : (getCategory(categoryId)?.topics ?? [])
  return [...new Set([...builtIn, ...customTitles])]
}
