// Minimal client for the League Client Update (LCU) API: HTTPS requests + WAMP websocket events.

import { EventEmitter } from 'node:events';
import https from 'node:https';
import WebSocket from 'ws';
import type { LcuCredentials } from './credentials';

// The LoL client and the in-game API serve a self-signed Riot certificate on 127.0.0.1 only.
// This agent is used exclusively for those loopback requests.
export const localRiotAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });

export function localGetJson<T>(url: string, auth?: string, timeoutMs = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    if (u.hostname !== '127.0.0.1') {
      reject(new Error('Only loopback requests are allowed'));
      return;
    }
    const req = https.request(
      {
        host: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: 'GET',
        agent: localRiotAgent,
        headers: { Accept: 'application/json', ...(auth ? { Authorization: auth } : {}) },
        timeout: timeoutMs,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if ((res.statusCode ?? 500) >= 400) {
            reject(new Error(`HTTP ${res.statusCode} ${u.pathname}`));
            return;
          }
          try {
            resolve(JSON.parse(body) as T);
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end();
  });
}

export const LCU_EVENTS = {
  champSelect: '/lol-champ-select/v1/session',
  gameflowPhase: '/lol-gameflow/v1/gameflow-phase',
};

export interface LcuEvent {
  uri: string;
  eventType: 'Create' | 'Update' | 'Delete';
  data: unknown;
}

export class LcuConnection extends EventEmitter {
  private ws: WebSocket | null = null;
  private readonly auth: string;

  constructor(readonly creds: LcuCredentials) {
    super();
    this.auth = `Basic ${Buffer.from(`riot:${creds.password}`).toString('base64')}`;
  }

  get<T>(path: string): Promise<T> {
    return localGetJson<T>(`https://127.0.0.1:${this.creds.port}${path}`, this.auth);
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`wss://127.0.0.1:${this.creds.port}/`, 'wamp', {
        headers: { Authorization: this.auth },
        // Loopback only (127.0.0.1): the client uses a self-signed Riot certificate.
        rejectUnauthorized: false,
      });
      this.ws = ws;
      ws.on('open', () => {
        for (const uri of Object.values(LCU_EVENTS)) {
          const event = `OnJsonApiEvent${uri.replace(/\//g, '_')}`;
          ws.send(JSON.stringify([5, event]));
        }
        resolve();
      });
      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (Array.isArray(msg) && msg[0] === 8 && msg[2]) this.emit('event', msg[2] as LcuEvent);
        } catch {
          // ignore non JSON frames
        }
      });
      ws.on('error', (err) => {
        this.emit('error', err);
        reject(err);
      });
      ws.on('close', () => {
        this.ws = null;
        this.emit('close');
      });
    });
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
  }
}
