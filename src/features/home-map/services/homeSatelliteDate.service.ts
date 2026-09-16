import { findLatestSentinel2Scene, type Position } from '../../../services/earthSearchService';

type GeometryLike = {
  type?: string;
  coordinates?: unknown;
  geometry?: GeometryLike | null;
};

function isPosition(value: unknown): value is Position {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

function asRing(value: unknown): Position[] | null {
  if (!Array.isArray(value)) return null;
  const ring = value.filter(isPosition);
  return ring.length >= 3 ? ring : null;
}

function getExteriorRing(source: unknown): Position[] | null {
  if (!source) return null;

  if (Array.isArray(source)) {
    const direct = asRing(source);
    if (direct) return direct;

    const polygon = source[0];
    if (Array.isArray(polygon)) {
      const ring = asRing(polygon);
      if (ring) return ring;
      return asRing(polygon[0]);
    }
    return null;
  }

  if (typeof source !== 'object') return null;
  const value = source as GeometryLike;
  const geometry = value.type === 'Feature' ? value.geometry : value;
  if (!geometry) return null;

  if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
    return asRing(geometry.coordinates[0]);
  }

  if (geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)) {
    const firstPolygon = geometry.coordinates[0];
    return Array.isArray(firstPolygon) ? asRing(firstPolygon[0]) : null;
  }

  return null;
}

/**
 * Returns the acquisition date of the newest sufficiently clear Sentinel-2 L2A
 * scene intersecting the selected parcel. No mock/fallback date is generated.
 */
export async function fetchHomeSatelliteDate(parcelGeometry: unknown) {
  const ring = getExteriorRing(parcelGeometry);
  if (!ring) return '';

  const scene = await findLatestSentinel2Scene({
    ring,
    daysBack: 60,
    maxCloudCover: 30,
  });

  return String(scene?.datetime ?? '').trim();
}
