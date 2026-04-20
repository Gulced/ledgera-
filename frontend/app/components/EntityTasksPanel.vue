<script setup lang="ts">
import { z } from 'zod';
import { useAuthStore } from '~/stores/auth';
import { useDashboardStore } from '~/stores/dashboard';
import { useWorkspaceStore } from '~/stores/workspace';
import type { WorkspaceEntityType } from '~/types/api';

const props = defineProps<{
  entityType: WorkspaceEntityType;
  entityId: string;
  title?: string;
}>();

const authStore = useAuthStore();
const dashboardStore = useDashboardStore();
const workspace = useWorkspaceStore();
const form = reactive({
  title: '',
  dueDate: '',
  assigneeId: '',
});
const validationError = ref('');

const tasks = computed(() => workspace.getTasks(props.entityType, props.entityId));
const assigneeOptions = computed(() => {
  const fromAccounts = authStore.accounts.map((account) => ({
    id: `user:${account.id}`,
    label: `${account.name} • ${account.role}`,
  }));

  const existingNames = new Set(
    fromAccounts.map((account) => account.label.split(' • ')[0]?.trim().toLowerCase()),
  );

  const fromAgents = dashboardStore.agents
    .filter((agent) => !existingNames.has(agent.name.trim().toLowerCase()))
    .map((agent) => ({
      id: `agent:${agent.id}`,
      label: `${agent.name} • agent`,
    }));

  return [...fromAccounts, ...fromAgents];
});
const schema = z.object({
  title: z.string().min(3, 'Add a clearer task title.'),
  dueDate: z.string().min(1, 'Select a due date.'),
});

async function submitTask() {
  validationError.value = '';
  const parsed = schema.safeParse(form);

  if (!parsed.success) {
    validationError.value = parsed.error.issues[0]?.message ?? 'Task could not be created.';
    return;
  }

  const selectedAssignee = assigneeOptions.value.find((account) => account.id === form.assigneeId);

  await workspace.addTask(props.entityType, props.entityId, {
    title: form.title,
    dueDate: form.dueDate,
    assigneeName: selectedAssignee?.label ?? authStore.currentUser?.name ?? 'Unassigned',
  });
  form.title = '';
  form.dueDate = '';
  form.assigneeId = '';
}

onMounted(() => {
  void workspace.loadEntityWorkspace(props.entityType, props.entityId);
});
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Follow-ups</p>
        <h2>{{ title || 'Tasks and scheduled actions' }}</h2>
      </div>
    </div>

    <div class="stack-list">
      <div class="filters-grid">
        <label>
          <span>Task title</span>
          <input v-model="form.title" type="text" placeholder="Call buyer, confirm docs, share summary..." />
        </label>
        <label>
          <span>Due date</span>
          <input v-model="form.dueDate" type="date">
        </label>
        <label>
          <span>Assignee</span>
          <select v-model="form.assigneeId">
            <option value="">
              Select a user
            </option>
            <option v-for="account in assigneeOptions" :key="account.id" :value="account.id">
              {{ account.label }}
            </option>
          </select>
        </label>
      </div>

      <p v-if="validationError" class="inline-error">
        {{ validationError }}
      </p>

      <div class="filters-actions">
        <button class="primary-button" @click="submitTask">
          Add follow-up
        </button>
      </div>

      <article v-for="task in tasks" :key="task.id" class="feed-card">
        <div class="feed-card__top">
          <strong>{{ task.title }}</strong>
          <button class="ghost-button ghost-button--small" @click="workspace.toggleTask(task.id)">
            {{ task.status === 'done' ? 'Reopen' : 'Mark done' }}
          </button>
        </div>
        <p>Due {{ task.dueDate }} • {{ task.assigneeName }}</p>
        <span class="feed-card__meta" :data-tone="task.status">{{ task.status }}</span>
      </article>

      <div v-if="!tasks.length" class="empty-state panel">
        No follow-ups scheduled yet.
      </div>
    </div>
  </section>
</template>
