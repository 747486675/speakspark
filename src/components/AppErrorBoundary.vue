<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'

const failed = ref(false)
const message = ref('')

onErrorCaptured((err) => {
  failed.value = true
  message.value = err instanceof Error ? err.message : String(err)
  // Swallow the error here so it doesn't propagate and blank the app.
  return false
})

function reload() {
  window.location.reload()
}
</script>

<template>
  <div v-if="failed" class="boundary" role="alert">
    <h1 class="boundary__title">出错了。</h1>
    <p class="boundary__body">
      应用遇到意外错误并已停止。重新加载通常可以解决。
    </p>
    <p v-if="message" class="boundary__detail">{{ message }}</p>
    <button class="boundary__reload" @click="reload">重新加载</button>
  </div>
  <slot v-else />
</template>

<style scoped>
.boundary {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 32px;
  text-align: center;
}
.boundary__title {
  margin: 0;
  font-size: 1.6rem;
  color: var(--ink);
}
.boundary__body {
  margin: 0;
  max-width: 40ch;
  color: var(--muted);
}
.boundary__detail {
  margin: 0;
  max-width: 40ch;
  font-family: ui-monospace, monospace;
  font-size: 0.85rem;
  color: #ff9b9b;
  word-break: break-word;
}
.boundary__reload {
  min-height: 48px;
  padding: 0 28px;
  border: none;
  border-radius: 999px;
  background: var(--accent);
  color: #2a1710;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
</style>
