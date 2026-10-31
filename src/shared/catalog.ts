import { CURATED, estimateTraits, findCurated, findCuratedByKey } from './champions';
import type { ChampionInfo, ChampionTraits } from './types';

/**
 * Champion catalog: merges Data Dragon metadata (names, images, ids of the current
 * patch) with the curated traits used by the analysis engine.
 */
export class ChampionCatalog {
  private readonly infoByKey = new Map<number, ChampionInfo>();
  private readonly traitsByKey = new Map<number, ChampionTraits>();

  constructor(
    infos: ChampionInfo[],
    readonly version: string | null,
  ) {
    for (const info of infos) {
      this.infoByKey.set(info.key, info);
      const curated = findCuratedByKey(info.key) ?? findCurated(info.id);
      const traits = curated
        ? { ...curated, id: info.id, key: info.key, name: info.name }
        : estimateTraits(info);
      this.traitsByKey.set(info.key, traits);
    }
  }

  /** Catalog built only from the bundled table (used when Data Dragon is unreachable). */
  static offline(): ChampionCatalog {
    return new ChampionCatalog(
      CURATED.map((c) => ({ id: c.id, key: c.key, name: c.name, ddTags: [], image: `${c.id}.png` })),
      null,
    );
  }

  info(key: number): ChampionInfo | undefined {
    return this.infoByKey.get(key);
  }

  traits(key: number): ChampionTraits | undefined {
    return this.traitsByKey.get(key);
  }

  /** Lookup by Data Dragon id or display name (used by the Live Client API, which gives names). */
  findByName(name: string): ChampionInfo | undefined {
    const norm = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const info of this.infoByKey.values()) {
      if (info.id.toLowerCase() === norm || info.name.toLowerCase().replace(/[^a-z0-9]/g, '') === norm) {
        return info;
      }
    }
    const curated = findCurated(name);
    return curated ? this.infoByKey.get(curated.key) : undefined;
  }

  list(): ChampionInfo[] {
    return [...this.infoByKey.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }
}
