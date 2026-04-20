<script setup lang="ts">
import { z } from 'zod';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '~/stores/auth';
import { useDashboardStore } from '~/stores/dashboard';

const authStore = useAuthStore();
const dashboardStore = useDashboardStore();
const api = useLedgeraApi();
const { actor } = storeToRefs(dashboardStore);

const form = reactive({
  role: 'operations' as 'operations' | 'finance' | 'agent',
  name: '',
  email: '',
  password: '',
});

const successMessage = ref('');
const errorMessage = ref('');

const schema = z.object({
  role: z.enum(['operations', 'finance', 'agent']),
  name: z.string().trim().min(2, 'Full name must be at least 2 characters.'),
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

function resetForm() {
  form.role = 'operations';
  form.name = '';
  form.email = '';
  form.password = '';
}

async function submit() {
  successMessage.value = '';
  errorMessage.value = '';

  const parsed = schema.safeParse(form);
  if (!parsed.success) {
    errorMessage.value = parsed.error.issues[0]?.message ?? 'The account form is invalid.';
    return;
  }

  try {
    let linkedAgentId: string | undefined;

    if (parsed.data.role === 'agent') {
      const createdAgent = await api.createAgent(actor.value, {
        name: parsed.data.name,
        email: parsed.data.email,
        isActive: true,
      });
      linkedAgentId = createdAgent.id;
      await dashboardStore.loadAgents();
    }

    const account = await authStore.createAccount({
      role: parsed.data.role,
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      linkedAgentId,
    });

    successMessage.value =
      parsed.data.role === 'agent'
        ? `Agent account created for ${account.name}.`
        : `Account created for ${account.name}.`;
    resetForm();
  } catch (error) {
    const appError = error as { statusMessage?: string };
    errorMessage.value = appError.statusMessage ?? 'Account creation failed.';
  }
}
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Admin Access</p>
        <h2>Create user account</h2>
      </div>
    </div>

    <form class="preview-form" @submit.prevent="submit">
      <label>
        <span>Role</span>
        <select v-model="form.role">
          <option value="operations">Operations</option>
          <option value="finance">Finance</option>
          <option value="agent">Agent</option>
        </select>
      </label>

      <label>
        <span>Full Name</span>
        <input v-model="form.name" type="text" placeholder="Jane Doe">
      </label>

      <label>
        <span>Email</span>
        <input v-model="form.email" type="email" placeholder="name@ledgera.app">
      </label>

      <label>
        <span>Password</span>
        <input v-model="form.password" type="password" placeholder="At least 6 characters">
      </label>

      <button class="primary-button">
        Create Account
      </button>
    </form>

    <p class="helper-copy">
      Public registration is disabled. Admins provision operations, finance, and agent logins here. Agent
      accounts automatically create the linked agent profile.
    </p>

    <p v-if="successMessage" class="success-banner">
      {{ successMessage }}
    </p>

    <p v-if="errorMessage" class="inline-error">
      {{ errorMessage }}
    </p>
  </section>
</template>
