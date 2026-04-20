<script setup lang="ts">
import type { Transaction } from '~/types/api';
import { formatDate } from '~/utils/format';

defineProps<{
  transaction: Transaction;
}>();
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Audit Trail</p>
        <h2>Traceability records</h2>
      </div>
    </div>

    <ul class="audit-list">
      <li
        v-for="entry in transaction.activityLog"
        :key="entry.id"
        class="audit-list__item"
      >
        <div class="audit-list__marker" />
        <div class="audit-list__card">
          <div class="audit-list__topline">
            <strong>{{ entry.summary }}</strong>
            <small>{{ formatDate(entry.timestamp) }}</small>
          </div>

          <p class="audit-list__actor">
            {{ entry.actorName || entry.actorId }}
          </p>
          <span class="stage-badge">
            {{ entry.actorRole }}
          </span>
        </div>
      </li>
    </ul>
  </section>
</template>
