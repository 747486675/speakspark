<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import type { TopicCategory } from '../types'

const props = defineProps<{
  categories: TopicCategory[]
  selectedId: string
  disabled: boolean
}>()

const emit = defineEmits<{ (e: 'select', id: string): void }>()

const open = ref(false)
const triggerRef = ref<HTMLButtonElement | null>(null)
const listRef = ref<HTMLUListElement | null>(null)
const activeIndex = ref(0)

const selected = computed(
  () => props.categories.find((c) => c.id === props.selectedId) ?? props.categories[0],
)

async function openList() {
  if (props.disabled) return
  open.value = true
  activeIndex.value = Math.max(0, props.categories.findIndex((c) => c.id === props.selectedId))
  await nextTick()
  focusOption(activeIndex.value)
}

function closeList(returnFocus = true) {
  open.value = false
  if (returnFocus) nextTick(() => triggerRef.value?.focus())
}

function focusOption(index: number) {
  const el = listRef.value?.querySelectorAll<HTMLElement>('[role="option"]')[index]
  el?.focus()
}

function choose(id: string) {
  emit('select', id)
  closeList()
}

function onListKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    closeList()
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % props.categories.length
    focusOption(activeIndex.value)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + props.categories.length) % props.categories.length
    focusOption(activeIndex.value)
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    choose(props.categories[activeIndex.value].id)
  }
}
</script>

<template>
  <div class="cat">
    <button
      ref="triggerRef"
      class="cat__trigger"
      :disabled="disabled"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="open ? closeList() : openList()"
    >
      <span aria-hidden="true">{{ selected.emoji }}</span>
      {{ selected.label }}
      <span class="cat__caret" aria-hidden="true">▾</span>
    </button>

    <ul
      v-if="open"
      ref="listRef"
      class="cat__list"
      role="listbox"
      aria-label="话题分类"
      @keydown="onListKeydown"
    >
      <li
        v-for="(c, i) in categories"
        :key="c.id"
        class="cat__option"
        :class="{ 'cat__option--active': c.id === selectedId }"
        role="option"
        :aria-selected="c.id === selectedId"
        tabindex="-1"
        @click="choose(c.id)"
        @focus="activeIndex = i"
      >
        <span aria-hidden="true">{{ c.emoji }}</span> {{ c.label }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.cat {
  position: relative;
  display: inline-block;
}
.cat__trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 999px;
  background: transparent;
  border: 1px solid #ffffff33;
  color: var(--ink);
  font: inherit;
  cursor: pointer;
}
.cat__trigger:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.cat__caret {
  font-size: 0.7em;
}
.cat__list {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  padding: 6px;
  list-style: none;
  max-height: 260px;
  overflow-y: auto;
  background: #101815f2;
  border: 1px solid #ffffff26;
  border-radius: 14px;
  z-index: 20;
  min-width: 200px;
  backdrop-filter: blur(8px);
}
.cat__option {
  padding: 10px 14px;
  border-radius: 10px;
  color: var(--ink);
  cursor: pointer;
  white-space: nowrap;
}
.cat__option:hover,
.cat__option:focus {
  background: #ffffff14;
  outline: none;
}
.cat__option--active {
  color: var(--accent-bright);
}
</style>
