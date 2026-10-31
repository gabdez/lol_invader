import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import { analyzeGame } from '../shared/analysis';
import { ChampionCatalog } from '../shared/catalog';
import { compositionSignature } from '../shared/parsers';
import { applyRoleOverrides, countOverrides, emptyOverrides, type RoleOverrides } from '../shared/roles';
import type { AiStreamEvent, GameAnalysis, GameContext, Role, Settings } from '../shared/types';
import { runAiAnalysis } from './ai';
import { loadCatalog } from './ddragon';
import { loadSettings, saveSettings } from './settings';
import { GameWatcher } from './watcher';

let win: BrowserWindow | null = null;
let catalog: ChampionCatalog = ChampionCatalog.offline();
let settings: Settings;
let lastAuto: { context: GameContext; analysis: GameAnalysis; overrideCount: number } | null = null;
/** Last context as reported by the client/game, before user role corrections. */
let lastRaw: GameContext | null = null;
let roleOverrides: RoleOverrides = emptyOverrides();
let lastSignature = '';
let lastAiSignature = '';
let aiRequestId = 0;
let aiAbort: AbortController | null = null;

function send(channel: string, payload: unknown): void {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#0b1016',
    title: 'LoL Invader',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  void win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  if (process.argv.includes('--dev')) win.webContents.openDevTools({ mode: 'detach' });
}

function catalogPayload() {
  return { version: catalog.version, champions: catalog.list() };
}

function startAi(context: GameContext, analysis: GameAnalysis): number {
  aiAbort?.abort();
  const requestId = ++aiRequestId;
  const emit = (e: Omit<AiStreamEvent, 'requestId'>) => send('ai', { requestId, ...e });
  if (!settings.anthropicApiKey) {
    emit({ type: 'error', text: 'Ajoute une clé API Anthropic dans les paramètres pour activer l’analyse IA.' });
    return requestId;
  }
  const abort = new AbortController();
  aiAbort = abort;
  emit({ type: 'start' });
  runAiAnalysis(settings.anthropicApiKey, analysis, context, { onDelta: (text) => emit({ type: 'delta', text }) }, abort.signal)
    .then(() => emit({ type: 'done' }))
    .catch((err: Error) => emit({ type: 'error', text: err.message }));
  return requestId;
}

function onContext(raw: GameContext): void {
  lastRaw = raw;
  if (raw.gameTime !== undefined) {
    send('live', { gameTime: raw.gameTime, objectives: raw.objectives ?? [] });
  }
  const context = applyRoleOverrides(raw, roleOverrides);
  const signature = compositionSignature(context);
  if (signature === lastSignature) return;
  lastSignature = signature;
  const analysis = analyzeGame(catalog, context);
  lastAuto = { context, analysis, overrideCount: countOverrides(roleOverrides) };
  send('analysis', lastAuto);

  // Deep AI analysis once all 10 champions are locked; re-run if champions or lanes change.
  const allLocked = analysis.complete && [...context.myTeam, ...context.enemyTeam].every((p) => p.locked);
  const lineup = [...analysis.lineup.ally, ...analysis.lineup.enemy].map((p) => `${p.id}:${p.role}`).join(',');
  if (allLocked && settings.aiAutoRun && settings.anthropicApiKey && lineup !== lastAiSignature) {
    lastAiSignature = lineup;
    startAi(context, analysis);
  }
}

/** Recomputes the analysis of the current game (after a role correction). */
function reanalyze(): void {
  lastSignature = '';
  if (lastRaw) onContext(lastRaw);
}

type RoleAssignment = { championId: number; role: Role }[];

function registerIpc(watcher: GameWatcher): void {
  ipcMain.handle('state:get', () => ({ status: watcher.status(), auto: lastAuto, catalog: catalogPayload() }));
  ipcMain.handle('manual:analyze', (_e, ctx: GameContext) => analyzeGame(catalog, ctx));
  ipcMain.handle('ai:run', (_e, ctx: GameContext) => startAi(ctx, analyzeGame(catalog, ctx)));
  ipcMain.handle('ai:cancel', () => aiAbort?.abort());
  ipcMain.handle('roles:set', (_e, assign: { ally?: RoleAssignment; enemy?: RoleAssignment }) => {
    const toMap = (list: RoleAssignment) => Object.fromEntries(list.filter((x) => x.championId > 0).map((x) => [x.championId, x.role]));
    if (assign.ally) roleOverrides.ally = toMap(assign.ally);
    if (assign.enemy) roleOverrides.enemy = toMap(assign.enemy);
    reanalyze();
    return lastAuto;
  });
  ipcMain.handle('roles:reset', () => {
    roleOverrides = emptyOverrides();
    reanalyze();
    return lastAuto;
  });
  ipcMain.handle('settings:get', () => ({ ...settings, anthropicApiKey: settings.anthropicApiKey ? '••••••••' : '' }));
  ipcMain.handle('settings:save', (_e, s: Settings) => {
    // The renderer never receives the real key back; keep it if the masked value is returned.
    const key = s.anthropicApiKey === '••••••••' ? settings.anthropicApiKey : s.anthropicApiKey;
    settings = { ...s, anthropicApiKey: key };
    saveSettings(settings);
    return true;
  });
}

app.whenReady().then(async () => {
  settings = loadSettings();
  createWindow();

  const watcher = new GameWatcher(() => catalog, () => settings.leagueInstallPath);
  watcher.on('status', (s) => send('status', s));
  watcher.on('context', onContext);
  watcher.on('champSelectStart', () => {
    lastSignature = '';
    roleOverrides = emptyOverrides(); // new game: forget previous corrections
    if (settings.focusOnChampSelect && win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.flashFrame(true);
    }
  });
  registerIpc(watcher);

  catalog = await loadCatalog(app.getPath('userData'));
  send('catalog', catalogPayload());
  watcher.start();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
