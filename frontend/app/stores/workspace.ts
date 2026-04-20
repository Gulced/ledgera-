import { defineStore } from 'pinia';
import { useAuthStore } from '~/stores/auth';
import type {
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

const STORAGE_KEY = 'ledgera-workspace';

type WorkspaceSnapshot = {
  notes: WorkspaceNote[];
  tasks: WorkspaceTask[];
  documents: WorkspaceDocument[];
  events: WorkspaceEvent[];
};

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function emptySnapshot(): WorkspaceSnapshot {
  return {
    notes: [],
    tasks: [],
    documents: [],
    events: [],
  };
}

export const useWorkspaceStore = defineStore('workspace', () => {
  const authStore = useAuthStore();

  const notes = ref<WorkspaceNote[]>([]);
  const tasks = ref<WorkspaceTask[]>([]);
  const documents = ref<WorkspaceDocument[]>([]);
  const events = ref<WorkspaceEvent[]>([]);
  const isHydrated = ref(false);

  function hydrate() {
    if (!import.meta.client || isHydrated.value) {
      return;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as WorkspaceSnapshot) : emptySnapshot();
      notes.value = parsed.notes ?? [];
      tasks.value = parsed.tasks ?? [];
      documents.value = parsed.documents ?? [];
      events.value = parsed.events ?? [];
    } catch {
      notes.value = [];
      tasks.value = [];
      documents.value = [];
      events.value = [];
    } finally {
      isHydrated.value = true;
    }
  }

  function persist() {
    if (!import.meta.client) {
      return;
    }

    const snapshot: WorkspaceSnapshot = {
      notes: notes.value,
      tasks: tasks.value,
      documents: documents.value,
      events: events.value,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }

  function recordEvent(input: {
    title: string;
    description: string;
    entityType?: WorkspaceEntityType;
    entityId?: string;
  }) {
    const actorName = authStore.currentUser?.name ?? 'System';
    events.value.unshift({
      id: createId('evt'),
      title: input.title,
      description: input.description,
      createdAt: new Date().toISOString(),
      actorName,
      entityType: input.entityType,
      entityId: input.entityId,
    });
    events.value = events.value.slice(0, 50);
    persist();
  }

  function getNotes(entityType: WorkspaceEntityType, entityId: string) {
    return notes.value
      .filter((item) => item.entityType === entityType && item.entityId === entityId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  function addNote(entityType: WorkspaceEntityType, entityId: string, body: string) {
    const author = authStore.currentUser;
    const note: WorkspaceNote = {
      id: createId('note'),
      entityType,
      entityId,
      body: body.trim(),
      authorName: author?.name ?? 'System',
      authorRole: author?.role ?? 'admin',
      createdAt: new Date().toISOString(),
    };

    notes.value.unshift(note);
    persist();
    recordEvent({
      title: 'New note added',
      description: note.body,
      entityType,
      entityId,
    });
  }

  function getTasks(entityType: WorkspaceEntityType, entityId: string) {
    return tasks.value
      .filter((item) => item.entityType === entityType && item.entityId === entityId)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }

  function addTask(
    entityType: WorkspaceEntityType,
    entityId: string,
    input: { title: string; dueDate: string; assigneeName?: string },
  ) {
    const task: WorkspaceTask = {
      id: createId('task'),
      entityType,
      entityId,
      title: input.title.trim(),
      dueDate: input.dueDate,
      status: 'open',
      assigneeName: input.assigneeName?.trim() || authStore.currentUser?.name || 'Unassigned',
      createdAt: new Date().toISOString(),
    };

    tasks.value.unshift(task);
    persist();
    recordEvent({
      title: 'Follow-up scheduled',
      description: `${task.title} • due ${task.dueDate}`,
      entityType,
      entityId,
    });
  }

  function toggleTask(taskId: string) {
    tasks.value = tasks.value.map((task) =>
      task.id === taskId
        ? { ...task, status: task.status === 'open' ? 'done' : 'open' }
        : task,
    );
    persist();
  }

  function getDocuments(entityType: WorkspaceEntityType, entityId: string) {
    return documents.value
      .filter((item) => item.entityType === entityType && item.entityId === entityId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  function addDocumentPlaceholder(
    entityType: WorkspaceEntityType,
    entityId: string,
    input: { name: string; type: WorkspaceDocument['type']; status: WorkspaceDocument['status'] },
  ) {
    const doc: WorkspaceDocument = {
      id: createId('doc'),
      entityType,
      entityId,
      name: input.name.trim(),
      type: input.type,
      status: input.status,
      createdAt: new Date().toISOString(),
    };

    documents.value.unshift(doc);
    persist();
    recordEvent({
      title: 'Document placeholder added',
      description: `${doc.name} • ${doc.status}`,
      entityType,
      entityId,
    });
  }

  function updateDocumentStatus(documentId: string, status: WorkspaceDocument['status']) {
    const target = documents.value.find((document) => document.id === documentId);

    if (!target || target.status === status) {
      return;
    }

    target.status = status;
    persist();
    recordEvent({
      title: 'Document status updated',
      description: `${target.name} • ${status}`,
      entityType: target.entityType,
      entityId: target.entityId,
    });
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
    hydrate,
    getNotes,
    addNote,
    getTasks,
    addTask,
    toggleTask,
    getDocuments,
    addDocumentPlaceholder,
    updateDocumentStatus,
    recordEvent,
    recentEvents,
    getCalendarItems,
    getAlerts,
    getAgentPerformance,
  };
});
