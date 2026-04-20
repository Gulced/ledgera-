<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useDashboardStore } from '~/stores/dashboard';
import { useWorkspaceStore } from '~/stores/workspace';

const store = useDashboardStore();
const workspace = useWorkspaceStore();
const { listings, transactions } = storeToRefs(store);

const alerts = computed(() => workspace.getAlerts(listings.value, transactions.value));
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Alerts</p>
        <h2>Notifications and risk signals</h2>
      </div>
    </div>

    <div class="stack-list">
      <article v-for="alert in alerts" :key="alert.id" class="feed-card" :data-tone="alert.tone">
        <div class="feed-card__top">
          <strong>{{ alert.title }}</strong>
          <span class="feed-card__meta">{{ alert.tone }}</span>
        </div>
        <p>{{ alert.description }}</p>
      </article>

      <div v-if="!alerts.length" class="empty-state panel">
        No alerts right now.
      </div>
    </div>
  </section>
</template>
