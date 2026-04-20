<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useDashboardStore } from '~/stores/dashboard';
import { useWorkspaceStore } from '~/stores/workspace';

const store = useDashboardStore();
const workspace = useWorkspaceStore();
const { agents, listings, transactions } = storeToRefs(store);

const performance = computed(() =>
  workspace.getAgentPerformance(agents.value, listings.value, transactions.value),
);
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Performance</p>
        <h2>Agent performance snapshot</h2>
      </div>
    </div>

    <div class="stack-list">
      <article v-for="agent in performance" :key="agent.id" class="feed-card">
        <div class="feed-card__top">
          <strong>{{ agent.name }}</strong>
          <small>{{ agent.completedDeals }} completed</small>
        </div>
        <p>{{ agent.listings }} listings • {{ agent.transactions }} related transactions</p>
        <span class="feed-card__meta">Payout €{{ agent.payoutTotal.toLocaleString() }}</span>
      </article>

      <div v-if="!performance.length" class="empty-state panel">
        Agent performance will appear as portfolio and transaction data grows.
      </div>
    </div>
  </section>
</template>
