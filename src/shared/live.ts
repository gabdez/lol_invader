import { OBJECTIVES } from './objectives';
import type { ObjectiveEvent } from './types';

export interface UpcomingObjective {
  label: string;
  /** Spawn time in seconds of game time. */
  at: number;
  /** Seconds until spawn (<= 0 means available now). */
  inSec: number;
}

/** Next spawn of each major objective based on the in-game event feed. */
export function upcomingObjectives(gameTime: number, events: ObjectiveEvent[]): UpcomingObjective[] {
  const last = (type: ObjectiveEvent['type']) =>
    events.filter((e) => e.type === type).reduce<number | null>((m, e) => (m === null || e.time > m ? e.time : m), null);
  const out: UpcomingObjective[] = [];

  const lastDragon = Math.max(last('dragon') ?? -1, last('elder') ?? -1);
  const dragonsAlly = events.filter((e) => e.type === 'dragon' && e.killerTeam === 'ally').length;
  const dragonsEnemy = events.filter((e) => e.type === 'dragon' && e.killerTeam === 'enemy').length;
  const soulTaken = dragonsAlly >= 4 || dragonsEnemy >= 4;
  out.push({
    label: soulTaken ? 'Dragon ancestral' : 'Drake',
    at: lastDragon >= 0 ? lastDragon + (soulTaken ? OBJECTIVES.elderRespawn : OBJECTIVES.dragonRespawn) : OBJECTIVES.firstDragon,
    inSec: 0,
  });
  if (last('grubs') === null && gameTime < OBJECTIVES.herald) out.push({ label: 'Voidgrubs', at: OBJECTIVES.voidgrubs, inSec: 0 });
  if (last('herald') === null) out.push({ label: 'Héraut', at: OBJECTIVES.herald, inSec: 0 });
  if (last('atakhan') === null) out.push({ label: 'Atakhan', at: OBJECTIVES.atakhan, inSec: 0 });
  const lastBaron = last('baron');
  out.push({ label: 'Baron', at: lastBaron !== null ? lastBaron + OBJECTIVES.baronRespawn : OBJECTIVES.baron, inSec: 0 });

  for (const o of out) o.inSec = Math.round(o.at - gameTime);
  return out.sort((a, b) => a.at - b.at);
}

export function currentPhase(gameTime: number): 'early' | 'mid' | 'late' {
  if (gameTime < 14 * 60) return 'early';
  if (gameTime < 25 * 60) return 'mid';
  return 'late';
}
