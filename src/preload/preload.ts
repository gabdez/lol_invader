import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

function on<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_e: IpcRendererEvent, payload: T) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api = {
  getState: () => ipcRenderer.invoke('state:get'),
  analyzeManual: (ctx: unknown) => ipcRenderer.invoke('manual:analyze', ctx),
  runAi: (ctx: unknown) => ipcRenderer.invoke('ai:run', ctx),
  cancelAi: () => ipcRenderer.invoke('ai:cancel'),
  copyText: (text: string) => ipcRenderer.invoke('clipboard:write', text),
  openClaude: () => ipcRenderer.invoke('open:claude'),
  setRoles: (assign: unknown) => ipcRenderer.invoke('roles:set', assign),
  resetRoles: () => ipcRenderer.invoke('roles:reset'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (s: unknown) => ipcRenderer.invoke('settings:save', s),
  onStatus: (cb: (p: unknown) => void) => on('status', cb),
  onAnalysis: (cb: (p: unknown) => void) => on('analysis', cb),
  onLive: (cb: (p: unknown) => void) => on('live', cb),
  onAi: (cb: (p: unknown) => void) => on('ai', cb),
  onCatalog: (cb: (p: unknown) => void) => on('catalog', cb),
};

contextBridge.exposeInMainWorld('lol', api);
