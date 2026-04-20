<script setup lang="ts">
import { storeToRefs } from 'pinia';
import type { Agent, Listing, Transaction, TransactionFilters } from '~/types/api';
import { useAuthStore } from '~/stores/auth';
import { useDashboardStore } from '~/stores/dashboard';
import { useAgentAssistantContext } from '~/composables/useAgentAssistantContext';

const store = useDashboardStore();
const authStore = useAuthStore();
const api = useLedgeraApi();
const agentAssistantContext = useAgentAssistantContext();

const { activeRole, actor, agents, errorMessage, isLoading, successMessage } = storeToRefs(store);

const selectedAgentId = ref('');
const metricsLoading = ref(false);
const metricsError = ref('');
const selectedListings = ref<Listing[]>([]);
const selectedTransactions = ref<Transaction[]>([]);
const selectedTransactionCount = ref(0);

const canManageAgents = computed(() => activeRole.value === 'admin');
const visibleAgents = computed(() => agents.value);
const selectedAgent = computed<Agent | null>(() =>
  visibleAgents.value.find((agent) => agent.id === selectedAgentId.value) ?? null,
);
const activeAgentCount = computed(() =>
  visibleAgents.value.filter((agent) => agent.isActive).length,
);
const linkedAccountCount = computed(() => {
  if (!selectedAgent.value || activeRole.value !== 'admin') {
    return 0;
  }

  return authStore.accounts.filter((account) => account.linkedAgentId === selectedAgent.value?.id).length;
});

const selectedMetrics = computed(() => ({
  listingCount: selectedListings.value.length,
  transactionCount: selectedTransactionCount.value,
  linkedAccountCount: linkedAccountCount.value,
}));

function defaultTransactionFilters(agentId: string): TransactionFilters {
  return {
    search: '',
    stage: '',
    currency: '',
    agentId,
    sortBy: 'updatedAt',
    order: 'desc',
    page: 1,
    limit: 4,
  };
}

async function loadSelectedAgentContext(agentId: string) {
  if (!agentId) {
    selectedListings.value = [];
    selectedTransactions.value = [];
    selectedTransactionCount.value = 0;
    metricsError.value = '';
    return;
  }

  metricsLoading.value = true;
  metricsError.value = '';

  try {
    const [listingsResponse, transactionsResponse] = await Promise.all([
      api.getListings(actor.value, {
        search: '',
        status: '',
        agentId,
      }),
      api.getTransactions(actor.value, defaultTransactionFilters(agentId)),
    ]);

    selectedListings.value = listingsResponse.slice(0, 4);
    selectedTransactions.value = transactionsResponse.items;
    selectedTransactionCount.value = transactionsResponse.paginationMeta.totalItems;
    agentAssistantContext.selectedListings.value = listingsResponse.slice(0, 6);
    agentAssistantContext.selectedTransactions.value = transactionsResponse.items;
  } catch (error) {
    const appError = error as { statusMessage?: string };
    metricsError.value =
      appError.statusMessage ?? 'Agent workspace context could not be loaded.';
    selectedListings.value = [];
    selectedTransactions.value = [];
    selectedTransactionCount.value = 0;
    agentAssistantContext.selectedListings.value = [];
    agentAssistantContext.selectedTransactions.value = [];
  } finally {
    metricsLoading.value = false;
  }
}

async function hydratePage() {
  await store.loadAgents();
  agentAssistantContext.totalVisibleAgents.value = visibleAgents.value.length;

  if (activeRole.value === 'admin') {
    await authStore.loadAccounts();
  }

  const nextSelection = visibleAgents.value.find((agent) => agent.id === selectedAgentId.value)
    ?? visibleAgents.value[0]
    ?? null;

  selectedAgentId.value = nextSelection?.id ?? '';
  await loadSelectedAgentContext(selectedAgentId.value);
}

function handleDeletedAgent(agentId: string) {
  if (selectedAgentId.value !== agentId) {
    return;
  }

  const nextSelection = visibleAgents.value[0] ?? null;
  selectedAgentId.value = nextSelection?.id ?? '';
  void loadSelectedAgentContext(selectedAgentId.value);
}

watch(
  [selectedAgent, selectedMetrics, visibleAgents],
  () => {
    agentAssistantContext.selectedAgent.value = selectedAgent.value;
    agentAssistantContext.selectedMetrics.value = selectedMetrics.value;
    agentAssistantContext.totalVisibleAgents.value = visibleAgents.value.length;
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  agentAssistantContext.clearAgentAssistantContext();
});

watch(
  () => selectedAgentId.value,
  async (agentId, previousId) => {
    if (agentId === previousId) {
      return;
    }

    await loadSelectedAgentContext(agentId);
  },
);

watch(
  () => activeRole.value,
  async () => {
    await hydratePage();
  },
);

await hydratePage();
</script>

<template>
  <AppShell>
    <div class="dashboard-grid">
      <div class="dashboard-grid__main">
        <section class="workspace-hero panel">
          <div class="workspace-hero__copy">
            <p class="eyebrow">Agent Command</p>
            <h2>Keep agent ownership, contact quality, and portfolio context in one readable workspace.</h2>
            <p>
              Review who is active, how many listings and transactions they carry, and keep agent
              records clean before they affect listing and deal execution.
            </p>
          </div>

          <div class="workspace-hero__metrics">
            <div>
              <span>Visible Agents</span>
              <strong>{{ visibleAgents.length }}</strong>
            </div>
            <div>
              <span>Active Agents</span>
              <strong>{{ activeAgentCount }}</strong>
            </div>
            <div>
              <span>Selected Agent</span>
              <strong>{{ selectedAgent?.name || 'No selection' }}</strong>
            </div>
          </div>
        </section>

        <div v-if="errorMessage" class="error-banner">
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="success-banner">
          {{ successMessage }}
        </div>

        <section class="panel">
          <div class="panel__header">
            <div>
              <p class="eyebrow">Agent Directory</p>
              <h2>Profiles and ownership visibility</h2>
            </div>
          </div>

          <div v-if="visibleAgents.length" class="agent-grid">
            <button
              v-for="agent in visibleAgents"
              :key="agent.id"
              type="button"
              class="agent-card"
              :class="{ 'agent-card--selected': selectedAgentId === agent.id }"
              @click="selectedAgentId = agent.id"
            >
              <div class="agent-card__top">
                <div>
                  <p class="eyebrow">Agent Profile</p>
                  <h3>{{ agent.name }}</h3>
                </div>
                <span class="stage-badge" :data-stage="agent.isActive ? 'completed' : 'agreement'">
                  {{ agent.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>

              <div class="agent-card__meta">
                <strong>{{ agent.email || 'No email on file' }}</strong>
                <small>{{ agent.phone || 'No phone number saved' }}</small>
              </div>

              <small>ID: {{ agent.id }}</small>
            </button>
          </div>

          <div v-else-if="!isLoading" class="preview-empty-state">
            <p class="eyebrow">No agents</p>
            <h3>No agent profiles are visible for this role yet.</h3>
            <p>Create an agent as admin or sign in with a linked agent account to populate this workspace.</p>
          </div>
        </section>

        <section class="panel">
          <div class="panel__header">
            <div>
              <p class="eyebrow">Selected Agent</p>
              <h2>{{ selectedAgent?.name || 'Choose an agent' }}</h2>
            </div>
          </div>

          <div v-if="selectedAgent" class="agent-detail">
            <div class="agent-kpi-grid">
              <div class="agent-kpi-card">
                <span>Listings</span>
                <strong>{{ selectedMetrics.listingCount }}</strong>
              </div>
              <div class="agent-kpi-card">
                <span>Transactions</span>
                <strong>{{ selectedMetrics.transactionCount }}</strong>
              </div>
              <div class="agent-kpi-card">
                <span>Linked Accounts</span>
                <strong>{{ canManageAgents ? linkedAccountCount : 'Role-limited' }}</strong>
              </div>
            </div>

            <div class="detail-agents agent-detail__meta">
              <div>
                <span class="eyebrow">Email</span>
                <strong>{{ selectedAgent.email || 'No email on file' }}</strong>
              </div>
              <div>
                <span class="eyebrow">Phone</span>
                <strong>{{ selectedAgent.phone || 'No phone number on file' }}</strong>
              </div>
              <div>
                <span class="eyebrow">Status</span>
                <strong>{{ selectedAgent.isActive ? 'Active and assignable' : 'Inactive profile' }}</strong>
              </div>
              <div>
                <span class="eyebrow">Updated</span>
                <strong>{{ selectedAgent.updatedAt ? new Date(selectedAgent.updatedAt).toLocaleString() : 'No timestamp' }}</strong>
              </div>
            </div>

            <div v-if="metricsError" class="error-banner">
              {{ metricsError }}
            </div>

            <p v-else-if="metricsLoading" class="helper-copy">
              Loading selected agent context...
            </p>

            <div v-else class="agent-workspace-split">
              <section class="agent-context-card">
                <div class="panel__header">
                  <div>
                    <p class="eyebrow">Owned Listings</p>
                    <h3>Latest listing visibility</h3>
                  </div>
                </div>

                <div v-if="selectedListings.length" class="agent-context-list">
                  <NuxtLink
                    v-for="listing in selectedListings"
                    :key="listing.id"
                    class="agent-context-item"
                    :to="`/listings/${listing.id}`"
                  >
                    <strong>{{ listing.title }}</strong>
                    <span>{{ listing.city }} • {{ listing.status.replaceAll('_', ' ') }}</span>
                    <small>{{ listing.propertyRef }}</small>
                  </NuxtLink>
                </div>
                <p v-else class="helper-copy helper-copy--compact">
                  No listings are currently assigned to this agent.
                </p>
              </section>

              <section class="agent-context-card">
                <div class="panel__header">
                  <div>
                    <p class="eyebrow">Open Transactions</p>
                    <h3>Recent deal flow involvement</h3>
                  </div>
                </div>

                <div v-if="selectedTransactions.length" class="agent-context-list">
                  <NuxtLink
                    v-for="transaction in selectedTransactions"
                    :key="transaction.id"
                    class="agent-context-item"
                    :to="`/transactions/${transaction.id}`"
                  >
                    <strong>{{ transaction.propertyRef }}</strong>
                    <span>{{ transaction.stage.replaceAll('_', ' ') }} • {{ transaction.currency }}</span>
                    <small>{{ transaction.listingAgent.name }} / {{ transaction.sellingAgent.name }}</small>
                  </NuxtLink>
                </div>
                <p v-else class="helper-copy helper-copy--compact">
                  No transactions are linked to this agent yet.
                </p>
              </section>
            </div>
          </div>

          <div v-else class="preview-empty-state">
            <p class="eyebrow">No selection</p>
            <h3>Select an agent to inspect portfolio context.</h3>
            <p>Listings and transactions connected to the selected agent will appear here.</p>
          </div>
        </section>
      </div>

      <div class="dashboard-grid__side">
        <CreateAgentPanel v-if="canManageAgents" />
        <EditAgentPanel
          v-if="canManageAgents"
          :agent="selectedAgent"
          @deleted="handleDeletedAgent"
        />
      </div>
    </div>
  </AppShell>
</template>
