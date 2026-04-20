<script setup lang="ts">
import type { Transaction, TransactionStage } from '~/types/api';
import { titleCaseStage } from '~/utils/format';

const props = defineProps<{
  transaction: Transaction;
}>();

const stages: TransactionStage[] = ['agreement', 'earnest_money', 'title_deed', 'completed'];

const stageCopy: Record<TransactionStage, string> = {
  agreement: 'Early-stage deal',
  earnest_money: 'Deposit secured',
  title_deed: 'Closing in progress',
  completed: 'Closed and locked',
};

const currentIndex = computed(() => stages.indexOf(props.transaction.stage));
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Workflow Path</p>
        <h2>Transaction stage flow</h2>
      </div>
    </div>

    <div class="stage-stepper">
      <article
        v-for="(stage, index) in stages"
        :key="stage"
        class="stage-step"
        :data-state="
          index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming'
        "
      >
        <div class="stage-step__marker">
          <span>{{ index + 1 }}</span>
        </div>
        <div class="stage-step__content">
          <strong>{{ titleCaseStage(stage) }}</strong>
          <small>{{ stageCopy[stage] }}</small>
        </div>
      </article>
    </div>
  </section>
</template>
