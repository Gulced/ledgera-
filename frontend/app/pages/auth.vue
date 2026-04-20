<script setup lang="ts">
import { z } from 'zod';
import { useAuthStore } from '~/stores/auth';
import type { UserRole } from '~/types/api';

definePageMeta({
  layout: false,
});

const authStore = useAuthStore();
const router = useRouter();
const activeRole = ref<UserRole>('admin');
const isSubmitting = ref(false);
const errorMessage = ref('');

const loginForm = reactive({
  email: '',
  password: '',
});

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

const demoCredentials = [
  { role: 'admin', email: 'admin@ledgera.app', password: 'demo123' },
  { role: 'operations', email: 'operations@ledgera.app', password: 'demo123' },
  { role: 'finance', email: 'finance@ledgera.app', password: 'demo123' },
  { role: 'agent', email: 'gulcedurukoc@gmail.com', password: 'demo123' },
  { role: 'agent', email: 'agent@ledgera.com', password: 'demo123' },
] satisfies Array<{ role: UserRole; email: string; password: string }>;

onMounted(() => {
  if (authStore.currentUser) {
    void router.replace('/');
  }
});

async function submitLogin() {
  errorMessage.value = '';
  const parsed = loginSchema.safeParse(loginForm);

  if (!parsed.success) {
    errorMessage.value = parsed.error.issues[0]?.message ?? 'The login form is invalid.';
    return;
  }

  isSubmitting.value = true;

  try {
    await authStore.login({
      role: activeRole.value,
      email: parsed.data.email,
      password: parsed.data.password,
    });
    await navigateTo('/');
  } catch (error) {
    const appError = error as { statusMessage?: string };
    errorMessage.value = appError.statusMessage ?? 'Login failed.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="auth-shell">
    <section class="auth-card">
      <div class="auth-showcase">
        <div class="auth-card__intro">
          <div class="auth-brand-lockup">
            <img class="auth-brand-lockup__logo" src="/ledgera-logo.png" alt="Ledgera logo">
          </div>
          <p class="eyebrow">Ledgera Access</p>
          <h1>Welcome to the Ledgera operating system</h1>
          <p>
            Ledgera is a transaction operations platform designed for real estate teams that need clear
            workflow ownership, controlled financial visibility, and reliable auditability across every deal.
          </p>
          <p>
            Once signed in, each user lands in the workspace that matches their role. Admin, operations,
            finance, and agent users only see the screens and actions that belong to their responsibilities.
          </p>

          <div class="auth-role-grid">
            <button
              v-for="role in ['admin', 'operations', 'finance', 'agent']"
              :key="role"
              class="top-nav__link"
              :class="{ 'top-nav__link--active': activeRole === role }"
              @click="activeRole = role"
            >
              {{ role }}
            </button>
          </div>

          <div class="auth-preview-card">
            <div class="auth-preview-card__top">
              <span class="auth-preview-card__pill">Role-based visibility</span>
              <span class="auth-preview-card__pill">Audit-ready finance</span>
            </div>
            <div class="auth-preview-grid">
              <article>
                <span>Transactions</span>
                <strong>24</strong>
              </article>
              <article>
                <span>Open revenue</span>
                <strong>€348k</strong>
              </article>
              <article>
                <span>Listing pool</span>
                <strong>18</strong>
              </article>
              <article>
                <span>Completion rate</span>
                <strong>82%</strong>
              </article>
            </div>
          </div>
        </div>

        <div class="auth-form-card">
          <p v-if="errorMessage" class="inline-error auth-inline-error">
            {{ errorMessage }}
          </p>

          <form class="auth-form" @submit.prevent="submitLogin">
            <div class="panel__header">
              <div>
                <p class="eyebrow">Sign In</p>
                <h2>Access your workspace</h2>
              </div>
            </div>

            <label>
              <span>Work email</span>
              <input v-model="loginForm.email" type="email" placeholder="name@ledgera.app">
            </label>

            <label>
              <span>Password</span>
              <input v-model="loginForm.password" type="password" placeholder="••••••••">
            </label>

            <button class="primary-button" :disabled="isSubmitting">
              {{ isSubmitting ? 'Signing in...' : 'Sign in' }}
            </button>
          </form>

          <div class="auth-demo">
            <p class="eyebrow">Quick Demo Access</p>
            <div class="auth-demo__list">
              <article v-for="item in demoCredentials" :key="item.role" class="auth-demo__item">
                <strong>{{ item.role }}</strong>
                <small>{{ item.email }}</small>
                <small>{{ item.password }}</small>
              </article>
            </div>

            <p class="helper-copy helper-copy--compact">
              Ledgera will route you into the correct workspace based on the account you use. New operations,
              finance, and agent accounts are provisioned by an admin from inside the platform.
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
