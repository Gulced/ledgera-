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
  <section class="panel rounded-[30px] border border-white/70 bg-white/85 p-7 shadow-[0_22px_52px_rgba(31,41,55,0.08)] backdrop-blur-xl">
    <div class="panel__header">
      <div>
        <p class="eyebrow text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-slate-400">{{ eyebrow || 'Listings' }}</p>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">{{ heading || 'Active listing pool' }}</h2>
      </div>
    </div>

    <div class="listing-grid mt-6 grid gap-5">
      <article v-for="item in items" :key="item.id" class="listing-card relative grid gap-4 rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_16px_36px_rgba(31,41,55,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(31,41,55,0.08)]">
        <a :href="`/listings/${item.id}`" class="listing-card__overlay-link" aria-label="Open listing detail" />

        <div class="listing-card__top flex items-start justify-between gap-4">
          <div>
            <p class="eyebrow text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-slate-400">{{ item.propertyRef }}</p>
            <a
              :href="`/listings/${item.id}`"
              class="listing-card__link listing-card__link-anchor listing-card__button block"
            >
              <h3 class="text-2xl font-semibold tracking-tight text-slate-900">{{ item.title }}</h3>
            </a>
          </div>
          <select
            v-if="canEditStatus(item)"
            class="listing-status-select min-h-[48px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none"
            :value="item.status"
            :disabled="isMutating"
            @click.stop
            @change="store.updateListingStatus(item.id, ($event.target as HTMLSelectElement).value as Listing['status'])"
          >
            <option value="active">Active</option>
            <option value="under_offer">Under Offer</option>
            <option value="closed">Closed</option>
          </select>
          <span v-else class="stage-badge inline-flex min-h-[40px] items-center rounded-full bg-slate-100 px-4 text-sm font-semibold capitalize text-slate-700">{{ item.status.replaceAll('_', ' ') }}</span>
        </div>

        <p class="listing-card__meta text-sm leading-7 text-slate-500">
          {{ item.city }} • {{ item.listingAgent.name }} • {{ item.listingAgent.id }}
        </p>
        <strong class="text-3xl font-semibold tracking-tight text-slate-900">{{ formatMoney(item.askingPrice, item.currency) }}</strong>
        <small class="text-sm text-slate-400">Updated {{ formatDate(item.updatedAt) }}</small>
        <div class="listing-card__actions pt-1">
          <a
            :href="`/listings/${item.id}`"
            class="table-link listing-card__detail-link inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
          >
            View Detail
          </a>
        </div>
      </article>
    </div>
  </section>
</template>
