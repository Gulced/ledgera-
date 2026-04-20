<script setup lang="ts">
import { z } from 'zod';
import { storeToRefs } from 'pinia';
import { useDashboardStore } from '~/stores/dashboard';

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

async function submit() {
  validationError.value = '';
  const parsed = schema.safeParse(form);

  if (!parsed.success) {
    validationError.value = parsed.error.issues[0]?.message ?? 'The form could not be validated.';
    return;
  }

  await store.createAgent({
    ...parsed.data,
    email: parsed.data.email || undefined,
  });

  form.name = '';
  form.email = '';
  form.phone = '';
  form.isActive = true;
}
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Create Agent</p>
        <h2>Add a new agent</h2>
      </div>
    </div>

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

      <button class="primary-button" :disabled="isMutating">
        {{ isMutating ? 'Saving...' : 'Create Agent' }}
      </button>
    </form>

    <p v-if="validationError" class="inline-error">
      {{ validationError }}
    </p>
  </section>
</template>
