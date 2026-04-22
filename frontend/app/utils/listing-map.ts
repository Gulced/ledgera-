import type { Listing } from '~/types/api';

export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  istanbul: { lat: 41.0082, lng: 28.9784 },
  ankara: { lat: 39.9334, lng: 32.8597 },
  izmir: { lat: 38.4237, lng: 27.1428 },
  bodrum: { lat: 37.0344, lng: 27.4305 },
  antalya: { lat: 36.8969, lng: 30.7133 },
  bursa: { lat: 40.1885, lng: 29.061 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  london: { lat: 51.5072, lng: -0.1276 },
};

function normalizeCity(input: string) {
  return input
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ');
}

function hashString(input: string) {
  let hash = 0;

  for (const char of input) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return hash;
}

function offsetFromHash(hash: number, maxOffset: number) {
  const normalized = (hash % 10_000) / 10_000;
  return (normalized * 2 - 1) * maxOffset;
}

export function getApproximateListingCoordinates(
  listing: Pick<Listing, 'city' | 'fullAddress' | 'id' | 'propertyRef'>,
) {
  const base = CITY_COORDINATES[normalizeCity(listing.city)];

  if (!base) {
    return null;
  }

  const seed = `${listing.fullAddress}|${listing.propertyRef}|${listing.id}`;
  const latOffset = offsetFromHash(hashString(seed), 0.04);
  const lngOffset = offsetFromHash(hashString(`${seed}|lng`), 0.06);

  return {
    lat: base.lat + latOffset,
    lng: base.lng + lngOffset,
  };
}
