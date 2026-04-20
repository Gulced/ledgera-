<script setup lang="ts">
import type { TransactionSummary, TransactionStage } from '~/types/api';
import { titleCaseStage } from '~/utils/format';

const props = defineProps<{
  summary: TransactionSummary | null;
}>();

const stages: TransactionStage[] = [
  'agreement',
  'earnest_money',
  'title_deed',
  'completed',
];

const maxValue = computed(() => {
  if (!props.summary) {
    return 1;
  }

  return Math.max(...stages.map((stage) => props.summary?.stageDistribution[stage] ?? 0), 1);
});
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Stage Distribution</p>
        <h2>Pipeline overview</h2>
      </div>
    </div>

    <div class="distribution-list">
      <div
        v-for="stage in stages"
        :key="stage"
        class="distribution-item"
      >
        <div class="distribution-item__label">
          <span>{{ titleCaseStage(stage) }}</span>
          <strong>{{ summary?.stageDistribution[stage] ?? 0 }}</strong>
        </div>
        <div class="distribution-item__track">
          <div
            class="distribution-item__fill"
            :style="{
              width: `${((summary?.stageDistribution[stage] ?? 0) / maxValue) * 100}%`,
            }"
          />
        </div>
      </div>
    </div>
  </section>
</template>
