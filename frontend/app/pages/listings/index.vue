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
        <section class="workspace-hero panel">
          <div class="workspace-hero__copy">
            <p class="eyebrow">Listing Command</p>
            <h2>Manage portfolio visibility, status changes, and listing-to-deal handoff in one place.</h2>
            <p>
              Use this workspace to monitor active inventory, filter by agent ownership, and move the
              right properties into transaction flow at the right time.
            </p>
          </div>

          <div class="workspace-hero__metrics">
            <div>
              <span>Visible Listings</span>
              <strong>{{ listings.length }}</strong>
            </div>
            <div>
              <span>Selected Agent</span>
              <strong>{{ selectedAgent?.name || 'All portfolios' }}</strong>
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
        <div v-else class="panel empty-state">
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
