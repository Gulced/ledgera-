<script setup lang="ts">
import { z } from 'zod';
import { storeToRefs } from 'pinia';
import { useDashboardStore } from '~/stores/dashboard';
import { useWorkspaceStore } from '~/stores/workspace';
import type { Listing } from '~/types/api';

const props = defineProps<{
  listing: Listing;
}>();

const store = useDashboardStore();
const workspace = useWorkspaceStore();
const { agents } = storeToRefs(store);
const canConvert = computed(() => ['admin', 'operations'].includes(store.activeRole));
const form = reactive({
  totalServiceFee: Math.max(Math.round(props.listing.askingPrice * 0.04), 10000),
  sellingAgentId: props.listing.listingAgent.id,
});
const validationError = ref('');

const schema = z.object({
  totalServiceFee: z.number().positive(),
  sellingAgentId: z.string().min(1),
});

async function convert() {
  validationError.value = '';
  const parsed = schema.safeParse(form);

  if (!parsed.success) {
    validationError.value = 'Choose a selling agent and a valid service fee.';
    return;
  }

  await store.createTransaction({
    propertyRef: props.listing.propertyRef,
    totalServiceFee: form.totalServiceFee,
    currency: props.listing.currency,
    listingAgentId: props.listing.listingAgent.id,
    sellingAgentId: form.sellingAgentId,
  });

  workspace.recordEvent({
    title: 'Listing converted to transaction',
    description: `${props.listing.title} moved from listing inventory into transaction workflow.`,
    entityType: 'listing',
    entityId: props.listing.id,
  });
}
</script>

<template>
  <section v-if="canConvert" class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Conversion</p>
        <h2>Convert listing to transaction</h2>
      </div>
    </div>

    <div class="filters-grid">
      <label>
        <span>Total service fee</span>
        <input v-model.number="form.totalServiceFee" type="number" min="1">
      </label>
      <label>
        <span>Selling agent</span>
        <select v-model="form.sellingAgentId">
          <option v-for="agent in agents" :key="agent.id" :value="agent.id">
            {{ agent.name }}
          </option>
        </select>
      </label>
    </div>

    <p v-if="validationError" class="inline-error">
      {{ validationError }}
    </p>

    <div class="filters-actions">
      <button class="primary-button" @click="convert">
        Convert now
      </button>
    </div>
  </section>
</template>
