<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useAuthStore } from '~/stores/auth';
import { useDashboardStore } from '~/stores/dashboard';
import { useWorkspaceStore } from '~/stores/workspace';
import type { Listing } from '~/types/api';

const store = useDashboardStore();
const workspace = useWorkspaceStore();
const authStore = useAuthStore();
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

async function loadDashboardWorkspace() {
  await authStore.loadAccounts();

  await Promise.allSettled([
    store.loadAgents(),
    store.loadDashboard(),
    store.loadListings(),
    workspace.hydrate(true),
    loadAdminListings(),
  ]);
}

watch(
  () => store.activeRole,
  async () => {
    await loadDashboardWorkspace();
  },
);

await loadDashboardWorkspace();
</script>

<template>
  <AppShell>
    <div class="dashboard-grid">
      <section class="workspace-hero panel rounded-[34px] border border-white/70 bg-white/80 px-8 py-8 shadow-[0_24px_60px_rgba(31,41,55,0.08)] backdrop-blur-xl">
        <div class="workspace-hero__copy">
          <p class="eyebrow text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-slate-400">Daily Snapshot</p>
          <h2 class="max-w-3xl text-balance text-3xl font-semibold leading-[1.02] tracking-tight text-slate-900">Keep listings, transactions, and revenue signals in one calm operating view.</h2>
          <p class="mt-4 max-w-3xl text-base leading-8 text-slate-500">
            This dashboard is designed for fast scanning: open deals, payout exposure, stage density,
            and operational actions all stay visible without losing financial context.
          </p>
        </div>

        <div class="workspace-hero__metrics grid gap-4 md:grid-cols-2">
          <div class="rounded-[26px] border border-slate-200/80 bg-white px-6 py-5 shadow-[0_14px_34px_rgba(31,41,55,0.05)]">
            <span class="text-sm text-slate-400">Workspace Mode</span>
            <strong class="mt-3 block text-4xl font-semibold tracking-tight text-slate-900">{{ store.activeRole }}</strong>
          </div>
          <div class="rounded-[26px] border border-slate-200/80 bg-white px-6 py-5 shadow-[0_14px_34px_rgba(31,41,55,0.05)]">
            <span class="text-sm text-slate-400">Live Transactions</span>
            <strong class="mt-3 block text-4xl font-semibold tracking-tight text-slate-900">{{ summary?.totals.transactions || 0 }}</strong>
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

      <section v-if="isAdmin" class="panel rounded-[34px] border border-white/70 bg-white/80 px-8 py-8 shadow-[0_24px_60px_rgba(31,41,55,0.08)] backdrop-blur-xl">
        <div class="panel__header">
          <div>
            <p class="eyebrow text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-slate-400">Admin Overview</p>
            <h2 class="text-3xl font-semibold tracking-tight text-slate-900">Listing map by full address</h2>
          </div>
        </div>

        <p class="helper-copy helper-copy--compact mt-3 max-w-3xl text-sm leading-7 text-slate-500">
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
