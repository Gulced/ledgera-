<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useDashboardStore } from '~/stores/dashboard';

const store = useDashboardStore();
const { paginationMeta } = storeToRefs(store);

async function goTo(page: number) {
  store.filters.page = page;
  await store.loadDashboard();
}
</script>

<template>
  <div class="pagination">
    <p>
      Page {{ paginationMeta.page }} / {{ Math.max(paginationMeta.totalPages, 1) }}
      • {{ paginationMeta.totalItems }} records
    </p>

    <div class="pagination__actions">
      <button
        class="ghost-button"
        :disabled="!paginationMeta.hasPrevPage"
        @click="goTo(paginationMeta.page - 1)"
      >
        Previous
      </button>
      <button
        class="ghost-button"
        :disabled="!paginationMeta.hasNextPage"
        @click="goTo(paginationMeta.page + 1)"
      >
        Next
      </button>
    </div>
  </div>
</template>
