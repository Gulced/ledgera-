<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useDashboardStore } from '~/stores/dashboard';
import { formatDate, formatMoney, titleCaseStage } from '~/utils/format';
import type { Listing } from '~/types/api';
import { getApproximateListingCoordinates } from '~/utils/listing-map';

const route = useRoute();
const store = useDashboardStore();
const api = useLedgeraApi();
const { activeRole, actor, isMutating, successMessage } = storeToRefs(store);
const listingId = computed(() => route.params.id as string);

const listing = ref<Listing | null>(null);
const errorMessage = ref('');
const isLoading = ref(true);

const canEditStatus = computed(() =>
  !!listing.value &&
  (['admin', 'operations'].includes(activeRole.value) ||
    (activeRole.value === 'agent' && listing.value.listingAgent.id === actor.value.userId)),
);

const mapCoordinates = computed(() =>
  listing.value ? getApproximateListingCoordinates(listing.value) : null,
);

async function loadListing() {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    listing.value = await api.getListing(actor.value, listingId.value);
  } catch (error) {
    const appError = error as { statusMessage?: string };
    errorMessage.value = appError.statusMessage ?? 'Listing detail could not be loaded.';
    listing.value = null;
  } finally {
    isLoading.value = false;
  }
}

await store.loadAgents();
await loadListing();

watch(
  listingId,
  () => {
    void loadListing();
  },
);

async function updateStatus(event: Event) {
  if (!listing.value) {
    return;
  }

  const nextStatus = (event.target as HTMLSelectElement).value as Listing['status'];
  listing.value = await store.updateListingStatus(listing.value.id, nextStatus);
}

function handleListingUpdated(updated: Listing) {
  listing.value = updated;
}
</script>

<template>
  <AppShell>
    <div v-if="listing" class="detail-grid">
      <div v-if="errorMessage" class="error-banner">
        {{ errorMessage }}
      </div>

      <div v-if="successMessage" class="success-banner">
        {{ successMessage }}
      </div>

      <section class="panel detail-hero">
        <div class="detail-hero__heading">
          <div>
            <p class="eyebrow">Listing Detail</p>
            <h2>{{ listing.title }}</h2>
          </div>

          <select
            v-if="canEditStatus"
            class="listing-status-select"
            :value="listing.status"
            :disabled="isMutating"
            @change="updateStatus"
          >
            <option value="active">Active</option>
            <option value="under_offer">Under Offer</option>
            <option value="closed">Closed</option>
          </select>
          <span v-else class="stage-badge">
            {{ titleCaseStage(listing.status) }}
          </span>
        </div>

        <div class="detail-stats">
          <div>
            <span>Property Ref</span>
            <strong>{{ listing.propertyRef }}</strong>
          </div>
          <div>
            <span>City</span>
            <strong>{{ listing.city }}</strong>
          </div>
          <div>
            <span>Full Address</span>
            <strong>{{ listing.fullAddress }}</strong>
          </div>
          <div>
            <span>Asking Price</span>
            <strong>{{ formatMoney(listing.askingPrice, listing.currency) }}</strong>
          </div>
          <div>
            <span>Updated At</span>
            <strong>{{ formatDate(listing.updatedAt) }}</strong>
          </div>
        </div>

        <div class="detail-agents">
          <div>
            <span>Listing Agent</span>
            <strong>{{ listing.listingAgent?.name || 'Unassigned' }}</strong>
          </div>
          <div>
            <span>Created By</span>
            <strong>{{ listing.createdBy?.name || listing.createdBy?.userId || 'System' }}</strong>
          </div>
        </div>
      </section>

      <section class="panel detail-map-panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Location</p>
            <h2>Map preview</h2>
          </div>
        </div>

        <p class="helper-copy helper-copy--compact">
          This preview uses the full address to place a stable marker around the selected city center.
        </p>

        <ListingMap
          v-if="mapCoordinates"
          :lat="mapCoordinates.lat"
          :lng="mapCoordinates.lng"
          :title="listing.title"
          :city="listing.city"
        />

        <div v-else class="preview-empty-state">
          <p class="eyebrow">Map unavailable</p>
          <h3>City-based map preview is not available for this listing yet.</h3>
          <p>Add a supported city to show a map marker in the detail view.</p>
        </div>
      </section>

      <EditListingPanel :listing="listing" @updated="handleListingUpdated" />
      <ConvertListingPanel :listing="listing" />
      <EntityNotesPanel entity-type="listing" :entity-id="listing.id" title="Listing notes" />
      <EntityTasksPanel entity-type="listing" :entity-id="listing.id" title="Listing follow-ups" />
      <DocumentPlaceholdersPanel entity-type="listing" :entity-id="listing.id" />
      <ActivityFeedPanel title="Recent workspace activity" />
    </div>

    <div v-else class="panel empty-state">
      {{ errorMessage || (isLoading ? 'Loading listing detail...' : 'Listing detail is unavailable.') }}
    </div>
  </AppShell>
</template>
