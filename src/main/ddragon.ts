// Loads champion metadata for the current patch from Riot's Data Dragon CDN,
// with a local cache and an offline fallback (bundled champion table).

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ChampionCatalog } from '../shared/catalog';
import type { ItemPrices } from '../shared/economy';
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

interface DdItem {
  name: string;
  gold: { total: number };
  into?: string[];
}

/** Item names and total costs (used to value inventories in game). */
export async function loadItemPrices(cacheDir: string, version: string | null): Promise<ItemPrices> {
  const cachePath = path.join(cacheDir, 'ddragon-items.json');
  try {
    const v = version ?? (await fetchJson<string[]>(`${BASE}/api/versions.json`))[0];
    const data = await fetchJson<{ data: Record<string, DdItem> }>(`${BASE}/cdn/${v}/data/fr_FR/item.json`);
    const prices: ItemPrices = {};
    for (const [id, item] of Object.entries(data.data)) {
      prices[Number(id)] = { name: item.name, total: item.gold.total, final: !item.into || item.into.length === 0 };
    }
    await writeFile(cachePath, JSON.stringify(prices)).catch(() => undefined);
    return prices;
  } catch (err) {
    console.warn('[ddragon] items download failed, trying cache:', (err as Error).message);
  }
  try {
    return JSON.parse(await readFile(cachePath, 'utf8')) as ItemPrices;
  } catch {
    return {}; // falls back to the prices reported by the game client
  }
}
