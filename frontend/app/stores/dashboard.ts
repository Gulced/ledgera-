import { defineStore } from 'pinia';
import { useAuthStore } from '~/stores/auth';
import type {
  ActorContext,
  Agent,
  CommissionPreview,
  CreateAgentInput,
  CreateListingInput,
  CreateTransactionInput,
  Listing,
  ListingFilters,
  ListingStatus,
  Transaction,
  TransactionFilters,
  TransactionSummary,
  UpdateListingInput,
  UserRole,
} from '~/types/api';

function createDefaultFilters(): TransactionFilters {
  return {
    search: '',
    stage: '',
    currency: '',
    agentId: '',
    sortBy: 'updatedAt',
    order: 'desc',
    page: 1,
    limit: 8,
  };
}

function createDefaultListingFilters(): ListingFilters {
  return {
    search: '',
    status: '',
    agentId: '',
  };
}

function createDefaultPreviewInput() {
  return {
    propertyRef: 'Sea-view apartment in Bebek • TRX-DEMO-901',
    totalServiceFee: 120000,
    currency: 'EUR' as Transaction['currency'],
  };
}

export const useDashboardStore = defineStore('dashboard', () => {
  const api = useLedgeraApi();
  const authStore = useAuthStore();

  const activeRole = computed<UserRole>(() => authStore.currentUser?.role ?? 'admin');
  const filters = reactive<TransactionFilters>(createDefaultFilters());
  const listingFilters = reactive<ListingFilters>(createDefaultListingFilters());
  const transactions = ref<Transaction[]>([]);
  const listings = ref<Listing[]>([]);
  const summary = ref<TransactionSummary | null>(null);
  const agents = ref<Agent[]>([]);
  const preview = ref<CommissionPreview | null>(null);
  const actor = computed<ActorContext>(() => {
    if (!authStore.currentUser) {
      return { userId: '', name: '', role: 'admin' };
    }

    if (authStore.currentUser.role === 'agent') {
      return {
        userId: authStore.currentUser.linkedAgentId ?? authStore.currentUser.id,
        name: authStore.currentUser.name,
        role: 'agent',
      };
    }

    return {
      userId: authStore.currentUser.id,
      name: authStore.currentUser.name,
      role: authStore.currentUser.role,
    };
  });

  const isLoading = ref(false);
  const isPreviewLoading = ref(false);
  const isMutating = ref(false);
  const errorMessage = ref('');
  const successMessage = ref('');

  async function loadAgents() {
    try {
      agents.value = await api.getAgents(actor.value);
    } catch {
      agents.value = [];
    }
  }

  async function loadDashboard() {
    isLoading.value = true;
    errorMessage.value = '';

    try {
      const [summaryResponse, transactionsResponse] = await Promise.all([
        api.getSummary(actor.value, filters),
        api.getTransactions(actor.value, filters),
      ]);

      summary.value = summaryResponse;
      transactions.value = transactionsResponse.items;
      filters.page = transactionsResponse.paginationMeta.page;
      filters.limit = transactionsResponse.paginationMeta.limit;
      paginationMeta.value = transactionsResponse.paginationMeta;
    } catch (error) {
      const appError = error as { statusMessage?: string };
      errorMessage.value =
        appError.statusMessage ?? 'An error occurred while loading dashboard data.';
    } finally {
      isLoading.value = false;
    }
  }

  async function loadListings() {
    isLoading.value = true;
    errorMessage.value = '';

    try {
      if (activeRole.value === 'agent') {
        listingFilters.agentId = actor.value.userId;
      }

      listings.value = await api.getListings(actor.value, listingFilters);
    } catch (error) {
      const appError = error as { statusMessage?: string };
      errorMessage.value =
        appError.statusMessage ?? 'An error occurred while loading listing data.';
    } finally {
      isLoading.value = false;
    }
  }

  const paginationMeta = ref({
    page: 1,
    limit: 8,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  async function previewCommission(input: {
    propertyRef: string;
    totalServiceFee: number;
    currency: Transaction['currency'];
    listingAgentId: string;
    sellingAgentId: string;
  }) {
    const listingAgent = agents.value.find((agent) => agent.id === input.listingAgentId);
    const sellingAgent = agents.value.find((agent) => agent.id === input.sellingAgentId);

    if (!listingAgent || !sellingAgent) {
      errorMessage.value =
        'Valid listing and selling agents must be selected for commission preview.';
      return;
    }

    isPreviewLoading.value = true;
    errorMessage.value = '';
    successMessage.value = '';

    try {
      preview.value = await api.previewCommission(actor.value, {
        propertyRef: input.propertyRef,
        totalServiceFee: input.totalServiceFee,
        currency: input.currency,
        listingAgent: { id: listingAgent.id, name: listingAgent.name },
        sellingAgent: { id: sellingAgent.id, name: sellingAgent.name },
      });
    } catch (error) {
      const appError = error as { statusMessage?: string };
      errorMessage.value =
        appError.statusMessage ?? 'An error occurred while loading the commission preview.';
    } finally {
      isPreviewLoading.value = false;
    }
  }

  async function createAgent(input: CreateAgentInput) {
    isMutating.value = true;
    errorMessage.value = '';
    successMessage.value = '';

    try {
      const created = await api.createAgent(actor.value, input);
      await loadAgents();
      successMessage.value = `Agent created. ID: ${created.id}`;
    } catch (error) {
      const appError = error as { statusMessage?: string };
      errorMessage.value =
        appError.statusMessage ?? 'An error occurred while creating the agent.';
      throw error;
    } finally {
      isMutating.value = false;
    }
  }

  async function createTransaction(input: CreateTransactionInput) {
    isMutating.value = true;
    errorMessage.value = '';
    successMessage.value = '';

    try {
      const created = await api.createTransaction(actor.value, input, agents.value);
      await loadDashboard();
      successMessage.value = `Transaction created. ID: ${created.id}`;
    } catch (error) {
      const appError = error as { statusMessage?: string };
      errorMessage.value =
        appError.statusMessage ?? 'An error occurred while creating the transaction.';
      throw error;
    } finally {
      isMutating.value = false;
    }
  }

  async function createListing(input: CreateListingInput) {
    isMutating.value = true;
    errorMessage.value = '';
    successMessage.value = '';

    try {
      const created = await api.createListing(actor.value, input, agents.value);
      await loadListings();
      successMessage.value = `Listing created. Property Ref: ${created.propertyRef}`;
    } catch (error) {
      const appError = error as { statusMessage?: string };
      errorMessage.value =
        appError.statusMessage ?? 'An error occurred while creating the listing.';
      throw error;
    } finally {
      isMutating.value = false;
    }
  }

  async function updateListingStatus(id: string, status: ListingStatus) {
    isMutating.value = true;
    errorMessage.value = '';
    successMessage.value = '';

    try {
      const updated = await api.updateListingStatus(actor.value, id, status);
      listings.value = listings.value.map((listing) =>
        listing.id === id ? updated : listing,
      );
      successMessage.value = `Listing status updated to ${status.replaceAll('_', ' ')}.`;
      return updated;
    } catch (error) {
      const appError = error as { statusMessage?: string };
      errorMessage.value =
        appError.statusMessage ?? 'An error occurred while updating the listing status.';
      throw error;
    } finally {
      isMutating.value = false;
    }
  }

  async function updateListing(input: UpdateListingInput) {
    isMutating.value = true;
    errorMessage.value = '';
    successMessage.value = '';

    try {
      const updated = await api.updateListing(actor.value, input, agents.value);
      listings.value = listings.value.map((listing) =>
        listing.id === input.id ? updated : listing,
      );
      successMessage.value = `Listing updated for ${updated.propertyRef}.`;
      return updated;
    } catch (error) {
      const appError = error as { statusMessage?: string };
      errorMessage.value =
        appError.statusMessage ?? 'An error occurred while updating the listing.';
      throw error;
    } finally {
      isMutating.value = false;
    }
  }

  async function deleteListing(id: string) {
    isMutating.value = true;
    errorMessage.value = '';
    successMessage.value = '';

    try {
      await api.deleteListing(actor.value, id);
      listings.value = listings.value.filter((listing) => listing.id !== id);
      successMessage.value = 'Listing deleted.';
    } catch (error) {
      const appError = error as { statusMessage?: string };
      errorMessage.value =
        appError.statusMessage ?? 'An error occurred while deleting the listing.';
      throw error;
    } finally {
      isMutating.value = false;
    }
  }

  async function transitionTransaction(id: string, stage: Transaction['stage']) {
    isMutating.value = true;
    errorMessage.value = '';
    successMessage.value = '';

    try {
      const updated = await api.transitionTransaction(actor.value, id, stage);
      successMessage.value = 'Transaction stage updated.';
      return updated;
    } catch (error) {
      const appError = error as { statusMessage?: string };
      errorMessage.value =
        appError.statusMessage ?? 'An error occurred while advancing the stage.';
      throw error;
    } finally {
      isMutating.value = false;
    }
  }

  function setRole(role: UserRole) {
    if (role === activeRole.value) {
      return;
    }

    filters.page = 1;
  }

  function resetFilters() {
    Object.assign(filters, createDefaultFilters());
  }

  function resetListingFilters() {
    Object.assign(listingFilters, createDefaultListingFilters());

    if (activeRole.value === 'agent') {
      listingFilters.agentId = actor.value.userId;
    }
  }

  function resetPreview() {
    preview.value = null;
    errorMessage.value = '';
    successMessage.value = '';
  }

  return {
    activeRole,
    actor,
    filters,
    listingFilters,
    transactions,
    listings,
    summary,
    agents,
    preview,
    paginationMeta,
    isLoading,
    isPreviewLoading,
    isMutating,
    errorMessage,
    successMessage,
    loadAgents,
    loadDashboard,
    loadListings,
    previewCommission,
    createAgent,
    createListing,
    updateListing,
    deleteListing,
    updateListingStatus,
    createTransaction,
    transitionTransaction,
    setRole,
    resetFilters,
    resetListingFilters,
    resetPreview,
    createDefaultPreviewInput,
  };
});
