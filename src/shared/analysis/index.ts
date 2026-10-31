import type { ChampionCatalog } from '../catalog';
import { inferRoles } from '../roles';
import type { GameAnalysis, GameContext, PlayerSlot } from '../types';
import { buildInsights } from './insights';
import { buildMatchups } from './matchups';
import { buildPersonalPlan } from './plan';
import { buildTeamProfile } from './team';
import { buildPhases, buildTimeline } from './timeline';
import type { Resolved } from './util';

function resolve(catalog: ChampionCatalog, team: PlayerSlot[]): Resolved[] {
  const out: Resolved[] = [];
  for (const p of team) {
    const t = p.championId ? catalog.traits(p.championId) : undefined;
    if (t) out.push({ t, role: p.role, isLocal: p.isLocalPlayer, locked: p.locked });
  }
  return out;
}

/** Full analysis of a draft / game. Works with partial drafts (analysis gets refined as picks lock). */
export function analyzeGame(catalog: ChampionCatalog, ctx: GameContext): GameAnalysis {
  const myTeam = inferRoles(catalog, ctx.myTeam);
  const enemyTeam = inferRoles(catalog, ctx.enemyTeam);
  const ally = resolve(catalog, myTeam);
  const enemy = resolve(catalog, enemyTeam);

  const allyP = buildTeamProfile(ally);
  const enemyP = buildTeamProfile(enemy);
  const myRole = myTeam.find((p) => p.isLocalPlayer)?.role ?? null;
  const matchups = buildMatchups(ally, enemy, myRole);

  return {
    complete: ally.length === 5 && enemy.length === 5,
    generatedAt: Date.now(),
    ally: allyP,
    enemy: enemyP,
    insights: buildInsights(ally, enemy, allyP, enemyP),
    matchups,
    phases: ally.length && enemy.length ? buildPhases(ally, enemy, allyP, enemyP) : [],
    timeline: ally.length && enemy.length ? buildTimeline(ally, enemy, allyP, enemyP) : [],
    plan: buildPersonalPlan(ally, enemy, allyP, enemyP, matchups),
    lineup: {
      ally: myTeam.map((p) => {
        const info = catalog.info(p.championId);
        return { name: info?.name ?? '', id: info?.id ?? '', role: p.role, isLocalPlayer: p.isLocalPlayer, locked: p.locked };
      }),
      enemy: enemyTeam.map((p) => {
        const info = catalog.info(p.championId);
        return { name: info?.name ?? '', id: info?.id ?? '', role: p.role, locked: p.locked };
      }),
    },
  };
}
