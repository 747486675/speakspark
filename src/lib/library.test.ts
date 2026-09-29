import { describe, it, expect } from 'vitest'
import {
  addCustomEntry,
  getActiveTopics,
  getLibraryEntries,
  getTopicUrl,
  LIBRARY_ENTRY_LIMIT,
  LIBRARY_VERSION,
  normalizeCustomCollections,
  normalizeCustomEntries,
  normalizeLibrary,
  normalizeUrl,
  removeCustomEntry,
} from './library'
import { offTheCuffCategories } from '../data/topics'

describe('normalizeUrl', () => {
  it('自动补全 https://', () => {
    expect(normalizeUrl('example.com/article')).toBe('https://example.com/article')
  })

  it('保留已有协议', () => {
    expect(normalizeUrl('http://example.com/a')).toBe('http://example.com/a')
  })

  it('裁掉首尾空白', () => {
    expect(normalizeUrl('  https://openai.com/a  ')).toBe('https://openai.com/a')
  })

  it('非 http(s) 协议返回空', () => {
    expect(normalizeUrl('javascript:alert(1)')).toBe('')
    expect(normalizeUrl('ftp://example.com')).toBe('')
  })

  it('解析失败返回空', () => {
    expect(normalizeUrl('://bad')).toBe('')
  })

  it('空/非字符串返回空', () => {
    expect(normalizeUrl('')).toBe('')
    expect(normalizeUrl(null)).toBe('')
    expect(normalizeUrl(undefined)).toBe('')
    expect(normalizeUrl(123)).toBe('')
  })
})

describe('normalizeCustomEntries', () => {
  it('接受字符串数组', () => {
    expect(normalizeCustomEntries(['A', 'B'], 'off-the-cuff')).toEqual([
      { title: 'A', url: '' },
      { title: 'B', url: '' },
    ])
  })

  it('接受 {title,url} 数组', () => {
    const out = normalizeCustomEntries(
      [{ title: 'AI', url: 'https://example.com' }, { title: 'A', url: 'bad' }],
      'deep-research',
    )
    expect(out[0]).toEqual({ title: 'AI', url: 'https://example.com' })
  })

  it('去重（大小写不敏感）', () => {
    expect(normalizeCustomEntries(['A', ' a ', 'A'], 'off-the-cuff').map((e) => e.title)).toEqual([
      'A',
    ])
  })

  it('非 deep-research 模式强制清空 url', () => {
    const out = normalizeCustomEntries(
      [{ title: 'A', url: 'https://example.com' }],
      'off-the-cuff',
    )
    expect(out[0].url).toBe('')
  })

  it('超过 limit 截断', () => {
    const out = normalizeCustomEntries(
      Array.from({ length: 50 }, (_, i) => `T${i}`),
      'off-the-cuff',
      10,
    )
    expect(out).toHaveLength(10)
  })

  it('非数组/空值返回空数组', () => {
    expect(normalizeCustomEntries(null, 'off-the-cuff')).toEqual([])
    expect(normalizeCustomEntries(undefined, 'off-the-cuff')).toEqual([])
  })
})

describe('normalizeCustomCollections', () => {
  it('缺失某模式时返回空数组', () => {
    expect(normalizeCustomCollections({})).toEqual({
      'off-the-cuff': [],
      'deep-research': [],
    })
  })
  it('双模式都归一化', () => {
    const out = normalizeCustomCollections({
      'off-the-cuff': ['A'],
      'deep-research': [{ title: 'B', url: 'https://x.com' }],
    })
    expect(out['off-the-cuff']).toEqual([{ title: 'A', url: '' }])
    expect(out['deep-research'][0].url).toBe('https://x.com')
  })
})

describe('addCustomEntry', () => {
  it('新条目放首位', () => {
    const next = addCustomEntry([{ title: 'A', url: '' }], { title: 'B' }, 'off-the-cuff')
    expect(next.map((e) => e.title)).toEqual(['B', 'A'])
  })
  it('同名去重后仍置顶', () => {
    const next = addCustomEntry(
      [{ title: 'A', url: '' }],
      { title: 'A' },
      'off-the-cuff',
    )
    expect(next.map((e) => e.title)).toEqual(['A'])
  })
  it('空标题/全空白返回原列表', () => {
    const base = [{ title: 'A', url: '' }]
    expect(addCustomEntry(base, { title: '   ' }, 'off-the-cuff')).toEqual(base)
  })
  it('超过 limit 截断', () => {
    const big = Array.from({ length: 20 }, (_, i) => ({ title: `T${i}`, url: '' }))
    const next = addCustomEntry(big, { title: 'NEW' }, 'off-the-cuff', 5)
    expect(next).toHaveLength(5)
    expect(next[0].title).toBe('NEW')
  })
})

describe('removeCustomEntry', () => {
  it('按标题删除（大小写不敏感）', () => {
    const out = removeCustomEntry(
      [
        { title: 'A', url: '' },
        { title: 'B', url: '' },
      ],
      'a',
      'off-the-cuff',
    )
    expect(out.map((e) => e.title)).toEqual(['B'])
  })
})

describe('normalizeLibrary', () => {
  it('返回当前版本号', () => {
    const lib = normalizeLibrary(undefined)
    expect(lib.version).toBe(LIBRARY_VERSION)
  })
  it('内置分类全部存在', () => {
    const lib = normalizeLibrary(undefined)
    for (const cat of offTheCuffCategories) {
      expect(lib.impromptu[cat.id]).toBeDefined()
      expect(lib.impromptu[cat.id].length).toBeGreaterThan(0)
    }
  })
  it('老格式（只含追加项）迁移到「综合」分类 + 内置 deep-research', () => {
    const lib = normalizeLibrary({
      'off-the-cuff': ['我的题'],
      'deep-research': [{ title: '我的深研', url: 'https://x.com' }],
    })
    const general = offTheCuffCategories[0]
    expect(lib.impromptu[general.id].some((e) => e.title === '我的题')).toBe(true)
    expect(lib.research.some((e) => e.title === '我的深研')).toBe(true)
  })
  it('已经是 v2 格式时按分类取数', () => {
    const lib = normalizeLibrary({
      version: LIBRARY_VERSION,
      impromptu: { general: [{ title: 'USER', url: '' }] },
      research: [],
    })
    expect(lib.impromptu.general[0].title).toBe('USER')
  })
})

describe('getLibraryEntries', () => {
  it('deep-research 模式返回 research 列表', () => {
    const lib = normalizeLibrary(undefined)
    expect(getLibraryEntries(lib, 'deep-research', 'general')).toEqual(lib.research)
  })
  it('off-the-cuff + 合法 categoryId 返回对应分类', () => {
    const lib = normalizeLibrary(undefined)
    const cat = offTheCuffCategories[1]
    expect(getLibraryEntries(lib, 'off-the-cuff', cat.id)).toEqual(lib.impromptu[cat.id])
  })
  it('off-the-cuff + 非法 categoryId 回退到第一个分类', () => {
    const lib = normalizeLibrary(undefined)
    const first = offTheCuffCategories[0]
    expect(getLibraryEntries(lib, 'off-the-cuff', '__bogus__')).toEqual(lib.impromptu[first.id])
  })
})

describe('getTopicUrl', () => {
  const research = [
    { title: 'AI', url: 'https://example.com/ai' },
    { title: 'B', url: '' },
  ]
  it('命中返回 url', () => {
    expect(getTopicUrl('AI', research)).toBe('https://example.com/ai')
  })
  it('未命中返回空', () => {
    expect(getTopicUrl('???', research)).toBe('')
  })
  it('非字符串 topic 返回空', () => {
    expect(getTopicUrl(undefined as unknown as string, research)).toBe('')
  })
})

describe('getActiveTopics', () => {
  it('off-the-cuff + 分类：内置 + 自定义去重', () => {
    const cat = offTheCuffCategories[0]
    const out = getActiveTopics('off-the-cuff', cat.id, [{ title: '补充题', url: '' }])
    expect(out).toContain('补充题')
    expect(out.length).toBeGreaterThanOrEqual(cat.topics.length)
  })
  it('deep-research：使用 deep-research 分类的内置 + 自定义', () => {
    const out = getActiveTopics('deep-research', 'general', [
      { title: '我的深研', url: 'https://x.com' },
    ])
    expect(out).toContain('我的深研')
  })
  it('limit 上限在归一化时生效（不会让单分类膨胀到几百条）', () => {
    const huge = Array.from({ length: LIBRARY_ENTRY_LIMIT + 50 }, (_, i) => ({
      title: `X${i}`,
      url: '',
    }))
    expect(normalizeCustomEntries(huge, 'off-the-cuff')).toHaveLength(LIBRARY_ENTRY_LIMIT)
  })
})
