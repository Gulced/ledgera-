<script setup lang="ts">
import { useDashboardStore } from '~/stores/dashboard';
import { formatDate, formatMoney, titleCaseStage } from '~/utils/format';
import type { Listing, ListingFilters, Transaction } from '~/types/api';

const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  istanbul: { lat: 41.0082, lng: 28.9784 },
  ankara: { lat: 39.9334, lng: 32.8597 },
  izmir: { lat: 38.4237, lng: 27.1428 },
  bodrum: { lat: 37.0344, lng: 27.4305 },
  antalya: { lat: 36.8969, lng: 30.7133 },
  bursa: { lat: 40.1885, lng: 29.061 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  london: { lat: 51.5072, lng: -0.1276 },
};

const route = useRoute();
const store = useDashboardStore();
const api = useLedgeraApi();

const transaction = ref<Transaction | null>(null);
const relatedListing = ref<Listing | null>(null);
const errorMessage = ref('');
const successMessage = computed(() => store.successMessage);
const isLoading = ref(true);
const router = useRouter();
const canAdvanceStage = computed(() =>
  ['admin', 'operations'].includes(store.activeRole),
);
const canManageTransaction = computed(() =>
  ['admin', 'operations'].includes(store.activeRole),
);
const mapCoordinates = computed(() => {
  const city = relatedListing.value?.city.trim().toLowerCase();
  return city ? CITY_COORDINATES[city] ?? null : null;
});

async function loadTransactionDetail() {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    const loadedTransaction = await api.getTransaction(store.actor, route.params.id as string);
    transaction.value = loadedTransaction;

    const filters: ListingFilters = {
      search: loadedTransaction.propertyRef,
      status: '',
      agentId: '',
    };
    const candidateListings = await api.getListings(store.actor, filters);
    relatedListing.value =
      candidateListings.find((item) => item.propertyRef === loadedTransaction.propertyRef) ?? null;
  } catch (error) {
    const appError = error as { statusMessage?: string };
    errorMessage.value = appError.statusMessage ?? 'Transaction detail could not be loaded.';
    transaction.value = null;
    relatedListing.value = null;
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  void loadTransactionDetail();
});

watch(
  () => route.params.id,
  () => {
    void loadTransactionDetail();
  },
);

function handleTransactionUpdated(updated: Transaction) {
  transaction.value = updated;
  void loadTransactionDetail();
}

async function handleTransactionDeleted() {
  await router.push('/');
}
</script>

<template>
  <AppShell>
    <div v-if="transaction" class="detail-grid">
      <div v-if="errorMessage" class="error-banner">
        {{ errorMessage }}
      </div>

      <div v-if="successMessage" class="success-banner">
        {{ successMessage }}
      </div>

      <section class="panel detail-hero rounded-[34px] border border-white/70 bg-white/85 px-8 py-8 shadow-[0_24px_60px_rgba(31,41,55,0.08)] backdrop-blur-xl">
        <div class="detail-hero__heading flex items-start justify-between gap-4">
          <div>
            <p class="eyebrow text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-slate-400">Transaction Detail</p>
            <h2 class="max-w-3xl text-balance text-3xl font-semibold leading-[1.02] tracking-tight text-slate-900">{{ transaction.propertyRef }}</h2>
          </div>
          <span class="stage-badge inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold" :data-stage="transaction.stage">
            {{ titleCaseStage(transaction.stage) }}
          </span>
        </div>

        <div class="detail-stats mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-[24px] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_14px_34px_rgba(31,41,55,0.05)]">
            <span class="text-sm text-slate-400">Total Service Fee</span>
            <strong class="mt-3 block text-3xl font-semibold tracking-tight text-slate-900">{{ formatMoney(transaction.totalServiceFee, transaction.currency) }}</strong>
          </div>
          <div class="rounded-[24px] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_14px_34px_rgba(31,41,55,0.05)]">
            <span class="text-sm text-slate-400">Agency Share</span>
            <strong class="mt-3 block text-3xl font-semibold tracking-tight text-slate-900">{{ formatMoney(transaction.commission.agencyShare, transaction.currency) }}</strong>
          </div>
          <div class="rounded-[24px] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_14px_34px_rgba(31,41,55,0.05)]">
            <span class="text-sm text-slate-400">Financial Lock</span>
            <strong class="mt-3 block text-3xl font-semibold tracking-tight text-slate-900">{{ transaction.financialIntegrity.isLocked ? 'Locked' : 'Open' }}</strong>
          </div>
          <div class="rounded-[24px] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_14px_34px_rgba(31,41,55,0.05)]">
            <span class="text-sm text-slate-400">Updated At</span>
            <strong class="mt-3 block text-3xl font-semibold tracking-tight text-slate-900">{{ formatDate(transaction.updatedAt) }}</strong>
          </div>
        </div>

        <div class="detail-agents mt-6 grid gap-4 md:grid-cols-2">
          <div class="rounded-[24px] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_14px_34px_rgba(31,41,55,0.05)]">
            <span class="text-sm text-slate-400">Listing Agent</span>
            <strong class="mt-3 block text-xl font-semibold tracking-tight text-slate-900">{{ transaction.listingAgent.name }}</strong>
          </div>
          <div class="rounded-[24px] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_14px_34px_rgba(31,41,55,0.05)]">
            <span class="text-sm text-slate-400">Selling Agent</span>
            <strong class="mt-3 block text-xl font-semibold tracking-tight text-slate-900">{{ transaction.sellingAgent.name }}</strong>
          </div>
        </div>
      </section>

      <section class="panel detail-map-panel rounded-[30px] border border-white/70 bg-white/85 p-7 shadow-[0_22px_52px_rgba(31,41,55,0.08)] backdrop-blur-xl">
        <div class="panel__header">
          <div>
            <p class="eyebrow text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-slate-400">Location</p>
            <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Property map preview</h2>
          </div>
        </div>

        <p v-if="relatedListing" class="helper-copy helper-copy--compact">
          This preview is linked from the matching listing record for {{ relatedListing.title }}.
        </p>
        <p v-else class="helper-copy helper-copy--compact">
          A matching listing record is required to display the map on a transaction.
        </p>

        <div v-if="mapCoordinates && relatedListing" class="location-layout">
          <ListingMap
            :lat="mapCoordinates.lat"
            :lng="mapCoordinates.lng"
            :title="relatedListing.title"
            :city="relatedListing.city"
          />

          <aside class="location-summary">
            <p class="eyebrow">Listing Context</p>
            <h3>{{ relatedListing.title }}</h3>

            <div class="location-summary__grid">
              <div>
                <span>Reference</span>
                <strong>{{ relatedListing.propertyRef }}</strong>
              </div>
              <div>
                <span>City</span>
                <strong>{{ relatedListing.city }}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{{ relatedListing.status }}</strong>
              </div>
              <div>
                <span>Listing Agent</span>
                <strong>{{ relatedListing.listingAgent?.name || 'Unassigned' }}</strong>
              </div>
            </div>

            <p class="location-summary__note">
              This map centers the transaction on the linked listing location so operations and finance
              teams can quickly understand where the deal sits geographically.
            </p>
          </aside>
        </div>

        <div v-else class="preview-empty-state">
          <p class="eyebrow">Map unavailable</p>
          <h3>No supported listing location was found for this transaction.</h3>
          <p>Create or update the linked listing to enable the map preview here.</p>
        </div>
      </section>

      <TransactionStageStepper :transaction="transaction" />
      <TransactionTimeline :transaction="transaction" />
      <StageActions
        v-if="canAdvanceStage"
        :transaction="transaction"
        @updated="transaction = $event"
      />
      <EditTransactionPanel
        v-if="canManageTransaction"
        :transaction="transaction"
        @updated="handleTransactionUpdated"
        @deleted="handleTransactionDeleted"
      />

      <section class="panel rounded-[30px] border border-white/70 bg-white/85 p-7 shadow-[0_22px_52px_rgba(31,41,55,0.08)] backdrop-blur-xl">
        <div class="panel__header">
          <div>
            <p class="eyebrow text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-slate-400">Commission</p>
            <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Explainable payout breakdown</h2>
          </div>
        </div>

        <div class="payout-grid mt-6 grid gap-4 md:grid-cols-2">
          <div
            v-for="payout in transaction.commission.payouts"
            :key="`${payout.agentId}-${payout.reason}`"
            class="payout-card rounded-[24px] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_14px_34px_rgba(31,41,55,0.05)]"
          >
            <span class="text-sm text-slate-400">{{ payout.agentName }}</span>
            <strong class="mt-3 block text-3xl font-semibold tracking-tight text-slate-900">{{ formatMoney(payout.amount, transaction.currency) }}</strong>
            <small class="mt-2 block text-sm text-slate-500">{{ payout.reason }}</small>
          </div>
        </div>

        <ul class="explanation-list mt-5 grid gap-3 text-sm leading-7 text-slate-600">
          <li v-for="item in transaction.commission.explanation" :key="item.code">
            {{ item.message }}
          </li>
        </ul>
      </section>

      <AuditTrail :transaction="transaction" />
      <EntityNotesPanel entity-type="transaction" :entity-id="transaction.id" title="Transaction notes" />
      <EntityTasksPanel entity-type="transaction" :entity-id="transaction.id" title="Transaction follow-ups" />
      <DocumentPlaceholdersPanel entity-type="transaction" :entity-id="transaction.id" />
    </div>

    <div v-else class="panel empty-state">
      {{ errorMessage || (isLoading ? 'Loading transaction detail...' : 'Transaction detail is unavailable.') }}
    </div>
  </AppShell>
</template>
