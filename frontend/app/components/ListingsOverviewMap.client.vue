<script setup lang="ts">
import Feature from 'ol/Feature';
import Map from 'ol/Map';
import View from 'ol/View';
import Point from 'ol/geom/Point';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { boundingExtent } from 'ol/extent';
import { fromLonLat } from 'ol/proj';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import type { Listing } from '~/types/api';
import { getApproximateListingCoordinates } from '~/utils/listing-map';

const props = defineProps<{
  listings: Listing[];
}>();

const router = useRouter();
const mapElement = ref<HTMLElement | null>(null);
const map = shallowRef<Map | null>(null);
const vectorSource = new VectorSource();

const markers = computed(() =>
  props.listings
    .map((listing) => {
      const coordinates = getApproximateListingCoordinates(listing);
      return coordinates
        ? {
            ...listing,
            coordinates,
          }
        : null;
    })
    .filter((item): item is Listing & { coordinates: { lat: number; lng: number } } => !!item),
);

function createFeatureStyle() {
  return new Style({
    image: new CircleStyle({
      radius: 8,
      fill: new Fill({ color: '#db6a4e' }),
      stroke: new Stroke({ color: '#fff7ef', width: 3 }),
    }),
  });
}

function syncFeatures() {
  vectorSource.clear();

  const features = markers.value.map((listing) => {
    const feature = new Feature({
      geometry: new Point(fromLonLat([listing.coordinates.lng, listing.coordinates.lat])),
      listingId: listing.id,
    });

    feature.setStyle(createFeatureStyle());
    return feature;
  });

  vectorSource.addFeatures(features);

  if (!map.value || !markers.value.length) {
    return;
  }

  if (markers.value.length === 1) {
    const [listing] = markers.value;
    map.value.getView().setCenter(fromLonLat([listing.coordinates.lng, listing.coordinates.lat]));
    map.value.getView().setZoom(13);
    return;
  }

  const extent = boundingExtent(
    markers.value.map((listing) => fromLonLat([listing.coordinates.lng, listing.coordinates.lat])),
  );

  map.value.getView().fit(extent, {
    padding: [36, 36, 36, 36],
    maxZoom: 12,
    duration: 0,
  });
}

onMounted(() => {
  if (!mapElement.value) {
    return;
  }

  map.value = new Map({
    target: mapElement.value,
    controls: [],
    layers: [
      new TileLayer({
        source: new OSM(),
      }),
      new VectorLayer({
        source: vectorSource,
      }),
    ],
    view: new View({
      center: fromLonLat([28.9784, 41.0082]),
      zoom: 5,
    }),
  });

  map.value.on('singleclick', (event) => {
    const feature = map.value?.forEachFeatureAtPixel(event.pixel, (candidate) => candidate);
    const listingId = feature?.get('listingId');

    if (listingId) {
      void router.push(`/listings/${listingId}`);
    }
  });

  map.value.on('pointermove', (event) => {
    const isHit = !!map.value?.hasFeatureAtPixel(event.pixel);
    const target = map.value?.getTargetElement();

    if (target) {
      target.style.cursor = isHit ? 'pointer' : '';
    }
  });

  syncFeatures();
});

watch(markers, syncFeatures, { deep: true });

onBeforeUnmount(() => {
  map.value?.setTarget(undefined);
});
</script>

<template>
  <div class="listings-overview">
    <div ref="mapElement" class="listings-overview__map" />

    <div class="listings-overview__list">
      <NuxtLink
        v-for="listing in markers"
        :key="listing.id"
        :to="`/listings/${listing.id}`"
        class="listings-overview__item"
      >
        <strong>{{ listing.title }}</strong>
        <span>{{ listing.fullAddress }}</span>
      </NuxtLink>
    </div>
  </div>
</template>
