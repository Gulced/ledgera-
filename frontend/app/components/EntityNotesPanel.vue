<script setup lang="ts">
import { z } from 'zod';
import { useWorkspaceStore } from '~/stores/workspace';
import { formatDate } from '~/utils/format';
import type { WorkspaceEntityType } from '~/types/api';

const props = defineProps<{
  entityType: WorkspaceEntityType;
  entityId: string;
  title?: string;
}>();

const workspace = useWorkspaceStore();
const noteBody = ref('');
const validationError = ref('');

const notes = computed(() => workspace.getNotes(props.entityType, props.entityId));

const schema = z.string().min(3, 'Add a more descriptive internal note.');

async function submitNote() {
  validationError.value = '';
  const parsed = schema.safeParse(noteBody.value);

  if (!parsed.success) {
    validationError.value = parsed.error.issues[0]?.message ?? 'Note could not be saved.';
    return;
  }

  await workspace.addNote(props.entityType, props.entityId, parsed.data);
  noteBody.value = '';
}

onMounted(() => {
  void workspace.loadEntityWorkspace(props.entityType, props.entityId);
});
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Collaboration</p>
        <h2>{{ title || 'Internal notes' }}</h2>
      </div>
    </div>

    <div class="stack-list">
      <label>
        <span>Add a note</span>
        <textarea v-model="noteBody" rows="4" placeholder="Add a decision, blocker, or follow-up note for the team." />
      </label>

      <p v-if="validationError" class="inline-error">
        {{ validationError }}
      </p>

      <div class="filters-actions">
        <button class="primary-button" @click="submitNote">
          Save note
        </button>
      </div>

      <article v-for="note in notes" :key="note.id" class="feed-card">
        <div class="feed-card__top">
          <strong>{{ note.authorName }}</strong>
          <small>{{ formatDate(note.createdAt) }}</small>
        </div>
        <p>{{ note.body }}</p>
        <span class="feed-card__meta">{{ note.authorRole }}</span>
      </article>

      <div v-if="!notes.length" class="empty-state panel">
        No internal notes yet.
      </div>
    </div>
  </section>
</template>
