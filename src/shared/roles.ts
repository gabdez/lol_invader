import type { ChampionCatalog } from './catalog';
import { ROLES, type PlayerSlot, type Role } from './types';

export const SMITE_SPELL_ID = 11;
const ROLE_WEIGHTS = [1, 0.55, 0.3, 0.15];

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const out: T[][] = [];
  items.forEach((item, i) => {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const p of permutations(rest)) out.push([item, ...p]);
  });
  return out;
}

/** How likely a champion is to be played in a given role (0..1+). */
export function roleAffinity(catalog: ChampionCatalog, slot: PlayerSlot, role: Role): number {
  const traits = slot.championId ? catalog.traits(slot.championId) : undefined;
  let score = 0.02;
  if (traits) {
    const idx = traits.roles.indexOf(role);
    if (idx >= 0) score = ROLE_WEIGHTS[Math.min(idx, ROLE_WEIGHTS.length - 1)];
  }
  if (slot.spells?.length) {
    const hasSmite = slot.spells.includes(SMITE_SPELL_ID);
    if (role === 'JUNGLE') score += hasSmite ? 5 : -0.5;
    else if (hasSmite) score -= 2;
  }
  return score;
}

/**
 * Fills missing roles in a team. Roles already known (assigned by the client) are kept;
 * the remaining players get the most likely distinct remaining roles (brute force over
 * at most 5! assignments).
 */
export function inferRoles(catalog: ChampionCatalog, team: PlayerSlot[]): PlayerSlot[] {
  const result = team.map((p) => ({ ...p }));
  const taken = new Set(result.filter((p) => p.role).map((p) => p.role as Role));
  const unknown = result.filter((p) => !p.role && p.championId);
  if (unknown.length === 0) return result;

  const freeRoles = ROLES.filter((r) => !taken.has(r));
  let best: Role[] = [];
  let bestScore = -Infinity;
  for (const perm of permutations(freeRoles)) {
    let score = 0;
    unknown.forEach((p, i) => {
      if (perm[i]) score += roleAffinity(catalog, p, perm[i]);
    });
    if (score > bestScore) {
      bestScore = score;
      best = perm;
    }
  }
  unknown.forEach((p, i) => {
    if (best[i]) {
      p.role = best[i];
      p.roleSource = 'inferred';
    }
  });
  return result;
}
