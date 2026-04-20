<script setup lang="ts">
import { z } from 'zod';
import { storeToRefs } from 'pinia';
import { useDashboardStore } from '~/stores/dashboard';
import type { Transaction } from '~/types/api';

const store = useDashboardStore();
const { activeRole, actor, agents, isMutating } = storeToRefs(store);

const form = reactive({
  title: '',
  city: '',
  fullAddress: '',
  askingPrice: 2500000,
  currency: 'EUR' as Transaction['currency'],
  listingAgentId: '',
});

const validationError = ref('');

const schema = z.object({
  title: z.string().trim().min(3, 'Listing title is required.'),
  city: z.string().trim().min(2, 'City is required.'),
  fullAddress: z.string().trim().min(10, 'Full address is required.'),
  askingPrice: z.number().positive('Asking price must be greater than 0.'),
  currency: z.enum(['EUR', 'USD', 'TRY', 'GBP']),
  listingAgentId: z.string().min(1, 'A listing agent must be selected.'),
});

watch(
  [agents, activeRole],
  ([value, role]) => {
    if (!value.length) {
      return;
    }

    if (role === 'agent') {
      const ownAgent = value.find((agent) => agent.id === actor.value.userId);
      form.listingAgentId = ownAgent?.id ?? '';
      return;
    }

    form.listingAgentId ||= value[0].id;
  },
  { immediate: true },
);

const availableAgents = computed(() =>
  activeRole.value === 'agent'
    ? agents.value.filter((agent) => agent.id === actor.value.userId)
    : agents.value,
);

const canCreate = computed(() => ['admin', 'agent'].includes(activeRole.value));

async function submit() {
  validationError.value = '';
  const parsed = schema.safeParse(form);

  if (!parsed.success) {
    validationError.value = parsed.error.issues[0]?.message ?? 'The form could not be validated.';
    return;
  }

  await store.createListing(parsed.data);
  form.title = '';
  form.city = '';
  form.fullAddress = '';
  form.askingPrice = 2500000;
}
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Create Listing</p>
        <h2>Add a new listing</h2>
      </div>
    </div>

    <p v-if="!canCreate" class="inline-error">
      This role cannot create listings.
    </p>

    <form v-else class="preview-form" @submit.prevent="submit">
      <label>
        <span>Listing Title</span>
        <input v-model="form.title" type="text" placeholder="Sea-view apartment in Bebek">
      </label>
      <label>
        <span>City</span>
        <input v-model="form.city" type="text" placeholder="Istanbul">
      </label>
      <label>
        <span>Full Address</span>
        <textarea
          v-model="form.fullAddress"
          rows="4"
          placeholder="Bebek Mahallesi, Cevdet Pasa Caddesi No: 18, Besiktas, Istanbul"
        />
      </label>
      <label>
        <span>Asking Price</span>
        <input v-model.number="form.askingPrice" type="number" min="1">
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
          <option v-for="agent in availableAgents" :key="agent.id" :value="agent.id">
            {{ agent.name }} • {{ agent.id }}
          </option>
        </select>
      </label>

      <button class="primary-button" :disabled="isMutating">
        {{ isMutating ? 'Saving...' : 'Create Listing' }}
      </button>
    </form>

    <p class="helper-copy">
      Property reference is generated automatically by the system.
    </p>

    <p v-if="validationError" class="inline-error">
      {{ validationError }}
    </p>
  </section>
</template>
