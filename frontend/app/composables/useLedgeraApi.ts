import type {
  ActorContext,
  Agent,
  AuthAccount,
  ApiError,
  ApiSuccess,
  AssistantPageType,
  AssistantMessage,
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
  CreateWorkspaceDocumentInput,
  CreateWorkspaceNoteInput,
  CreateWorkspaceTaskInput,
  WorkspaceDocument,
  WorkspaceEntityType,
  WorkspaceEvent,
  WorkspaceNote,
  WorkspaceTask,
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

function getApiError(error: unknown) {
  const candidate = error as {
    data?: ApiError;
    response?: { _data?: ApiError };
    status?: number;
    statusCode?: number;
    statusMessage?: string;
    message?: string;
  };

  const envelope = candidate.data?.error ?? candidate.response?._data?.error;

  if (envelope) {
    return {
      statusCode: envelope.statusCode,
      message: envelope.message,
      data: envelope,
    };
  }

  const statusCode = candidate.statusCode ?? candidate.status;

  if (statusCode) {
    return {
      statusCode,
      message:
        candidate.statusMessage ??
        candidate.message ??
        'The backend rejected this request.',
      data: undefined,
    };
  }

  return {
    statusCode: 503,
    message: undefined,
    data: undefined,
  };
}

function isLikelyNetworkError(error: unknown) {
  const candidate = error as {
    status?: number;
    statusCode?: number;
    name?: string;
    message?: string;
  };
  const message = candidate.message ?? '';

  return (
    !candidate.status &&
    !candidate.statusCode &&
    (candidate.name === 'FetchError' ||
      message.includes('Failed to fetch') ||
      message.includes('fetch failed') ||
      message.includes('NetworkError') ||
      message.includes('CORS'))
  );
}

function getFallbackErrorMessage(error: unknown, apiBase: string) {
  if (isLikelyNetworkError(error)) {
    return `Backend is unreachable. Make sure the API is running at ${apiBase}.`;
  }

  return 'The request could not be completed for the current user.';
}

export function useLedgeraApi() {
  const config = useRuntimeConfig();

  async function checkBackendHealth() {
    const healthUrl = config.public.healthUrl || `${config.public.apiBase}/health`;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(healthUrl, {
          method: 'GET',
          signal: controller.signal,
          credentials: 'omit',
          cache: 'no-store',
          mode: 'cors',
        });

        clearTimeout(timeout);

        if (!response.ok) {
          return {
            available: false,
            reason: 'bad_status' as const,
            statusCode: response.status,
          };
        }

        const data = (await response.json()) as { status?: string };
        return {
          available: data.status === 'ok',
          reason: data.status === 'ok' ? ('ok' as const) : ('bad_status' as const),
          statusCode: response.status,
        };
      } catch {
        if (attempt === 2) {
          return {
            available: false,
            reason: 'network_error' as const,
            statusCode: null,
          };
        }

        await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
      }
    }

    return {
      available: false,
      reason: 'network_error' as const,
      statusCode: null,
    };
  }

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

      if (response === undefined || response === null) {
        return null as T;
      }

      return response.data;
    } catch (error) {
      const apiError = getApiError(error);
      const fallbackMessage =
        apiError.message ??
        getFallbackErrorMessage(error, config.public.apiBase);

      throw createError({
        statusCode: apiError.statusCode,
        statusMessage: fallbackMessage,
        data: apiError.data,
      });
    }
  }

  return {
    checkBackendHealth,
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
        const apiError = getApiError(error);
        const fallbackMessage =
          apiError.message ??
          getFallbackErrorMessage(error, config.public.apiBase);

        throw createError({
          statusCode: apiError.statusCode,
          statusMessage: fallbackMessage,
          data: apiError.data,
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
    async uploadListingPhotos(actor: ActorContext, id: string, files: File[]) {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      try {
        const response = await $fetch<ApiSuccess<Listing>>(`/listings/${id}/photos`, {
          baseURL: config.public.apiBase,
          method: 'POST',
          body: formData,
          headers: buildHeaders(actor),
        });

        return response.data;
      } catch (error) {
        const apiError = getApiError(error);
        const fallbackMessage =
          apiError.message ??
          getFallbackErrorMessage(error, config.public.apiBase);

        throw createError({
          statusCode: apiError.statusCode,
          statusMessage: fallbackMessage,
          data: apiError.data,
        });
      }
    },
    deleteListingPhoto(actor: ActorContext, listingId: string, photoId: string) {
      return request<Listing>(`/listings/${listingId}/photos/${photoId}`, {
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
        entityId?: string;
        context: Record<string, unknown>;
      },
    ) {
      return request<AssistantResponse>('/assistant/chat', {
        actor,
        method: 'POST',
        body,
      });
    },
    getAssistantHistory(
      actor: ActorContext,
      query: {
        pageType: AssistantPageType;
        entityId?: string;
      },
    ) {
      return request<AssistantMessage[]>('/assistant/history', {
        actor,
        query: cleanQuery(query) as Record<string, string | number>,
      });
    },
    getWorkspaceNotes(
      actor: ActorContext,
      query?: { entityType?: WorkspaceEntityType; entityId?: string },
    ) {
      return request<WorkspaceNote[]>('/workspace/notes', {
        actor,
        query: cleanQuery(query ?? {}) as Record<string, string | number>,
      });
    },
    createWorkspaceNote(actor: ActorContext, body: CreateWorkspaceNoteInput) {
      return request<WorkspaceNote>('/workspace/notes', {
        actor,
        method: 'POST',
        body,
      });
    },
    getWorkspaceTasks(
      actor: ActorContext,
      query?: { entityType?: WorkspaceEntityType; entityId?: string; limit?: number },
    ) {
      return request<WorkspaceTask[]>('/workspace/tasks', {
        actor,
        query: cleanQuery(query ?? {}) as Record<string, string | number>,
      });
    },
    createWorkspaceTask(actor: ActorContext, body: CreateWorkspaceTaskInput) {
      return request<WorkspaceTask>('/workspace/tasks', {
        actor,
        method: 'POST',
        body,
      });
    },
    updateWorkspaceTaskStatus(
      actor: ActorContext,
      id: string,
      status: WorkspaceTask['status'],
    ) {
      return request<WorkspaceTask>(`/workspace/tasks/${id}/status`, {
        actor,
        method: 'PATCH',
        body: { status },
      });
    },
    getWorkspaceDocuments(
      actor: ActorContext,
      query?: { entityType?: WorkspaceEntityType; entityId?: string },
    ) {
      return request<WorkspaceDocument[]>('/workspace/documents', {
        actor,
        query: cleanQuery(query ?? {}) as Record<string, string | number>,
      });
    },
    createWorkspaceDocument(actor: ActorContext, body: CreateWorkspaceDocumentInput) {
      return request<WorkspaceDocument>('/workspace/documents', {
        actor,
        method: 'POST',
        body,
      });
    },
    updateWorkspaceDocumentStatus(
      actor: ActorContext,
      id: string,
      status: WorkspaceDocument['status'],
    ) {
      return request<WorkspaceDocument>(`/workspace/documents/${id}/status`, {
        actor,
        method: 'PATCH',
        body: { status },
      });
    },
    getWorkspaceEvents(actor: ActorContext, query?: { limit?: number }) {
      return request<WorkspaceEvent[]>('/workspace/events', {
        actor,
        query: cleanQuery(query ?? {}) as Record<string, string | number>,
      });
    },
  };
}
