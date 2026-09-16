import { useEffect, useState } from 'react';
import {
  fetchHomeSatelliteScene,
  type HomeSatelliteSceneInfo,
} from '../services/homeSatelliteDate.service';

export function useHomeSatelliteDate({
  fieldKey,
  parcelGeometry,
  satelliteDate,
}: {
  fieldKey: string;
  parcelGeometry?: unknown;
  satelliteDate?: unknown;
}) {
  const [sceneInfo, setSceneInfo] = useState<HomeSatelliteSceneInfo | null>(null);

  useEffect(() => {
    let alive = true;
    setSceneInfo(null);

    if (!fieldKey || !parcelGeometry) {
      return () => {
        alive = false;
      };
    }

    void fetchHomeSatelliteScene(parcelGeometry)
      .then((value) => {
        if (alive) setSceneInfo(value);
      })
      .catch((error) => {
        console.warn('Sentinel-2 görüntü bilgisi alınamadı:', error);
      });

    return () => {
      alive = false;
    };
  }, [fieldKey, parcelGeometry]);

  const resolvedDate =
    sceneInfo?.latestImageDate || String(satelliteDate ?? '').trim();

  return {
    resolvedDate,
    cloudCover: sceneInfo?.cloudCover ?? null,
    collection: sceneInfo?.collection ?? '',
    sceneId: sceneInfo?.sceneId ?? '',
  };
}
