<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useDashboardStore } from '~/stores/dashboard';

const store = useDashboardStore();
const { agents, listings, transactions } = storeToRefs(store);

const isOpen = ref(false);
const query = ref('');

const results = computed(() => {
  const term = query.value.trim().toLowerCase();
  if (!term) {
    return [];
  }

  const listingResults = listings.value
    .filter((item) => `${item.title} ${item.propertyRef} ${item.city}`.toLowerCase().includes(term))
    .map((item) => ({ id: item.id, label: item.title, meta: item.propertyRef, to: `/listings/${item.id}` }));

  const transactionResults = transactions.value
    .filter((item) => `${item.propertyRef} ${item.listingAgent.name} ${item.sellingAgent.name}`.toLowerCase().includes(term))
    .map((item) => ({ id: item.id, label: item.propertyRef, meta: item.stage, to: `/transactions/${item.id}` }));

  const agentResults = agents.value
    .filter((item) => item.name.toLowerCase().includes(term))
    .map((item) => ({ id: item.id, label: item.name, meta: 'Agent', to: '/listings' }));

  return [...listingResults, ...transactionResults, ...agentResults].slice(0, 8);
});

function toggle() {
  isOpen.value = !isOpen.value;
  if (!isOpen.value) {
    query.value = '';
  }
}

function openResult(path: string) {
  isOpen.value = false;
  query.value = '';
  return navigateTo(path);
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
});

function onKeyDown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    toggle();
  }

  if (event.key === 'Escape' && isOpen.value) {
    toggle();
  }
}
</script>

<template>
  <div class="command-palette">
    <button class="ghost-button" @click="toggle">
      Search everything
    </button>

    <div v-if="isOpen" class="command-palette__backdrop" @click="toggle">
      <div class="command-palette__panel" @click.stop>
        <input v-model="query" class="command-palette__input" type="text" placeholder="Search listings, transactions, or agents...">

        <div class="stack-list">
          <button
            v-for="result in results"
            :key="`${result.meta}-${result.id}`"
            class="command-palette__result"
            @click="openResult(result.to)"
          >
            <strong>{{ result.label }}</strong>
            <small>{{ result.meta }}</small>
          </button>

          <div v-if="query && !results.length" class="empty-state panel">
            No results matched your search.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
