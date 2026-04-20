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
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Create Transaction</p>
        <h2>Open a new transaction from the web</h2>
      </div>
    </div>

    <form class="preview-form" @submit.prevent="submit">
      <label>
        <span>Property / Reference</span>
        <div class="search-stack">
          <input
            v-model="form.propertySearch"
            type="text"
            placeholder="Search by listing name or property ref"
          >

          <div v-if="listingSuggestions.length" class="search-suggestions">
            <button
              v-for="item in listingSuggestions"
              :key="item.id"
              type="button"
              class="search-suggestion"
              @click="selectListing(item)"
            >
              <strong>{{ item.title }}</strong>
              <small>
                {{ item.propertyRef }} • {{ item.city }} • {{ item.listingAgent.name }}
              </small>
            </button>
          </div>
        </div>
      </label>
      <label>
        <span>Total Service Fee</span>
        <input v-model.number="form.totalServiceFee" type="number" min="1">
      </label>
      <label>
        <span>Currency</span>
        <select v-model="form.currency">
          <option value="EUR">EUR</option>
          <option value="USD">USD</option>
          <option value="TRY">TRY</option>
          <option value="GBP">GBP</option>
        </select>
      </label>
      <label>
        <span>Listing Agent</span>
        <select v-model="form.listingAgentId">
          <option v-for="agent in agents" :key="agent.id" :value="agent.id">
            {{ agent.name }} • {{ agent.id }}
          </option>
        </select>
      </label>
      <label>
        <span>Selling Agent</span>
        <select v-model="form.sellingAgentId">
          <option v-for="agent in agents" :key="agent.id" :value="agent.id">
            {{ agent.name }} • {{ agent.id }}
          </option>
        </select>
      </label>

      <button class="primary-button" :disabled="isMutating">
        {{ isMutating ? 'Saving...' : 'Create Transaction' }}
      </button>
    </form>

    <p v-if="validationError" class="inline-error">
      {{ validationError }}
    </p>

    <p class="helper-copy">
      Start typing a listing name like “sea” to pick a property from the active listing pool, or type a manual reference.
    </p>
  </section>
</template>
