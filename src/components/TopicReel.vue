<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  topic: string
  isSpinning: boolean
  hasSelection: boolean
  /** 抽题过程中由帧循环同步过来的「这一格的入场动画时长」。 */
  tickMs?: number
  /** 自上次入场以来的版本号，外部应当用 :key="revision" 触发重渲染。 */
  revision?: number
}>()

const status = computed(() => {
  if (props.isSpinning) return 'SPINNING'
  if (props.hasSelection) return 'YOUR TOPIC'
  return 'READY'
})

const settled = computed(() => !props.isSpinning && props.hasSelection)

// 只在滚动时把 tickMs 交给入场动画；落定后让收尾动画用自己的时长。
const tickStyle = computed(() => {
  const t = props.tickMs
  if (props.isSpinning && typeof t === 'number' && Number.isFinite(t) && t > 0) {
    return { animationDuration: `${Math.round(t)}ms` }
  }
  return {}
})

// Screen-reader announcement only fires once a topic is committed.
const announcement = computed(() =>
  props.hasSelection && !props.isSpinning ? `Your topic: ${props.topic}` : '',
)
</script>

<template>
  <div class="reel">
    <p class="reel__status" aria-hidden="true">{{ status }}</p>
    <p
      :key="revision ?? 0"
      class="reel__topic"
      :class="{
        'reel__topic--spinning': isSpinning,
        'reel__topic--settled': settled,
      }"
      :style="tickStyle"
    >
      {{ topic }}
    </p>
    <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>
  </div>
</template>

<style scoped>
.reel {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 180px;
  justify-content: center;
}
.reel__status {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.25em;
  color: var(--muted);
}
.reel__topic {
  margin: 0 auto;
  max-width: 14ch;
  font-size: clamp(2rem, 8vw, 3.4rem);
  line-height: 1.1;
  color: var(--ink);
  text-wrap: balance;
  transition: opacity 0.1s;
  /* 与源项目一致：闪进用极短缓动，落到 80ms 时仍然是干脆的「咔哒」感。 */
  will-change: transform, opacity;
}
.reel__topic--spinning {
  opacity: 0.9;
  animation: reel-tick var(--reel-tick-ms, 80ms) cubic-bezier(0.16, 0.84, 0.3, 1) both;
}
/* 落定：接着尾格那 320ms 的滑入继续走完，位移量比单格更大一点，收得住又不生硬。 */
.reel__topic--settled {
  animation: reel-settle 0.72s cubic-bezier(0.16, 0.9, 0.24, 1) both;
}
@keyframes reel-tick {
  from {
    opacity: 0.58;
    transform: translateY(0.5em);
  }
  to {
    opacity: 0.9;
    transform: translateY(0);
  }
}
@keyframes reel-settle {
  from {
    opacity: 0.72;
    transform: translateY(0.55em) scale(0.988);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (prefers-reduced-motion: reduce) {
  .reel__topic,
  .reel__topic--spinning,
  .reel__topic--settled {
    animation: none !important;
    transition: none !important;
  }
}
</style>
