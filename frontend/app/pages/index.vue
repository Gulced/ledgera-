<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useDashboardStore } from '~/stores/dashboard';
import type { Listing } from '~/types/api';

const store = useDashboardStore();
const { errorMessage, filters, isLoading, successMessage, summary, transactions } = storeToRefs(store);
const api = useLedgeraApi();
const canManageAgents = computed(() => store.activeRole === 'admin');
const canCreateTransactions = computed(() =>
  ['admin', 'operations'].includes(store.activeRole),
);
const isOperations = computed(() => store.activeRole === 'operations');
const isAdmin = computed(() => store.activeRole === 'admin');
const adminListings = ref<Listing[]>([]);
const adminListingError = ref('');

async function loadAdminListings() {
  if (!isAdmin.value) {
    adminListings.value = [];
    adminListingError.value = '';
    return;
  }

  try {
    adminListings.value = await api.getListings(store.actor, {
      search: '',
      status: '',
      agentId: '',
    });
    adminListingError.value = '';
  } catch (error) {
    const appError = error as { statusMessage?: string };
    adminListingError.value = appError.statusMessage ?? 'Listing map could not be loaded.';
    adminListings.value = [];
  }
}

watch(
  () => store.activeRole,
  async () => {
    await Promise.all([store.loadAgents(), store.loadDashboard(), loadAdminListings()]);
  },
);

await store.loadAgents();
await store.loadDashboard();
await loadAdminListings();
</script>

<template>
  <AppShell>
    <div class="dashboard-grid">
      <section class="workspace-hero panel">
        <div class="workspace-hero__copy">
          <p class="eyebrow">Daily Snapshot</p>
          <h2>Keep listings, transactions, and revenue signals in one calm operating view.</h2>
          <p>
            This dashboard is designed for fast scanning: open deals, payout exposure, stage density,
            and operational actions all stay visible without losing financial context.
          </p>
        </div>

        <div class="workspace-hero__metrics">
          <div>
            <span>Workspace Mode</span>
            <strong>{{ store.activeRole }}</strong>
          </div>
          <div>
            <span>Live Transactions</span>
            <strong>{{ summary?.totals.transactions || 0 }}</strong>
          </div>
        </div>
      </section>

      <SummaryCards :summary="summary" :currency="filters.currency || 'EUR'" />

      <div v-if="errorMessage" class="error-banner">
        {{ errorMessage }}
      </div>

      <div v-if="successMessage" class="success-banner">
        {{ successMessage }}
      </div>

      <section v-if="isAdmin" class="panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Admin Overview</p>
            <h2>Listing map by full address</h2>
          </div>
        </div>

        <p class="helper-copy helper-copy--compact">
          Click a marker to open that listing detail. Marker placement uses the saved full address
          within the selected city footprint.
        </p>

        <div v-if="adminListingError" class="error-banner">
          {{ adminListingError }}
        </div>
        <ListingsOverviewMap v-else-if="adminListings.length" :listings="adminListings" />
        <div v-else class="preview-empty-state">
          <p class="eyebrow">No listing markers</p>
          <h3>No listings are ready to plot yet.</h3>
          <p>Create a listing with a supported city and full address to show it here.</p>
        </div>
      </section>

      <div class="dashboard-grid__main">
        <TransactionFilters />
        <TransactionTable v-if="transactions.length" :items="transactions" />
        <div v-else-if="!isLoading" class="empty-state panel">
          No transactions matched the current filters.
        </div>
        <PaginationControls />
      </div>

      <div class="dashboard-grid__side">
        <section v-if="isOperations" class="panel">
          <div class="panel__header">
            <div>
              <p class="eyebrow">Operations Workspace</p>
              <h2>Own the workflow</h2>
            </div>
          </div>

          <p class="helper-copy helper-copy--compact">
            Use this view to open transactions, monitor the stage pipeline, and keep deals moving from
            agreement to completion.
          </p>

          <div class="quick-links">
            <NuxtLink class="table-link" to="/listings">
              Review active listings
            </NuxtLink>
          </div>
        </section>

        <CreateUserAccountPanel v-if="canManageAgents" />
        <CreateTransactionPanel v-if="canCreateTransactions" />
        <ExportToolbar :items="transactions" />
        <AlertsPanel />
        <CalendarPanel />
        <ActivityFeedPanel />
        <AgentPerformancePanel />
        <StageDistribution :summary="summary" />
        <StageDistributionChart :summary="summary" />
        <CommissionPreviewPanel />
      </div>
    </div>
  </AppShell>
</template>
