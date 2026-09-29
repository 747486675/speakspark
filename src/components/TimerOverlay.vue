<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PracticeMode, TimerPhase } from '../types'
import { useFocusTrap } from '../composables/useFocusTrap'
import { useCountdown } from '../composables/useCountdown'
import SpeechArc from './SpeechArc.vue'
import { resumeAudio, playTimerEnd } from '../lib/audio'
import { formatMSS } from '../lib/duration'

const props = defineProps<{
  phase: TimerPhase
  mode: PracticeMode
  topic: string
  speechSeconds: number
  researchSeconds: number
  muted: boolean
  topicUrl?: string
  /** 实际演讲秒数（done 阶段展示用，可选）。 */
  actualSpeechSeconds?: number
}>()

const emit = defineEmits<{
  (e: 'finish-research'): void
  (e: 'start-speech'): void
  (e: 'finish-speech'): void
  (e: 'close'): void
}>()

const panelRef = ref<HTMLElement | null>(null)
const open = computed(() => props.phase !== 'idle')

useFocusTrap(panelRef, open)

const reducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const total = computed(() =>
  props.phase === 'research' ? props.researchSeconds : props.speechSeconds,
)

const { secondsLeft, start, pause, resume, restart, stop } = useCountdown()
const isPaused = ref(false)

const isUrgent = computed(
  () =>
    (props.phase === 'research' || props.phase === 'speech') &&
    !isPaused.value &&
    secondsLeft.value <= 10 &&
    secondsLeft.value > 0,
)

function beginPhase() {
  if (props.phase === 'research') {
    start(props.researchSeconds, () => {
      if (!props.muted) {
        resumeAudio()
        playTimerEnd()
      }
      emit('finish-research')
    })
  } else if (props.phase === 'speech') {
    start(props.speechSeconds, () => {
      if (!props.muted) {
        resumeAudio()
        playTimerEnd()
      }
      emit('finish-speech')
    })
  }
  isPaused.value = false
}

function togglePause() {
  if (props.phase === 'research' || props.phase === 'speech') {
    if (isPaused.value) {
      resume()
      isPaused.value = false
    } else {
      pause()
      isPaused.value = true
    }
  }
}

function onRestart() {
  if (props.phase === 'research' || props.phase === 'speech') {
    restart()
    isPaused.value = false
  }
}

watch(
  () => props.phase,
  (phase) => {
    if (phase === 'research' || phase === 'speech') {
      beginPhase()
    } else {
      stop()
      isPaused.value = false
    }
  },
  { immediate: true },
)

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    stop()
    isPaused.value = false
    emit('close')
  } else if (e.code === 'Space') {
    if (props.phase === 'research' || props.phase === 'speech') {
      e.preventDefault()
      togglePause()
    }
  }
}

function openTopicUrl() {
  if (!props.topicUrl) return
  window.open(props.topicUrl, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="overlay" @keydown="onKeydown">
      <div
        ref="panelRef"
        class="overlay__panel"
        role="dialog"
        aria-modal="true"
        aria-label="练习计时"
      >
        <p class="overlay__topic">{{ topic }}</p>

        <button
          v-if="topicUrl && (phase === 'research' || phase === 'ready')"
          type="button"
          class="overlay__source"
          @click="openTopicUrl"
        >
          🔗 打开参考网址
        </button>

        <p v-if="phase === 'research'" class="overlay__phase">准备</p>
        <p v-else-if="phase === 'speech'" class="overlay__phase">演讲</p>

        <SpeechArc
          v-if="phase === 'research' || phase === 'speech'"
          :seconds-left="secondsLeft"
          :total-seconds="total"
          :reduced-motion="reducedMotion"
          :urgent="isUrgent"
        />

        <div v-else-if="phase === 'ready'" class="overlay__ready">
          <p class="overlay__ready-text">准备好就开始吧。</p>
        </div>

        <div v-else-if="phase === 'done'" class="overlay__done">
          <p class="overlay__done-text" role="status" aria-live="assertive">时间到，做得很好。</p>
          <p v-if="actualSpeechSeconds !== undefined" class="overlay__done-meta">
            本次表达 {{ formatMSS(actualSpeechSeconds) }}
          </p>
        </div>

        <div class="overlay__controls">
          <template v-if="phase === 'research' || phase === 'speech'">
            <button class="overlay__secondary" @click="togglePause">
              {{ isPaused ? '继续' : '暂停' }}
            </button>
            <button class="overlay__secondary" @click="onRestart">重新开始</button>
            <button
              class="overlay__primary"
              @click="phase === 'speech' ? emit('finish-speech') : emit('finish-research')"
            >
              {{ phase === 'speech' ? '完成演讲' : '我准备好了' }}
            </button>
          </template>
          <button
            v-else-if="phase === 'ready'"
            class="overlay__primary"
            @click="emit('start-speech')"
          >
            开始演讲
          </button>
          <button v-else class="overlay__primary" @click="stop(); emit('close')">关闭</button>
          <button class="overlay__close" @click="stop(); emit('close')">结束本次训练</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: #060a08f2;
  z-index: 60;
  padding: 16px;
  box-sizing: border-box;
}
.overlay__panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 32px;
  max-width: 480px;
  width: 100%;
  text-align: center;
}
.overlay__topic {
  margin: 0;
  max-width: 18ch;
  font-size: clamp(1.5rem, 5vw, 2.4rem);
  color: var(--ink);
  text-wrap: balance;
}
.overlay__source {
  margin: 0;
  padding: 6px 14px;
  border: 1px solid #4fb0c64d;
  border-radius: 999px;
  background: transparent;
  color: var(--research);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}
.overlay__source:hover {
  background: #4fb0c614;
}
.overlay__phase {
  margin: 0;
  letter-spacing: 0.25em;
  font-size: 0.8rem;
  color: var(--muted);
  text-transform: uppercase;
}
.overlay__ready,
.overlay__done {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}
.overlay__ready-text,
.overlay__done-text {
  margin: 0;
  font-size: 1.2rem;
  color: var(--ink);
}
.overlay__done-meta {
  margin: 0;
  font-size: 0.9rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.overlay__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-top: 4px;
}
.overlay__primary {
  min-height: 52px;
  padding: 0 32px;
  border: none;
  border-radius: 999px;
  background: var(--accent);
  color: #2a1710;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.overlay__secondary {
  min-height: 52px;
  padding: 0 20px;
  border: 1px solid #ffffff33;
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  cursor: pointer;
}
.overlay__close {
  min-height: 44px;
  padding: 0 16px;
  border: none;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}
.overlay__close:hover {
  color: var(--ink);
}
</style>
