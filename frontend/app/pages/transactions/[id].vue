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
const canAdvanceStage = computed(() =>
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

      <section class="panel detail-hero">
        <div class="detail-hero__heading">
          <div>
            <p class="eyebrow">Transaction Detail</p>
            <h2>{{ transaction.propertyRef }}</h2>
          </div>
          <span class="stage-badge" :data-stage="transaction.stage">
            {{ titleCaseStage(transaction.stage) }}
          </span>
        </div>

        <div class="detail-stats">
          <div>
            <span>Total Service Fee</span>
            <strong>{{ formatMoney(transaction.totalServiceFee, transaction.currency) }}</strong>
          </div>
          <div>
            <span>Agency Share</span>
            <strong>{{ formatMoney(transaction.commission.agencyShare, transaction.currency) }}</strong>
          </div>
          <div>
            <span>Financial Lock</span>
            <strong>{{ transaction.financialIntegrity.isLocked ? 'Locked' : 'Open' }}</strong>
          </div>
          <div>
            <span>Updated At</span>
            <strong>{{ formatDate(transaction.updatedAt) }}</strong>
          </div>
        </div>

        <div class="detail-agents">
          <div>
            <span>Listing Agent</span>
            <strong>{{ transaction.listingAgent.name }}</strong>
          </div>
          <div>
            <span>Selling Agent</span>
            <strong>{{ transaction.sellingAgent.name }}</strong>
          </div>
        </div>
      </section>

      <section class="panel detail-map-panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Location</p>
            <h2>Property map preview</h2>
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

      <section class="panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Commission</p>
            <h2>Explainable payout breakdown</h2>
          </div>
        </div>

        <div class="payout-grid">
          <div
            v-for="payout in transaction.commission.payouts"
            :key="`${payout.agentId}-${payout.reason}`"
            class="payout-card"
          >
            <span>{{ payout.agentName }}</span>
            <strong>{{ formatMoney(payout.amount, transaction.currency) }}</strong>
            <small>{{ payout.reason }}</small>
          </div>
        </div>

        <ul class="explanation-list">
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
