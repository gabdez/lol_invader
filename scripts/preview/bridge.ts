// Dev-only: mock of the Electron preload bridge so the UI can be previewed in a normal browser
// with the real analysis engine and a simulated champion select.
import { analyzeGame } from '../../src/shared/analysis';
import { ChampionCatalog } from '../../src/shared/catalog';
import { findCurated } from '../../src/shared/champions';
import { computeEconomy, newItemAlerts, type ItemPrices } from '../../src/shared/economy';
import { applyRoleOverrides, countOverrides, emptyOverrides } from '../../src/shared/roles';
import type { GameContext, PlayerSlot, Role, Settings } from '../../src/shared/types';

const catalog = ChampionCatalog.offline();
const listeners: Record<string, ((p: unknown) => void)[]> = {};
const on = (ch: string) => (cb: (p: unknown) => void) => {
  (listeners[ch] ??= []).push(cb);
  return () => undefined;
};
const emit = (ch: string, p: unknown) => (listeners[ch] ?? []).forEach((cb) => cb(p));

const slot = (name: string, role: Role | null, me = false, locked = true): PlayerSlot => ({
  championId: findCurated(name)!.key, role, roleSource: role ? 'assigned' : 'inferred', isLocalPlayer: me, locked,
});
const ctx: GameContext = {
  source: 'champselect', phase: 'ChampSelect', side: 'blue',
  myTeam: [slot('Darius', 'TOP'), slot('LeeSin', 'JUNGLE'), slot('Orianna', 'MIDDLE', true), slot('Jinx', 'BOTTOM'), slot('Lulu', 'UTILITY', false, false)],
  enemyTeam: ['Teemo', 'Hecarim', 'Zed', 'Draven', 'Leona'].map((n) => slot(n, null)),
};
const params = new URLSearchParams(location.search);
const withGame = params.has('auto');
let overrides = emptyOverrides();
const autoPayload = () => {
  const c = applyRoleOverrides(ctx, overrides);
  return { context: c, analysis: analyzeGame(catalog, c), overrideCount: countOverrides(overrides) };
};
let settings: Settings = { anthropicApiKey: '', aiAutoRun: true, focusOnChampSelect: true, leagueInstallPath: '' };

(window as any).lol = {
  getState: async () => ({
    status: { client: 'connected', liveGame: params.has('live'), phase: params.has('live') ? 'InProgress' : withGame ? 'ChampSelect' : 'None' },
    auto: withGame ? autoPayload() : null,
    catalog: { version: null, champions: catalog.list() },
  }),
  analyzeManual: async (c: GameContext) => analyzeGame(catalog, c),
  runAi: async () => {
    setTimeout(() => emit('ai', { requestId: 1, type: 'start' }), 10);
    setTimeout(() => emit('ai', { requestId: 1, type: 'delta', text: '## Résumé de la game\n- Draft **simulée** (aperçu)\n- Point 2\n## Mon plan\nTexte.' }), 30);
    setTimeout(() => emit('ai', { requestId: 1, type: 'done' }), 50);
    return 1;
  },
  cancelAi: async () => undefined,
  copyText: async (t: string) => { (window as any).__copied = t; },
  openClaude: async () => { (window as any).__opened = true; },
  setRoles: async (assign: any) => {
    const toMap = (l: { championId: number; role: Role }[]) => Object.fromEntries(l.map((x) => [x.championId, x.role]));
    if (assign.ally) overrides.ally = toMap(assign.ally);
    if (assign.enemy) overrides.enemy = toMap(assign.enemy);
    return autoPayload();
  },
  resetRoles: async () => {
    overrides = emptyOverrides();
    return autoPayload();
  },
  getSettings: async () => settings,
  saveSettings: async (s: Settings) => { settings = s; return true; },
  onStatus: on('status'), onAnalysis: on('analysis'), onLive: on('live'), onAi: on('ai'), onCatalog: on('catalog'),
};
if (params.has('live')) {
  // Simulated scoreboard so the live tab can be previewed.
  const prices: ItemPrices = {
    1055: { name: 'Lame de Doran', total: 450, final: false },
    1056: { name: 'Anneau de Doran', total: 400, final: false },
    3031: { name: "Lame d'infini", total: 3450, final: true },
    3006: { name: 'Jambières du berzerker', total: 1100, final: true },
    6672: { name: 'Briseur de Kraken', total: 3100, final: true },
    3089: { name: 'Coiffe de Rabadon', total: 3600, final: true },
    3157: { name: 'Sablier de Zhonya', total: 3250, final: true },
    3068: { name: 'Égide solaire', total: 2700, final: true },
    1037: { name: 'Pioche', total: 875, final: false },
  };
  const st = (level: number, k: number, d: number, a: number, cs: number, items: number[], dead = 0) => ({
    level, kills: k, deaths: d, assists: a, cs, wardScore: 10, isDead: dead > 0, respawnTimer: dead,
    items: items.map((id) => ({ id, count: 1 })),
  });
  const before = {
    myGold: 1650,
    ally: [st(13, 3, 2, 4, 160, [3068, 3006]), st(12, 2, 3, 8, 120, [6672]), st(13, 4, 1, 5, 175, [3089, 1056]), st(11, 2, 2, 3, 150, [3031, 1037]), st(10, 0, 3, 9, 30, [3006])],
    enemy: [st(12, 1, 3, 2, 140, [1056, 1037]), st(13, 5, 2, 6, 125, [6672, 3006]), st(14, 8, 1, 3, 180, [3157, 3089], 28), st(12, 4, 2, 2, 160, [1037, 1055, 3006]), st(10, 1, 2, 10, 25, [3006])],
  };
  const after = { ...before, enemy: [...before.enemy.slice(0, 3), st(12, 4, 2, 2, 165, [6672, 3006]), before.enemy[4]] };
  const analysis = analyzeGame(catalog, ctx);
  const objectives = [{ type: 'dragon' as const, time: 330, killerTeam: 'enemy' as const }, { type: 'grubs' as const, time: 500, killerTeam: 'ally' as const }];
  const e1 = computeEconomy(before, analysis, prices, 19 * 60 + 5, objectives);
  const e2 = computeEconomy(after, analysis, prices, 19 * 60 + 12, objectives);
  const alerts = newItemAlerts(e1, e2);
  setTimeout(() => emit('live', { gameTime: 19 * 60 + 12, objectives, economy: e2, alerts }), 100);
}
