<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useFocusTrap } from '../composables/useFocusTrap'
import type { LibraryEntry, Library } from '../lib/library'
import { offTheCuffCategories, getCategory } from '../data/topics'

type Mode = 'off-the-cuff' | 'deep-research'

const props = defineProps<{
  open: boolean
  library: Library
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'add-entry', mode: Mode, categoryId: string, title: string, url: string): boolean
  (e: 'remove-entry', mode: Mode, categoryId: string, title: string): void
}>()

const panelRef = ref<HTMLElement | null>(null)
const activeRef = computed(() => props.open)
useFocusTrap(panelRef, activeRef)

const mode = ref<Mode>('off-the-cuff')
const categoryId = ref(offTheCuffCategories[0]?.id ?? 'general')
const draft = reactive({ title: '', url: '' })

const categoryOptions = computed(() => {
  if (mode.value === 'deep-research') return [getCategory('deep-research')].filter(Boolean)
  return offTheCuffCategories
})

const currentEntries = computed<LibraryEntry[]>(() => {
  if (mode.value === 'deep-research') return props.library.research
  return props.library.impromptu[categoryId.value] ?? []
})

const showUrlInput = computed(() => mode.value === 'deep-research')
const error = ref('')

function switchMode(next: Mode) {
  mode.value = next
  if (next === 'deep-research') {
    categoryId.value = 'deep-research'
  } else {
    categoryId.value = offTheCuffCategories[0]?.id ?? 'general'
  }
  draft.title = ''
  draft.url = ''
  error.value = ''
}

function onAdd() {
  const title = draft.title.trim()
  if (!title) {
    error.value = '请输入条目内容'
    return
  }
  const ok = emit('add-entry', mode.value, categoryId.value, title, draft.url)
  if (ok === false) {
    error.value = '已存在同名条目或网址无效'
    return
  }
  draft.title = ''
  draft.url = ''
  error.value = ''
}

function onRemove(entry: LibraryEntry) {
  emit('remove-entry', mode.value, categoryId.value, entry.title)
}

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
        aria-label="自定义题目"
      >
        <header class="dialog__head">
          <h2 class="dialog__title">自定义题目</h2>
          <button class="dialog__close-x" aria-label="关闭" @click="emit('close')">×</button>
        </header>

        <div class="dialog__modes" role="tablist">
          <button
            v-for="m in (['off-the-cuff', 'deep-research'] as const)"
            :key="m"
            type="button"
            role="tab"
            :aria-selected="mode === m"
            class="dialog__mode"
            :class="{ 'dialog__mode--active': mode === m }"
            @click="switchMode(m)"
          >
            {{ m === 'off-the-cuff' ? '即兴开讲' : '深度准备' }}
          </button>
        </div>

        <div v-if="mode === 'off-the-cuff'" class="dialog__cats" role="tablist">
          <button
            v-for="cat in categoryOptions"
            :key="cat.id"
            type="button"
            role="tab"
            :aria-selected="categoryId === cat.id"
            class="dialog__cat"
            :class="{ 'dialog__cat--active': categoryId === cat.id }"
            @click="categoryId = cat.id; error = ''"
          >
            <span aria-hidden="true">{{ cat.emoji }}</span>
            <span>{{ cat.label }}</span>
          </button>
        </div>

        <p class="dialog__hint">
          新增或删除的条目会保存在本地，之后每次抽题都会从这个完整列表里随机取。
        </p>

        <div class="dialog__form">
          <input
            v-model="draft.title"
            type="text"
            class="dialog__input"
            maxlength="100"
            placeholder="输入随机条目"
            @keydown.enter="onAdd"
          >
          <input
            v-if="showUrlInput"
            v-model="draft.url"
            type="url"
            class="dialog__input"
            maxlength="500"
            placeholder="参考网址（选填）"
            @keydown.enter="onAdd"
          >
          <button type="button" class="dialog__add" @click="onAdd">＋ 增加条目</button>
          <p v-if="error" class="dialog__error" role="alert">{{ error }}</p>
        </div>

        <div class="dialog__list">
          <p class="dialog__list-title">
            当前 <strong>{{ currentEntries.length }}</strong> 条
          </p>
          <p v-if="!currentEntries.length" class="dialog__empty">题库为空，请先增加条目。</p>
          <ul v-else class="dialog__items">
            <li v-for="entry in currentEntries" :key="entry.title" class="dialog__item">
              <div class="dialog__item-copy">
                <p class="dialog__item-title">{{ entry.title }}</p>
                <p v-if="entry.url" class="dialog__item-url">{{ entry.url }}</p>
              </div>
              <button
                type="button"
                class="dialog__delete"
                :aria-label="`删除 ${entry.title}`"
                @click="onRemove(entry)"
              >
                删除
              </button>
            </li>
          </ul>
        </div>

        <button class="dialog__done" @click="emit('close')">完成</button>
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
  z-index: 55;
  padding: 16px;
  box-sizing: border-box;
}
.dialog__scrim {
  position: absolute;
  inset: 0;
  background: #000000a6;
}
.dialog__panel {
  position: relative;
  width: min(96vw, 540px);
  max-height: 90vh;
  padding: 20px 22px;
  border-radius: 20px;
  background: #121a17;
  border: 1px solid #ffffff1f;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  box-sizing: border-box;
}
.dialog__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.dialog__title {
  margin: 0;
  font-size: 1.1rem;
  color: var(--ink);
}
.dialog__close-x {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--muted);
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
}
.dialog__close-x:hover {
  background: #ffffff14;
  color: var(--ink);
}
.dialog__modes,
.dialog__cats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.dialog__mode {
  flex: 1;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid #ffffff26;
  border-radius: 12px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
}
.dialog__mode--active {
  border-color: var(--accent);
  background: var(--accent);
  color: #2a1710;
  font-weight: 700;
}
.dialog__cat {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #ffffff26;
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}
.dialog__cat--active {
  border-color: var(--accent);
  background: #f0b42926;
  color: var(--accent-bright);
}
.dialog__hint {
  margin: 0;
  color: var(--muted);
  font-size: 0.8rem;
  line-height: 1.5;
}
.dialog__form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dialog__input {
  height: 44px;
  padding: 0 14px;
  border: 1px solid #ffffff26;
  border-radius: 12px;
  background: #0a1310;
  color: var(--ink);
  font: inherit;
  font-size: 0.95rem;
  box-sizing: border-box;
}
.dialog__input:focus {
  outline: 2px solid var(--accent-bright);
  outline-offset: 1px;
}
.dialog__add {
  height: 44px;
  border: none;
  border-radius: 12px;
  background: var(--accent);
  color: #2a1710;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.dialog__error {
  margin: 0;
  color: var(--danger);
  font-size: 0.85rem;
}
.dialog__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid #ffffff14;
  padding-top: 12px;
}
.dialog__list-title {
  margin: 0;
  font-size: 0.85rem;
  color: var(--muted);
}
.dialog__list-title strong {
  color: var(--ink);
}
.dialog__empty {
  margin: 0;
  padding: 16px 0;
  text-align: center;
  color: var(--muted);
  font-size: 0.9rem;
}
.dialog__items {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
}
.dialog__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #ffffff0d;
}
.dialog__item-copy {
  flex: 1;
  min-width: 0;
}
.dialog__item-title {
  margin: 0;
  color: var(--ink);
  font-size: 0.95rem;
  line-height: 1.4;
  word-break: break-word;
}
.dialog__item-url {
  margin: 4px 0 0;
  color: var(--research);
  font-size: 0.8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dialog__delete {
  flex-shrink: 0;
  padding: 6px 12px;
  border: 1px solid var(--danger);
  border-radius: 8px;
  background: transparent;
  color: var(--danger);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}
.dialog__delete:hover {
  background: var(--danger);
  color: #1a0a0a;
}
.dialog__done {
  height: 48px;
  border: none;
  border-radius: 999px;
  background: var(--accent);
  color: #2a1710;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  margin-top: 4px;
}
</style>
