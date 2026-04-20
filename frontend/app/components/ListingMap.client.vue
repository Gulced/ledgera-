<script setup lang="ts">
const props = defineProps<{
  lat: number;
  lng: number;
  title: string;
  city: string;
}>();

const TILE_SIZE = 256;
const VIEWPORT_WIDTH = 320;
const VIEWPORT_HEIGHT = 220;
const ZOOM = 12;

function lonToTileX(lon: number, zoom: number) {
  return ((lon + 180) / 360) * 2 ** zoom;
}

function latToTileY(lat: number, zoom: number) {
  const rad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
    2 ** zoom
  );
}

const tileLayout = computed(() => {
  const tileX = lonToTileX(props.lng, ZOOM);
  const tileY = latToTileY(props.lat, ZOOM);

  const baseX = Math.floor(tileX) - 1;
  const baseY = Math.floor(tileY) - 1;

  const pointX = (tileX - baseX) * TILE_SIZE;
  const pointY = (tileY - baseY) * TILE_SIZE;

  const translateX = VIEWPORT_WIDTH / 2 - pointX;
  const translateY = VIEWPORT_HEIGHT / 2 - pointY;

  const tiles = Array.from({ length: 3 * 3 }, (_, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = baseX + col;
    const y = baseY + row;

    return {
      key: `${x}-${y}`,
      src: `https://tile.openstreetmap.org/${ZOOM}/${x}/${y}.png`,
      left: col * TILE_SIZE,
      top: row * TILE_SIZE,
    };
  });

  return {
    tiles,
    translateX,
    translateY,
  };
});
</script>

<template>
  <div class="listing-map listing-map--static">
    <div class="listing-map__canvas listing-map__canvas--static">
      <div
        class="listing-map__tile-grid"
        :style="{
          width: `${TILE_SIZE * 3}px`,
          height: `${TILE_SIZE * 3}px`,
          transform: `translate(${tileLayout.translateX}px, ${tileLayout.translateY}px)`,
        }"
      >
        <img
          v-for="tile in tileLayout.tiles"
          :key="tile.key"
          :src="tile.src"
          alt=""
          class="listing-map__tile"
          :style="{
            left: `${tile.left}px`,
            top: `${tile.top}px`,
            width: `${TILE_SIZE}px`,
            height: `${TILE_SIZE}px`,
          }"
        />
      </div>

      <div class="listing-map__pin" aria-hidden="true">
        <svg viewBox="0 0 38 52" width="38" height="52">
          <path fill="#33261b" d="M19 0c10.49 0 19 8.5 19 19 0 13.59-19 33-19 33S0 32.59 0 19C0 8.5 8.51 0 19 0z"/>
          <circle cx="19" cy="19" r="8" fill="#f4ecdd"/>
        </svg>
      </div>
    </div>

    <div class="listing-map__popup listing-map__popup--visible">
      <strong>{{ title }}</strong>
      <span>{{ city }}</span>
    </div>
  </div>
</template>
