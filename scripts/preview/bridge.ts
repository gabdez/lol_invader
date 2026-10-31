// Dev-only: mock of the Electron preload bridge so the UI can be previewed in a normal browser
// with the real analysis engine and a simulated champion select.
import { analyzeGame } from '../../src/shared/analysis';
import { ChampionCatalog } from '../../src/shared/catalog';
import { findCurated } from '../../src/shared/champions';
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
  setTimeout(() => emit('live', { gameTime: 7 * 60 + 25, objectives: [{ type: 'dragon', time: 330, killerTeam: 'enemy' }] }), 100);
}
