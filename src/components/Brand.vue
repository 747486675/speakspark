<script setup lang="ts">
import { brand } from '../config'
</script>

<template>
  <header class="brand">
    <h1 class="brand__name">{{ brand.name }}</h1>
    <p class="brand__tagline">{{ brand.tagline }}</p>
    <a
      v-if="brand.authorLabel && brand.authorUrl"
      class="brand__author"
      :href="brand.authorUrl"
      target="_blank"
      rel="noopener noreferrer"
    >{{ brand.authorLabel }}</a>
  </header>
</template>

<style scoped>
.brand {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.brand__name {
  margin: 0;
  font-size: 1.5rem;
  letter-spacing: 0.02em;
  color: var(--ink);
}
.brand__tagline {
  margin: 0;
  font-size: 0.9rem;
  color: var(--muted);
}
.brand__author {
  font-size: 0.8rem;
  color: var(--muted);
  text-decoration: underline;
}
.brand__author:hover {
  color: var(--accent-bright);
}
</style>
