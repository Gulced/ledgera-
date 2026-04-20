<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useAuthStore } from '~/stores/auth';
import { useDashboardStore } from '~/stores/dashboard';
import { useWorkspaceStore } from '~/stores/workspace';

const authStore = useAuthStore();
const { currentUser } = storeToRefs(authStore);
const dashboardStore = useDashboardStore();
const workspaceStore = useWorkspaceStore();
const route = useRoute();

const routeMeta = computed(() => {
  if (route.path.startsWith('/agents')) {
    return {
      eyebrow: 'Agent Workspace',
      title: 'Agent directory, ownership, and portfolio visibility',
      subtitle: 'Review agent coverage, update profiles, and connect people to active listings and deal flow.',
    };
  }

  if (route.path.startsWith('/listings')) {
    return {
      eyebrow: 'Listing Workspace',
      title: route.path === '/listings' ? 'Property inventory and portfolio control' : 'Listing detail and location context',
      subtitle: 'Track portfolio health, update listing status, and move opportunities into transactions.',
    };
  }

  if (route.path.startsWith('/transactions/')) {
    return {
      eyebrow: 'Transaction Workspace',
      title: 'Deal workflow, auditability, and payout control',
      subtitle: 'Follow each transaction step, validate responsibility, and keep the financial trail readable.',
    };
  }

  return {
    eyebrow: 'Control Center',
    title: 'Real-estate operations with clarity and accountability',
    subtitle: 'Ledgera brings listings, transactions, commission logic, and role-based visibility into one operating canvas.',
  };
});

async function signOut() {
  authStore.logout();
  await navigateTo('/auth');
}

onMounted(async () => {
  workspaceStore.hydrate();
  await authStore.loadAccounts();

  if (!dashboardStore.agents.length) {
    await dashboardStore.loadAgents();
  }
});
</script>

<template>
  <div class="shell shell--app">
    <aside class="shell__sidebar">
      <div class="sidebar-brand">
        <img class="sidebar-brand__logo" src="/ledgera-logo.png" alt="Ledgera logo">
        <div>
          <p class="eyebrow">Ledgera OS</p>
          <strong>Brokerage operations suite</strong>
        </div>
      </div>

      <nav class="sidebar-nav">
        <NuxtLink class="sidebar-nav__link" to="/">
          <span class="sidebar-nav__icon">01</span>
          <span>
            <strong>Dashboard</strong>
            <small>Transactions and financial overview</small>
          </span>
        </NuxtLink>

        <NuxtLink class="sidebar-nav__link" to="/listings">
          <span class="sidebar-nav__icon">02</span>
          <span>
            <strong>Listings</strong>
            <small>Inventory, status, and agent portfolios</small>
          </span>
        </NuxtLink>

        <NuxtLink class="sidebar-nav__link" to="/agents">
          <span class="sidebar-nav__icon">03</span>
          <span>
            <strong>Agents</strong>
            <small>Profiles, activity context, and assignment health</small>
          </span>
        </NuxtLink>
      </nav>

      <div class="sidebar-note">
        <p class="eyebrow">Operating Model</p>
        <h3>Each role lands in a focused workspace.</h3>
        <p>
          Admin, operations, finance, and agent users only see the screens and actions that belong
          to their responsibility model.
        </p>
      </div>
    </aside>

    <div class="shell__main">
      <header class="shell__topbar">
        <div class="shell__topbar-copy">
          <p class="eyebrow">{{ routeMeta.eyebrow }}</p>
          <h1>{{ routeMeta.title }}</h1>
          <p class="shell__subtitle">{{ routeMeta.subtitle }}</p>
        </div>

        <div class="shell__controls">
          <span v-if="currentUser" class="actor-chip">
            {{ currentUser?.name }}
            <small>{{ currentUser?.role }}</small>
          </span>

          <button class="ghost-button" @click="signOut">
            Log Out
          </button>
        </div>
      </header>

      <main class="shell__content">
        <slot />
      </main>
    </div>

    <GlobalAssistantFab />
  </div>
</template>
