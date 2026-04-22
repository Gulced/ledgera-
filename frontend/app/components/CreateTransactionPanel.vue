<script setup lang="ts">
import { z } from 'zod';
import { storeToRefs } from 'pinia';
import { useDashboardStore } from '~/stores/dashboard';
import type { Listing, Transaction } from '~/types/api';

const store = useDashboardStore();
const api = useLedgeraApi();
const { actor, agents, isMutating } = storeToRefs(store);

const form = reactive({
  propertySearch: '',
  totalServiceFee: 100000,
  currency: 'EUR' as Transaction['currency'],
  listingAgentId: '',
  sellingAgentId: '',
});

const validationError = ref('');
const selectedListing = ref<Listing | null>(null);
const listingSuggestions = ref<Listing[]>([]);

const schema = z.object({
  propertyRef: z.string().trim().min(3, 'Property reference is required.'),
  totalServiceFee: z.number().positive('Service fee must be greater than 0.'),
  currency: z.enum(['EUR', 'USD', 'TRY', 'GBP']),
  listingAgentId: z.string().min(1, 'A listing agent must be selected.'),
  sellingAgentId: z.string().min(1, 'A selling agent must be selected.'),
});

watch(
  agents,
  (value) => {
    if (!value.length) {
      return;
    }

    form.listingAgentId ||= value[0].id;
    form.sellingAgentId ||= value[Math.min(1, value.length - 1)].id;
  },
  { immediate: true },
);

watch(
  () => form.propertySearch,
  (value) => {
    if (
      selectedListing.value &&
      value !== `${selectedListing.value.title} • ${selectedListing.value.propertyRef}`
    ) {
      selectedListing.value = null;
    }

    const search = value.trim();

    if (search.length < 2) {
      listingSuggestions.value = [];
      return;
    }

    const timer = setTimeout(async () => {
      try {
        listingSuggestions.value = (await api.getListings(actor.value, {
          search,
          status: '',
          agentId: '',
        })).slice(0, 5);
      } catch {
        listingSuggestions.value = [];
      }
    }, 250);

    onWatcherCleanup(() => clearTimeout(timer));
  },
);

function selectListing(listing: Listing) {
  selectedListing.value = listing;
  form.propertySearch = `${listing.title} • ${listing.propertyRef}`;
  form.listingAgentId = listing.listingAgent.id;
  listingSuggestions.value = [];
}

async function submit() {
  validationError.value = '';
  const parsed = schema.safeParse({
    propertyRef: selectedListing.value?.propertyRef ?? form.propertySearch,
    totalServiceFee: form.totalServiceFee,
    currency: form.currency,
    listingAgentId: form.listingAgentId,
    sellingAgentId: form.sellingAgentId,
  });

  if (!parsed.success) {
    validationError.value = parsed.error.issues[0]?.message ?? 'The form could not be validated.';
    return;
  }

  await store.createTransaction(parsed.data);
  form.propertySearch = '';
  form.totalServiceFee = 100000;
  selectedListing.value = null;
  listingSuggestions.value = [];
}
</script>

<template>
  <section class="panel rounded-[30px] border border-white/70 bg-white/85 p-7 shadow-[0_22px_52px_rgba(31,41,55,0.08)] backdrop-blur-xl">
    <div class="panel__header">
      <div>
        <p class="eyebrow text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-slate-400">Create Transaction</p>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Open a new transaction from the web</h2>
      </div>
    </div>

    <form class="preview-form mt-6 grid gap-5" @submit.prevent="submit">
      <label class="grid gap-2.5">
        <span class="text-sm font-medium text-slate-600">Property / Reference</span>
        <div class="search-stack relative">
          <input
            v-model="form.propertySearch"
            type="text"
            placeholder="Search by listing name or property ref"
            class="min-h-[56px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
          >

          <div v-if="listingSuggestions.length" class="search-suggestions absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-[22px] border border-slate-200 bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
            <button
              v-for="item in listingSuggestions"
              :key="item.id"
              type="button"
              class="search-suggestion grid w-full gap-1 rounded-2xl px-4 py-3 text-left transition hover:bg-slate-50"
              @click="selectListing(item)"
            >
              <strong class="text-sm font-semibold text-slate-900">{{ item.title }}</strong>
              <small class="text-xs leading-5 text-slate-500">
                {{ item.propertyRef }} • {{ item.city }} • {{ item.listingAgent.name }}
              </small>
            </button>
          </div>
        </div>
      </label>
      <label class="grid gap-2.5">
        <span class="text-sm font-medium text-slate-600">Total Service Fee</span>
        <input v-model.number="form.totalServiceFee" type="number" min="1" class="min-h-[56px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100">
      </label>
      <label class="grid gap-2.5">
        <span class="text-sm font-medium text-slate-600">Currency</span>
        <select v-model="form.currency" class="min-h-[56px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100">
          <option value="EUR">EUR</option>
          <option value="USD">USD</option>
          <option value="TRY">TRY</option>
          <option value="GBP">GBP</option>
        </select>
      </label>
      <label class="grid gap-2.5">
        <span class="text-sm font-medium text-slate-600">Listing Agent</span>
        <select v-model="form.listingAgentId" class="min-h-[56px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100">
          <option v-for="agent in agents" :key="agent.id" :value="agent.id">
            {{ agent.name }} • {{ agent.id }}
          </option>
        </select>
      </label>
      <label class="grid gap-2.5">
        <span class="text-sm font-medium text-slate-600">Selling Agent</span>
        <select v-model="form.sellingAgentId" class="min-h-[56px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100">
          <option v-for="agent in agents" :key="agent.id" :value="agent.id">
            {{ agent.name }} • {{ agent.id }}
          </option>
        </select>
      </label>

      <button class="primary-button inline-flex min-h-[56px] items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#3b2f95,#6d5efc)] px-5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(99,102,241,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" :disabled="isMutating">
        {{ isMutating ? 'Saving...' : 'Create Transaction' }}
      </button>
    </form>

    <p v-if="validationError" class="inline-error mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {{ validationError }}
    </p>

    <p class="helper-copy mt-5 text-sm leading-7 text-slate-500">
      Start typing a listing name like “sea” to pick a property from the active listing pool, or type a manual reference.
    </p>
  </section>
</template>
