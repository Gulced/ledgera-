<script setup lang="ts">
import { z } from 'zod';
import { storeToRefs } from 'pinia';
import { useDashboardStore } from '~/stores/dashboard';
import type { Listing, UpdateListingInput } from '~/types/api';

const props = defineProps<{
  listing: Listing;
}>();

const emit = defineEmits<{
  updated: [listing: Listing];
}>();

const store = useDashboardStore();
const { activeRole, actor, agents, isMutating } = storeToRefs(store);

const form = reactive<UpdateListingInput>({
  id: props.listing.id,
  title: props.listing.title,
  city: props.listing.city,
  fullAddress: props.listing.fullAddress,
  askingPrice: props.listing.askingPrice,
  currency: props.listing.currency,
  listingAgentId: props.listing.listingAgent.id,
});

const validationError = ref('');

const schema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(3, 'Listing title is required.'),
  city: z.string().trim().min(2, 'City is required.'),
  fullAddress: z.string().trim().min(10, 'Full address is required.'),
  askingPrice: z.number().positive('Asking price must be greater than 0.'),
  currency: z.enum(['EUR', 'USD', 'TRY', 'GBP']),
  listingAgentId: z.string().min(1, 'A listing agent must be selected.'),
});

const availableAgents = computed(() =>
  activeRole.value === 'agent'
    ? agents.value.filter((agent) => agent.id === actor.value.userId)
    : agents.value,
);

const canManage = computed(() =>
  activeRole.value === 'admin' ||
  (activeRole.value === 'agent' && props.listing.listingAgent.id === actor.value.userId),
);

watch(
  () => props.listing,
  (value) => {
    form.id = value.id;
    form.title = value.title;
    form.city = value.city;
    form.fullAddress = value.fullAddress;
    form.askingPrice = value.askingPrice;
    form.currency = value.currency;
    form.listingAgentId = value.listingAgent.id;
  },
  { immediate: true },
);

async function submit() {
  validationError.value = '';
  const parsed = schema.safeParse(form);

  if (!parsed.success) {
    validationError.value = parsed.error.issues[0]?.message ?? 'The form could not be validated.';
    return;
  }

  const updated = await store.updateListing(parsed.data);
  emit('updated', updated);
}

async function remove() {
  if (import.meta.client && !window.confirm('Delete this listing permanently?')) {
    return;
  }

  await store.deleteListing(props.listing.id);
  await navigateTo('/listings');
}
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Listing Admin</p>
        <h2>Edit or remove listing</h2>
      </div>
    </div>

    <p v-if="!canManage" class="inline-error">
      This role cannot edit or delete this listing.
    </p>

    <form v-else class="preview-form" @submit.prevent="submit">
      <label>
        <span>Listing Title</span>
        <input v-model="form.title" type="text">
      </label>
      <label>
        <span>City</span>
        <input v-model="form.city" type="text">
      </label>
      <label>
        <span>Full Address</span>
        <textarea v-model="form.fullAddress" rows="4" />
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

      <div class="preview-actions listing-form-actions">
        <button class="ghost-button listing-delete-button" type="button" :disabled="isMutating" @click="remove">
          {{ isMutating ? 'Working...' : 'Delete Listing' }}
        </button>
        <button class="primary-button" :disabled="isMutating">
          {{ isMutating ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </form>

    <p v-if="validationError" class="inline-error">
      {{ validationError }}
    </p>
  </section>
</template>
