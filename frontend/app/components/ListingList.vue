<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useDashboardStore } from '~/stores/dashboard';
import type { Listing } from '~/types/api';
import { formatDate, formatMoney } from '~/utils/format';

const props = defineProps<{
  items: Listing[];
  heading?: string;
  eyebrow?: string;
}>();

const store = useDashboardStore();
const { activeRole, actor, isMutating } = storeToRefs(store);
const canEditStatus = (item: Listing) =>
  ['admin', 'operations'].includes(activeRole.value) ||
  (activeRole.value === 'agent' && item.listingAgent.id === actor.value.userId);
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">{{ eyebrow || 'Listings' }}</p>
        <h2>{{ heading || 'Active listing pool' }}</h2>
      </div>
    </div>

    <div class="listing-grid">
      <article v-for="item in items" :key="item.id" class="listing-card">
        <a :href="`/listings/${item.id}`" class="listing-card__overlay-link" aria-label="Open listing detail" />

        <div class="listing-card__top">
          <div>
            <p class="eyebrow">{{ item.propertyRef }}</p>
            <a
              :href="`/listings/${item.id}`"
              class="listing-card__link listing-card__link-anchor listing-card__button"
            >
              <h3>{{ item.title }}</h3>
            </a>
          </div>
          <select
            v-if="canEditStatus(item)"
            class="listing-status-select"
            :value="item.status"
            :disabled="isMutating"
            @click.stop
            @change="store.updateListingStatus(item.id, ($event.target as HTMLSelectElement).value as Listing['status'])"
          >
            <option value="active">Active</option>
            <option value="under_offer">Under Offer</option>
            <option value="closed">Closed</option>
          </select>
          <span v-else class="stage-badge">{{ item.status.replaceAll('_', ' ') }}</span>
        </div>

        <p class="listing-card__meta">
          {{ item.city }} • {{ item.listingAgent.name }} • {{ item.listingAgent.id }}
        </p>
        <strong>{{ formatMoney(item.askingPrice, item.currency) }}</strong>
        <small>Updated {{ formatDate(item.updatedAt) }}</small>
        <div class="listing-card__actions">
          <a
            :href="`/listings/${item.id}`"
            class="table-link listing-card__detail-link"
          >
            View Detail
          </a>
        </div>
      </article>
    </div>
  </section>
</template>
