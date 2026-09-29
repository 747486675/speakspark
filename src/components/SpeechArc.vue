<script setup lang="ts">
import { computed } from 'vue'
import { formatMSS, elapsedFraction } from '../lib/duration'

const props = defineProps<{
  secondsLeft: number
  totalSeconds: number
  reducedMotion: boolean
  urgent?: boolean
}>()

const RADIUS = 120
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const progress = computed(() => elapsedFraction(props.secondsLeft, props.totalSeconds))
const dashOffset = computed(() => CIRCUMFERENCE * progress.value)
const label = computed(() => formatMSS(props.secondsLeft))
</script>

<template>
  <div class="arc">
    <svg
      v-if="!reducedMotion"
      class="arc__svg"
      :class="{ 'arc__svg--urgent': urgent }"
      viewBox="0 0 280 280"
      aria-hidden="true"
    >
      <circle class="arc__track" cx="140" cy="140" :r="RADIUS" />
      <circle
        class="arc__progress"
        cx="140"
        cy="140"
        :r="RADIUS"
        :stroke-dasharray="CIRCUMFERENCE"
        :stroke-dashoffset="dashOffset"
      />
    </svg>
    <div class="arc__time" :class="{ 'arc__time--urgent': urgent }" role="timer" aria-live="off">{{ label }}</div>
  </div>
</template>

<style scoped>
.arc {
  position: relative;
  width: 280px;
  height: 280px;
  display: grid;
  place-items: center;
}
.arc__svg {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
}
.arc__svg--urgent {
  animation: arc-pulse 1s ease-in-out infinite;
}
.arc__track {
  fill: none;
  stroke: #ffffff1a;
  stroke-width: 10;
}
.arc__progress {
  fill: none;
  stroke: var(--accent);
  stroke-width: 10;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s linear, stroke 0.3s ease;
}
.arc__svg--urgent .arc__progress {
  stroke: var(--danger);
}
.arc__time {
  font-size: 3.2rem;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
  transition: color 0.3s ease;
}
.arc__time--urgent {
  color: var(--danger);
}
@keyframes arc-pulse {
  0%, 100% { transform: rotate(-90deg) scale(1); }
  50% { transform: rotate(-90deg) scale(1.05); }
}
@media (prefers-reduced-motion: reduce) {
  .arc__progress,
  .arc__svg--urgent,
  .arc__time {
    transition: none;
    animation: none;
  }
}
</style>
