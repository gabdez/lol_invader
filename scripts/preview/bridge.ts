// Dev-only: mock of the Electron preload bridge so the UI can be previewed in a normal browser
// with the real analysis engine and a simulated champion select.
import { analyzeGame } from '../../src/shared/analysis';
import { ChampionCatalog } from '../../src/shared/catalog';
import { findCurated } from '../../src/shared/champions';
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
let settings: Settings = { anthropicApiKey: '', aiAutoRun: true, focusOnChampSelect: true, leagueInstallPath: '' };

(window as any).lol = {
  getState: async () => ({
    status: { client: 'connected', liveGame: params.has('live'), phase: params.has('live') ? 'InProgress' : withGame ? 'ChampSelect' : 'None' },
    auto: withGame ? { context: ctx, analysis: analyzeGame(catalog, ctx) } : null,
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
  getSettings: async () => settings,
  saveSettings: async (s: Settings) => { settings = s; return true; },
  onStatus: on('status'), onAnalysis: on('analysis'), onLive: on('live'), onAi: on('ai'), onCatalog: on('catalog'),
};
if (params.has('live')) {
  setTimeout(() => emit('live', { gameTime: 7 * 60 + 25, objectives: [{ type: 'dragon', time: 330, killerTeam: 'enemy' }] }), 100);
}
