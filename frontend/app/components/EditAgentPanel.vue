<script setup lang="ts">
import { z } from 'zod';
import { storeToRefs } from 'pinia';
import type { Agent } from '~/types/api';
import { useDashboardStore } from '~/stores/dashboard';

const props = defineProps<{
  agent: Agent | null;
}>();

const emit = defineEmits<{
  deleted: [agentId: string];
}>();

const store = useDashboardStore();
const { isMutating } = storeToRefs(store);

const form = reactive({
  name: '',
  email: '',
  phone: '',
  isActive: true,
});

const validationError = ref('');

const schema = z.object({
  name: z.string().trim().min(2, 'Agent name is required.'),
  email: z.string().trim().or(z.literal('')),
  phone: z.string().optional(),
  isActive: z.boolean(),
});

watch(
  () => props.agent,
  (agent) => {
    form.name = agent?.name ?? '';
    form.email = agent?.email ?? '';
    form.phone = agent?.phone ?? '';
    form.isActive = agent?.isActive ?? true;
    validationError.value = '';
  },
  { immediate: true },
);

async function submit() {
  if (!props.agent) {
    return;
  }

  validationError.value = '';
  const parsed = schema.safeParse(form);

  if (!parsed.success) {
    validationError.value = parsed.error.issues[0]?.message ?? 'The form could not be validated.';
    return;
  }

  await store.updateAgent({
    id: props.agent.id,
    ...parsed.data,
    email: parsed.data.email || undefined,
    phone: parsed.data.phone?.trim() || undefined,
  });
}

async function removeAgent() {
  if (!props.agent) {
    return;
  }

  const confirmed = window.confirm(
    `${props.agent.name} agent kaydini silmek istedigine emin misin?`,
  );

  if (!confirmed) {
    return;
  }

  const deletedId = props.agent.id;
  await store.deleteAgent(deletedId);
  emit('deleted', deletedId);
}
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Edit Agent</p>
        <h2>{{ agent?.name || 'Select an agent' }}</h2>
      </div>
    </div>

    <template v-if="agent">
      <form class="preview-form" @submit.prevent="submit">
        <label>
          <span>Agent Name</span>
          <input v-model="form.name" type="text" placeholder="Selin Kaya">
        </label>
        <label>
          <span>Email</span>
          <input v-model="form.email" type="email" placeholder="selin@ledgera.com">
        </label>
        <label>
          <span>Phone</span>
          <input v-model="form.phone" type="text" placeholder="+90 555 111 2233">
        </label>
        <label class="checkbox-field">
          <input v-model="form.isActive" type="checkbox">
          <span>Agent is active</span>
        </label>

        <div class="listing-form-actions agent-form-actions">
          <button class="primary-button" :disabled="isMutating">
            {{ isMutating ? 'Saving...' : 'Save Agent' }}
          </button>
          <button
            class="ghost-button listing-delete-button"
            type="button"
            :disabled="isMutating"
            @click="removeAgent"
          >
            Delete Agent
          </button>
        </div>
      </form>

      <p v-if="validationError" class="inline-error">
        {{ validationError }}
      </p>
    </template>

    <div v-else class="preview-empty-state">
      <p class="eyebrow">No selection</p>
      <h3>Select an agent to edit profile details.</h3>
      <p>Once an agent is selected, name, contact fields, and active status can be updated here.</p>
    </div>
  </section>
</template>
