import { describe, expect, it } from 'vitest';
import { analyzeGame } from '../src/shared/analysis';
import { ChampionCatalog } from '../src/shared/catalog';
import { CURATED, findCurated } from '../src/shared/champions';
import { inferRoles } from '../src/shared/roles';
import type { GameContext, PlayerSlot, Role } from '../src/shared/types';

const catalog = ChampionCatalog.offline();

function key(name: string): number {
  const c = findCurated(name);
  if (!c) throw new Error(`unknown champion ${name}`);
  return c.key;
}

function slot(name: string, role: Role | null, isLocalPlayer = false): PlayerSlot {
  return { championId: key(name), role, roleSource: role ? 'assigned' : 'inferred', isLocalPlayer, locked: true };
}

describe('champion table', () => {
  it('has unique ids and keys', () => {
    expect(new Set(CURATED.map((c) => c.key)).size).toBe(CURATED.length);
    expect(new Set(CURATED.map((c) => c.id)).size).toBe(CURATED.length);
  });
  it('resolves aliases', () => {
    expect(findCurated('Wukong')?.id).toBe('MonkeyKing');
    expect(findCurated("Kai'Sa")?.id).toBe('Kaisa');
    expect(findCurated('Nunu & Willump')?.id).toBe('Nunu');
  });
});

describe('role inference', () => {
  it('assigns the most likely distinct roles to enemies', () => {
    const team: PlayerSlot[] = ['Leona', 'Jinx', 'Darius', 'Ahri', 'LeeSin'].map((n) => slot(n, null));
    const roles = Object.fromEntries(inferRoles(catalog, team).map((p) => [catalog.info(p.championId)!.name, p.role]));
    expect(roles).toEqual({ Leona: 'UTILITY', Jinx: 'BOTTOM', Darius: 'TOP', Ahri: 'MIDDLE', 'Lee Sin': 'JUNGLE' });
  });
  it('uses Smite to detect the jungler', () => {
    const team: PlayerSlot[] = [
      { ...slot('Wukong', null), spells: [4, 11] },
      { ...slot('Volibear', null), spells: [4, 12] },
    ];
    const res = inferRoles(catalog, team);
    expect(res[0].role).toBe('JUNGLE');
    expect(res[1].role).toBe('TOP');
  });
  it('keeps roles assigned by the client', () => {
    const res = inferRoles(catalog, [slot('Jinx', 'MIDDLE'), slot('Ahri', null)]);
    expect(res[0].role).toBe('MIDDLE');
    expect(res[1].role).not.toBe('MIDDLE');
  });
});

describe('analyzeGame', () => {
  const ctx: GameContext = {
    source: 'manual',
    phase: 'Manual',
    side: 'blue',
    myTeam: [
      slot('Darius', 'TOP'),
      slot('LeeSin', 'JUNGLE', true),
      slot('Orianna', 'MIDDLE'),
      slot('Jinx', 'BOTTOM'),
      slot('Lulu', 'UTILITY'),
    ],
    enemyTeam: ['Teemo', 'Hecarim', 'Zed', 'Draven', 'Leona'].map((n) => slot(n, null)),
  };
  const a = analyzeGame(catalog, ctx);

  it('produces a complete analysis', () => {
    expect(a.complete).toBe(true);
    expect(a.matchups.map((m) => m.lane)).toEqual(['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM']);
    expect(a.matchups.find((m) => m.lane === 'JUNGLE')?.isMyLane).toBe(true);
    expect(a.phases).toHaveLength(3);
    expect(a.timeline.length).toBeGreaterThan(5);
    expect(a.plan.role).toBe('JUNGLE');
    expect(a.plan.roleTips.length).toBeGreaterThan(0);
    expect(a.plan.threats.length).toBeGreaterThan(0);
  });

  it('flags ranged-vs-melee top lane and an aggressive enemy bot lane', () => {
    const top = a.matchups.find((m) => m.lane === 'TOP')!;
    expect(top.tips.join(' ')).toMatch(/portée/);
    const bot = a.matchups.find((m) => m.lane === 'BOTTOM')!;
    expect(bot.earlyScore).toBeLessThan(0);
    expect(bot.scalingScore).toBeGreaterThan(0);
  });

  it('recognises a scaling protect-the-carry composition', () => {
    expect(a.ally.archetypes.slice(0, 3).map((x) => x.id)).toContain('protect');
    expect(a.ally.curve.late).toBeGreaterThan(a.enemy.curve.late);
  });

  it('works on a partial draft', () => {
    const partial = analyzeGame(catalog, {
      ...ctx,
      enemyTeam: [slot('Zed', null), { championId: 0, role: null, roleSource: 'inferred', isLocalPlayer: false, locked: false }],
    });
    expect(partial.complete).toBe(false);
    expect(partial.matchups.length).toBeGreaterThan(0);
  });

  it('handles an empty draft', () => {
    const empty = analyzeGame(catalog, { ...ctx, myTeam: [], enemyTeam: [] });
    expect(empty.insights).toEqual([]);
    expect(empty.plan.headline).toMatch(/Choisis/);
  });
});
