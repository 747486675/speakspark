<script setup lang="ts">
const tips = [
  '先用一句话说清核心观点',
  '给出两个理由或一个具体例子',
  '最后回到观点，做一个简短总结',
]
</script>

<template>
  <section class="guide" aria-label="表达三步法">
    <h3 class="guide__title">表达三步法</h3>
    <ol class="guide__list">
      <li v-for="(tip, index) in tips" :key="tip" class="guide__item">
        <span class="guide__number" aria-hidden="true">{{ index + 1 }}</span>
        <span class="guide__text">{{ tip }}</span>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.guide {
  width: 100%;
  max-width: 480px;
  padding: 18px 20px;
  border: 1px solid #ffffff14;
  border-radius: 16px;
  background: #ffffff08;
  box-sizing: border-box;
}
.guide__title {
  margin: 0 0 10px;
  color: var(--ink);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}
.guide__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.guide__item {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--muted);
  font-size: 0.9rem;
  line-height: 1.4;
}
.guide__number {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: var(--accent);
  color: #2a1710;
  font-size: 0.8rem;
  font-weight: 800;
}
.guide__text {
  flex: 1;
}
</style>
