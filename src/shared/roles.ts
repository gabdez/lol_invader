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

/** Roles forced by the user, per team, keyed by champion id (survives draft updates). */
export interface RoleOverrides {
  ally: Record<number, Role>;
  enemy: Record<number, Role>;
}

export function emptyOverrides(): RoleOverrides {
  return { ally: {}, enemy: {} };
}

export function countOverrides(o: RoleOverrides): number {
  return Object.keys(o.ally).length + Object.keys(o.enemy).length;
}

function applyTeamOverrides(team: PlayerSlot[], map: Record<number, Role>): PlayerSlot[] {
  const forced = new Set(team.filter((p) => p.championId && map[p.championId]).map((p) => map[p.championId]));
  return team.map((p) => {
    const role = p.championId ? map[p.championId] : undefined;
    if (role) return { ...p, role, roleSource: 'manual' as const };
    // Someone else was forced into this player's role: let the inference re-place this player.
    if (p.role && forced.has(p.role)) return { ...p, role: null, roleSource: 'inferred' as const };
    return p;
  });
}

/** Applies user role corrections on top of what the client / game reports. */
export function applyRoleOverrides<T extends { myTeam: PlayerSlot[]; enemyTeam: PlayerSlot[] }>(ctx: T, o: RoleOverrides): T {
  return { ...ctx, myTeam: applyTeamOverrides(ctx.myTeam, o.ally), enemyTeam: applyTeamOverrides(ctx.enemyTeam, o.enemy) };
}

/**
 * Gives `role` to the player at `index`; the player who had that role takes the previous
 * role of `index` (swap), so roles stay distinct. Works for any value type ('' = auto).
 */
export function assignRoleWithSwap<R extends string | null>(roles: R[], index: number, role: R): R[] {
  const out = [...roles];
  const previous = out[index];
  if (role) {
    const other = out.findIndex((r, k) => k !== index && r === role);
    if (other >= 0) out[other] = previous;
  }
  out[index] = role;
  return out;
}
