import { supabase } from '../../../supabaseClient';
import { fetchHistoricalSatellite, listSatelliteDates } from '../../map-data/services/satelliteHistory';
import type { PusulaPdfSatellitePoint, PusulaPdfSnapshot, WeeklyPusulaReport } from '../types';

const FIELD_COLUMNS = [
  'id','name','city','district','village','area_decare','crop','crop_subtype','season',
  'irrigation_status','irrigation_method','parcel_geometry','latitude','longitude',
  'parcel_centroid_lat','parcel_centroid_lng'
].join(',');

function isoDate(date: Date) { return date.toISOString().slice(0, 10); }

export function getWeeklyReportPeriod(now = new Date()) {
  // PUSULAPDF takvim haftasına bağlı değildir. Rapor oluşturulduğu gün biter
  // ve o gün dahil son 7 günlük gerçek veri penceresini temsil eder.
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);
  return { start: isoDate(start), end: isoDate(end) };
}

const REPORT_CYCLE_MS = 7 * 24 * 60 * 60 * 1000;

function nextReportAt(createdAt: string) {
  return new Date(new Date(createdAt).getTime() + REPORT_CYCLE_MS);
}

function reportIsStillCurrent(createdAt: string, now = new Date()) {
  return now.getTime() < nextReportAt(createdAt).getTime();
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('PUSULAPDF için oturum bulunamadı.');
  return data.user;
}

async function optionalRows(table: string, fieldId: string, select = '*', orderColumn = 'created_at') {
  const { data, error } = await supabase.from(table).select(select).eq('field_id', fieldId).order(orderColumn, { ascending: false });
  if (error) {
    console.warn(`[PUSULAPDF] ${table} alınamadı:`, error.message);
    return [];
  }
  return data ?? [];
}

function readIndex(result: any, key: string): number | null {
  const candidates = [
    result?.[`${key}Average`], result?.[`${key}Avg`], result?.[key],
    result?.indices?.[key]?.average, result?.indices?.[key]?.avg,
    result?.indexValues?.[key], result?.statistics?.[key]?.mean,
  ];
  for (const value of candidates) {
    const n = numberOrNull(value);
    if (n !== null) return n;
  }
  return null;
}

async function collectSatellite(geometry: unknown) {
  if (!geometry) return { points: [] as PusulaPdfSatellitePoint[], availableDates: [] as string[] };
  const allDates = await listSatelliteDates(geometry);
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 30);
  const dates = allDates
    .filter((d) => new Date(`${d}T00:00:00Z`) >= cutoff)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 8);
  const points: PusulaPdfSatellitePoint[] = [];
  for (const date of dates) {
    try {
      const r: any = await fetchHistoricalSatellite(geometry, date);
      points.push({
        date,
        ndvi: readIndex(r, 'ndvi'),
        ndmi: readIndex(r, 'ndmi'),
        ndre: readIndex(r, 'ndre'),
        savi: readIndex(r, 'savi'),
        gndvi: readIndex(r, 'gndvi'),
        ndviImage: typeof r?.ndviImage === 'string' ? r.ndviImage : null,
        trueColorImage: typeof r?.trueColorImage === 'string' ? r.trueColorImage : null,
      });
    } catch (error) {
      console.warn(`[PUSULAPDF] ${date} uydu analizi alınamadı:`, error);
    }
  }
  return { points: points.sort((a,b) => a.date.localeCompare(b.date)), availableDates: allDates };
}

function hasUsableAppWeather(value: any) {
  if (!value || value.status !== 'ready') return false;
  if (Array.isArray(value.forecast) && value.forecast.length > 0) return true;
  if (Array.isArray(value.providers) && value.providers.some((provider: any) =>
    Array.isArray(provider?.forecast) && provider.forecast.length > 0
  )) return true;
  return false;
}

async function collectWeather(field: any) {
  const lat = numberOrNull(field.parcel_centroid_lat ?? field.latitude);
  const lng = numberOrNull(field.parcel_centroid_lng ?? field.longitude);
  if (lat === null || lng === null) return null;

  // Uygulamanın weather_cache tablosundaki en yakın/güncel gerçek payload'ını kullanır.
  // Cache yoksa burada değer uydurulmaz; ileride weather Edge Function doğrudan bağlanabilir.
  const { data, error } = await supabase
    .from('weather_cache')
    .select('payload,provider_count,updated_at,latitude,longitude')
    .gte('latitude', lat - 0.03).lte('latitude', lat + 0.03)
    .gte('longitude', lng - 0.03).lte('longitude', lng + 0.03)
    .order('updated_at', { ascending: false }).limit(1).maybeSingle();
  if (error) {
    console.warn('[PUSULAPDF] hava cache alınamadı:', error.message);
    return null;
  }
  return data ?? null;
}

export async function buildPusulaPdfSnapshot(fieldIdInput: string, appWeather?: unknown): Promise<PusulaPdfSnapshot> {
  const fieldId = String(fieldIdInput ?? '').trim();
  if (!fieldId) throw new Error('PUSULAPDF için tarla seçilmedi.');
  const user = await requireUser();

  const { data: field, error: fieldError } = await supabase
    .from('fields').select(FIELD_COLUMNS).eq('id', fieldId).eq('user_id', user.id).single();
  if (fieldError) throw fieldError;

  const geometry = field.parcel_geometry ?? null;
  const period = getWeeklyReportPeriod();

  const [satellite, weather, activities, soilAnalyses, diagnoses, kcSnapshots] = await Promise.all([
    collectSatellite(geometry).catch(() => ({ points: [], availableDates: [] })),
    hasUsableAppWeather(appWeather) ? Promise.resolve(appWeather) : collectWeather(field),
    optionalRows('activities', fieldId, '*', 'activity_date'),
    optionalRows('soil_analyses', fieldId),
    optionalRows('ai_diagnosis_sessions', fieldId, '*', 'updated_at'),
    optionalRows('field_irrigation_kc_snapshots', fieldId, '*', 'snapshot_date'),
  ]);

  const missing: string[] = [];
  if (!geometry) missing.push('parcel_geometry');
  if (!satellite.points.length) missing.push('satellite_30d');
  if (!weather) missing.push('weather');
  if (!activities.length) missing.push('activities');
  if (!soilAnalyses.length) missing.push('soil_analysis');
  if (!diagnoses.some((d: any) => d.status === 'resolved')) missing.push('resolved_diagnosis');
  if (!kcSnapshots.length) missing.push('irrigation_kc');

  return {
    schemaVersion: 1,
    field: {
      id: String(field.id), name: field.name ?? 'Tarla', city: field.city ?? null,
      district: field.district ?? null, village: field.village ?? null,
      areaDecare: numberOrNull(field.area_decare), crop: field.crop ?? null,
      cropSubtype: field.crop_subtype ?? null, season: numberOrNull(field.season),
      irrigationStatus: field.irrigation_status ?? null, irrigationMethod: field.irrigation_method ?? null,
      geometry, latitude: numberOrNull(field.parcel_centroid_lat ?? field.latitude),
      longitude: numberOrNull(field.parcel_centroid_lng ?? field.longitude),
    },
    period: { start: period.start, end: period.end, createdAt: new Date().toISOString() },
    satellite, weather,
    irrigation: { kcSnapshots },
    activities,
    soilAnalyses,
    diagnoses: diagnoses.filter((d: any) => d.status === 'resolved'),
    missing,
  };
}

export async function getOrCreateWeeklyPusulaReport(fieldId: string, appWeather?: unknown): Promise<WeeklyPusulaReport> {
  const user = await requireUser();
  const now = new Date();

  // Her tarla kendi 7 günlük döngüsüne sahiptir. Son raporun oluşturulma
  // zamanından 7 gün geçmediyse aynı rapor tekrar kullanılır.
  const { data: latest, error: latestError } = await supabase
    .from('weekly_field_reports').select('*')
    .eq('user_id', user.id).eq('field_id', fieldId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (latestError) throw latestError;

  if (latest && reportIsStillCurrent(latest.created_at, now)) {
    // Eski Pazartesi-Pazar sürümünde geleceğe uzanan tarih metadata'sı oluşmuşsa
    // yalnızca tarih penceresini gerçek oluşturma gününe göre düzelt.
    const created = new Date(latest.created_at);
    const corrected = getWeeklyReportPeriod(created);
    const needsCorrection = latest.period_start !== corrected.start || latest.period_end !== corrected.end;
    const canAttachAppWeather = hasUsableAppWeather(appWeather);
    const missing = Array.isArray(latest.report_data?.missing) ? latest.report_data.missing : [];
    const needsWeatherPatch = canAttachAppWeather && (!latest.report_data?.weather || missing.includes('weather'));

    if (needsCorrection || needsWeatherPatch) {
      const reportData = {
        ...(latest.report_data ?? {}),
        ...(needsWeatherPatch ? {
          weather: appWeather,
          missing: missing.filter((item: string) => item !== 'weather'),
        } : {}),
        period: {
          ...(latest.report_data?.period ?? {}),
          start: corrected.start,
          end: corrected.end,
        },
      };
      const { data: fixed, error: fixError } = await supabase
        .from('weekly_field_reports')
        .update({ period_start: corrected.start, period_end: corrected.end, report_data: reportData })
        .eq('id', latest.id).eq('user_id', user.id).select('*').single();
      if (fixError) throw fixError;
      return fixed as WeeklyPusulaReport;
    }
    return latest as WeeklyPusulaReport;
  }

  const period = getWeeklyReportPeriod(now);
  const snapshot = await buildPusulaPdfSnapshot(fieldId, appWeather);
  const { data, error } = await supabase.from('weekly_field_reports').insert({
    user_id: user.id, field_id: fieldId, period_start: period.start, period_end: period.end,
    status: 'snapshot', report_data: snapshot,
  }).select('*').single();
  if (error) throw error;
  return data as WeeklyPusulaReport;
}

export async function getCurrentWeeklyPusulaReport(fieldId: string) {
  const user = await requireUser();
  const { data, error } = await supabase.from('weekly_field_reports').select('*')
    .eq('user_id', user.id).eq('field_id', fieldId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!data || !reportIsStillCurrent(data.created_at)) return null;
  return data as WeeklyPusulaReport;
}
