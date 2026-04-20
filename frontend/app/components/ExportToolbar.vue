<script setup lang="ts">
import type { Transaction } from '~/types/api';

const props = defineProps<{
  items: Transaction[];
}>();

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

function exportVisible() {
  const rows = [
    ['Property Ref', 'Stage', 'Listing Agent', 'Selling Agent', 'Fee', 'Updated At'],
    ...props.items.map((item) => [
      item.propertyRef,
      item.stage,
      item.listingAgent.name,
      item.sellingAgent.name,
      String(item.totalServiceFee),
      item.updatedAt,
    ]),
  ];

  downloadCsv('ledgera-visible-transactions.csv', rows);
}

function exportCompleted() {
  const completed = props.items.filter((item) => item.stage === 'completed');
  const rows = [
    ['Property Ref', 'Agency Share', 'Agent Pool', 'Updated At'],
    ...completed.map((item) => [
      item.propertyRef,
      String(item.commission.agencyShare),
      String(item.commission.agentPool),
      item.updatedAt,
    ]),
  ];

  downloadCsv('ledgera-completed-financials.csv', rows);
}
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Export</p>
        <h2>Financial export</h2>
      </div>
    </div>

    <div class="filters-actions">
      <button class="ghost-button" @click="exportVisible">
        Export visible transactions
      </button>
      <button class="primary-button" @click="exportCompleted">
        Export completed financials
      </button>
    </div>
  </section>
</template>
