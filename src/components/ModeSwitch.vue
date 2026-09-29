<script setup lang="ts">
import type { PracticeMode } from '../types'
import { modeCopy } from '../config'

const props = defineProps<{
  mode: PracticeMode
  disabled: boolean
}>()

const emit = defineEmits<{ (e: 'update', mode: PracticeMode): void }>()

const modes: PracticeMode[] = ['off-the-cuff', 'deep-research']

function select(mode: PracticeMode) {
  if (props.disabled) return
  emit('update', mode)
}

function onKeydown(e: KeyboardEvent) {
  if (props.disabled) return
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
  e.preventDefault()
  const idx = modes.indexOf(props.mode)
  const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
  const next = modes[(idx + dir + modes.length) % modes.length]
  emit('update', next)
}
</script>

<template>
  <div
    class="mode"
    role="radiogroup"
    aria-label="Practice mode"
    @keydown="onKeydown"
  >
    <button
      v-for="m in modes"
      :key="m"
      class="mode__option"
      :class="{ 'mode__option--active': mode === m, 'mode__option--research': mode === m && m === 'deep-research' }"
      role="radio"
      :aria-checked="mode === m"
      :tabindex="mode === m ? 0 : -1"
      :disabled="disabled"
      @click="select(m)"
    >
      <span aria-hidden="true">{{ modeCopy[m].emoji }}</span>
      {{ modeCopy[m].label }}
    </button>
  </div>
</template>

<style scoped>
.mode {
  display: inline-flex;
  padding: 4px;
  gap: 4px;
  border-radius: 999px;
  background: #ffffff10;
  border: 1px solid #ffffff1f;
}
.mode__option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  min-height: 44px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  font: inherit;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.mode__option--active {
  background: var(--accent);
  color: #2a1710;
}
.mode__option--research {
  background: var(--research);
  color: #06222b;
}
.mode__option:disabled {
  cursor: not-allowed;
}
</style>
