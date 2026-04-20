<script setup lang="ts">
import type { TransactionSummary, Transaction } from '~/types/api';
import { formatMoney } from '~/utils/format';

const props = defineProps<{
  summary: TransactionSummary | null;
  currency?: Transaction['currency'];
}>();

const cards = computed(() => {
  if (!props.summary) {
    return [];
  }

  const selectedCurrency = props.currency || 'EUR';

  return [
    {
      label: 'Total Transactions',
      value: props.summary.totals.transactions.toString(),
      tone: 'neutral',
    },
    {
      label: 'Completed Deals',
      value: props.summary.totals.completedTransactions.toString(),
      tone: 'success',
    },
    {
      label: 'Agency Earnings',
      value: formatMoney(props.summary.earningsBreakdown.agencyTotal, selectedCurrency),
      tone: 'accent',
    },
    {
      label: 'Agent Earnings',
      value: formatMoney(props.summary.earningsBreakdown.agentTotal, selectedCurrency),
      tone: 'warm',
    },
  ];
});
</script>

<template>
  <section class="card-grid">
    <article
      v-for="card in cards"
      :key="card.label"
      class="summary-card"
      :data-tone="card.tone"
    >
      <p>{{ card.label }}</p>
      <strong>{{ card.value }}</strong>
    </article>
  </section>
</template>
