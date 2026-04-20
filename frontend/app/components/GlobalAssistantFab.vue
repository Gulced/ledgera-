<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useAgentAssistantContext } from '~/composables/useAgentAssistantContext';
import { useDashboardStore } from '~/stores/dashboard';
import type {
  AssistantPageType,
  AssistantResponse,
  Listing,
  ListingFilters,
  Transaction,
} from '~/types/api';

const api = useLedgeraApi();
const route = useRoute();
const store = useDashboardStore();
const agentAssistantContext = useAgentAssistantContext();
const { actor, filters, listingFilters, listings, summary, transactions } = storeToRefs(store);

const isOpen = ref(false);
const isLoading = ref(false);
const contextLoading = ref(false);
const errorMessage = ref('');
const prompt = ref('');
const currentListing = ref<Listing | null>(null);
const currentTransaction = ref<Transaction | null>(null);
const messages = ref<Array<{
  id: string;
  role: 'user' | 'assistant';
  body: string;
  tone?: 'error' | 'muted';
  source?: AssistantResponse['source'];
}>>([]);
const chatBody = ref<HTMLElement | null>(null);

const contextEntityId = computed(() => {
  if (pageType.value === 'listing_detail' || pageType.value === 'transaction_detail') {
    return route.params.id as string | undefined;
  }

  return undefined;
});

const pageType = computed<AssistantPageType>(() => {
  if (/^\/transactions\/[^/]+$/.test(route.path)) {
    return 'transaction_detail';
  }

  if (/^\/listings\/[^/]+$/.test(route.path)) {
    return 'listing_detail';
  }

  if (route.path === '/agents') {
    return 'agents';
  }

  if (route.path === '/listings') {
    return 'listings';
  }

  return 'dashboard';
});

const pageTitle = computed(() => {
  switch (pageType.value) {
    case 'listing_detail':
      return currentListing.value?.title ?? 'Listing detail';
    case 'transaction_detail':
      return currentTransaction.value?.propertyRef ?? 'Transaction detail';
    case 'agents':
      return agentAssistantContext.selectedAgent.value?.name ?? 'Agents workspace';
    case 'listings':
      return 'Listings workspace';
    default:
      return 'Dashboard';
  }
});

const currentRole = computed(() => actor.value?.role ?? 'admin');

const suggestedPrompts = computed(() => {
  switch (pageType.value) {
    case 'listing_detail': {
      if (currentRole.value === 'agent') {
        return [
          'Write a short client message for this listing.',
          'What should the next follow-up be for this listing?',
          'Write a short summary that presents this listing clearly.',
          'What is the best task to focus on for this listing today?',
        ];
      }

      if (currentRole.value === 'operations') {
        return [
          'What is the next operational step for this listing?',
          'List anything that may be missing for this listing.',
          'Create a task checklist for this listing.',
          'Summarize the operational risks for this listing.',
        ];
      }

      if (currentRole.value === 'finance') {
        return [
          'If this listing becomes a transaction, what financial points should we watch?',
          'Write the key finance risks to track for this listing.',
          'Summarize this record briefly for reporting.',
          'Write a short note for the finance team about this listing.',
        ];
      }

      return [
        'What is the most logical next step for this listing?',
        'Write a short client message for this listing.',
        'Summarize the risks for this listing.',
        'Create a follow-up task list for this listing.',
      ];
    }
    case 'transaction_detail': {
      if (currentRole.value === 'agent') {
        return [
          'Write a short client update message for this transaction.',
          'What should my next action be on this transaction?',
          'Summarize this transaction for the client in simple language.',
          'Is there a delay risk in this transaction?',
        ];
      }

      if (currentRole.value === 'operations') {
        return [
          'What is the next operational step for this transaction?',
          'Summarize the risks in this transaction.',
          'List anything that may be missing for this transaction.',
          'Create a checklist for this transaction.',
        ];
      }

      if (currentRole.value === 'finance') {
        return [
          'Summarize the financial risks in this transaction.',
          'Explain the commission flow in plain language.',
          'Create a pre-closing finance checklist for this transaction.',
          'Write a short status summary for the finance team.',
        ];
      }

      return [
        'What is the next operational step for this transaction?',
        'Summarize the risks in this transaction.',
        'Write a short client update message for this transaction.',
        'List anything that may be missing for this transaction.',
      ];
    }
    case 'agents': {
      if (currentRole.value === 'agent') {
        return [
          'Based on my profile, what should I focus on today?',
          'Write a short daily follow-up plan for me.',
          'Suggest priorities based on my portfolio load.',
          'Write a short work summary about me.',
        ];
      }

      if (currentRole.value === 'operations') {
        return [
          'Which agents show workload or follow-up risk?',
          'Write operational recommendations for the selected agent.',
          'Summarize possible bottlenecks across agent distribution.',
          'Create a short coordination plan for this agent list.',
        ];
      }

      if (currentRole.value === 'finance') {
        return [
          'From the agent view, what should finance monitor?',
          'Which heavy agent portfolios look most important?',
          'Write a short agent-based summary for the finance team.',
          'Comment on agent workloads that are likely to convert into transactions.',
        ];
      }

      return [
        'Write management priorities based on this agent view.',
        'Which agents show workload or follow-up risk?',
        'Write a short management summary for the selected agent.',
        'Comment on team balance based on agent distribution.',
      ];
    }
    case 'listings': {
      if (currentRole.value === 'agent') {
        return [
          'Which of my listings should I focus on today?',
          'Create a short follow-up plan for the listings on this page.',
          'Which listings seem to need client communication first?',
          'Write a daily work plan for this listing list.',
        ];
      }

      if (currentRole.value === 'operations') {
        return [
          'Which listings on this page should be prioritized first?',
          'Which listings look risky based on status?',
          'Suggest a quick operational plan based on this list.',
          'Flag records with missing information or delay risk.',
        ];
      }

      if (currentRole.value === 'finance') {
        return [
          'From this listing list, what should finance monitor?',
          'Which records seem important for reporting?',
          'Write a short summary for the finance team about this listing pool.',
          'If these turn into transactions later, what should we watch?',
        ];
      }

      return [
        'Which listings on this page should be prioritized first?',
        'Which listings look risky based on status?',
        'Write a team summary for the listings on this page.',
        'Suggest a quick operational plan based on this list.',
      ];
    }
    default: {
      if (currentRole.value === 'agent') {
        return [
          'What should I focus on today as an agent?',
          'Summarize the work that looks most urgent for me.',
          'Create a short daily work plan.',
          'Write follow-up recommendations that fit my workload.',
        ];
      }

      if (currentRole.value === 'operations') {
        return [
          'Based on the dashboard, what should we focus on today?',
          'Summarize the areas that look risky.',
          'Create a short daily operations summary.',
          'List the work that could become blocked today.',
        ];
      }

      if (currentRole.value === 'finance') {
        return [
          'Based on the dashboard, what should the finance team focus on?',
          'Summarize the areas carrying financial risk.',
          'Create a short finance operations summary for today.',
          'Write what needs attention from a reporting perspective.',
        ];
      }

      return [
        'Based on the dashboard, what should we focus on today?',
        'Summarize the areas that look risky.',
        'Create a short daily operations summary.',
        'Write recommendations for the admin based on this data.',
      ];
    }
  }
});

const assistantContext = computed<Record<string, unknown>>(() => {
  switch (pageType.value) {
    case 'listing_detail':
      return {
        listing: currentListing.value,
      };
    case 'transaction_detail':
      return {
        transaction: currentTransaction.value,
      };
    case 'listings':
      return {
        filters: listingFilters.value,
        visibleListings: listings.value.slice(0, 12),
        totalVisibleListings: listings.value.length,
      };
    case 'agents':
      return {
        selectedAgent: agentAssistantContext.selectedAgent.value,
        selectedMetrics: agentAssistantContext.selectedMetrics.value,
        selectedListings: agentAssistantContext.selectedListings.value,
        selectedTransactions: agentAssistantContext.selectedTransactions.value,
        totalVisibleAgents: agentAssistantContext.totalVisibleAgents.value,
      };
    default:
      return {
        filters: filters.value,
        summary: summary.value,
        visibleTransactions: transactions.value.slice(0, 8),
      };
  }
});

async function loadRouteContext() {
  contextLoading.value = true;
  errorMessage.value = '';

  try {
    if (pageType.value === 'listing_detail') {
      currentListing.value = await api.getListing(actor.value, route.params.id as string);
      currentTransaction.value = null;
      return;
    }

    if (pageType.value === 'transaction_detail') {
      currentTransaction.value = await api.getTransaction(actor.value, route.params.id as string);
      currentListing.value = null;
      return;
    }

    currentListing.value = null;
    currentTransaction.value = null;

    if (pageType.value === 'listings' && !listings.value.length) {
      await store.loadListings();
    }

    if (pageType.value === 'dashboard' && !transactions.value.length && !summary.value) {
      await store.loadDashboard();
    }
  } catch (error) {
    const appError = error as { statusMessage?: string };
    errorMessage.value = appError.statusMessage ?? 'Assistant context could not be loaded.';
  } finally {
    contextLoading.value = false;
  }
}

async function loadHistory() {
  try {
    const history = await api.getAssistantHistory(actor.value, {
      pageType: pageType.value,
      entityId: contextEntityId.value,
    });

    messages.value = history.map((item) => ({
      id: item.id,
      role: item.role,
      body: item.body,
      source: item.source,
    }));
  } catch {
    messages.value = [];
  }
}

async function askAssistant(customPrompt?: string) {
  const nextPrompt = (customPrompt ?? prompt.value).trim();

  if (!nextPrompt) {
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';
  messages.value.push({
    id: crypto.randomUUID(),
    role: 'user',
    body: nextPrompt,
  });
  messages.value.push({
    id: 'assistant-loading',
    role: 'assistant',
    body: 'Thinking...',
    tone: 'muted',
  });
  prompt.value = '';

  try {
    const response = await Promise.race([
      api.chatAssistant(actor.value, {
        pageType: pageType.value,
        title: pageTitle.value,
        entityId: contextEntityId.value,
        prompt: nextPrompt,
        context: assistantContext.value,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Assistant request timed out.'));
        }, 20000);
      }),
    ]);
    messages.value = messages.value.filter((item) => item.id !== 'assistant-loading');
    messages.value.push({
      id: crypto.randomUUID(),
      role: 'assistant',
      body: response.response,
      source: response.source,
    });
  } catch (error) {
    const appError = error as { statusMessage?: string; message?: string };
    errorMessage.value =
      appError.statusMessage ??
      appError.message ??
      'Assistant response could not be generated.';
    messages.value = messages.value.filter((item) => item.id !== 'assistant-loading');
    messages.value.push({
      id: crypto.randomUUID(),
      role: 'assistant',
      body: errorMessage.value,
      tone: 'error',
    });
  } finally {
    isLoading.value = false;
  }
}

watch(
  messages,
  async () => {
    await nextTick();

    if (chatBody.value) {
      chatBody.value.scrollTop = chatBody.value.scrollHeight;
    }
  },
  { deep: true },
);

onMounted(() => {
  watch(
    () => route.fullPath,
    async () => {
      messages.value = [];
      prompt.value = '';
      await loadRouteContext();
      await loadHistory();
    },
    { immediate: true },
  );
});
</script>

<template>
  <div class="assistant-fab-shell">
    <button class="assistant-fab" type="button" @click="isOpen = !isOpen">
      {{ isOpen ? 'Close AI' : 'Ask AI' }}
    </button>

    <aside v-if="isOpen" class="assistant-drawer panel">
      <div class="panel__header">
        <div>
          <p class="eyebrow">Workspace AI</p>
          <h2>{{ pageTitle }}</h2>
        </div>
        <button class="ghost-button ghost-button--small" type="button" @click="isOpen = false">
          Close
        </button>
      </div>

      <p class="helper-copy helper-copy--compact">
        Ready questions adapt to the current page.
      </p>

      <div class="assistant-suggestions">
        <button
          v-for="item in suggestedPrompts"
          :key="item"
          type="button"
          class="ghost-button assistant-suggestion"
          :disabled="isLoading || contextLoading"
          @click="askAssistant(item)"
        >
          {{ item }}
        </button>
      </div>

      <div ref="chatBody" class="assistant-chat-shell">
        <div v-if="messages.length" class="assistant-chat">
          <article
            v-for="message in messages"
            :key="message.id"
            class="assistant-chat__message"
            :class="[
              message.role === 'user' ? 'assistant-chat__message--user' : 'assistant-chat__message--assistant',
              message.tone === 'error' ? 'assistant-chat__message--error' : '',
              message.tone === 'muted' ? 'assistant-chat__message--muted' : '',
            ]"
          >
            <div class="assistant-chat__meta">
              <strong>{{ message.role === 'user' ? 'You' : 'AI' }}</strong>
              <span v-if="message.role === 'assistant' && message.source" class="assistant-source-badge">
                {{ message.source === 'gemini' ? 'Gemini' : 'Fallback' }}
              </span>
            </div>
            <pre class="assistant-result__body">{{ message.body }}</pre>
          </article>
        </div>
        <div v-else class="assistant-chat assistant-chat--empty">
          <article class="assistant-chat__message assistant-chat__message--assistant assistant-chat__message--muted">
            <strong>AI</strong>
            <pre class="assistant-result__body">Messages will appear here after you send a prompt.</pre>
          </article>
        </div>
      </div>

      <label class="assistant-field">
        <span>Your question</span>
        <textarea
          v-model="prompt"
          rows="4"
          placeholder="Ask anything based on the content of this page."
        />
      </label>

      <div class="preview-actions">
        <button class="primary-button" type="button" :disabled="isLoading || contextLoading || !prompt.trim()" @click="askAssistant()">
          {{ isLoading ? 'Thinking...' : 'Send' }}
        </button>
      </div>

      <p v-if="contextLoading" class="helper-copy">
        Page context is loading...
      </p>

      <p v-if="errorMessage && !messages.length" class="inline-error">
        {{ errorMessage }}
      </p>
    </aside>
  </div>
</template>
