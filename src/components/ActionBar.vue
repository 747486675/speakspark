<script setup lang="ts">
import {
  resumeAudio,
  playSpinStart,
  playLand,
} from '../lib/audio'
import {
  buildSpinReel,
  buildSpinTimeline,
  getTickMs,
  pickTopic,
  SPIN_DURATION_MS,
  SPIN_SAFETY_MS,
} from '../lib/spin'

const props = defineProps<{
  topics: string[]
  displayedTopic: string
  recentTopics: string[]
  canStartTimer: boolean
  controlsLocked: boolean
  isSpinning: boolean
  muted: boolean
}>()

const emit = defineEmits<{
  (e: 'begin-spin', landing: string): void
  (e: 'advance', topic: string, tickMs: number): void
  (e: 'settle', finalTopic: string): void
  (e: 'remember-topic', topic: string): void
  (e: 'start-timer'): void
  (e: 'open-settings'): void
  (e: 'open-library'): void
}>()

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function onSpinClick() {
  if (props.controlsLocked || props.isSpinning) return
  if (props.topics.length === 0) return
  if (!props.muted) resumeAudio()

  // 先选好落点，再开始动画 —— 视觉过程不参与结果。
  const landing = pickTopic(props.topics, Math.random, props.recentTopics)
  if (!props.muted) playSpinStart()
  emit('begin-spin', landing)

  if (prefersReducedMotion) {
    // 跳过动画：直接落点。
    window.setTimeout(() => {
      if (!props.muted) playLand()
      emit('settle', landing)
      emit('remember-topic', landing)
    }, 80)
    return
  }

  const reel = buildSpinReel(props.topics, props.displayedTopic, landing)
  const timeline = buildSpinTimeline(reel.steps, SPIN_DURATION_MS)
  const startedAt = performance.now()
  let step = 0
  let finished = false
  let frameHandle = 0
  let safetyTimer = 0

  function finishSpin() {
    if (finished) return
    finished = true
    if (frameHandle) cancelAnimationFrame(frameHandle)
    if (safetyTimer) window.clearTimeout(safetyTimer)
    if (!props.muted) playLand()
    emit('settle', landing)
    emit('remember-topic', landing)
  }

  function frame(now: number) {
    if (finished) return
    // 用真实经过时间对表推进，切后台回来也能自动校正总时长。
    const elapsed = now - startedAt
    while (step < timeline.length && elapsed >= timeline[step]) {
      step += 1
      if (step >= reel.steps) {
        finishSpin()
        return
      }
      // 停得越久，这一格的入场动画就越舒缓。
      const tickMs = getTickMs(timeline, step)
      const nextTopic = reel.topics[(reel.startIndex + step) % reel.topics.length]
      emit('advance', nextTopic, tickMs)
    }
    frameHandle = requestAnimationFrame(frame)
  }

  frameHandle = requestAnimationFrame(frame)
  // rAF 在后台会被节流，超时强制收尾。
  safetyTimer = window.setTimeout(finishSpin, SPIN_SAFETY_MS)
}
</script>

<template>
  <div class="actions">
    <button
      class="actions__spin"
      :disabled="controlsLocked"
      @click="onSpinClick"
    >
      {{ isSpinning ? '抽取中…' : '抽题' }}
    </button>

    <button
      class="actions__timer"
      :disabled="!canStartTimer"
      @click="emit('start-timer')"
    >
      开始计时
    </button>

    <button
      class="actions__library"
      aria-label="管理自定义题目"
      :disabled="controlsLocked"
      @click="emit('open-library')"
    >
      <span aria-hidden="true">📚</span>
    </button>

    <button
      class="actions__settings"
      aria-label="设置"
      :disabled="controlsLocked"
      @click="emit('open-settings')"
    >
      <span aria-hidden="true">⚙</span>
    </button>
  </div>
</template>

<style scoped>
.actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}
.actions__spin,
.actions__timer,
.actions__library,
.actions__settings {
  min-height: 56px;
  font-size: 1.05rem;
  border: none;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.actions__spin {
  padding: 0 40px;
  background: var(--accent);
  color: #2a1710;
  flex: 1 1 auto;
  min-width: 140px;
  font-size: 1.15rem;
}
.actions__spin:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.actions__timer {
  padding: 0 24px;
  border: 1px solid #ffffff33;
  background: transparent;
  color: var(--ink);
}
.actions__timer:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.actions__library,
.actions__settings {
  min-width: 56px;
  padding: 0 18px;
  border: 1px solid #ffffff33;
  background: transparent;
  color: var(--ink);
  font-size: 1.2rem;
}
.actions__library:disabled,
.actions__settings:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
