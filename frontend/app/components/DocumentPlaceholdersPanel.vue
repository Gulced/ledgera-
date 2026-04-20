<script setup lang="ts">
import { useWorkspaceStore } from '~/stores/workspace';
import type { WorkspaceDocument, WorkspaceEntityType } from '~/types/api';

const props = defineProps<{
  entityType: WorkspaceEntityType;
  entityId: string;
}>();

const workspace = useWorkspaceStore();
const form = reactive({
  name: '',
  type: 'agreement' as WorkspaceDocument['type'],
  status: 'pending' as WorkspaceDocument['status'],
});

const documents = computed(() => workspace.getDocuments(props.entityType, props.entityId));

function addDocument() {
  if (!form.name.trim()) {
    return;
  }

  workspace.addDocumentPlaceholder(props.entityType, props.entityId, form);
  form.name = '';
}
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Documents</p>
        <h2>Document placeholders</h2>
      </div>
    </div>

    <div class="filters-grid">
      <label>
        <span>Document name</span>
        <input v-model="form.name" type="text" placeholder="Agreement pack, commission sheet, invoice..." />
      </label>
      <label>
        <span>Type</span>
        <select v-model="form.type">
          <option value="agreement">Agreement</option>
          <option value="deed">Deed</option>
          <option value="invoice">Invoice</option>
          <option value="commission_sheet">Commission sheet</option>
          <option value="compliance_note">Compliance note</option>
        </select>
      </label>
      <label>
        <span>Status</span>
        <select v-model="form.status">
          <option value="pending">Pending</option>
          <option value="ready">Ready</option>
        </select>
      </label>
    </div>

    <div class="filters-actions">
      <button class="primary-button" @click="addDocument">
        Add placeholder
      </button>
    </div>

    <div class="listing-grid listing-grid--documents">
      <article v-for="document in documents" :key="document.id" class="listing-card">
        <p class="eyebrow">{{ document.type.replaceAll('_', ' ') }}</p>
        <h3>{{ document.name }}</h3>
        <label class="document-status-field">
          <span>Status</span>
          <select
            :value="document.status"
            @change="workspace.updateDocumentStatus(document.id, ($event.target as HTMLSelectElement).value as WorkspaceDocument['status'])"
          >
            <option value="pending">Pending</option>
            <option value="ready">Ready</option>
          </select>
        </label>
      </article>

      <div v-if="!documents.length" class="empty-state panel">
        No document placeholders yet.
      </div>
    </div>
  </section>
</template>
