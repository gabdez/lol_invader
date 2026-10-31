// Discovery of the League Client (LCU) port + auth token.
// 1) Command line of the running LeagueClientUx.exe process (works wherever the game is installed)
// 2) lockfile in the install directory (configured path, then common defaults)

import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface LcuCredentials {
  port: number;
  password: string;
}

/** lockfile format: "LeagueClient:<pid>:<port>:<password>:https" */
export function parseLockfile(content: string): LcuCredentials | null {
  const parts = content.trim().split(':');
  if (parts.length < 5) return null;
  const port = Number(parts[2]);
  if (!Number.isInteger(port) || !parts[3]) return null;
  return { port, password: parts[3] };
}

export function parseCommandLine(cmd: string): LcuCredentials | null {
  const port = /--app-port=(\d+)/.exec(cmd)?.[1];
  const password = /--remoting-auth-token=([\w-]+)/.exec(cmd)?.[1];
  if (!port || !password) return null;
  return { port: Number(port), password };
}

function readProcessCommandLine(): Promise<string> {
  if (process.platform !== 'win32') return Promise.resolve('');
  const script =
    "Get-CimInstance Win32_Process -Filter \"Name='LeagueClientUx.exe'\" | Select-Object -ExpandProperty CommandLine";
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, timeout: 5000 },
      (err, stdout) => resolve(err ? '' : stdout),
    );
  });
}

const DEFAULT_INSTALL_DIRS = [
  'C:\\Riot Games\\League of Legends',
  'D:\\Riot Games\\League of Legends',
  'C:\\Program Files\\Riot Games\\League of Legends',
  'E:\\Riot Games\\League of Legends',
];

export async function findCredentials(installPath?: string): Promise<LcuCredentials | null> {
  const fromProcess = parseCommandLine(await readProcessCommandLine());
  if (fromProcess) return fromProcess;

  const dirs = [installPath, ...DEFAULT_INSTALL_DIRS].filter((d): d is string => !!d);
  for (const dir of dirs) {
    try {
      const creds = parseLockfile(await readFile(path.join(dir, 'lockfile'), 'utf8'));
      if (creds) return creds;
    } catch {
      // not there, try next
    }
  }
  return null;
}
