<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useDashboardStore } from '~/stores/dashboard';
import { titleCaseStage } from '~/utils/format';

const store = useDashboardStore();
const { agents, isLoading, listingFilters, listings } = storeToRefs(store);

watch(
  () => [listingFilters.value.search, listingFilters.value.status, listingFilters.value.agentId],
  () => {
    const timer = setTimeout(() => {
      store.loadListings();
    }, 250);

    onWatcherCleanup(() => clearTimeout(timer));
  },
);

const searchSuggestions = computed(() => {
  const search = listingFilters.value.search.trim();

  if (!search) {
    return [];
  }

  return listings.value.slice(0, 5);
});

function openListingDetail(id: string) {
  if (import.meta.client) {
    window.location.assign(`/listings/${id}`);
  }
}
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Listing Filters</p>
        <h2>Search and filter listings</h2>
      </div>
      <button class="ghost-button" @click="store.resetListingFilters()">
        Reset
      </button>
    </div>

    <div class="filters-grid">
      <label>
        <span>Search</span>
        <div class="search-stack">
          <input
            v-model="listingFilters.search"
            type="text"
            placeholder="Property ref, title, or city"
          >

          <div v-if="searchSuggestions.length" class="search-suggestions">
            <button
              v-for="item in searchSuggestions"
              :key="item.id"
              class="search-suggestion"
              type="button"
              @click="openListingDetail(item.id)"
            >
              <strong>{{ item.title }}</strong>
              <small>
                {{ item.propertyRef }} • {{ item.city }} •
                {{ titleCaseStage(item.status) }}
              </small>
            </button>
          </div>
        </div>
      </label>
      <label>
        <span>Status</span>
        <select v-model="listingFilters.status">
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="under_offer">Under Offer</option>
          <option value="closed">Closed</option>
        </select>
      </label>
      <label>
        <span>Agent</span>
        <select v-model="listingFilters.agentId">
          <option value="">All</option>
          <option v-for="agent in agents" :key="agent.id" :value="agent.id">
            {{ agent.name }} • {{ agent.id }}
          </option>
        </select>
      </label>
    </div>

    <div class="filters-actions">
      <button class="primary-button" :disabled="isLoading" @click="store.loadListings()">
        {{ isLoading ? 'Loading...' : 'Apply Filters' }}
      </button>
    </div>
  </section>
</template>
