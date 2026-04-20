<script setup lang="ts">
import { useWorkspaceStore } from '~/stores/workspace';

const workspace = useWorkspaceStore();
const items = computed(() => workspace.getCalendarItems());
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Calendar</p>
        <h2>Upcoming scheduled actions</h2>
      </div>
    </div>

    <div class="stack-list">
      <article v-for="item in items" :key="item.id" class="feed-card">
        <div class="feed-card__top">
          <strong>{{ item.title }}</strong>
          <small>{{ item.dueDate }}</small>
        </div>
        <p>{{ item.assigneeName }}</p>
        <span class="feed-card__meta">{{ item.entityType }}</span>
      </article>

      <div v-if="!items.length" class="empty-state panel">
        No scheduled actions yet.
      </div>
    </div>
  </section>
</template>
