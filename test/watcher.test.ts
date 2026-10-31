// Integration test: a fake League client (HTTPS + WAMP websocket with a self-signed
// certificate, discovered through a lockfile) drives the GameWatcher end to end.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import https from 'node:https';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocketServer } from 'ws';
import { GameWatcher } from '../src/main/watcher';
import { ChampionCatalog } from '../src/shared/catalog';
import type { GameContext } from '../src/shared/types';

let hasOpenssl = true;
try {
  execFileSync('openssl', ['version']);
} catch {
  hasOpenssl = false;
}

const PASSWORD = 'test-token';
const session = (enemyChamp: number) => ({
  localPlayerCellId: 0,
  myTeam: [{ cellId: 0, championId: 103, assignedPosition: 'middle', team: 1 }],
  theirTeam: [{ cellId: 5, championId: enemyChamp, assignedPosition: '', team: 2 }],
  actions: [[{ actorCellId: 0, championId: 103, completed: true, type: 'pick' }]],
});

describe.skipIf(!hasOpenssl)('GameWatcher with a fake League client', () => {
  let server: https.Server;
  let dir: string;
  const subscriptions: string[] = [];
  let pushEvent: (data: unknown) => void = () => undefined;

  beforeAll(async () => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'lcu-'));
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-subj', '/CN=127.0.0.1', '-days', '1',
      '-keyout', path.join(dir, 'key.pem'), '-out', path.join(dir, 'cert.pem')], { stdio: 'ignore' });
    const auth = `Basic ${Buffer.from(`riot:${PASSWORD}`).toString('base64')}`;
    server = https.createServer(
      { key: readFileSync(path.join(dir, 'key.pem')), cert: readFileSync(path.join(dir, 'cert.pem')) },
      (req, res) => {
        if (req.headers.authorization !== auth) {
          res.writeHead(401).end();
          return;
        }
        const routes: Record<string, unknown> = {
          '/lol-gameflow/v1/gameflow-phase': 'ChampSelect',
          '/lol-champ-select/v1/session': session(17),
          '/lol-summoner/v1/current-summoner': { puuid: 'me' },
        };
        if (!(req.url! in routes)) {
          res.writeHead(404).end();
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(routes[req.url!]));
      },
    );
    const wss = new WebSocketServer({ server });
    wss.on('connection', (ws, req) => {
      if (req.headers.authorization !== auth) ws.close();
      ws.on('message', (m) => subscriptions.push(JSON.parse(m.toString())[1]));
      pushEvent = (data) =>
        ws.send(JSON.stringify([8, 'OnJsonApiEvent_lol-champ-select_v1_session', { uri: '/lol-champ-select/v1/session', eventType: 'Update', data }]));
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const port = (server.address() as AddressInfo).port;
    writeFileSync(path.join(dir, 'lockfile'), `LeagueClient:1:${port}:${PASSWORD}:https`);
  });

  afterAll(() => {
    server.closeAllConnections();
    server.close();
  });

  it('connects, follows champ select and reacts to websocket picks', async () => {
    const catalog = ChampionCatalog.offline();
    const watcher = new GameWatcher(() => catalog, () => dir);
    const contexts: GameContext[] = [];
    const phases: string[] = [];
    watcher.on('context', (c) => contexts.push(c));
    watcher.on('status', (s) => phases.push(s.phase));
    watcher.start();
    try {
      await expect.poll(() => contexts.length, { timeout: 8000 }).toBeGreaterThan(0);
      expect(phases).toContain('ChampSelect');
      expect(contexts[0].myTeam[0]).toMatchObject({ championId: 103, role: 'MIDDLE', isLocalPlayer: true, locked: true });
      expect(contexts[0].enemyTeam[0].championId).toBe(17);
      expect(subscriptions).toContain('OnJsonApiEvent_lol-champ-select_v1_session');

      pushEvent(session(238));
      await expect.poll(() => contexts.at(-1)?.enemyTeam[0].championId, { timeout: 3000 }).toBe(238);
    } finally {
      watcher.stop();
    }
  }, 15000);
});
