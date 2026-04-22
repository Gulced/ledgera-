<script setup lang="ts">
import { storeToRefs } from 'pinia';
import type { Listing } from '~/types/api';
import { useDashboardStore } from '~/stores/dashboard';

const props = defineProps<{
  listing: Listing;
  canManage: boolean;
}>();

const emit = defineEmits<{
  updated: [listing: Listing];
}>();

const store = useDashboardStore();
const { isMutating } = storeToRefs(store);
const config = useRuntimeConfig();
const uploadError = ref('');

function resolvePhotoUrl(path: string) {
  return path.startsWith('http') ? path : `${config.public.apiBase}${path}`;
}

async function handleFileSelection(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);

  if (!files.length) {
    return;
  }

  uploadError.value = '';

  try {
    const updated = await store.uploadListingPhotos(props.listing.id, files);
    emit('updated', updated);
    input.value = '';
  } catch (error) {
    const appError = error as { statusMessage?: string };
    uploadError.value = appError.statusMessage ?? 'Listing photos could not be uploaded.';
  }
}

async function removePhoto(photoId: string) {
  uploadError.value = '';

  try {
    const updated = await store.deleteListingPhoto(props.listing.id, photoId);
    emit('updated', updated);
  } catch (error) {
    const appError = error as { statusMessage?: string };
    uploadError.value = appError.statusMessage ?? 'Listing photo could not be deleted.';
  }
}
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Listing Photos</p>
        <h2>Photo gallery</h2>
      </div>

      <label v-if="canManage" class="primary-button listing-photos__upload">
        <input
          type="file"
          accept="image/*"
          multiple
          :disabled="isMutating"
          @change="handleFileSelection"
        >
        {{ isMutating ? 'Uploading...' : 'Upload Photos' }}
      </label>
    </div>

    <div v-if="listing.photos.length" class="listing-photos__grid">
      <article
        v-for="photo in listing.photos"
        :key="photo.id"
        class="listing-photos__card"
      >
        <img
          class="listing-photos__image"
          :src="resolvePhotoUrl(photo.url)"
          :alt="photo.originalName"
        >

        <div class="listing-photos__meta">
          <strong>{{ photo.originalName }}</strong>
          <small>{{ photo.isCover ? 'Cover image' : 'Gallery image' }}</small>
        </div>

        <button
          v-if="canManage"
          class="ghost-button listing-photos__delete"
          type="button"
          :disabled="isMutating"
          @click="removePhoto(photo.id)"
        >
          Delete
        </button>
      </article>
    </div>

    <div v-else class="preview-empty-state">
      <p class="eyebrow">No images yet</p>
      <h3>This listing does not have any uploaded photos.</h3>
      <p v-if="canManage">Upload images here or during listing creation to build a proper gallery.</p>
      <p v-else>Photos added by the listing owner or an admin will appear here.</p>
    </div>

    <p v-if="uploadError" class="inline-error">
      {{ uploadError }}
    </p>
  </section>
</template>
