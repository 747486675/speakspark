<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { offTheCuffCategories } from './data/topics'
import { usePersistentSettings } from './composables/usePersistentSettings'
import { usePracticeMachine } from './composables/usePracticeMachine'
import { getLibraryEntries, getActiveTopics, getTopicUrl } from './lib/library'
import AppErrorBoundary from './components/AppErrorBoundary.vue'
import Brand from './components/Brand.vue'
import ModeSwitch from './components/ModeSwitch.vue'
import CategorySelect from './components/CategorySelect.vue'
import TopicReel from './components/TopicReel.vue'
import ActionBar from './components/ActionBar.vue'
import SettingsDialog from './components/SettingsDialog.vue'
import TimerOverlay from './components/TimerOverlay.vue'
import CustomTopicsDialog from './components/CustomTopicsDialog.vue'
import GuideTips from './components/GuideTips.vue'

const { settings, library, recentTopics, rememberTopic, addEntry, removeEntry } =
  usePersistentSettings()
const machine = usePracticeMachine()

const settingsOpen = ref(false)
const libraryOpen = ref(false)

// 把库合并进机器的 topics：内置 + 自定义去重。
// 用计算属性保持响应式：当 library 或 mode/category 变化时，topics 也会变。
const effectiveTopics = computed(() => {
  if (machine.state.mode === 'deep-research') {
    return getActiveTopics('deep-research', 'general', library.research)
  }
  const entries = getLibraryEntries(library, 'off-the-cuff', machine.state.categoryId)
  return getActiveTopics('off-the-cuff', machine.state.categoryId, entries)
})

const hasSelection = computed(() => machine.state.selectedTopic !== null)

const controlsLocked = machine.controlsLocked
const canStartTimer = machine.canStartTimer

// 在 idle 状态下显示当前显示的话题；否则让 ActionBar / 帧循环推过来的。
const displayedTopic = computed(() =>
  hasSelection.value && !machine.state.isSpinning ? machine.state.selectedTopic! : machine.state.displayedTopic,
)

// 当前 topic 的 URL（深研模式用）
const topicUrl = computed(() => {
  if (machine.state.mode !== 'deep-research') return ''
  return getTopicUrl(machine.state.selectedTopic ?? machine.state.displayedTopic, library.research)
})

function onStartTimer() {
  if (machine.state.mode === 'deep-research') {
    machine.startResearch()
  } else {
    machine.startSpeech()
  }
}

function onAdvance(topic: string, tickMs: number) {
  machine.advanceTo(topic, tickMs)
}

function onSettle(_landing: string) {
  machine.settleSpin()
}

function onBeginSpin(landing: string) {
  machine.beginSpin(landing)
}

function onRememberTopic(topic: string) {
  rememberTopic(topic)
}

function onAddEntry(
  mode: 'off-the-cuff' | 'deep-research',
  categoryId: string,
  title: string,
  url: string,
): boolean {
  const result = addEntry(mode, categoryId, title, url)
  return result.ok
}

function onRemoveEntry(
  mode: 'off-the-cuff' | 'deep-research',
  categoryId: string,
  title: string,
) {
  removeEntry(mode, categoryId, title)
}

// 当分类/模式切换后，机器会重置 displayedTopic；为了一致性，主动从 effectiveTopics 重新挑一个。
watch(
  () => [machine.state.mode, machine.state.categoryId] as const,
  () => {
    if (machine.state.isSpinning || machine.state.timerPhase !== 'idle') return
    const list = effectiveTopics.value
    if (list.length > 0 && !list.includes(machine.state.displayedTopic)) {
      // 让 machine 走 reshuffleDisplayed 的同款行为
      machine.cancelSpin()
    }
  },
)
</script>

<template>
  <AppErrorBoundary>
    <main class="app">
      <div class="app__main">
        <Brand />
        <ModeSwitch
          :mode="machine.state.mode"
          :disabled="controlsLocked"
          @update="machine.setMode($event)"
        />
        <CategorySelect
          v-if="machine.state.mode !== 'deep-research'"
          :categories="offTheCuffCategories"
          :selected-id="machine.state.categoryId"
          :disabled="controlsLocked"
          @select="machine.setCategory($event)"
        />
        <TopicReel
          :topic="displayedTopic"
          :is-spinning="machine.state.isSpinning"
          :has-selection="hasSelection"
          :tick-ms="machine.state.tickMs"
          :revision="machine.state.topicRevision"
        />
        <ActionBar
          :topics="effectiveTopics"
          :displayed-topic="machine.state.displayedTopic"
          :recent-topics="recentTopics"
          :can-start-timer="canStartTimer"
          :controls-locked="controlsLocked"
          :is-spinning="machine.state.isSpinning"
          :muted="settings.muted"
          @begin-spin="onBeginSpin"
          @advance="onAdvance"
          @settle="onSettle"
          @remember-topic="onRememberTopic"
          @start-timer="onStartTimer"
          @open-settings="settingsOpen = true"
          @open-library="libraryOpen = true"
        />
      </div>

      <aside class="app__side" aria-label="辅助信息">
        <GuideTips />
      </aside>

      <SettingsDialog
        :open="settingsOpen"
        :speech-seconds="settings.speechSeconds"
        :research-seconds="settings.researchSeconds"
        :muted="settings.muted"
        @close="settingsOpen = false"
        @update-speech="settings.speechSeconds = $event"
        @update-research="settings.researchSeconds = $event"
        @update-muted="settings.muted = $event"
      />

      <CustomTopicsDialog
        :open="libraryOpen"
        :library="library"
        @close="libraryOpen = false"
        @add-entry="onAddEntry"
        @remove-entry="onRemoveEntry"
      />

      <TimerOverlay
        :phase="machine.state.timerPhase"
        :mode="machine.state.mode"
        :topic="machine.state.selectedTopic ?? ''"
        :speech-seconds="settings.speechSeconds"
        :research-seconds="settings.researchSeconds"
        :muted="settings.muted"
        :topic-url="topicUrl"
        @finish-research="machine.finishResearch()"
        @start-speech="machine.startSpeechFromReady()"
        @finish-speech="machine.finishSpeech()"
        @close="machine.closeTimer()"
      />
    </main>
  </AppErrorBoundary>
</template>

<style scoped>
.app {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
  padding: 32px 20px;
  max-width: 640px;
  margin: 0 auto;
  box-sizing: border-box;
}
.app__main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
  width: 100%;
}
.app__side {
  display: none;
  width: 100%;
  max-width: 640px;
}

/* PC 宽屏（>= 960px）：两栏布局，主体居中、辅助信息靠右。 */
@media (min-width: 960px) {
  .app {
    max-width: 1080px;
    flex-direction: row;
    align-items: flex-start;
    justify-content: center;
    gap: 56px;
    padding: 56px 32px;
  }
  .app__main {
    flex: 0 1 640px;
    align-items: stretch;
  }
  .app__side {
    display: flex;
    flex: 0 0 320px;
    padding-top: 96px;
  }
}

/* 超宽屏（>= 1280px）：给主区更多留白，避免内容贴边。 */
@media (min-width: 1280px) {
  .app {
    max-width: 1200px;
    gap: 80px;
  }
  .app__main {
    flex: 0 1 680px;
  }
  .app__side {
    flex: 0 0 340px;
    padding-top: 120px;
  }
}

/* 触摸设备：避免双击放大，按钮需要更明确的反馈。 */
@media (hover: none) {
  .app {
    padding-bottom: calc(32px + env(safe-area-inset-bottom, 0));
  }
}
</style>
