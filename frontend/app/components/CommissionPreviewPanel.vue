<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { z } from 'zod';
import { useDashboardStore } from '~/stores/dashboard';
import type { CommissionPayout, Transaction } from '~/types/api';
import { formatMoney } from '~/utils/format';

const store = useDashboardStore();
const { agents, isPreviewLoading, preview } = storeToRefs(store);
const defaultPreviewInput = store.createDefaultPreviewInput();

const form = reactive({
  propertyRef: defaultPreviewInput.propertyRef,
  totalServiceFee: defaultPreviewInput.totalServiceFee,
  currency: defaultPreviewInput.currency as Transaction['currency'],
  listingAgentId: '',
  sellingAgentId: '',
});

const validationError = ref('');

const previewSchema = z.object({
  propertyRef: z.string().trim().min(3, 'Property name or reference must be at least 3 characters long.'),
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

const propertyLabel = computed(() => {
  const [name, reference] = form.propertyRef.split('•').map((item) => item.trim());

  return {
    name: name || form.propertyRef.trim(),
    reference: reference || 'Preview reference',
  };
});

const topRecipient = computed<CommissionPayout | null>(() => {
  if (!preview.value?.commission.payouts.length) {
    return null;
  }

  return [...preview.value.commission.payouts].sort((left, right) => right.amount - left.amount)[0] ?? null;
});

async function handleSubmit() {
  validationError.value = '';

  const parsed = previewSchema.safeParse(form);
  if (!parsed.success) {
    validationError.value = parsed.error.issues[0]?.message ?? 'The form could not be validated.';
    return;
  }

  await store.previewCommission(parsed.data);
}

function handleReset() {
  validationError.value = '';
  Object.assign(form, {
    propertyRef: defaultPreviewInput.propertyRef,
    totalServiceFee: defaultPreviewInput.totalServiceFee,
    currency: defaultPreviewInput.currency,
    listingAgentId: agents.value[0]?.id ?? '',
    sellingAgentId: agents.value[Math.min(1, agents.value.length - 1)]?.id ?? agents.value[0]?.id ?? '',
  });
  store.resetPreview();
}
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Commission Preview</p>
        <h2>Preview commission before saving</h2>
      </div>
    </div>

    <form
      class="preview-form"
      @submit.prevent="handleSubmit"
    >
      <label>
        <span>Property Name / Reference</span>
        <input
          v-model="form.propertyRef"
          type="text"
          placeholder="Sea-view apartment in Bebek • TRX-DEMO-901"
        >
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
          <option
            v-for="agent in agents"
            :key="agent.id"
            :value="agent.id"
          >
            {{ agent.name }} • {{ agent.id }}
          </option>
        </select>
      </label>

      <label>
        <span>Selling Agent</span>
        <select v-model="form.sellingAgentId">
          <option
            v-for="agent in agents"
            :key="agent.id"
            :value="agent.id"
          >
            {{ agent.name }} • {{ agent.id }}
          </option>
        </select>
      </label>

      <div class="preview-actions">
        <button type="button" class="ghost-button" :disabled="isPreviewLoading" @click="handleReset">
          Reset
        </button>

        <button class="primary-button" :disabled="isPreviewLoading">
          {{ isPreviewLoading ? 'Calculating...' : 'Run Preview' }}
        </button>
      </div>
    </form>

    <p class="helper-copy">
      Run a what-if scenario to review the payout split without creating a transaction or changing saved data.
    </p>

    <p v-if="validationError" class="inline-error">
      {{ validationError }}
    </p>

    <div v-if="preview" class="preview-result">
      <div class="preview-result__hero">
        <div>
          <p class="eyebrow">Scenario</p>
          <h3>{{ propertyLabel.name }}</h3>
          <p class="preview-result__reference">{{ propertyLabel.reference }}</p>
        </div>
        <span class="stage-badge">
          {{ preview.currency }} Preview
        </span>
      </div>

      <div class="preview-kpis">
        <article class="preview-kpi-card preview-kpi-card--agency">
          <span>Agency Share</span>
          <strong>{{ formatMoney(preview.commission.agencyShare, preview.currency) }}</strong>
          <small>Locked to the company side of the split.</small>
        </article>

        <article class="preview-kpi-card preview-kpi-card--agents">
          <span>Agent Pool</span>
          <strong>{{ formatMoney(preview.commission.agentPool, preview.currency) }}</strong>
          <small>Distributed based on the active commission rule.</small>
        </article>

        <article class="preview-kpi-card">
          <span>Top Recipient</span>
          <strong>{{ topRecipient?.agentName ?? 'No recipient yet' }}</strong>
          <small>
            {{
              topRecipient
                ? formatMoney(topRecipient.amount, preview.currency)
                : 'Run the simulation to calculate a payout.'
            }}
          </small>
        </article>
      </div>

      <section class="preview-explanation">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Why This Payout</p>
            <h3>Commission rule explanation</h3>
          </div>
        </div>

        <ul class="explanation-list">
          <li v-for="item in preview.commission.explanation" :key="item.code">
            {{ item.message }}
          </li>
        </ul>
      </section>

      <section class="preview-breakdown">
        <div class="panel__header">
          <div>
            <p class="eyebrow">Payout Breakdown</p>
            <h3>Recipient-level split</h3>
          </div>
        </div>

        <div class="preview-breakdown__table">
          <div class="preview-breakdown__row preview-breakdown__row--head">
            <span>Agent</span>
            <span>Role</span>
            <span>Amount</span>
          </div>

          <div
            v-for="payout in preview.commission.payouts"
            :key="`${payout.agentId}-${payout.reason}`"
            class="preview-breakdown__row"
          >
            <span>{{ payout.agentName }}</span>
            <span>{{ payout.reason.replaceAll('_', ' ') }}</span>
            <strong>{{ formatMoney(payout.amount, preview.currency) }}</strong>
          </div>
        </div>
      </section>
    </div>

    <div v-else class="preview-empty-state">
      <p class="eyebrow">No Preview Yet</p>
      <h3>Run a simulation to see the commission split.</h3>
      <p>
        You will get agency earnings, agent payouts, and a readable explanation without saving any transaction.
      </p>
    </div>
  </section>
</template>
