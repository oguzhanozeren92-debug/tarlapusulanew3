import { fromUrl } from 'geotiff';
import type { EarthSearchScene, Position } from '../../../services/earthSearchService';

export type EarthSearchNdviStats = {
  sceneId: string;
  datetime: string;
  cloudCover: number | null;
  sampleCount: number;
  mean: number;
  min: number;
  max: number;
  healthyPercent: number;
  moderatePercent: number;
  stressedPercent: number;
};

type XY = [number, number];

function pointInRing(point: XY, ring: XY[]) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function normalizeRing(ring: Position[]) {
  if (ring.length < 3) throw new Error('NDVI analizi için tarla sınırı eksik.');
  const first = ring[0];
  const last = ring[ring.length - 1];
  return first[0] === last[0] && first[1] === last[1] ? ring : [...ring, first];
}

function clampWindow(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function wgs84ToUtm([lon, lat]: Position, zone: number, south: boolean): XY {
  const a = 6378137;
  const eccSquared = 0.00669438;
  const k0 = 0.9996;
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const lonOrigin = (zone - 1) * 6 - 180 + 3;
  const lonOriginRad = (lonOrigin * Math.PI) / 180;
  const eccPrimeSquared = eccSquared / (1 - eccSquared);
  const n = a / Math.sqrt(1 - eccSquared * Math.sin(latRad) ** 2);
  const t = Math.tan(latRad) ** 2;
  const c = eccPrimeSquared * Math.cos(latRad) ** 2;
  const aa = Math.cos(latRad) * (lonRad - lonOriginRad);
  const m = a * (
    (1 - eccSquared / 4 - (3 * eccSquared ** 2) / 64 - (5 * eccSquared ** 3) / 256) * latRad -
    ((3 * eccSquared) / 8 + (3 * eccSquared ** 2) / 32 + (45 * eccSquared ** 3) / 1024) * Math.sin(2 * latRad) +
    ((15 * eccSquared ** 2) / 256 + (45 * eccSquared ** 3) / 1024) * Math.sin(4 * latRad) -
    ((35 * eccSquared ** 3) / 3072) * Math.sin(6 * latRad)
  );
  const easting = k0 * n * (aa + ((1 - t + c) * aa ** 3) / 6 + ((5 - 18 * t + t ** 2 + 72 * c - 58 * eccPrimeSquared) * aa ** 5) / 120) + 500000;
  let northing = k0 * (m + n * Math.tan(latRad) * (aa ** 2 / 2 + ((5 - t + 9 * c + 4 * c ** 2) * aa ** 4) / 24 + ((61 - 58 * t + t ** 2 + 600 * c - 330 * eccPrimeSquared) * aa ** 6) / 720));
  if (south) northing += 10000000;
  return [easting, northing];
}

function projectRingForImage(image: any, ring: Position[]): XY[] {
  const geoKeys = image.getGeoKeys?.() ?? {};
  const epsg = Number(geoKeys.ProjectedCSTypeGeoKey ?? geoKeys.ProjectedCRSGeoKey);
  if (epsg >= 32601 && epsg <= 32660) {
    const zone = epsg - 32600;
    return ring.map((point) => wgs84ToUtm(point, zone, false));
  }
  if (epsg >= 32701 && epsg <= 32760) {
    const zone = epsg - 32700;
    return ring.map((point) => wgs84ToUtm(point, zone, true));
  }
  throw new Error(`Sentinel-2 raster koordinat sistemi desteklenmiyor (EPSG:${epsg || 'bilinmiyor'}).`);
}

/**
 * Reads Sentinel-2 red/NIR COG windows directly in the browser. Parcel WGS84
 * coordinates are projected to the COG's UTM CRS before windowing and masking.
 * No synthetic values are produced.
 */
export async function analyzeEarthSearchSceneNdvi(scene: EarthSearchScene, parcelRing: Position[]): Promise<EarthSearchNdviStats | null> {
  if (!scene.redUrl || !scene.nirUrl) return null;
  const wgs84Ring = normalizeRing(parcelRing);
  const [redTiff, nirTiff] = await Promise.all([fromUrl(scene.redUrl), fromUrl(scene.nirUrl)]);
  const [redImage, nirImage] = await Promise.all([redTiff.getImage(), nirTiff.getImage()]);
  const ring = projectRingForImage(redImage, wgs84Ring);

  const redBox = redImage.getBoundingBox();
  const nirBox = nirImage.getBoundingBox();
  const minX = Math.max(redBox[0], nirBox[0], Math.min(...ring.map(([x]) => x)));
  const minY = Math.max(redBox[1], nirBox[1], Math.min(...ring.map(([, y]) => y)));
  const maxX = Math.min(redBox[2], nirBox[2], Math.max(...ring.map(([x]) => x)));
  const maxY = Math.min(redBox[3], nirBox[3], Math.max(...ring.map(([, y]) => y)));
  if (!(minX < maxX && minY < maxY)) return null;

  const width = redImage.getWidth();
  const height = redImage.getHeight();
  const [originX, originY] = redImage.getOrigin();
  const [resXRaw, resYRaw] = redImage.getResolution();
  const resX = Math.abs(resXRaw);
  const resY = Math.abs(resYRaw);
  const x0 = clampWindow(Math.floor((minX - originX) / resX), 0, width - 1);
  const x1 = clampWindow(Math.ceil((maxX - originX) / resX), x0 + 1, width);
  const y0 = clampWindow(Math.floor((originY - maxY) / resY), 0, height - 1);
  const y1 = clampWindow(Math.ceil((originY - minY) / resY), y0 + 1, height);
  const window: [number, number, number, number] = [x0, y0, x1, y1];

  const [redRaster, nirRaster] = await Promise.all([
    redImage.readRasters({ window, interleave: true }),
    nirImage.readRasters({ window, width: x1 - x0, height: y1 - y0, interleave: true }),
  ]);
  const values: number[] = [];
  const windowWidth = x1 - x0;
  const windowHeight = y1 - y0;
  const length = Math.min(redRaster.length, nirRaster.length, windowWidth * windowHeight);
  for (let index = 0; index < length; index += 1) {
    const col = index % windowWidth;
    const row = Math.floor(index / windowWidth);
    const x = originX + (x0 + col + 0.5) * resX;
    const y = originY - (y0 + row + 0.5) * resY;
    if (!pointInRing([x, y], ring)) continue;
    const red = Number(redRaster[index]);
    const nir = Number(nirRaster[index]);
    const denominator = nir + red;
    if (!Number.isFinite(red) || !Number.isFinite(nir) || denominator === 0) continue;
    const ndvi = (nir - red) / denominator;
    if (Number.isFinite(ndvi) && ndvi >= -1 && ndvi <= 1) values.push(ndvi);
  }
  if (!values.length) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const healthy = values.filter((value) => value >= 0.6).length;
  const moderate = values.filter((value) => value >= 0.3 && value < 0.6).length;
  const stressed = values.filter((value) => value < 0.3).length;
  return {
    sceneId: scene.id,
    datetime: scene.datetime,
    cloudCover: scene.cloudCover,
    sampleCount: values.length,
    mean,
    min: Math.min(...values),
    max: Math.max(...values),
    healthyPercent: (healthy / values.length) * 100,
    moderatePercent: (moderate / values.length) * 100,
    stressedPercent: (stressed / values.length) * 100,
  };
}
