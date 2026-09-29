/**
 * 抽题滚动模型：总时长固定，逐格排「这一格停多久」，越往后停得越久。
 * 开头单格停留不到 1ms，一帧要跨过好几格，看起来就是连续快速滚动；
 * 尾段每格停留递增到 SPIN_TAIL_MS 收住。
 *
 * 之所以不用 easeOutCubic 这类幂曲线：它的尾巴太陡，最后一格会停 T*(1/N)^(1/3)，
 * 120 格时约 970ms，而上一格只有 250ms——转盘会先卡住近一秒再跳一下才停，
 * 那个 3.8 倍的落差就是「一下子停下来」的来源。
 *
 * 尾段也不用恒定比例的等比数列：比例恒定意味着增量在放大
 * （111→129→…→275→320，增量 +18 一路涨到 +45），最后一步跨得最大，
 * 读起来是「快停住时还在往上蹿」。改成让比例本身从 TAIL_RATIO_START
 * 衰减到 TAIL_RATIO_END，增量先持平再收窄，末尾几格近似等间隔。
 */

/** 总滚动时长。 */
export const SPIN_DURATION_MS = 4800

/** 页面被切到后台时 rAF 会被节流，用这个兜底时间强制收尾。 */
export const SPIN_SAFETY_MS = 5100

/** 最后一格的停留时长，也是整条曲线的尾部锚点：调大更慢更稳，调小更利落。 */
export const SPIN_TAIL_MS = 320

/** 单次滚动实际经过的题目条数，题库更大时抽样成定长滚动带，保持一致的滚动密度。 */
export const REEL_SIZE = 30

/** 换题闪进动画的时长区间：停留越久，这一格的入场就越舒缓，不再是固定的急闪。 */
export const TICK_MIN_MS = 80
export const TICK_MAX_MS = 240

/** 尾段显式排布的格数：只有这十来格是肉眼能分辨的「一格一格」，前面都是模糊带。 */
export const SPIN_TAIL_STEPS = 14

/**
 * 尾段相邻两格的停留比例：从接缝处的 START 线性衰减到最后一格的 END。
 * START 决定尾段刚接上时还有多少减速余量，END 越接近 1，最后几格越像等间隔。
 */
const TAIL_RATIO_START = 1.18
const TAIL_RATIO_END = 1.03

/**
 * 先排「每格停留多久」，再累加成时间表。
 *
 * 直接排时间点很容易在两段的接缝处排出「后一格反而更快」的倒挂，
 * 那在视觉上就是快停下了又猛冲一下；而单调性本来就是停留时长的性质，
 * 所以这里全程只操作 holds：非递减 + 全正 + 最后按比例缩放到 total，
 * 缩放不破坏前两条，累加出来的时间表天然严格递增，不需要任何事后修补。
 *
 * 分两段：
 * - 尾段（最后 SPIN_TAIL_STEPS 格）从末格 tail 往前倒推，
 *   每步除以一个逐渐变大的比例，于是正着看是「增量先持平再收窄」，
 *   末尾几格接近等间隔，收得住又不会在最后一步猛跨一下。
 * - 头段（其余格）用幂曲线填掉剩下的时间，末格对齐尾段第一格保证接缝连续。
 *   头段单格常常不足一帧，一帧跨过好几格，那就是开头的模糊高速感。
 */
function buildSpinHolds(count: number, duration: number, tailMs: number): number[] {
  const tailSteps = Math.min(count, SPIN_TAIL_STEPS)
  // 从末格 tailMs 往前倒推：越靠前用的比例越大（减速余量多），
  // 越靠末尾比例越接近 1（几乎等间隔）。
  const tailHolds: number[] = new Array(tailSteps)
  tailHolds[tailSteps - 1] = tailMs
  for (let index = tailSteps - 1; index > 0; index -= 1) {
    // back=0 是最后一格前的那一步，用 END；back 越大越靠前，趋向 START。
    const back = tailSteps - 1 - index
    const t = tailSteps > 2 ? back / (tailSteps - 2) : 1
    const ratio = TAIL_RATIO_END + (TAIL_RATIO_START - TAIL_RATIO_END) * t
    tailHolds[index - 1] = tailHolds[index] / ratio
  }
  const headSteps = count - tailSteps
  if (headSteps <= 0) return tailHolds

  const joinHold = tailHolds[0]
  const tailSpan = tailHolds.reduce((sum, hold) => sum + hold, 0)
  // 头段要填的时间；尾段已经吃满（甚至超过）总时长时，头段退化成极快的模糊带。
  const headSpan = Math.max(0, duration - tailSpan)
  const headSumAt = (power: number): number => {
    let sum = 0
    for (let index = 0; index < headSteps; index += 1) {
      sum += joinHold * ((index + 1) / headSteps) ** power
    }
    return sum
  }
  // 头段停留取 joinHold * ((i+1)/headSteps)^power：power 越大越前倾、总和越小。
  // 二分到总和等于 headSpan；解不到（headSpan 太大）就落在 power=0 的等速上限，
  // 后面统一缩放会把整条压回 total，单调性不受影响。
  let low = 0
  let high = 64
  for (let iteration = 0; iteration < 60; iteration += 1) {
    const mid = (low + high) / 2
    if (headSumAt(mid) > headSpan) low = mid
    else high = mid
  }
  const power = (low + high) / 2
  const headHolds = Array.from(
    { length: headSteps },
    (_, index) => joinHold * ((index + 1) / headSteps) ** power,
  )
  return [...headHolds, ...tailHolds]
}

/**
 * 生成「第 k 格何时出现」的时间表（毫秒，长度为 steps，最后一项恒等于 total）。
 * 帧循环只需拿经过时间和这张表比对，不必再反解曲线。
 */
export function buildSpinTimeline(
  steps: number,
  total: number = SPIN_DURATION_MS,
  tail: number = SPIN_TAIL_MS,
): number[] {
  const count = Math.max(1, Math.round(Number(steps) || 1))
  const duration = Math.max(1, Number(total) || SPIN_DURATION_MS)
  const tailMs = Math.max(1, Number(tail) || SPIN_TAIL_MS)

  const holds = buildSpinHolds(count, duration, tailMs)
  // 兜住幂函数下溢：每格至少留一点正的停留，并强制非递减。
  let previous = Number.EPSILON
  for (let index = 0; index < count; index += 1) {
    const hold = Number.isFinite(holds[index]) ? holds[index] : previous
    previous = Math.max(previous, hold)
    holds[index] = previous
  }
  // 按比例缩放到 total：非递减和全正都不受影响。
  const span = holds.reduce((sum, hold) => sum + hold, 0)
  const scale = duration / span

  const timeline = new Array<number>(count)
  let elapsed = 0
  for (let index = 0; index < count; index += 1) {
    elapsed += holds[index] * scale
    timeline[index] = elapsed
  }
  // 浮点累加的尾差直接钉掉；前一项一定小于它，因为最后一格停留是正的。
  timeline[count - 1] = duration
  return timeline
}

/** 第 step 格的闪进时长：跟着这一格的停留时间走，末尾几格就成了缓慢滑入。 */
export function getTickMs(timeline: readonly number[], step: number): number {
  if (!Array.isArray(timeline) || !timeline.length) return TICK_MIN_MS
  const index = Math.max(
    0,
    Math.min(timeline.length - 1, Math.round(Number(step) || 0)),
  )
  const hold = index === 0 ? timeline[0] : timeline[index] - timeline[index - 1]
  return Math.round(Math.max(TICK_MIN_MS, Math.min(TICK_MAX_MS, hold * 0.6)))
}

function toSafeRandom(random: () => number): number {
  const value = Number(typeof random === 'function' ? random() : NaN)
  return Number.isFinite(value) ? Math.max(0, Math.min(0.999999999, value)) : 0
}

/**
 * 滚动格数：3~5 整圈再加 1~len-1 的偏移，
 * 保证每次至少转三圈，且绝不停在出发的那一格。
 */
export function planSpinSteps(length: number, random: () => number = Math.random): number {
  const len = Math.max(1, Math.round(Number(length) || 1))
  const revolutions = 3 + Math.floor(toSafeRandom(random) * 3)
  if (len <= 1) return revolutions
  return revolutions * len + 1 + Math.floor(toSafeRandom(random) * (len - 1))
}

export interface SpinReel {
  topics: string[]
  startIndex: number
  landIndex: number
  steps: number
}

/**
 * 组装一次滚动的题目带：出发格固定为当前已显示的题目（开始时不跳字），
 * 落点格固定为已经选好的最终题目（近期去重规则仍由 pickTopic 决定）。
 */
export function buildSpinReel(
  pool: readonly string[],
  current: string,
  landing: string,
  random: () => number = Math.random,
): SpinReel {
  const unique = [
    ...new Set(
      (Array.isArray(pool) ? pool : []).filter(
        (item): item is string => typeof item === 'string' && item.length > 0,
      ),
    ),
  ]
  if (!unique.length) throw new Error('话题列表不能为空')
  const finalTopic = unique.includes(landing) ? landing : (unique[0] as string)
  const head = unique.includes(current) ? current : (unique[0] as string)

  let topics = unique
  let startIndex = unique.indexOf(head)
  if (unique.length > REEL_SIZE) {
    const rest = unique.filter((item) => item !== head && item !== finalTopic)
    for (let index = 0; index < rest.length && index < REEL_SIZE; index += 1) {
      const target = index + Math.floor(toSafeRandom(random) * (rest.length - index))
      ;[rest[index], rest[target]] = [rest[target], rest[index]]
    }
    topics = [head, ...rest.slice(0, REEL_SIZE - 2), finalTopic]
    startIndex = 0
  } else {
    topics = [...unique]
  }

  const steps = planSpinSteps(topics.length, random)
  const landIndex = (startIndex + steps) % topics.length
  if (topics[landIndex] !== finalTopic) {
    const existing = topics.indexOf(finalTopic)
    if (existing > 0 && existing !== startIndex) {
      ;[topics[landIndex], topics[existing]] = [topics[existing], topics[landIndex]]
    } else if (landIndex !== startIndex) {
      topics[landIndex] = finalTopic
    }
  }
  return { topics, startIndex, landIndex, steps }
}

/**
 * 抽一题，避开最近抽过的；近期全部命中时回落到全集（保底不会抛错）。
 */
export function pickTopic(
  topics: readonly string[],
  random: () => number = Math.random,
  recentTopics: readonly string[] = [],
): string {
  if (!Array.isArray(topics) || topics.length === 0) throw new Error('话题列表不能为空')
  const recent = new Set(Array.isArray(recentTopics) ? recentTopics : [recentTopics])
  const candidates = topics.filter((topic) => !recent.has(topic))
  const pool = candidates.length > 0 ? candidates : [...topics]
  return pool[Math.floor(toSafeRandom(random) * pool.length)]
}

/** 维护「最近抽过的」定长列表，新抽到的放首位。 */
export function pushRecent(
  recentTopics: readonly string[],
  topic: string,
  limit: number = 5,
): string[] {
  const safeLimit = Math.max(1, Math.round(Number(limit) || 5))
  const recent = Array.isArray(recentTopics) ? recentTopics : []
  return [topic, ...recent.filter((item) => item && item !== topic)].slice(0, safeLimit)
}
