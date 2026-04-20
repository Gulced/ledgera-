<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useDashboardStore } from '~/stores/dashboard';
import type { Transaction, TransactionStage } from '~/types/api';
import { titleCaseStage } from '~/utils/format';

const props = defineProps<{
  transaction: Transaction;
}>();

const emit = defineEmits<{
  updated: [transaction: Transaction];
}>();

const store = useDashboardStore();
const { actor, isMutating } = storeToRefs(store);

const nextStageMap: Record<TransactionStage, TransactionStage | null> = {
  agreement: 'earnest_money',
  earnest_money: 'title_deed',
  title_deed: 'completed',
  completed: null,
};

const nextStage = computed(() => nextStageMap[props.transaction.stage]);
const canTransition = computed(() =>
  ['admin', 'operations'].includes(actor.value.role) && !!nextStage.value,
);

async function advance() {
  if (!nextStage.value) {
    return;
  }

  const updated = await store.transitionTransaction(props.transaction.id, nextStage.value);
  emit('updated', updated);
}
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Stage Action</p>
        <h2>Advance workflow</h2>
      </div>
    </div>

    <p class="stage-action-copy">
      Current stage: <strong>{{ titleCaseStage(transaction.stage) }}</strong>
    </p>

    <button
      class="primary-button"
      :disabled="!canTransition || isMutating"
      @click="advance"
    >
      {{
        canTransition && nextStage
          ? `Move to ${titleCaseStage(nextStage)}`
          : 'This role cannot advance the stage'
      }}
    </button>
  </section>
</template>
