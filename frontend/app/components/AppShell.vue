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
  await workspaceStore.hydrate();
  await authStore.loadAccounts();

  if (!dashboardStore.agents.length) {
    await dashboardStore.loadAgents();
  }
});
</script>

<template>
  <div class="shell shell--app min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(240,240,255,0.92)_42%,_rgba(233,229,255,0.78)_100%)] text-slate-900">
    <aside class="shell__sidebar border-r border-white/60 bg-white/70 backdrop-blur-xl">
      <div class="sidebar-brand flex items-start gap-4 rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_48px_rgba(31,41,55,0.08)]">
        <img class="sidebar-brand__logo h-12 w-12 rounded-2xl object-contain" src="/ledgera-logo.png" alt="Ledgera logo">
        <div>
          <p class="eyebrow text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-slate-400">Ledgera OS</p>
          <strong class="block max-w-[11rem] text-lg font-semibold leading-tight text-slate-900">Brokerage operations suite</strong>
        </div>
      </div>

      <nav class="sidebar-nav space-y-3">
        <NuxtLink class="sidebar-nav__link flex items-center gap-4 rounded-[24px] border border-transparent bg-white/60 px-4 py-4 shadow-[0_8px_24px_rgba(31,41,55,0.05)] transition hover:-translate-y-0.5 hover:border-violet-200 hover:bg-white" to="/">
          <span class="sidebar-nav__icon inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-sm font-semibold text-violet-700">01</span>
          <span>
            <strong class="block text-sm font-semibold text-slate-900">Dashboard</strong>
            <small class="block text-sm leading-5 text-slate-500">Transactions and financial overview</small>
          </span>
        </NuxtLink>

        <NuxtLink class="sidebar-nav__link flex items-center gap-4 rounded-[24px] border border-transparent bg-white/60 px-4 py-4 shadow-[0_8px_24px_rgba(31,41,55,0.05)] transition hover:-translate-y-0.5 hover:border-violet-200 hover:bg-white" to="/listings">
          <span class="sidebar-nav__icon inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-sm font-semibold text-violet-700">02</span>
          <span>
            <strong class="block text-sm font-semibold text-slate-900">Listings</strong>
            <small class="block text-sm leading-5 text-slate-500">Inventory, status, and agent portfolios</small>
          </span>
        </NuxtLink>

        <NuxtLink class="sidebar-nav__link flex items-center gap-4 rounded-[24px] border border-transparent bg-white/60 px-4 py-4 shadow-[0_8px_24px_rgba(31,41,55,0.05)] transition hover:-translate-y-0.5 hover:border-violet-200 hover:bg-white" to="/agents">
          <span class="sidebar-nav__icon inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-sm font-semibold text-violet-700">03</span>
          <span>
            <strong class="block text-sm font-semibold text-slate-900">Agents</strong>
            <small class="block text-sm leading-5 text-slate-500">Profiles, activity context, and assignment health</small>
          </span>
        </NuxtLink>
      </nav>

      <div class="sidebar-note rounded-[28px] bg-slate-900 px-6 py-7 text-white shadow-[0_22px_50px_rgba(15,23,42,0.25)]">
        <p class="eyebrow text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-300">Operating Model</p>
        <h3 class="mt-2 text-[1.75rem] font-semibold leading-[1.05] tracking-tight">Each role lands in a focused workspace.</h3>
        <p class="mt-4 text-sm leading-7 text-slate-300">
          Admin, operations, finance, and agent users only see the screens and actions that belong
          to their responsibility model.
        </p>
      </div>
    </aside>

    <div class="shell__main">
      <header class="shell__topbar rounded-[34px] border border-white/70 bg-white/75 px-8 py-8 shadow-[0_20px_55px_rgba(31,41,55,0.08)] backdrop-blur-xl">
        <div class="shell__topbar-copy">
          <p class="eyebrow text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-slate-400">{{ routeMeta.eyebrow }}</p>
          <h1 class="max-w-4xl text-balance text-4xl font-semibold leading-[0.96] tracking-tight text-slate-900 md:text-5xl">{{ routeMeta.title }}</h1>
          <p class="shell__subtitle mt-4 max-w-3xl text-base leading-8 text-slate-500">{{ routeMeta.subtitle }}</p>
        </div>

        <div class="shell__controls flex items-center gap-3">
          <span v-if="currentUser" class="actor-chip inline-flex min-w-[10rem] flex-col rounded-[22px] border border-slate-200/80 bg-white px-5 py-4 text-sm font-semibold text-slate-900 shadow-[0_8px_30px_rgba(31,41,55,0.06)]">
            {{ currentUser?.name }}
            <small class="mt-1 text-[0.7rem] uppercase tracking-[0.24em] text-slate-400">{{ currentUser?.role }}</small>
          </span>

          <button class="ghost-button inline-flex min-h-[52px] items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 shadow-[0_8px_24px_rgba(31,41,55,0.05)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900" @click="signOut">
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
