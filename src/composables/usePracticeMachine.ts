import { reactive, computed, readonly } from 'vue'
import type { PracticeMode, TimerPhase } from '../types'
import { getCategory, deepResearchCategory, offTheCuffCategories, DEEP_RESEARCH_ID } from '../data/topics'
import { pickIndex } from '../lib/random'
import { TICK_MIN_MS } from '../lib/spin'

interface MachineState {
  mode: PracticeMode
  categoryId: string
  displayedTopic: string
  displayedIndex: number
  selectedTopic: string | null
  isSpinning: boolean
  timerPhase: TimerPhase
  /**
   * 最近一次闪进的入场动画时长（毫秒），落定后由收尾动画接管。
   * 始终取一个有限值，避免外部 NaN 写进 style。
   */
  tickMs: number
  /**
   * 当前显示话题自上次入场以来的版本号，用于触发 :key 重渲染。
   */
  topicRevision: number
  /**
   * 抽题开始时已经选好的最终题目（落点），用于安全收尾。
   * 为空时 settleSpin 退回到 displayedTopic。
   */
  pendingLanding: string | null
}

/**
 * Core practice state machine. Owns mode, category, spin lifecycle and timer
 * phase, and enforces the invariants from the spec so components never juggle
 * loose booleans.
 */
export function usePracticeMachine() {
  // Remember the last ordinary category so switching back from deep-research
  // restores it rather than falling to general every time.
  let lastOrdinaryCategory = offTheCuffCategories[0].id

  const initialCategory = getCategory(lastOrdinaryCategory)
  const initialIndex = pickIndex(initialCategory.topics.length)

  const state = reactive<MachineState>({
    mode: 'off-the-cuff',
    categoryId: initialCategory.id,
    displayedTopic: initialCategory.topics[initialIndex],
    displayedIndex: initialIndex,
    selectedTopic: null,
    isSpinning: false,
    timerPhase: 'idle',
    tickMs: TICK_MIN_MS,
    topicRevision: 0,
    pendingLanding: null,
  })

  const activeCategory = computed(() =>
    state.mode === 'deep-research' ? deepResearchCategory : getCategory(state.categoryId),
  )

  const topics = computed(() => activeCategory.value.topics)

  // Timer button is enabled only with a committed topic and no spin/timer active.
  const canStartTimer = computed(
    () => state.selectedTopic !== null && !state.isSpinning && state.timerPhase === 'idle',
  )

  // Controls lock while spinning or any timer phase is active.
  const controlsLocked = computed(() => state.isSpinning || state.timerPhase !== 'idle')

  function reshuffleDisplayed() {
    const list = topics.value
    const idx = pickIndex(list.length)
    state.displayedIndex = idx
    state.displayedTopic = list[idx]
    state.selectedTopic = null
  }

  function setMode(mode: PracticeMode) {
    if (controlsLocked.value || mode === state.mode) return
    state.mode = mode
    if (mode === 'deep-research') {
      state.categoryId = DEEP_RESEARCH_ID
    } else {
      state.categoryId = lastOrdinaryCategory
    }
    reshuffleDisplayed()
  }

  function setCategory(id: string) {
    if (controlsLocked.value || state.mode === 'deep-research') return
    if (id === DEEP_RESEARCH_ID) return
    state.categoryId = id
    lastOrdinaryCategory = id
    reshuffleDisplayed()
  }

  // --- Spin lifecycle -------------------------------------------------------

  /**
   * 进入抽题状态。`landing` 已经在外面由 pickTopic 选好，作为「落点固定」防止
   * 视觉过程参与结果。如果不传，结束时会落到 displayedTopic（兼容旧行为）。
   */
  function beginSpin(landing: string | null = null) {
    if (controlsLocked.value) return
    state.selectedTopic = null // invariant: spinning => no selection
    state.pendingLanding = typeof landing === 'string' ? landing : null
    state.isSpinning = true
  }

  /**
   * 抽题过程中推进一格。`topic` 是新显示的话题，`tickMs` 是这一格入场动画的时长。
   * 暴露给 ActionBar 的帧循环调用。
   */
  function advanceTo(topic: string, tickMs: number) {
    const list = topics.value
    const idx = list.indexOf(topic)
    if (idx >= 0) {
      state.displayedIndex = idx
    }
    state.displayedTopic = topic
    state.tickMs = Number.isFinite(tickMs) && tickMs > 0 ? Math.round(tickMs) : TICK_MIN_MS
    state.topicRevision += 1
  }

  /**
   * 收尾：把 displayedTopic 固定为 selectedTopic。如果 beginSpin 传了 landing，
   * 优先用 landing（避免视觉与结果不一致）。
   */
  function settleSpin(finalTopic?: string) {
    if (state.pendingLanding && topics.value.includes(state.pendingLanding)) {
      const idx = topics.value.indexOf(state.pendingLanding)
      state.displayedIndex = idx
      state.displayedTopic = state.pendingLanding
    } else if (finalTopic && topics.value.includes(finalTopic)) {
      state.displayedTopic = finalTopic
      state.displayedIndex = topics.value.indexOf(finalTopic)
    }
    state.isSpinning = false
    state.selectedTopic = state.displayedTopic
    state.pendingLanding = null
  }

  /** 抽到一半被打断（关闭/切换分类）：清掉 pendingLanding，恢复可选。 */
  function cancelSpin() {
    state.isSpinning = false
    state.pendingLanding = null
  }

  // --- Timer phase transitions ---------------------------------------------

  function startResearch() {
    if (!canStartTimer.value || state.mode !== 'deep-research') return
    state.timerPhase = 'research'
  }

  function finishResearch() {
    if (state.timerPhase === 'research') state.timerPhase = 'ready'
  }

  function startSpeechFromReady() {
    if (state.timerPhase === 'ready') state.timerPhase = 'speech'
  }

  function startSpeech() {
    if (!canStartTimer.value || state.mode !== 'off-the-cuff') return
    state.timerPhase = 'speech'
  }

  function finishSpeech() {
    if (state.timerPhase === 'speech') state.timerPhase = 'done'
  }

  /** 关闭计时弹层：回到 idle，但保留选中的话题。 */
  function closeTimer() {
    state.timerPhase = 'idle'
  }

  return {
    state: readonly(state),
    activeCategory,
    topics,
    canStartTimer,
    controlsLocked,
    setMode,
    setCategory,
    beginSpin,
    advanceTo,
    settleSpin,
    cancelSpin,
    startResearch,
    finishResearch,
    startSpeechFromReady,
    startSpeech,
    finishSpeech,
    closeTimer,
  }
}

export type PracticeMachine = ReturnType<typeof usePracticeMachine>
