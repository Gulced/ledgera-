<script setup lang="ts">
import type { Listing, ListingAssistantAction, ListingAssistantResponse } from '~/types/api';
import { useDashboardStore } from '~/stores/dashboard';

const props = defineProps<{
  listing: Listing;
}>();

const api = useLedgeraApi();
const store = useDashboardStore();

const prompt = ref('');
const isLoading = ref(false);
const errorMessage = ref('');
const result = ref<ListingAssistantResponse | null>(null);

const presets: Array<{ action: ListingAssistantAction; label: string; prompt: string }> = [
  {
    action: 'next_step',
    label: 'Next Step',
    prompt: 'What is the best next operational step for this listing?',
  },
  {
    action: 'client_message',
    label: 'Client Message',
    prompt: 'Write a short client-ready update for this listing.',
  },
  {
    action: 'listing_summary',
    label: 'Summary',
    prompt: 'Summarize this listing for an internal team handoff.',
  },
  {
    action: 'risk_review',
    label: 'Risk Review',
    prompt: 'Review the main risks for this listing.',
  },
  {
    action: 'follow_up_tasks',
    label: 'Task List',
    prompt: 'Create a short follow-up checklist for this listing.',
  },
];

async function runAssistant(action: ListingAssistantAction, fallbackPrompt: string) {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    result.value = await api.assistListing(store.actor, props.listing.id, {
      action,
      prompt: prompt.value.trim() || fallbackPrompt,
    });
  } catch (error) {
    const appError = error as { statusMessage?: string };
    errorMessage.value = appError.statusMessage ?? 'Assistant response could not be generated.';
  } finally {
    isLoading.value = false;
  }
}

async function submitCustomPrompt() {
  await runAssistant('listing_summary', 'Summarize this listing and answer the user question.');
}
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">AI Assistant</p>
        <h2>Listing copilot</h2>
      </div>
    </div>

    <p class="helper-copy helper-copy--compact">
      Ask for a summary, client message, risk review, or next-step recommendation using the active
      listing context.
    </p>

    <div class="assistant-preset-grid">
      <button
        v-for="preset in presets"
        :key="preset.action"
        class="ghost-button assistant-preset"
        :disabled="isLoading"
        @click="runAssistant(preset.action, preset.prompt)"
      >
        {{ preset.label }}
      </button>
    </div>

    <label class="assistant-field">
      <span>Custom prompt</span>
      <textarea
        v-model="prompt"
        rows="4"
        placeholder="Example: Write a buyer-facing message for this listing and suggest the next follow-up."
      />
    </label>

    <div class="preview-actions">
      <button class="primary-button" :disabled="isLoading" @click="submitCustomPrompt">
        {{ isLoading ? 'Thinking...' : 'Ask Assistant' }}
      </button>
    </div>

    <p v-if="errorMessage" class="inline-error">
      {{ errorMessage }}
    </p>

    <div v-if="result" class="assistant-result">
      <p class="eyebrow">Assistant Response</p>
      <h3>{{ result.prompt }}</h3>
      <pre class="assistant-result__body">{{ result.response }}</pre>
    </div>
  </section>
</template>
