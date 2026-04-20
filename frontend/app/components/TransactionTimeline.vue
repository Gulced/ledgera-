<script setup lang="ts">
import type { Transaction } from '~/types/api';
import { formatDate, titleCaseStage } from '~/utils/format';

defineProps<{
  transaction: Transaction;
}>();
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Timeline</p>
        <h2>Workflow history</h2>
      </div>
    </div>

    <ol class="timeline">
      <li v-for="item in transaction.history" :key="`${item.stage}-${item.changedAt}`">
        <div class="timeline__dot" />
        <div class="timeline__content">
          <strong>{{ titleCaseStage(item.stage) }}</strong>
          <p>{{ item.changedBy.name || item.changedBy.userId }}</p>
          <small>{{ formatDate(item.changedAt) }}</small>
        </div>
      </li>
    </ol>
  </section>
</template>
