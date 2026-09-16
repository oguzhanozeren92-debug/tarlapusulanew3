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

function pointInRing(point: Position, ring: Position[]) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi;
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

/**
 * Reads the matching Sentinel-2 red/NIR COG windows directly in the browser and
 * calculates NDVI only for pixels whose centres fall inside the parcel polygon.
 * No synthetic values are produced.
 */
export async function analyzeEarthSearchSceneNdvi(
  scene: EarthSearchScene,
  parcelRing: Position[],
): Promise<EarthSearchNdviStats | null> {
  if (!scene.redUrl || !scene.nirUrl) return null;

  const ring = normalizeRing(parcelRing);
  const [redTiff, nirTiff] = await Promise.all([
    fromUrl(scene.redUrl),
    fromUrl(scene.nirUrl),
  ]);
  const [redImage, nirImage] = await Promise.all([
    redTiff.getImage(),
    nirTiff.getImage(),
  ]);

  const redBox = redImage.getBoundingBox();
  const nirBox = nirImage.getBoundingBox();
  const minX = Math.max(redBox[0], nirBox[0], ...ring.map(([x]) => x));
  const minY = Math.max(redBox[1], nirBox[1], ...ring.map(([, y]) => y));
  const maxX = Math.min(redBox[2], nirBox[2], ...ring.map(([x]) => x));
  const maxY = Math.min(redBox[3], nirBox[3], ...ring.map(([, y]) => y));
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
    const lon = originX + (x0 + col + 0.5) * resX;
    const lat = originY - (y0 + row + 0.5) * resY;
    if (!pointInRing([lon, lat], ring)) continue;

    const red = Number(redRaster[index]);
    const nir = Number(nirRaster[index]);
    const denominator = nir + red;
    if (!Number.isFinite(red) || !Number.isFinite(nir) || denominator === 0) continue;

    const ndvi = (nir - red) / denominator;
    if (Number.isFinite(ndvi) && ndvi >= -1 && ndvi <= 1) values.push(ndvi);
  }

  if (!values.length) return null;

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const healthy = values.filter((value) => value >= 0.6).length;
  const moderate = values.filter((value) => value >= 0.3 && value < 0.6).length;
  const stressed = values.filter((value) => value < 0.3).length;

  return {
    sceneId: scene.id,
    datetime: scene.datetime,
    cloudCover: scene.cloudCover,
    sampleCount: values.length,
    mean,
    min,
    max,
    healthyPercent: (healthy / values.length) * 100,
    moderatePercent: (moderate / values.length) * 100,
    stressedPercent: (stressed / values.length) * 100,
  };
}
