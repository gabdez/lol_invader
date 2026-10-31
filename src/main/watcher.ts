// Watches the League client and the game, and emits a GameContext whenever the draft or game changes.
//  - LCU websocket: champ select updates in real time (picks, hovers, locks)
//  - Gameflow session: loading screen
//  - Live Client Data API (port 2999): in-game data (works even without the client API)

import { EventEmitter } from 'node:events';
import type { ChampionCatalog } from '../shared/catalog';
import { parseChampSelect, parseGameflowSession, parseLiveGame, type ChampSelectSession, type GameflowSession, type LiveGameData } from '../shared/parsers';
import type { ConnectionStatus, GameContext, GamePhase } from '../shared/types';
import { findCredentials } from './credentials';
import { LCU_EVENTS, LcuConnection, localGetJson, type LcuEvent } from './lcu';

const LIVE_URL = 'https://127.0.0.1:2999/liveclientdata/allgamedata';
const IN_GAME_PHASES: GamePhase[] = ['GameStart', 'InProgress'];

export interface WatcherEvents {
  status: [ConnectionStatus];
  context: [GameContext];
  champSelectStart: [];
}

export class GameWatcher extends EventEmitter<WatcherEvents> {
  private lcu: LcuConnection | null = null;
  private phase: GamePhase = 'Disconnected';
  private liveOk = false;
  private myPuuid: string | null = null;
  private timer: NodeJS.Timeout | null = null;
  private busy = false;
  private lastSearch = 0;

  constructor(
    private readonly getCatalog: () => ChampionCatalog,
    private readonly getInstallPath: () => string,
  ) {
    super();
  }

  start(): void {
    void this.tick();
    this.timer = setInterval(() => void this.tick(), 2000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.lcu?.close();
  }

  status(): ConnectionStatus {
    return { client: this.lcu ? 'connected' : 'searching', liveGame: this.liveOk, phase: this.phase };
  }

  private emitStatus(): void {
    this.emit('status', this.status());
  }

  private async tick(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      if (!this.lcu && Date.now() - this.lastSearch > 4000) {
        this.lastSearch = Date.now();
        await this.tryConnect();
      }
      if (this.lcu) {
        const phase = await this.lcu.get<string>(LCU_EVENTS.gameflowPhase).catch(() => null);
        if (phase) await this.setPhase(phase as GamePhase);
      }
      if (!this.lcu || IN_GAME_PHASES.includes(this.phase)) await this.pollLive();
      else if (this.liveOk) {
        this.liveOk = false;
        this.emitStatus();
      }
    } catch (err) {
      console.warn('[watcher]', (err as Error).message);
    } finally {
      this.busy = false;
    }
  }

  private async tryConnect(): Promise<void> {
    const creds = await findCredentials(this.getInstallPath());
    if (!creds) return;
    const lcu = new LcuConnection(creds);
    lcu.on('event', (e: LcuEvent) => void this.onLcuEvent(e));
    lcu.on('error', (err: Error) => console.warn('[lcu]', err.message));
    lcu.on('close', () => {
      if (this.lcu === lcu) {
        this.lcu = null;
        this.phase = 'Disconnected';
        this.emitStatus();
      }
    });
    try {
      await lcu.connect();
    } catch {
      return; // client still starting up, retry on next tick
    }
    this.lcu = lcu;
    const me = await lcu.get<{ puuid?: string }>('/lol-summoner/v1/current-summoner').catch(() => null);
    this.myPuuid = me?.puuid ?? null;
    this.phase = 'None';
    this.emitStatus();
  }

  private async onLcuEvent(e: LcuEvent): Promise<void> {
    if (e.uri === LCU_EVENTS.gameflowPhase && typeof e.data === 'string') {
      await this.setPhase(e.data as GamePhase);
    } else if (e.uri === LCU_EVENTS.champSelect && e.eventType !== 'Delete' && e.data) {
      this.emit('context', parseChampSelect(e.data as ChampSelectSession));
    }
  }

  private async setPhase(phase: GamePhase): Promise<void> {
    if (phase === this.phase) return;
    this.phase = phase;
    this.emitStatus();
    if (!this.lcu) return;
    if (phase === 'ChampSelect') {
      this.emit('champSelectStart');
      const session = await this.lcu.get<ChampSelectSession>(LCU_EVENTS.champSelect).catch(() => null);
      if (session) this.emit('context', parseChampSelect(session));
    } else if (IN_GAME_PHASES.includes(phase) && !this.liveOk) {
      const session = await this.lcu.get<GameflowSession>('/lol-gameflow/v1/session').catch(() => null);
      const ctx = session && parseGameflowSession(session, this.myPuuid);
      if (ctx) this.emit('context', ctx);
    }
  }

  private async pollLive(): Promise<void> {
    const data = await localGetJson<LiveGameData>(LIVE_URL, undefined, 1500).catch(() => null);
    const ctx = data ? parseLiveGame(data, this.getCatalog()) : null;
    const ok = !!ctx && ctx.myTeam.length > 0;
    if (ok !== this.liveOk) {
      this.liveOk = ok;
      if (!this.lcu) this.phase = ok ? 'InProgress' : 'Disconnected';
      this.emitStatus();
    }
    if (ctx && ok) this.emit('context', ctx);
  }
}
