import { defineStore } from 'pinia';
import { useAuthStore } from '~/stores/auth';
import type {
  ActorContext,
  Agent,
  Listing,
  Transaction,
  WorkspaceAlert,
  WorkspaceDocument,
  WorkspaceEntityType,
  WorkspaceEvent,
  WorkspaceNote,
  WorkspaceTask,
} from '~/types/api';

function mergeById<T extends { id: string }>(current: T[], incoming: T[]) {
  const byId = new Map(current.map((item) => [item.id, item] as const));

  for (const item of incoming) {
    byId.set(item.id, item);
  }

  return [...byId.values()];
}

export const useWorkspaceStore = defineStore('workspace', () => {
  const api = useLedgeraApi();
  const authStore = useAuthStore();

  const notes = ref<WorkspaceNote[]>([]);
  const tasks = ref<WorkspaceTask[]>([]);
  const documents = ref<WorkspaceDocument[]>([]);
  const events = ref<WorkspaceEvent[]>([]);
  const isHydrated = ref(false);
  const isLoading = ref(false);
  const errorMessage = ref('');

  const actor = computed<ActorContext | null>(() => {
    const session = authStore.currentUser;

    if (!session) {
      return null;
    }

    return {
      userId: session.role === 'agent' ? session.linkedAgentId ?? session.id : session.id,
      name: session.name,
      role: session.role,
    };
  });

  async function hydrate(force = false) {
    if (!actor.value) {
      notes.value = [];
      tasks.value = [];
      documents.value = [];
      events.value = [];
      isHydrated.value = false;
      return;
    }

    if (isHydrated.value && !force) {
      return;
    }

    isLoading.value = true;
    errorMessage.value = '';

    try {
      const [notesResponse, tasksResponse, documentsResponse, eventsResponse] = await Promise.all([
        api.getWorkspaceNotes(actor.value),
        api.getWorkspaceTasks(actor.value),
        api.getWorkspaceDocuments(actor.value),
        api.getWorkspaceEvents(actor.value, { limit: 20 }),
      ]);

      notes.value = notesResponse;
      tasks.value = tasksResponse;
      documents.value = documentsResponse;
      events.value = eventsResponse;
      isHydrated.value = true;
    } catch (error) {
      const appError = error as { statusMessage?: string };
      errorMessage.value =
        appError.statusMessage ?? 'Workspace data could not be loaded.';
    } finally {
      isLoading.value = false;
    }
  }

  async function loadEntityWorkspace(entityType: WorkspaceEntityType, entityId: string) {
    if (!actor.value) {
      return;
    }

    const [entityNotes, entityTasks, entityDocuments] = await Promise.all([
      api.getWorkspaceNotes(actor.value, { entityType, entityId }),
      api.getWorkspaceTasks(actor.value, { entityType, entityId }),
      api.getWorkspaceDocuments(actor.value, { entityType, entityId }),
    ]);

    notes.value = mergeById(
      notes.value.filter((item) => !(item.entityType === entityType && item.entityId === entityId)),
      entityNotes,
    );
    tasks.value = mergeById(
      tasks.value.filter((item) => !(item.entityType === entityType && item.entityId === entityId)),
      entityTasks,
    );
    documents.value = mergeById(
      documents.value.filter((item) => !(item.entityType === entityType && item.entityId === entityId)),
      entityDocuments,
    );
  }

  async function loadEvents(limit = 20) {
    if (!actor.value) {
      events.value = [];
      return;
    }

    events.value = await api.getWorkspaceEvents(actor.value, { limit });
  }

  function getNotes(entityType: WorkspaceEntityType, entityId: string) {
    return notes.value
      .filter((item) => item.entityType === entityType && item.entityId === entityId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async function addNote(entityType: WorkspaceEntityType, entityId: string, body: string) {
    if (!actor.value) {
      return;
    }

    const created = await api.createWorkspaceNote(actor.value, {
      entityType,
      entityId,
      body: body.trim(),
    });
    notes.value.unshift(created);
    await loadEvents();
  }

  function getTasks(entityType: WorkspaceEntityType, entityId: string) {
    return tasks.value
      .filter((item) => item.entityType === entityType && item.entityId === entityId)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }

  async function addTask(
    entityType: WorkspaceEntityType,
    entityId: string,
    input: { title: string; dueDate: string; assigneeName?: string },
  ) {
    if (!actor.value) {
      return;
    }

    const created = await api.createWorkspaceTask(actor.value, {
      entityType,
      entityId,
      title: input.title.trim(),
      dueDate: input.dueDate,
      assigneeName: input.assigneeName?.trim() || undefined,
    });
    tasks.value.unshift(created);
    await loadEvents();
  }

  async function toggleTask(taskId: string) {
    if (!actor.value) {
      return;
    }

    const existing = tasks.value.find((task) => task.id === taskId);

    if (!existing) {
      return;
    }

    const updated = await api.updateWorkspaceTaskStatus(
      actor.value,
      taskId,
      existing.status === 'open' ? 'done' : 'open',
    );

    tasks.value = tasks.value.map((task) => (task.id === taskId ? updated : task));
    await loadEvents();
  }

  function getDocuments(entityType: WorkspaceEntityType, entityId: string) {
    return documents.value
      .filter((item) => item.entityType === entityType && item.entityId === entityId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async function addDocumentPlaceholder(
    entityType: WorkspaceEntityType,
    entityId: string,
    input: { name: string; type: WorkspaceDocument['type']; status: WorkspaceDocument['status'] },
  ) {
    if (!actor.value) {
      return;
    }

    const created = await api.createWorkspaceDocument(actor.value, {
      entityType,
      entityId,
      name: input.name.trim(),
      type: input.type,
      status: input.status,
    });
    documents.value.unshift(created);
    await loadEvents();
  }

  async function updateDocumentStatus(documentId: string, status: WorkspaceDocument['status']) {
    if (!actor.value) {
      return;
    }

    const existing = documents.value.find((document) => document.id === documentId);

    if (!existing || existing.status === status) {
      return;
    }

    const updated = await api.updateWorkspaceDocumentStatus(actor.value, documentId, status);
    documents.value = documents.value.map((document) =>
      document.id === documentId ? updated : document,
    );
    await loadEvents();
  }

  const recentEvents = computed(() =>
    [...events.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
  );

  function getCalendarItems() {
    return [...tasks.value]
      .filter((task) => task.status === 'open')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 6);
  }

  function getAlerts(listings: Listing[], transactions: Transaction[]) {
    const now = Date.now();
    const alerts: WorkspaceAlert[] = [];

    listings
      .filter((listing) => listing.status === 'under_offer')
      .forEach((listing) => {
        const ageDays = Math.floor((now - new Date(listing.updatedAt).getTime()) / 86400000);
        if (ageDays >= 3) {
          alerts.push({
            id: `listing-${listing.id}`,
            title: 'Under-offer listing needs review',
            description: `${listing.title} has been under offer for ${ageDays} days.`,
            tone: 'warning',
          });
        }
      });

    transactions
      .filter((transaction) => transaction.stage === 'title_deed')
      .forEach((transaction) => {
        alerts.push({
          id: `tx-${transaction.id}`,
          title: 'Transaction is close to completion',
          description: `${transaction.propertyRef} is in title deed stage and may be ready to close.`,
          tone: 'info',
        });
      });

    getCalendarItems()
      .filter((task) => {
        const days = Math.floor((new Date(task.dueDate).getTime() - now) / 86400000);
        return days <= 2;
      })
      .forEach((task) => {
        alerts.push({
          id: `task-${task.id}`,
          title: 'Upcoming follow-up deadline',
          description: `${task.title} is due on ${task.dueDate}.`,
          tone: 'warning',
        });
      });

    return alerts.slice(0, 6);
  }

  function getAgentPerformance(agents: Agent[], listings: Listing[], transactions: Transaction[]) {
    return agents
      .map((agent) => {
        const ownedListings = listings.filter((listing) => listing.listingAgent.id === agent.id);
        const relatedTransactions = transactions.filter(
          (transaction) =>
            transaction.listingAgent.id === agent.id || transaction.sellingAgent.id === agent.id,
        );

        const payoutTotal = relatedTransactions.reduce((sum, transaction) => {
          const payout = transaction.commission.payouts
            .filter((item) => item.agentId === agent.id)
            .reduce((acc, item) => acc + item.amount, 0);
          return sum + payout;
        }, 0);

        return {
          id: agent.id,
          name: agent.name,
          listings: ownedListings.length,
          transactions: relatedTransactions.length,
          payoutTotal,
          completedDeals: relatedTransactions.filter((item) => item.stage === 'completed').length,
        };
      })
      .sort((a, b) => b.payoutTotal - a.payoutTotal)
      .slice(0, 6);
  }

  return {
    notes,
    tasks,
    documents,
    events,
    isHydrated,
    isLoading,
    errorMessage,
    hydrate,
    loadEntityWorkspace,
    loadEvents,
    getNotes,
    addNote,
    getTasks,
    addTask,
    toggleTask,
    getDocuments,
    addDocumentPlaceholder,
    updateDocumentStatus,
    recentEvents,
    getCalendarItems,
    getAlerts,
    getAgentPerformance,
  };
});
