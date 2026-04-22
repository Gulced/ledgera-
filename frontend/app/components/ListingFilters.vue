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
  <section class="panel rounded-[30px] border border-white/70 bg-white/85 p-7 shadow-[0_22px_52px_rgba(31,41,55,0.08)] backdrop-blur-xl">
    <div class="panel__header">
      <div>
        <p class="eyebrow text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-slate-400">Listing Filters</p>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Search and filter listings</h2>
      </div>
      <button class="ghost-button inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900" @click="store.resetListingFilters()">
        Reset
      </button>
    </div>

    <div class="filters-grid mt-6 grid gap-5 md:grid-cols-3">
      <label class="grid gap-2.5">
        <span class="text-sm font-medium text-slate-600">Search</span>
        <div class="search-stack relative">
          <input
            v-model="listingFilters.search"
            type="text"
            placeholder="Property ref, title, or city"
            class="min-h-[56px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
          >

          <div v-if="searchSuggestions.length" class="search-suggestions absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-[22px] border border-slate-200 bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
            <button
              v-for="item in searchSuggestions"
              :key="item.id"
              class="search-suggestion grid w-full gap-1 rounded-2xl px-4 py-3 text-left transition hover:bg-slate-50"
              type="button"
              @click="openListingDetail(item.id)"
            >
              <strong class="text-sm font-semibold text-slate-900">{{ item.title }}</strong>
              <small class="text-xs leading-5 text-slate-500">
                {{ item.propertyRef }} • {{ item.city }} •
                {{ titleCaseStage(item.status) }}
              </small>
            </button>
          </div>
        </div>
      </label>
      <label class="grid gap-2.5">
        <span class="text-sm font-medium text-slate-600">Status</span>
        <select v-model="listingFilters.status" class="min-h-[56px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100">
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="under_offer">Under Offer</option>
          <option value="closed">Closed</option>
        </select>
      </label>
      <label class="grid gap-2.5">
        <span class="text-sm font-medium text-slate-600">Agent</span>
        <select v-model="listingFilters.agentId" class="min-h-[56px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100">
          <option value="">All</option>
          <option v-for="agent in agents" :key="agent.id" :value="agent.id">
            {{ agent.name }} • {{ agent.id }}
          </option>
        </select>
      </label>
    </div>

    <div class="filters-actions mt-5">
      <button class="primary-button inline-flex min-h-[54px] items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#3b2f95,#6d5efc)] px-5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(99,102,241,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" :disabled="isLoading" @click="store.loadListings()">
        {{ isLoading ? 'Loading...' : 'Apply Filters' }}
      </button>
    </div>
  </section>
</template>
