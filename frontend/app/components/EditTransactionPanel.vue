<script setup lang="ts">
import { z } from 'zod';
import { storeToRefs } from 'pinia';
import type { Transaction } from '~/types/api';
import { useDashboardStore } from '~/stores/dashboard';

const props = defineProps<{
  transaction: Transaction;
}>();

const emit = defineEmits<{
  updated: [transaction: Transaction];
  deleted: [];
}>();

const store = useDashboardStore();
const { agents, isMutating } = storeToRefs(store);

const form = reactive({
  propertyRef: '',
  totalServiceFee: 0,
  currency: 'EUR' as Transaction['currency'],
  listingAgentId: '',
  sellingAgentId: '',
});

const validationError = ref('');

const schema = z.object({
  propertyRef: z.string().trim().min(3, 'Property reference is required.'),
  totalServiceFee: z.number().positive('Service fee must be greater than 0.'),
  currency: z.enum(['EUR', 'USD', 'TRY', 'GBP']),
  listingAgentId: z.string().min(1, 'A listing agent must be selected.'),
  sellingAgentId: z.string().min(1, 'A selling agent must be selected.'),
});

const isLocked = computed(() => props.transaction.financialIntegrity.isLocked);

watch(
  () => props.transaction,
  (transaction) => {
    form.propertyRef = transaction.propertyRef;
    form.totalServiceFee = transaction.totalServiceFee;
    form.currency = transaction.currency;
    form.listingAgentId = transaction.listingAgent.id;
    form.sellingAgentId = transaction.sellingAgent.id;
    validationError.value = '';
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

  const updated = await store.updateTransaction({
    id: props.transaction.id,
    ...parsed.data,
  });

  emit('updated', updated);
}

async function removeTransaction() {
  const confirmed = window.confirm(
    `${props.transaction.propertyRef} kaydini silmek istedigine emin misin?`,
  );

  if (!confirmed) {
    return;
  }

  await store.deleteTransaction(props.transaction.id);
  emit('deleted');
}
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Manage Transaction</p>
        <h2>Edit transaction details</h2>
      </div>
    </div>

    <template v-if="!isLocked">
      <form class="preview-form" @submit.prevent="submit">
        <label>
          <span>Property Reference</span>
          <input v-model="form.propertyRef" type="text" placeholder="Sea-view apartment in Bebek • TRX-DEMO-901">
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

        <div class="listing-form-actions transaction-form-actions">
          <button class="primary-button" :disabled="isMutating">
            {{ isMutating ? 'Saving...' : 'Save Transaction' }}
          </button>
          <button
            class="ghost-button listing-delete-button"
            type="button"
            :disabled="isMutating"
            @click="removeTransaction"
          >
            Delete Transaction
          </button>
        </div>
      </form>

      <p v-if="validationError" class="inline-error">
        {{ validationError }}
      </p>
    </template>

    <div v-else class="preview-empty-state">
      <p class="eyebrow">Locked record</p>
      <h3>This transaction is completed and financially locked.</h3>
      <p>Editing and deletion are disabled after completion to keep the payout trail auditable.</p>
    </div>
  </section>
</template>
