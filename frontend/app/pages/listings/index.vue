<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useDashboardStore } from '~/stores/dashboard';

const store = useDashboardStore();
const { agents, errorMessage, listingFilters, listings, successMessage } = storeToRefs(store);
const canCreateListings = computed(() =>
  ['admin', 'agent'].includes(store.activeRole),
);

const selectedAgent = computed(() =>
  agents.value.find((agent) => agent.id === listingFilters.value.agentId),
);

const listingHeading = computed(() =>
  selectedAgent.value ? `${selectedAgent.value.name}'s listings` : 'Active listing pool',
);

const listingEyebrow = computed(() =>
  selectedAgent.value ? 'Agent Listings' : 'Listings',
);

watch(
  () => store.activeRole,
  async () => {
    await Promise.all([store.loadAgents(), store.loadListings()]);
  },
);

await store.loadAgents();
await store.loadListings();
</script>

<template>
  <AppShell>
    <div class="dashboard-grid">
      <div class="dashboard-grid__main">
        <section class="workspace-hero panel rounded-[34px] border border-white/70 bg-white/80 px-8 py-8 shadow-[0_24px_60px_rgba(31,41,55,0.08)] backdrop-blur-xl">
          <div class="workspace-hero__copy">
            <p class="eyebrow text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-slate-400">Listing Command</p>
            <h2 class="max-w-3xl text-balance text-3xl font-semibold leading-[1.02] tracking-tight text-slate-900">Manage portfolio visibility, status changes, and listing-to-deal handoff in one place.</h2>
            <p class="mt-4 max-w-3xl text-base leading-8 text-slate-500">
              Use this workspace to monitor active inventory, filter by agent ownership, and move the
              right properties into transaction flow at the right time.
            </p>
          </div>

          <div class="workspace-hero__metrics grid gap-4 md:grid-cols-2">
            <div class="rounded-[26px] border border-slate-200/80 bg-white px-6 py-5 shadow-[0_14px_34px_rgba(31,41,55,0.05)]">
              <span class="text-sm text-slate-400">Visible Listings</span>
              <strong class="mt-3 block text-4xl font-semibold tracking-tight text-slate-900">{{ listings.length }}</strong>
            </div>
            <div class="rounded-[26px] border border-slate-200/80 bg-white px-6 py-5 shadow-[0_14px_34px_rgba(31,41,55,0.05)]">
              <span class="text-sm text-slate-400">Selected Agent</span>
              <strong class="mt-3 block text-4xl font-semibold tracking-tight text-slate-900">{{ selectedAgent?.name || 'All portfolios' }}</strong>
            </div>
          </div>
        </section>

        <div v-if="errorMessage" class="error-banner">
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="success-banner">
          {{ successMessage }}
        </div>

        <ListingFilters />
        <ListingList
          v-if="listings.length"
          :items="listings"
          :heading="listingHeading"
          :eyebrow="listingEyebrow"
        />
        <div v-else class="panel empty-state rounded-[28px] border border-dashed border-slate-200 bg-white/70 px-8 py-10 text-slate-500">
          {{
            selectedAgent
              ? `No listings matched the current filters for ${selectedAgent.name}.`
              : 'No listings matched the current filters.'
          }}
        </div>
      </div>

      <div class="dashboard-grid__side">
        <CreateListingPanel v-if="canCreateListings" />
      </div>
    </div>
  </AppShell>
</template>
