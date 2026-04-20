<script setup lang="ts">
import { useWorkspaceStore } from '~/stores/workspace';
import { formatDate } from '~/utils/format';

const props = defineProps<{
  title?: string;
}>();

const workspace = useWorkspaceStore();
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Activity</p>
        <h2>{{ title || 'Recent workspace activity' }}</h2>
      </div>
    </div>

    <div class="stack-list">
      <article v-for="event in workspace.recentEvents" :key="event.id" class="feed-card">
        <div class="feed-card__top">
          <strong>{{ event.title }}</strong>
          <small>{{ formatDate(event.createdAt) }}</small>
        </div>
        <p>{{ event.description }}</p>
        <span class="feed-card__meta">{{ event.actorName }}</span>
      </article>

      <div v-if="!workspace.recentEvents.length" class="empty-state panel">
        No activity has been recorded yet.
      </div>
    </div>
  </section>
</template>
