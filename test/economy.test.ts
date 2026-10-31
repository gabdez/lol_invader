import { describe, expect, it } from 'vitest';
import { analyzeGame } from '../src/shared/analysis';
import { ChampionCatalog } from '../src/shared/catalog';
import { findCurated } from '../src/shared/champions';
import { computeEconomy, formatGold, newItemAlerts, type ItemPrices } from '../src/shared/economy';
import { parseLiveGame } from '../src/shared/parsers';
import type { GameContext, LivePlayerStats, Role } from '../src/shared/types';

const catalog = ChampionCatalog.offline();
const prices: ItemPrices = {
  1055: { name: "Lame de Doran", total: 450, final: false },
  3031: { name: "Lame d'infini", total: 3450, final: true },
  3006: { name: 'Jambières du berzerker', total: 1100, final: true },
  6672: { name: 'Briseur de Kraken', total: 3100, final: true },
};
const slot = (name: string, role: Role, me = false) => ({
  championId: findCurated(name)!.key, role, roleSource: 'assigned' as const, isLocalPlayer: me, locked: true,
});
const stats = (o: Partial<LivePlayerStats>): LivePlayerStats => ({
  level: 9, kills: 0, deaths: 0, assists: 0, cs: 100, wardScore: 0, isDead: false, respawnTimer: 0, items: [], ...o,
});

const ctx: GameContext = {
  source: 'ingame', phase: 'InProgress', side: 'blue',
  myTeam: [slot('Darius', 'TOP'), slot('Jinx', 'BOTTOM', true)],
  enemyTeam: [slot('Teemo', 'TOP'), slot('Draven', 'BOTTOM')],
};
const analysis = analyzeGame(catalog, ctx);

describe('computeEconomy', () => {
  const live = {
    myGold: 1800,
    ally: [stats({ items: [{ id: 3031, count: 1 }, { id: 3006, count: 1 }], cs: 150, level: 11 }), stats({ items: [{ id: 1055, count: 2 }] })],
    enemy: [stats({ items: [{ id: 1055, count: 1 }], cs: 120, level: 10 }), stats({ kills: 7, deaths: 1, items: [{ id: 6672, count: 1 }], level: 12, isDead: true, respawnTimer: 30 })],
  };
  const e = computeEconomy(live, analysis, prices, 21 * 60, []);

  it('values inventories with total item costs', () => {
    expect(e.ally[0].itemGold).toBe(4550);
    expect(e.ally[1].itemGold).toBe(900);
    expect(e.allyGold).toBe(5450);
    expect(e.enemyGold).toBe(3550);
    expect(e.goldDiff).toBe(1900);
    expect(e.ally[0].completedItems).toEqual(["Lame d'infini"]);
  });

  it('computes lane diffs', () => {
    const top = e.lanes.find((l) => l.role === 'TOP')!;
    expect(top).toMatchObject({ goldDiff: 4100, csDiff: 30, levelDiff: 1, isMyLane: false });
    const bot = e.lanes.find((l) => l.role === 'BOTTOM')!;
    expect(bot.isMyLane).toBe(true);
    expect(bot.goldDiff).toBe(900 - 3100);
  });

  it('gives advice: fed enemy, my lane deficit, unspent gold', () => {
    const titles = e.advice.map((a) => a.title).join(' | ');
    expect(titles).toMatch(/Draven est fed \(7\/1\/0\)/);
    expect(titles).toMatch(/Tu es en retard sur Draven/);
    expect(titles).toMatch(/1800 or non dépensé/);
  });

  it('falls back to client prices for unknown items', () => {
    const x = computeEconomy({ myGold: null, ally: [stats({ items: [{ id: 9999, count: 2, price: 300 }] })], enemy: [] }, analysis, {}, 60, []);
    expect(x.ally[0].itemGold).toBe(600);
  });

  it('alerts when an enemy completes an item', () => {
    const before = computeEconomy({ ...live, enemy: [live.enemy[0], stats({ items: [{ id: 1055, count: 1 }] })] }, analysis, prices, 600, []);
    const alerts = newItemAlerts(before, e);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].text).toMatch(/Draven a terminé Briseur de Kraken \(1er objet\)/);
    expect(newItemAlerts(e, e)).toEqual([]);
  });

  it('formats gold', () => {
    expect(formatGold(3200)).toBe('+3,2k');
    expect(formatGold(-450)).toBe('−450');
  });
});

describe('parseLiveGame scoreboard', () => {
  it('extracts levels, scores, items and my gold', () => {
    const c = parseLiveGame(
      {
        activePlayer: { riotId: 'Moi#EUW', currentGold: 812.5 },
        allPlayers: [
          { championName: 'Ahri', rawChampionName: 'game_character_displayname_Ahri', team: 'ORDER', riotId: 'Moi#EUW', level: 7,
            scores: { kills: 2, deaths: 1, assists: 3, creepScore: 64, wardScore: 4 }, items: [{ itemID: 1056, count: 1, price: 400 }] },
          { championName: 'Zed', rawChampionName: 'game_character_displayname_Zed', team: 'CHAOS', riotId: 'X#EUW', isDead: true, respawnTimer: 12.5 },
        ],
        gameData: { gameTime: 500 },
      },
      catalog,
    )!;
    expect(c.liveStats!.myGold).toBe(812.5);
    expect(c.liveStats!.ally[0]).toMatchObject({ level: 7, kills: 2, deaths: 1, assists: 3, cs: 64, items: [{ id: 1056, count: 1, price: 400 }] });
    expect(c.liveStats!.enemy[0]).toMatchObject({ isDead: true, respawnTimer: 12.5, level: 1, items: [] });
  });
});

describe('Claude.ai prompt with live situation', () => {
  it('appends economy and lane stats during a game', async () => {
    const { buildClaudeAiPrompt } = await import('../src/shared/aiPrompt');
    const e = computeEconomy(
      { myGold: 900, ally: [stats({ items: [{ id: 3031, count: 1 }] }), stats({})], enemy: [stats({}), stats({ kills: 3 })] },
      analysis, prices, 754, [],
    );
    const text = buildClaudeAiPrompt(analysis, ctx, e);
    expect(text).toMatch(/Situation en direct à 12:34/);
    expect(text).toMatch(/écart \+3450/);
    expect(text).toMatch(/ADC : Jinx .* ← MOI/);
    expect(buildClaudeAiPrompt(analysis, ctx)).not.toMatch(/Situation en direct/);
  });
});
