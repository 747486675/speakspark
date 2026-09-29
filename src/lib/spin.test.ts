import { describe, it, expect } from 'vitest'
import {
  buildSpinTimeline,
  getTickMs,
  planSpinSteps,
  buildSpinReel,
  pickTopic,
  pushRecent,
  SPIN_DURATION_MS,
  SPIN_TAIL_MS,
  SPIN_TAIL_STEPS,
  TICK_MIN_MS,
  TICK_MAX_MS,
  REEL_SIZE,
} from './spin'

const deterministic = (seed: number) => () => {
  // Mulberry32: deterministic, fast, good enough for tests
  let t = (seed += 0x6d2b79f5)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

describe('buildSpinTimeline', () => {
  it('长度等于 steps，最后一项恒等于 total', () => {
    const tl = buildSpinTimeline(20, 1000, 100)
    expect(tl).toHaveLength(20)
    expect(tl[19]).toBe(1000)
  })

  it('时间表严格递增（单调不倒退）', () => {
    for (let seed = 0; seed < 4; seed += 1) {
      const tl = buildSpinTimeline(120, SPIN_DURATION_MS, SPIN_TAIL_MS)
      for (let i = 1; i < tl.length; i += 1) {
        expect(tl[i]).toBeGreaterThan(tl[i - 1])
      }
    }
  })

  it('尾段增量的峰值收窄到末格最小（不允许快停住时再往上蹿）', () => {
    // 与源项目一致：先把 timeline 转成每格停留时长（holds），再取尾段。
    const holdsOf = (tl: number[]) => tl.map((t, i) => (i === 0 ? t : t - tl[i - 1]))
    for (const steps of [93, 120, 149]) {
      const holds = holdsOf(buildSpinTimeline(steps, SPIN_DURATION_MS, SPIN_TAIL_MS))
      const tail = holds.slice(-SPIN_TAIL_STEPS)
      const increments = tail.slice(1).map((hold, i) => hold - tail[i])
      const peak = Math.max(...increments)
      // 末格停在尾部锚点上。
      expect(tail[tail.length - 1]).toBeCloseTo(SPIN_TAIL_MS, 6)
      // 末格增量 < 峰值 × 0.6，避免「快停住时还在往上蹿」。
      expect(increments[increments.length - 1]).toBeLessThan(peak * 0.6)
      // 末格是整段尾部的最小增量。
      expect(increments[increments.length - 1]).toBe(Math.min(...increments))
    }
  })

  it('极小 steps 也输出长度对齐的合法表', () => {
    const tl = buildSpinTimeline(1)
    expect(tl).toEqual([SPIN_DURATION_MS])
  })

  it('非法入参兜底：steps=NaN → 1 格', () => {
    const tl = buildSpinTimeline(Number.NaN)
    expect(tl).toEqual([SPIN_DURATION_MS])
  })

  it('非法 total=NaN → 使用默认总时长', () => {
    const tl = buildSpinTimeline(5, Number.NaN)
    expect(tl[tl.length - 1]).toBe(SPIN_DURATION_MS)
  })
})

describe('getTickMs', () => {
  it('空表返回最小值', () => {
    expect(getTickMs([], 0)).toBe(TICK_MIN_MS)
  })

  it('返回值被夹在 [TICK_MIN_MS, TICK_MAX_MS] 之间', () => {
    const tl = buildSpinTimeline(80)
    for (let step = 0; step < tl.length; step += 1) {
      const ms = getTickMs(tl, step)
      expect(ms).toBeGreaterThanOrEqual(TICK_MIN_MS)
      expect(ms).toBeLessThanOrEqual(TICK_MAX_MS)
    }
  })

  it('step 越靠尾，tickMs 越大（停留越久、入场越缓）', () => {
    const tl = buildSpinTimeline(80)
    const early = getTickMs(tl, 0)
    const late = getTickMs(tl, tl.length - 2)
    expect(late).toBeGreaterThan(early)
  })

  it('step 越界被夹到首/末', () => {
    const tl = buildSpinTimeline(10)
    expect(getTickMs(tl, -1)).toBe(getTickMs(tl, 0))
    expect(getTickMs(tl, 99)).toBe(getTickMs(tl, tl.length - 1))
  })
})

describe('planSpinSteps', () => {
  it('至少三整圈', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const steps = planSpinSteps(20, deterministic(seed))
      expect(steps).toBeGreaterThanOrEqual(3 * 20)
    }
  })

  it('绝不停在出发的那一格：steps % len != 0', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      const len = 12
      const steps = planSpinSteps(len, deterministic(seed))
      expect(steps % len).not.toBe(0)
    }
  })

  it('len<=1 时直接返回 revolutions', () => {
    expect(planSpinSteps(1)).toBeGreaterThanOrEqual(3)
    expect(planSpinSteps(0)).toBeGreaterThanOrEqual(3)
  })
})

describe('buildSpinReel', () => {
  it('出发格固定为 current，落点格固定为 landing', () => {
    const pool = ['A', 'B', 'C', 'D', 'E']
    const reel = buildSpinReel(pool, 'B', 'E', deterministic(1))
    expect(reel.topics[reel.startIndex]).toBe('B')
    expect(reel.topics[reel.landIndex]).toBe('E')
  })

  it('题库 > REEL_SIZE 时抽样成定长滚动带，出发/落点固定', () => {
    const pool = Array.from({ length: 80 }, (_, i) => `T${i}`)
    const reel = buildSpinReel(pool, 'T0', 'T77', deterministic(2))
    expect(reel.topics.length).toBe(REEL_SIZE)
    expect(reel.topics[reel.startIndex]).toBe('T0')
    expect(reel.topics[reel.landIndex]).toBe('T77')
    expect(reel.startIndex).toBe(0)
  })

  it('current 不在池中时回退到池首', () => {
    const pool = ['A', 'B', 'C']
    const reel = buildSpinReel(pool, 'Z', 'C', deterministic(3))
    expect(reel.topics[reel.startIndex]).toBe('A')
  })

  it('landing 不在池中时回退到池首', () => {
    const pool = ['A', 'B', 'C']
    const reel = buildSpinReel(pool, 'A', 'Z', deterministic(4))
    expect(reel.topics[reel.landIndex]).toBe('A')
  })

  it('空池抛错', () => {
    expect(() => buildSpinReel([], 'A', 'B')).toThrow('话题列表不能为空')
  })

  it('steps 与 planSpinSteps 输出一致', () => {
    const pool = ['A', 'B', 'C', 'D', 'E']
    const rand = deterministic(5)
    const reel = buildSpinReel(pool, 'A', 'E', rand)
    expect(reel.steps % reel.topics.length).not.toBe(0)
  })
})

describe('pickTopic', () => {
  const topics = ['A', 'B', 'C', 'D', 'E']
  it('返回池中元素', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(topics).toContain(pickTopic(topics, deterministic(i)))
    }
  })

  it('避开 recent', () => {
    const recent = ['A', 'B', 'C']
    for (let i = 0; i < 50; i += 1) {
      const picked = pickTopic(topics, deterministic(i), recent)
      expect(recent).not.toContain(picked)
    }
  })

  it('recent 涵盖全集时回落全集', () => {
    const picked = pickTopic(topics, deterministic(1), [...topics])
    expect(topics).toContain(picked)
  })

  it('空池抛错', () => {
    expect(() => pickTopic([])).toThrow('话题列表不能为空')
  })
})

describe('pushRecent', () => {
  it('新抽到的放首位', () => {
    expect(pushRecent(['A', 'B'], 'C')).toEqual(['C', 'A', 'B'])
  })

  it('重复时去重后放首位', () => {
    expect(pushRecent(['A', 'B'], 'A')).toEqual(['A', 'B'])
  })

  it('按 limit 截断', () => {
    expect(pushRecent(['A', 'B', 'C'], 'D', 3)).toEqual(['D', 'A', 'B'])
  })

  it('limit 为 NaN 时回退到默认 5', () => {
    expect(pushRecent(['A'], 'B', Number.NaN)).toEqual(['B', 'A'])
  })
})
