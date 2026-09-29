<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFocusTrap } from '../composables/useFocusTrap'
import DurationSlider from './DurationSlider.vue'
import { SPEECH_MIN, SPEECH_MAX, RESEARCH_MIN, RESEARCH_MAX } from '../composables/usePersistentSettings'
import { formatMSS } from '../lib/duration'

const props = defineProps<{
  open: boolean
  speechSeconds: number
  researchSeconds: number
  muted: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update-speech', v: number): void
  (e: 'update-research', v: number): void
  (e: 'update-muted', v: boolean): void
}>()

// 演讲/准备时长的快捷预设：与源项目一致，单位秒。
// 60s 起步，因为 < 1 分钟的演讲难以组织观点。
const SPEECH_PRESETS = [60, 180, 300, 600] as const
const RESEARCH_PRESETS = [300, 600, 900, 1800] as const

const panelRef = ref<HTMLElement | null>(null)
// Must track `open` reactively — a plain ref(props.open) snapshots the initial
// value, leaving the trap (and therefore Escape-to-close) permanently inert.
const activeRef = computed(() => props.open)

useFocusTrap(panelRef, activeRef)

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="dialog" @keydown="onKeydown">
      <div class="dialog__scrim" @click="emit('close')" />
      <div
        ref="panelRef"
        class="dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-label="设置"
      >
        <h2 class="dialog__title">设置</h2>

        <section class="dialog__section">
          <header class="dialog__row">
            <label class="dialog__label" for="speech-slider">演讲时长</label>
            <span class="dialog__value">{{ formatMSS(speechSeconds) }}</span>
          </header>
          <DurationSlider
            id="speech-slider"
            :min="SPEECH_MIN"
            :max="SPEECH_MAX"
            :seconds="speechSeconds"
            @update="emit('update-speech', $event)"
          />
          <div class="dialog__presets" role="group" aria-label="演讲时长预设">
            <button
              v-for="preset in SPEECH_PRESETS"
              :key="`speech-${preset}`"
              type="button"
              class="dialog__preset"
              :class="{ 'dialog__preset--active': speechSeconds === preset }"
              @click="emit('update-speech', preset)"
            >
              {{ formatMSS(preset) }}
            </button>
          </div>
        </section>

        <section class="dialog__section">
          <header class="dialog__row">
            <label class="dialog__label" for="research-slider">准备时长</label>
            <span class="dialog__value">{{ formatMSS(researchSeconds) }}</span>
          </header>
          <DurationSlider
            id="research-slider"
            :min="RESEARCH_MIN"
            :max="RESEARCH_MAX"
            :seconds="researchSeconds"
            @update="emit('update-research', $event)"
          />
          <div class="dialog__presets" role="group" aria-label="准备时长预设">
            <button
              v-for="preset in RESEARCH_PRESETS"
              :key="`research-${preset}`"
              type="button"
              class="dialog__preset"
              :class="{ 'dialog__preset--active': researchSeconds === preset }"
              @click="emit('update-research', preset)"
            >
              {{ formatMSS(preset) }}
            </button>
          </div>
        </section>

        <label class="dialog__toggle">
          <input
            type="checkbox"
            :checked="muted"
            @change="emit('update-muted', ($event.target as HTMLInputElement).checked)"
          >
          静音提示音
        </label>

        <button class="dialog__close" @click="emit('close')">完成</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.dialog {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  z-index: 50;
}
.dialog__scrim {
  position: absolute;
  inset: 0;
  background: #000000a6;
}
.dialog__panel {
  position: relative;
  width: min(92vw, 460px);
  max-height: 90vh;
  padding: 24px;
  border-radius: 20px;
  background: #121a17;
  border: 1px solid #ffffff1f;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}
.dialog__title {
  margin: 0;
  font-size: 1.2rem;
  color: var(--ink);
}
.dialog__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dialog__row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.dialog__label {
  color: var(--ink);
  font-size: 0.95rem;
}
.dialog__value {
  color: var(--accent-bright);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.dialog__presets {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
.dialog__preset {
  flex: 1;
  min-height: 40px;
  padding: 0 8px;
  border: 1px solid #ffffff26;
  border-radius: 12px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}
.dialog__preset:hover {
  border-color: #ffffff40;
  background: #ffffff0a;
}
.dialog__preset--active {
  border-color: var(--accent);
  background: var(--accent);
  color: #2a1710;
  font-weight: 700;
}
.dialog__toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ink);
  cursor: pointer;
}
.dialog__close {
  min-height: 48px;
  border: none;
  border-radius: 999px;
  background: var(--accent);
  color: #2a1710;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
</style>
