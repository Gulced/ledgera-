<script setup lang="ts">
import {
  ArcElement,
  Chart as ChartJS,
  Legend,
  Tooltip,
} from 'chart.js';
import { Doughnut } from 'vue-chartjs';
import type { TransactionStage, TransactionSummary } from '~/types/api';

ChartJS.register(ArcElement, Tooltip, Legend);

const props = defineProps<{
  summary: TransactionSummary | null;
}>();

const stages: TransactionStage[] = [
  'agreement',
  'earnest_money',
  'title_deed',
  'completed',
];

const chartData = computed(() => ({
  labels: stages.map((stage) => stage.replaceAll('_', ' ')),
  datasets: [
    {
      data: stages.map((stage) => props.summary?.stageDistribution[stage] ?? 0),
      backgroundColor: ['#D9C6A1', '#D47937', '#0D7C66', '#2D241A'],
      borderWidth: 0,
      borderRadius: 8,
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        usePointStyle: true,
        boxWidth: 10,
        color: '#706253',
      },
    },
  },
};
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Stage Chart</p>
        <h2>Pipeline density</h2>
      </div>
    </div>

    <div class="chart-shell">
      <Doughnut :data="chartData" :options="chartOptions" />
    </div>
  </section>
</template>
