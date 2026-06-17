import { calculateHaversineDistance } from "./haversine-distance.util";

/**
 * Nearest-Neighbor Heuristic for TSP
 * Start from toko location, always visit the nearest unvisited customer.
 * Not globally optimal, but very fast and produces decent routes.
 */
export function optimizeRouteNearestNeighbor(
  items: Array<{
    pesananId: string;
    lat: number | null;
    lng: number | null;
    alamat: string;
    penerima: string;
  }>,
  tokoLat: number | null,
  tokoLng: number | null,
) {
  // If no toko coordinates or items have no coordinates, return as-is
  if (!tokoLat || !tokoLng) return items;

  const withCoords = items.filter((i) => i.lat && i.lng);
  const withoutCoords = items.filter((i) => !i.lat || !i.lng);

  if (withCoords.length === 0) return items;

  const ordered: typeof withCoords = [];
  const remaining = [...withCoords];
  let currentLat = tokoLat;
  let currentLng = tokoLng;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = calculateHaversineDistance(
        currentLat,
        currentLng,
        remaining[i].lat!,
        remaining[i].lng!,
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    const nearest = remaining.splice(nearestIdx, 1)[0];
    ordered.push(nearest);
    currentLat = nearest.lat!;
    currentLng = nearest.lng!;
  }

  // Items without coordinates go at the end
  return [...ordered, ...withoutCoords];
}
