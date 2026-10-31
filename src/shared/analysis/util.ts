import type { ChampionTraits, Role } from '../types';

export interface Resolved {
  t: ChampionTraits;
  role: Role | null;
  isLocal: boolean;
  locked: boolean;
}

export function names(list: Resolved[] | ChampionTraits[]): string {
  const n = list.map((x) => ('t' in x ? x.t.name : x.name));
  if (n.length <= 1) return n.join('');
  return `${n.slice(0, -1).join(', ')} et ${n[n.length - 1]}`;
}

export function byRole(team: Resolved[], role: Role): Resolved | undefined {
  return team.find((c) => c.role === role);
}

export function hasTag(c: Resolved, tag: ChampionTraits['tags'][number]): boolean {
  return c.t.tags.includes(tag);
}

export function withTag(team: Resolved[], tag: ChampionTraits['tags'][number]): Resolved[] {
  return team.filter((c) => hasTag(c, tag));
}

export function avg(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

export function isCarry(c: Resolved): boolean {
  return c.t.dps + c.t.burst >= 4 && c.t.tank <= 1;
}

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
