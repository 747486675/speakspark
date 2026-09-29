<script setup lang="ts">
import { computed } from 'vue'
import { formatMSS, minutesToSeconds, secondsToMinutes } from '../lib/duration'

const props = defineProps<{
  label?: string
  unit?: string
  min: number
  max: number
  seconds: number
  id?: string
}>()

const emit = defineEmits<{ (e: 'update', seconds: number): void }>()

const minMinutes = computed(() => Math.round(props.min / 60))
const maxMinutes = computed(() => Math.round(props.max / 60))
const currentMinutes = computed(() => secondsToMinutes(props.seconds))
const display = computed(() => formatMSS(props.seconds))

function onInput(e: Event) {
  const minutes = Number((e.target as HTMLInputElement).value)
  emit('update', minutesToSeconds(minutes))
}
</script>

<template>
  <div class="slider">
    <div v-if="label" class="slider__row">
      <label class="slider__label" :for="id ?? `slider-${label}`">{{ label }}</label>
      <span class="slider__value">{{ display }}</span>
    </div>
    <input
      :id="id ?? (label ? `slider-${label}` : undefined)"
      type="range"
      :min="minMinutes"
      :max="maxMinutes"
      step="1"
      :value="currentMinutes"
      :aria-valuetext="`${currentMinutes} ${unit}`"
      @input="onInput"
    >
  </div>
</template>

<style scoped>
.slider {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.slider__row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.slider__label {
  color: var(--ink);
}
.slider__value {
  color: var(--accent-bright);
  font-variant-numeric: tabular-nums;
}
input[type='range'] {
  width: 100%;
  accent-color: var(--accent);
  min-height: 44px;
}
</style>
