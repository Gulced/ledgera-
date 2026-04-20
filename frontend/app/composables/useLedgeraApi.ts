import type {
  ActorContext,
  Agent,
  AuthAccount,
  ApiError,
  ApiSuccess,
  AssistantPageType,
  AssistantResponse,
  CommissionPreview,
  CreateAgentInput,
  CreateListingInput,
  CreateUserAccountInput,
  LoginInput,
  Listing,
  ListingAssistantAction,
  ListingAssistantResponse,
  ListingFilters,
  ListingStatus,
  UpdateListingInput,
  Transaction,
  TransactionFilters,
  TransactionListResponse,
  TransactionSummary,
  CreateTransactionInput,
  UpdateAgentInput,
  UpdateTransactionInput,
} from '~/types/api';

function buildHeaders(actor: ActorContext) {
  return {
    'x-user-id': actor.userId,
    'x-user-name': actor.name,
    'x-user-role': actor.role,
  };
}

function cleanQuery(filters: Partial<TransactionFilters>) {
  return Object.fromEntries(
    Object.entries(filters).filter((entry) => {
      const value = entry[1];
      return value !== '' && value !== undefined && value !== null;
    }),
  );
}

export function useLedgeraApi() {
  const config = useRuntimeConfig();

  async function request<T>(
    path: string,
    options: {
      actor: ActorContext;
      method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
      query?: Record<string, string | number>;
      body?: Record<string, unknown>;
    },
  ) {
    try {
      const response = await $fetch<ApiSuccess<T>>(path, {
        baseURL: config.public.apiBase,
        method: options.method ?? 'GET',
        query: options.query,
        body: options.body,
        headers: buildHeaders(options.actor),
      });

      return response.data;
    } catch (error) {
      const apiError = error as { data?: ApiError };
      const fallbackMessage = apiError.data?.error.message
        ?? `Backend is unreachable. Make sure the API is running at ${config.public.apiBase}.`;

      throw createError({
        statusCode: apiError.data?.error.statusCode ?? 500,
        statusMessage: fallbackMessage,
        data: apiError.data?.error,
      });
    }
  }

  return {
    getUsers(actor: ActorContext) {
      return request<AuthAccount[]>('/users', { actor });
    },
    createUserAccount(actor: ActorContext, body: CreateUserAccountInput) {
      return request<AuthAccount>('/users', {
        actor,
        method: 'POST',
        body,
      });
    },
    async loginUser(body: LoginInput) {
      try {
        const response = await $fetch<ApiSuccess<AuthAccount>>('/auth/login', {
          baseURL: config.public.apiBase,
          method: 'POST',
          body,
        });

        return response.data;
      } catch (error) {
        const apiError = error as { data?: ApiError };
        const fallbackMessage = apiError.data?.error.message
          ?? `Backend is unreachable. Make sure the API is running at ${config.public.apiBase}.`;

        throw createError({
          statusCode: apiError.data?.error.statusCode ?? 500,
          statusMessage: fallbackMessage,
          data: apiError.data?.error,
        });
      }
    },
    getTransactions(actor: ActorContext, filters: TransactionFilters) {
      return request<TransactionListResponse>('/transactions', {
        actor,
        query: cleanQuery(filters) as Record<string, string | number>,
      });
    },
    getSummary(actor: ActorContext, filters: Partial<TransactionFilters>) {
      return request<TransactionSummary>('/transactions/summary', {
        actor,
        query: cleanQuery(filters) as Record<string, string | number>,
      });
    },
    getTransaction(actor: ActorContext, id: string) {
      return request<Transaction>(`/transactions/${id}`, { actor });
    },
    previewCommission(
      actor: ActorContext,
      body: {
        propertyRef: string;
        totalServiceFee: number;
        currency: Transaction['currency'];
        listingAgent: { id: string; name: string };
        sellingAgent: { id: string; name: string };
      },
    ) {
      return request<CommissionPreview>('/transactions/preview-commission', {
        actor,
        method: 'POST',
        body,
      });
    },
    getAgents(actor: ActorContext) {
      return request<Agent[]>('/agents', { actor });
    },
    getAgent(actor: ActorContext, id: string) {
      return request<Agent>(`/agents/${id}`, { actor });
    },
    createAgent(actor: ActorContext, body: CreateAgentInput) {
      return request<Agent>('/agents', {
        actor,
        method: 'POST',
        body,
      });
    },
    updateAgent(actor: ActorContext, input: UpdateAgentInput) {
      return request<Agent>(`/agents/${input.id}`, {
        actor,
        method: 'PATCH',
        body: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          isActive: input.isActive,
        },
      });
    },
    deleteAgent(actor: ActorContext, id: string) {
      return request<null>(`/agents/${id}`, {
        actor,
        method: 'DELETE',
      });
    },
    createTransaction(actor: ActorContext, input: CreateTransactionInput, agents: Agent[]) {
      const listingAgent = agents.find((agent) => agent.id === input.listingAgentId);
      const sellingAgent = agents.find((agent) => agent.id === input.sellingAgentId);

      if (!listingAgent || !sellingAgent) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Valid listing and selling agents must be selected.',
        });
      }

      return request<Transaction>('/transactions', {
        actor,
        method: 'POST',
        body: {
          propertyRef: input.propertyRef,
          totalServiceFee: input.totalServiceFee,
          currency: input.currency,
          listingAgent: { id: listingAgent.id, name: listingAgent.name },
          sellingAgent: { id: sellingAgent.id, name: sellingAgent.name },
        },
      });
    },
    updateTransaction(actor: ActorContext, input: UpdateTransactionInput, agents: Agent[]) {
      const listingAgent = agents.find((agent) => agent.id === input.listingAgentId);
      const sellingAgent = agents.find((agent) => agent.id === input.sellingAgentId);

      if (!listingAgent || !sellingAgent) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Valid listing and selling agents must be selected.',
        });
      }

      return request<Transaction>(`/transactions/${input.id}`, {
        actor,
        method: 'PATCH',
        body: {
          propertyRef: input.propertyRef,
          totalServiceFee: input.totalServiceFee,
          currency: input.currency,
          listingAgent: { id: listingAgent.id, name: listingAgent.name },
          sellingAgent: { id: sellingAgent.id, name: sellingAgent.name },
        },
      });
    },
    deleteTransaction(actor: ActorContext, id: string) {
      return request<null>(`/transactions/${id}`, {
        actor,
        method: 'DELETE',
      });
    },
    transitionTransaction(actor: ActorContext, id: string, stage: Transaction['stage']) {
      return request<Transaction>(`/transactions/${id}/stage`, {
        actor,
        method: 'PATCH',
        body: { stage },
      });
    },
    getListings(actor: ActorContext, filters: ListingFilters) {
      return request<Listing[]>('/listings', {
        actor,
        query: cleanQuery(filters) as Record<string, string | number>,
      });
    },
    getListing(actor: ActorContext, id: string) {
      return request<Listing>(`/listings/${id}`, { actor });
    },
    createListing(actor: ActorContext, input: CreateListingInput, agents: Agent[]) {
      const listingAgent = agents.find((agent) => agent.id === input.listingAgentId);

      if (!listingAgent) {
        throw createError({
          statusCode: 400,
          statusMessage: 'A valid listing agent must be selected.',
        });
      }

      return request<Listing>('/listings', {
        actor,
        method: 'POST',
        body: {
          title: input.title,
          city: input.city,
          fullAddress: input.fullAddress,
          askingPrice: input.askingPrice,
          currency: input.currency,
          listingAgent: { id: listingAgent.id, name: listingAgent.name },
        },
      });
    },
    updateListing(actor: ActorContext, input: UpdateListingInput, agents: Agent[]) {
      const listingAgent = agents.find((agent) => agent.id === input.listingAgentId);

      if (!listingAgent) {
        throw createError({
          statusCode: 400,
          statusMessage: 'A valid listing agent must be selected.',
        });
      }

      return request<Listing>(`/listings/${input.id}`, {
        actor,
        method: 'PATCH',
        body: {
          title: input.title,
          city: input.city,
          fullAddress: input.fullAddress,
          askingPrice: input.askingPrice,
          currency: input.currency,
          listingAgent: { id: listingAgent.id, name: listingAgent.name },
        },
      });
    },
    updateListingStatus(actor: ActorContext, id: string, status: ListingStatus) {
      return request<Listing>(`/listings/${id}/status`, {
        actor,
        method: 'PATCH',
        body: { status },
      });
    },
    deleteListing(actor: ActorContext, id: string) {
      return request<null>(`/listings/${id}`, {
        actor,
        method: 'DELETE',
      });
    },
    assistListing(
      actor: ActorContext,
      id: string,
      body: { action?: ListingAssistantAction; prompt?: string },
    ) {
      return request<ListingAssistantResponse>(`/listings/${id}/assistant`, {
        actor,
        method: 'POST',
        body,
      });
    },
    chatAssistant(
      actor: ActorContext,
      body: {
        pageType: AssistantPageType;
        prompt: string;
        title?: string;
        context: Record<string, unknown>;
      },
    ) {
      return request<AssistantResponse>('/assistant/chat', {
        actor,
        method: 'POST',
        body,
      });
    },
  };
}
