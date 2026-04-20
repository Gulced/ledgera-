<script setup lang="ts">
import type { Transaction } from '~/types/api';
import { formatDate, formatMoney, titleCaseStage } from '~/utils/format';

defineProps<{
  items: Transaction[];
}>();
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Transactions</p>
        <h2>Operations list</h2>
      </div>
    </div>

    <div class="table-shell">
      <table class="transaction-table">
        <thead>
          <tr>
            <th>Property</th>
            <th>Stage</th>
            <th>Agents</th>
            <th>Fee</th>
            <th>Updated</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>
              <strong>{{ item.propertyRef }}</strong>
            </td>
            <td>
              <span class="stage-badge" :data-stage="item.stage">
                {{ titleCaseStage(item.stage) }}
              </span>
            </td>
            <td>
              <p>{{ item.listingAgent.name }}</p>
              <small>{{ item.sellingAgent.name }}</small>
            </td>
            <td>{{ formatMoney(item.totalServiceFee, item.currency) }}</td>
            <td>{{ formatDate(item.updatedAt) }}</td>
            <td>
              <NuxtLink class="table-link" :to="`/transactions/${item.id}`">
                View Detail
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
