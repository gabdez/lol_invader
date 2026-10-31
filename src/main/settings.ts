import { app, safeStorage } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Settings } from '../shared/types';

const DEFAULTS: Settings = {
  anthropicApiKey: '',
  aiAutoRun: true,
  focusOnChampSelect: true,
  leagueInstallPath: '',
};

interface StoredSettings extends Omit<Settings, 'anthropicApiKey'> {
  /** API key, encrypted with the OS keychain (DPAPI on Windows) when available. */
  apiKeyEnc?: string;
  apiKeyPlain?: string;
}

function file(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(readFileSync(file(), 'utf8')) as Partial<StoredSettings>;
    let key = raw.apiKeyPlain ?? '';
    if (raw.apiKeyEnc && safeStorage.isEncryptionAvailable()) {
      key = safeStorage.decryptString(Buffer.from(raw.apiKeyEnc, 'base64'));
    }
    return {
      anthropicApiKey: key,
      aiAutoRun: raw.aiAutoRun ?? DEFAULTS.aiAutoRun,
      focusOnChampSelect: raw.focusOnChampSelect ?? DEFAULTS.focusOnChampSelect,
      leagueInstallPath: raw.leagueInstallPath ?? DEFAULTS.leagueInstallPath,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: Settings): void {
  const stored: StoredSettings = {
    aiAutoRun: s.aiAutoRun,
    focusOnChampSelect: s.focusOnChampSelect,
    leagueInstallPath: s.leagueInstallPath.trim(),
  };
  const key = s.anthropicApiKey.trim();
  if (key) {
    if (safeStorage.isEncryptionAvailable()) stored.apiKeyEnc = safeStorage.encryptString(key).toString('base64');
    else stored.apiKeyPlain = key;
  }
  writeFileSync(file(), JSON.stringify(stored, null, 2));
}
