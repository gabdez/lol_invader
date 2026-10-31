// Loads champion metadata for the current patch from Riot's Data Dragon CDN,
// with a local cache and an offline fallback (bundled champion table).

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ChampionCatalog } from '../shared/catalog';
import type { ChampionInfo } from '../shared/types';

const BASE = 'https://ddragon.leagueoflegends.com';

interface DdChampion {
  id: string;
  key: string;
  name: string;
  tags: string[];
  image: { full: string };
}

interface CacheFile {
  version: string;
  champions: ChampionInfo[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return (await res.json()) as T;
}

async function download(): Promise<CacheFile> {
  const versions = await fetchJson<string[]>(`${BASE}/api/versions.json`);
  const version = versions[0];
  const data = await fetchJson<{ data: Record<string, DdChampion> }>(
    `${BASE}/cdn/${version}/data/fr_FR/champion.json`,
  );
  const champions = Object.values(data.data).map((c) => ({
    id: c.id,
    key: Number(c.key),
    name: c.name,
    ddTags: c.tags,
    image: c.image.full,
  }));
  return { version, champions };
}

export async function loadCatalog(cacheDir: string): Promise<ChampionCatalog> {
  const cachePath = path.join(cacheDir, 'ddragon-cache.json');
  try {
    const fresh = await download();
    await writeFile(cachePath, JSON.stringify(fresh)).catch(() => undefined);
    return new ChampionCatalog(fresh.champions, fresh.version);
  } catch (err) {
    console.warn('[ddragon] download failed, trying cache:', (err as Error).message);
  }
  try {
    const cached = JSON.parse(await readFile(cachePath, 'utf8')) as CacheFile;
    return new ChampionCatalog(cached.champions, cached.version);
  } catch {
    console.warn('[ddragon] no cache, using bundled champion table');
    return ChampionCatalog.offline();
  }
}

export function championImageUrl(version: string | null, image: string): string | null {
  return version ? `${BASE}/cdn/${version}/img/champion/${image}` : null;
}
