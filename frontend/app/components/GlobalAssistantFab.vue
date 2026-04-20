<script setup lang="ts">
import { storeToRefs } from 'pinia';
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

const pageType = computed<AssistantPageType>(() => {
  if (/^\/transactions\/[^/]+$/.test(route.path)) {
    return 'transaction_detail';
  }

  if (/^\/listings\/[^/]+$/.test(route.path)) {
    return 'listing_detail';
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
    case 'listings':
      return 'Listings workspace';
    default:
      return 'Dashboard';
  }
});

const currentRole = computed(() => actor.value.role);

const suggestedPrompts = computed(() => {
  switch (pageType.value) {
    case 'listing_detail': {
      if (currentRole.value === 'agent') {
        return [
          'Bu ilan için müşteriye kısa bir mesaj yaz.',
          'Bu ilan için bir sonraki follow-up ne olmalı?',
          'Bu ilanı daha iyi anlatmak için kısa bir özet yaz.',
          'Bu ilan için bugün hangi işi yapmam daha doğru olur?',
        ];
      }

      if (currentRole.value === 'operations') {
        return [
          'Bu ilan için operasyonel sıradaki adımı söyle.',
          'Bu ilanda eksik olabilecek kayıtları listele.',
          'Bu ilan için task checklist oluştur.',
          'Bu ilanın risklerini operasyon açısından özetle.',
        ];
      }

      if (currentRole.value === 'finance') {
        return [
          'Bu ilanın transactiona dönüşmesi halinde finansal dikkat noktaları ne olur?',
          'Bu ilanda finans açısından izlenmesi gereken riskleri yaz.',
          'Bu kaydı raporlama açısından kısa özetle.',
          'Bu ilan için finans takımına not çıkar.',
        ];
      }

      return [
        'Bu ilan için sonraki en mantıklı adım ne?',
        'Bu ilan için müşteriye kısa bir mesaj yaz.',
        'Bu ilanın risklerini özetle.',
        'Bu ilan için follow-up task listesi oluştur.',
      ];
    }
    case 'transaction_detail': {
      if (currentRole.value === 'agent') {
        return [
          'Bu işlem için müşteriye kısa güncelleme mesajı yaz.',
          'Bu transactionda benim sıradaki aksiyonum ne olmalı?',
          'Bu işlemi müşteriye sade dille özetle.',
          'Bu transactionda gecikme riski var mı?',
        ];
      }

      if (currentRole.value === 'operations') {
        return [
          'Bu işlem için sıradaki operasyon adımını söyle.',
          'Bu transactiondaki riskleri özetle.',
          'Bu işlem için eksik olabilecek şeyleri listele.',
          'Bu transaction için kontrol listesi oluştur.',
        ];
      }

      if (currentRole.value === 'finance') {
        return [
          'Bu transactionın finansal risklerini özetle.',
          'Komisyon akışını sade şekilde açıkla.',
          'Bu işlemde kapanış öncesi finans kontrol listesi çıkar.',
          'Finans ekibi için kısa bir durum özeti yaz.',
        ];
      }

      return [
        'Bu işlem için sıradaki operasyon adımını söyle.',
        'Bu transactiondaki riskleri özetle.',
        'Müşteriye gönderilecek kısa güncelleme mesajı yaz.',
        'Bu işlem için eksik olabilecek şeyleri listele.',
      ];
    }
    case 'listings': {
      if (currentRole.value === 'agent') {
        return [
          'Kendi ilanlarım içinde bugün hangilerine odaklanmalıyım?',
          'Bu listedeki ilanlar için kısa takip planı çıkar.',
          'Hangi ilanlarda müşteri iletişimi öncelikli görünüyor?',
          'Bu ilan listesi için günlük çalışma planı yaz.',
        ];
      }

      if (currentRole.value === 'operations') {
        return [
          'Bu listing listesinden öncelikli takip edilmesi gerekenleri söyle.',
          'Duruma göre hangi ilanlar riskli görünüyor?',
          'Listeye göre hızlı bir operasyon planı öner.',
          'Eksik veya gecikme riski taşıyan kayıtları işaretle.',
        ];
      }

      if (currentRole.value === 'finance') {
        return [
          'Bu ilan listesinden finans açısından takip edilmesi gerekenleri söyle.',
          'Hangi kayıtlar raporlama için önemli görünüyor?',
          'Bu ilan havuzu için finans ekibine kısa özet çıkar.',
          'İleride transactiona dönüşürse dikkat edilmesi gerekenleri yaz.',
        ];
      }

      return [
        'Bu listing listesinden öncelikli takip edilmesi gerekenleri söyle.',
        'Duruma göre hangi ilanlar riskli görünüyor?',
        'Bu sayfadaki ilanlar için ekip özeti çıkar.',
        'Listeye göre hızlı bir operasyon planı öner.',
      ];
    }
    default: {
      if (currentRole.value === 'agent') {
        return [
          'Bugün agent olarak neye odaklanmalıyım?',
          'Benim için öncelikli görünen işleri özetle.',
          'Kısa bir günlük çalışma planı çıkar.',
          'Bana uygun takip önerileri yaz.',
        ];
      }

      if (currentRole.value === 'operations') {
        return [
          'Dashboard verilerine göre bugün neye odaklanmalıyız?',
          'Riskli görünen başlıkları kısa özetle.',
          'Kısa bir günlük operasyon özeti çıkar.',
          'Bugün sıkışabilecek işleri listele.',
        ];
      }

      if (currentRole.value === 'finance') {
        return [
          'Dashboard verisine göre finans ekibi neye odaklanmalı?',
          'Finansal risk taşıyan alanları özetle.',
          'Bugün için kısa bir finans operasyon özeti çıkar.',
          'Raporlama açısından dikkat edilmesi gerekenleri yaz.',
        ];
      }

      return [
        'Dashboard verilerine göre bugün neye odaklanmalıyız?',
        'Riskli görünen başlıkları kısa özetle.',
        'Kısa bir günlük operasyon özeti çıkar.',
        'Bu veriye göre admin için önerilerini yaz.',
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

watch(
  () => route.fullPath,
  () => {
    messages.value = [];
    prompt.value = '';
    void loadRouteContext();
  },
  { immediate: true },
);
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
          placeholder="Bu sayfanın içeriğine göre istediğin soruyu sor."
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
