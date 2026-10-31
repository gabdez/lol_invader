import { formatTime } from '../shared/analysis/util';
import { currentPhase, upcomingObjectives } from '../shared/live';
import {
  ROLE_LABELS,
  ROLES,
  type AiStreamEvent,
  type ChampionInfo,
  type ConnectionStatus,
  type GameAnalysis,
  type GameContext,
  type GamePhase,
  type ObjectiveEvent,
  type PlayerSlot,
  type Role,
  type Settings,
} from '../shared/types';

// ---------------------------------------------------------------------------
// Bridge typing
// ---------------------------------------------------------------------------

interface CatalogPayload {
  version: string | null;
  champions: ChampionInfo[];
}
interface AutoPayload {
  context: GameContext;
  analysis: GameAnalysis;
}
interface LivePayload {
  gameTime: number;
  objectives: ObjectiveEvent[];
}
interface LolApi {
  getState(): Promise<{ status: ConnectionStatus; auto: AutoPayload | null; catalog: CatalogPayload }>;
  analyzeManual(ctx: GameContext): Promise<GameAnalysis>;
  runAi(ctx: GameContext): Promise<number>;
  cancelAi(): Promise<void>;
  getSettings(): Promise<Settings>;
  saveSettings(s: Settings): Promise<boolean>;
  onStatus(cb: (s: ConnectionStatus) => void): () => void;
  onAnalysis(cb: (p: AutoPayload) => void): () => void;
  onLive(cb: (p: LivePayload) => void): () => void;
  onAi(cb: (e: AiStreamEvent) => void): () => void;
  onCatalog(cb: (c: CatalogPayload) => void): () => void;
}
declare global {
  interface Window {
    lol: LolApi;
  }
}
const api = window.lol;
let lastLiveRefresh = -1;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

type Tab = 'plan' | 'matchups' | 'compo' | 'timeline' | 'ai';
const TABS: { id: Tab; label: string }[] = [
  { id: 'plan', label: 'Mon plan' },
  { id: 'matchups', label: 'Match-ups' },
  { id: 'compo', label: 'Compositions' },
  { id: 'timeline', label: 'Moments clés' },
  { id: 'ai', label: 'Analyse IA' },
];

interface ManualRow {
  name: string;
  role: Role | '';
}
interface ManualDraft {
  ally: ManualRow[];
  enemy: ManualRow[];
  me: number;
}

const state = {
  mode: 'auto' as 'auto' | 'manual',
  tab: 'plan' as Tab,
  catalog: { version: null, champions: [] } as CatalogPayload,
  status: { client: 'searching', liveGame: false, phase: 'Disconnected' } as ConnectionStatus,
  auto: null as AutoPayload | null,
  live: null as LivePayload | null,
  manual: loadManualDraft(),
  manualAnalysis: null as GameAnalysis | null,
  ai: { requestId: 0, status: 'idle' as 'idle' | 'running' | 'done' | 'error', text: '', error: '' },
};

function loadManualDraft(): ManualDraft {
  try {
    const raw = JSON.parse(localStorage.getItem('manualDraft') ?? '');
    if (raw?.ally?.length === 5 && raw?.enemy?.length === 5) return raw as ManualDraft;
  } catch {
    // default below
  }
  return {
    ally: ROLES.map((role) => ({ name: '', role })),
    enemy: ROLES.map(() => ({ name: '', role: '' as const })),
    me: 0,
  };
}

function currentAnalysis(): GameAnalysis | null {
  return state.mode === 'auto' ? (state.auto?.analysis ?? null) : state.manualAnalysis;
}

function currentContext(): GameContext | null {
  return state.mode === 'auto' ? (state.auto?.context ?? null) : manualContext();
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

type Child = Node | string | null | undefined | false;
function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> = {},
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = String(v);
    // CSSOM (not the style attribute) so the strict Content-Security-Policy allows it.
    else if (k === 'style') el.style.cssText = String(v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k in el && typeof v !== 'string') (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, String(v));
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

const $ = (id: string) => document.getElementById(id)!;

function list(items: string[], empty = 'Rien de particulier.'): HTMLElement {
  if (!items.length) return h('p', { class: 'muted' }, empty);
  return h('ul', {}, items.map((i) => h('li', {}, i)));
}

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

function findChampion(name: string): ChampionInfo | undefined {
  const n = norm(name);
  if (!n) return undefined;
  return state.catalog.champions.find((c) => norm(c.name) === n || norm(c.id) === n);
}

function avatar(id: string, name: string): HTMLElement {
  const info = state.catalog.champions.find((c) => c.id === id);
  if (info && state.catalog.version) {
    return h(
      'div',
      { class: 'avatar' },
      h('img', { src: `https://ddragon.leagueoflegends.com/cdn/${state.catalog.version}/img/champion/${info.image}`, alt: name }),
    );
  }
  return h('div', { class: 'avatar' }, name ? name.slice(0, 2) : '?');
}

// ---------------------------------------------------------------------------
// Status bar
// ---------------------------------------------------------------------------

const PHASE_LABELS: Record<GamePhase, string> = {
  Disconnected: 'Client LoL non détecté',
  None: 'Client ouvert',
  Lobby: 'Dans le salon',
  Matchmaking: 'Recherche de partie',
  ReadyCheck: 'Partie trouvée',
  ChampSelect: 'Sélection des champions',
  GameStart: 'Chargement',
  InProgress: 'En partie',
  WaitingForStats: 'Fin de partie',
  EndOfGame: 'Fin de partie',
  Manual: 'Mode manuel',
};

function renderStatus(): void {
  const s = state.status;
  const pill = (on: boolean, text: string) => h('span', { class: `pill${on ? ' on' : ''}` }, h('span', { class: 'dot' }), text);
  const pills = [
    pill(s.client === 'connected', s.client === 'connected' ? 'Client connecté' : 'Recherche du client…'),
    pill(s.phase !== 'Disconnected' && s.phase !== 'None', PHASE_LABELS[s.phase] ?? s.phase),
  ];
  if (s.liveGame) pills.push(pill(true, 'Données de partie en direct'));
  $('status').replaceChildren(...pills);
}

// ---------------------------------------------------------------------------
// Draft
// ---------------------------------------------------------------------------

function versusBlock(a: GameAnalysis | null): HTMLElement {
  const ctx = currentContext();
  return h(
    'div',
    { class: 'versus', id: 'versus' },
    h('div', { class: 'vs' }, 'VS'),
    a && a.ally.champions.length
      ? h('div', { class: 'identity' }, h('b', {}, a.ally.identity), 'votre identité')
      : null,
    a && a.enemy.champions.length
      ? h('div', { class: 'identity' }, h('b', {}, a.enemy.identity), 'identité adverse')
      : null,
    ctx?.side ? h('div', { class: 'side' }, ctx.side === 'blue' ? 'Côté bleu' : 'Côté rouge') : null,
    a && !a.complete ? h('div', { class: 'side' }, 'Analyse provisoire : draft incomplète') : null,
  );
}

function renderAutoDraft(): void {
  const a = state.auto?.analysis ?? null;
  const ctx = state.auto?.context;
  const row = (
    p: { name: string; id: string; role: Role | null; locked: boolean; isLocalPlayer?: boolean },
    slot: PlayerSlot | undefined,
  ) =>
    h(
      'div',
      { class: `player${p.isLocalPlayer ? ' me' : ''}${!p.locked ? ' pending' : ''}` },
      avatar(p.id, p.name),
      h(
        'div',
        { class: 'who' },
        h('div', { class: 'name' }, p.name || 'En attente…'),
        h(
          'div',
          { class: 'role' },
          p.role ? `${ROLE_LABELS[p.role]}${slot?.roleSource === 'inferred' ? ' (déduit)' : ''}` : 'Rôle inconnu',
        ),
      ),
      p.isLocalPlayer ? h('span', { class: 'badge gold' }, 'VOUS') : null,
      p.name && !p.locked ? h('span', { class: 'badge' }, 'intention') : null,
    );
  const allyRows = a ? a.lineup.ally.map((p, i) => row(p, ctx?.myTeam[i])) : [];
  const enemyRows = a ? a.lineup.enemy.map((p, i) => row(p, ctx?.enemyTeam[i])) : [];
  $('draft').replaceChildren(
    h('div', { class: 'team ally' }, h('h3', {}, 'Votre équipe'), allyRows.length ? allyRows : h('p', { class: 'muted' }, 'En attente de la sélection…')),
    versusBlock(a),
    h('div', { class: 'team enemy' }, h('h3', {}, 'Équipe adverse'), enemyRows.length ? enemyRows : h('p', { class: 'muted' }, 'En attente de la sélection…')),
  );
}

function manualContext(): GameContext {
  const toSlot = (r: ManualRow, i: number, ally: boolean): PlayerSlot => ({
    championId: findChampion(r.name)?.key ?? 0,
    role: r.role || null,
    roleSource: r.role ? 'manual' : 'inferred',
    isLocalPlayer: ally && i === state.manual.me,
    locked: true,
  });
  return {
    source: 'manual',
    phase: 'Manual',
    side: null,
    myTeam: state.manual.ally.map((r, i) => toSlot(r, i, true)),
    enemyTeam: state.manual.enemy.map((r, i) => toSlot(r, i, false)),
  };
}

let manualTimer: number | undefined;
function scheduleManualAnalysis(): void {
  localStorage.setItem('manualDraft', JSON.stringify(state.manual));
  window.clearTimeout(manualTimer);
  manualTimer = window.setTimeout(async () => {
    state.manualAnalysis = await api.analyzeManual(manualContext());
    $('versus').replaceWith(versusBlock(state.manualAnalysis));
    refreshManualAvatars();
    renderContent();
  }, 150);
}

function refreshManualAvatars(): void {
  document.querySelectorAll<HTMLElement>('[data-avatar]').forEach((el) => {
    const tag = el.dataset.avatar!;
    const [team, idx] = tag.split(':');
    const row = (team === 'ally' ? state.manual.ally : state.manual.enemy)[Number(idx)];
    const info = findChampion(row.name);
    const fresh = avatar(info?.id ?? '', info?.name ?? '');
    fresh.dataset.avatar = tag;
    el.replaceWith(fresh);
  });
}

function renderManualDraft(): void {
  const datalist = h('datalist', { id: 'champ-list' }, state.catalog.champions.map((c) => h('option', { value: c.name })));
  const roleSelect = (row: ManualRow, allowAuto: boolean) =>
    h(
      'select',
      {
        onchange: (e: Event) => {
          row.role = (e.target as HTMLSelectElement).value as Role | '';
          scheduleManualAnalysis();
        },
      },
      allowAuto ? h('option', { value: '', selected: row.role === '' }, 'Auto') : null,
      ROLES.map((r) => h('option', { value: r, selected: row.role === r }, ROLE_LABELS[r])),
    );
  const editorRow = (row: ManualRow, i: number, team: 'ally' | 'enemy') => {
    const info = findChampion(row.name);
    const av = avatar(info?.id ?? '', info?.name ?? '');
    av.dataset.avatar = `${team}:${i}`;
    return h(
      'div',
      { class: `player${team === 'ally' && state.manual.me === i ? ' me' : ''}` },
      av,
      h('input', {
        type: 'text',
        list: 'champ-list',
        value: row.name,
        placeholder: 'Champion…',
        oninput: (e: Event) => {
          row.name = (e.target as HTMLInputElement).value;
          scheduleManualAnalysis();
        },
      }),
      roleSelect(row, team === 'enemy'),
      team === 'ally'
        ? h(
            'label',
            { class: 'me-radio', title: 'C’est moi' },
            h('input', {
              type: 'radio',
              name: 'me',
              checked: state.manual.me === i,
              onchange: () => {
                state.manual.me = i;
                renderManualDraft();
                scheduleManualAnalysis();
              },
            }),
            'moi',
          )
        : null,
    );
  };
  $('draft').replaceChildren(
    datalist,
    h(
      'div',
      { class: 'team ally' },
      h('h3', {}, 'Votre équipe'),
      state.manual.ally.map((r, i) => editorRow(r, i, 'ally')),
    ),
    versusBlock(state.manualAnalysis),
    h(
      'div',
      { class: 'team enemy' },
      h('h3', {}, 'Équipe adverse'),
      state.manual.enemy.map((r, i) => editorRow(r, i, 'enemy')),
    ),
  );
}

function renderDraft(): void {
  if (state.mode === 'auto') renderAutoDraft();
  else renderManualDraft();
}

// ---------------------------------------------------------------------------
// Live in-game bar
// ---------------------------------------------------------------------------

function renderLive(): void {
  const el = $('live');
  if (state.mode !== 'auto' || !state.live || !state.status.liveGame) {
    el.classList.add('hidden');
    return;
  }
  const { gameTime, objectives } = state.live;
  el.classList.remove('hidden');
  const next = upcomingObjectives(gameTime, objectives).slice(0, 4);
  const phaseLabel = { early: 'Early game', mid: 'Mid game', late: 'Late game' }[currentPhase(gameTime)];
  el.replaceChildren(
    h('span', { class: 'clock' }, formatTime(gameTime)),
    h('span', { class: 'badge gold' }, phaseLabel),
    ...next.map((o) =>
      h(
        'span',
        { class: `chip${o.inSec <= 0 ? ' up' : o.inSec <= 60 ? ' soon' : ''}` },
        o.inSec <= 0 ? `${o.label} : disponible` : `${o.label} dans ${formatTime(o.inSec)}`,
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// Tabs & content
// ---------------------------------------------------------------------------

function renderTabs(): void {
  $('tabs').replaceChildren(
    ...TABS.map((t) =>
      h(
        'button',
        {
          class: `tab${state.tab === t.id ? ' active' : ''}`,
          type: 'button',
          onclick: () => {
            state.tab = t.id;
            renderTabs();
            renderContent();
          },
        },
        t.label,
      ),
    ),
  );
}

const SEVERITY_ICON = { info: 'ℹ️', good: '✅', warning: '⚠️', danger: '⛔' } as const;
const ADV_LABEL = { ally: 'Avantage : vous', enemy: 'Avantage : ennemi', even: 'Équilibré' } as const;

function insightsBlock(a: GameAnalysis): HTMLElement {
  return h(
    'div',
    { class: 'card' },
    h('h3', {}, 'Forces et faiblesses'),
    a.insights.length
      ? a.insights.map((i) =>
          h(
            'div',
            { class: `insight ${i.severity}` },
            h('span', { class: 'ico', 'aria-hidden': 'true' }, SEVERITY_ICON[i.severity]),
            h('div', {}, h('b', {}, i.title), i.detail),
          ),
        )
      : h('p', { class: 'muted' }, 'Pas assez de champions pour comparer les équipes.'),
  );
}

function phasesBlock(a: GameAnalysis): HTMLElement {
  const live = state.mode === 'auto' && state.status.liveGame && state.live ? currentPhase(state.live.gameTime) : null;
  return h(
    'div',
    { class: 'grid' },
    a.phases.map((p) =>
      h(
        'div',
        { class: `card phase${live === p.phase ? ' current' : ''}` },
        h('div', { class: 'score-row' }, h('h3', {}, `${p.label} · ${p.window}`), h('span', { class: `adv ${p.advantage}` }, ADV_LABEL[p.advantage])),
        list(p.actions),
      ),
    ),
  );
}

function renderPlan(a: GameAnalysis): HTMLElement {
  const p = a.plan;
  return h(
    'div',
    {},
    h('div', { class: 'card headline' }, p.headline),
    h(
      'div',
      { class: 'grid' },
      h('div', { class: 'card' }, h('h3', {}, p.role === 'JUNGLE' ? 'Duel de junglers' : 'Phase de lane'), list(p.laning, 'Matchup pas encore connu.')),
      h('div', { class: 'card' }, h('h3', {}, `Ton rôle${p.role ? ` (${ROLE_LABELS[p.role]})` : ''}`), list(p.roleTips, 'Rôle pas encore connu.')),
      h(
        'div',
        { class: 'card' },
        h('h3', {}, 'Teamfights'),
        list(p.teamfight, 'Choisis ton champion.'),
        h('h4', {}, 'Cibles prioritaires'),
        list(p.focus.map((f) => `${f.champion} — ${f.reason}`), 'Aucune pour le moment.'),
        h('h4', {}, 'Menaces principales'),
        list(p.threats.map((t) => `${t.champion} — ${t.reason}`), 'Aucune pour le moment.'),
      ),
      h('div', { class: 'card' }, h('h3', {}, 'Objets & adaptations'), list(p.build, 'Rien de spécifique.')),
    ),
    h('h3', {}, 'Plan de la partie'),
    phasesBlock(a),
    h('div', { style: 'height:14px' }),
    insightsBlock(a),
  );
}

const LANE_LABELS = { TOP: 'Top', JUNGLE: 'Jungle', MIDDLE: 'Mid', BOTTOM: 'Bot lane' } as const;

function renderMatchups(a: GameAnalysis): HTMLElement {
  if (!a.matchups.length) return h('div', { class: 'empty' }, 'Les match-ups apparaîtront quand les champions face à face seront connus.');
  const sorted = [...a.matchups].sort((x, y) => Number(y.isMyLane) - Number(x.isMyLane));
  const fmt = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}`;
  return h(
    'div',
    { class: 'grid' },
    sorted.map((m) =>
      h(
        'div',
        { class: `card${m.isMyLane ? ' my-lane' : ''}` },
        h(
          'div',
          { class: 'score-row' },
          h('h3', {}, `${LANE_LABELS[m.lane]} — ${m.allies.join(' + ')} vs ${m.enemies.join(' + ')}`),
          m.isMyLane ? h('span', { class: 'badge gold' }, 'TA LANE') : null,
        ),
        h(
          'div',
          { class: 'score-row' },
          h('span', { class: `verdict ${m.earlyScore >= 0.6 ? 'pos' : m.earlyScore <= -0.6 ? 'neg' : ''}` }, m.verdict),
          h('span', { class: 'muted' }, `Early ${fmt(m.earlyScore)} · Scaling ${fmt(m.scalingScore)}`),
        ),
        h('p', {}, m.summary),
        list(m.tips),
      ),
    ),
  );
}

const STAT_LABELS: [keyof GameAnalysis['ally']['scores'], string][] = [
  ['frontline', 'Frontline'],
  ['engage', 'Engage'],
  ['cc', 'Contrôles'],
  ['peel', 'Peel'],
  ['poke', 'Poke'],
  ['burst', 'Burst'],
  ['dps', 'DPS'],
  ['mobility', 'Mobilité'],
  ['sustain', 'Sustain'],
  ['waveclear', 'Waveclear'],
  ['split', 'Split push'],
];

function renderCompo(a: GameAnalysis): HTMLElement {
  const max = 15;
  const cmpRow = (label: string, ally: number, enemy: number) =>
    h(
      'div',
      { class: 'cmp' },
      h(
        'div',
        { class: 'side left', title: `Vous : ${ally}` },
        h('div', { class: 'track' }, h('div', { class: 'bar', style: `width:${(ally / max) * 100}%` })),
        String(ally),
      ),
      h('div', { class: 'label' }, label),
      h(
        'div',
        { class: 'side right', title: `Ennemis : ${enemy}` },
        h('div', { class: 'track' }, h('div', { class: 'bar', style: `width:${(enemy / max) * 100}%` })),
        String(enemy),
      ),
    );
  const teamCard = (title: string, p: GameAnalysis['ally'], cls: 'ally' | 'enemy') =>
    h(
      'div',
      { class: 'card' },
      h('h3', {}, `${title} — ${p.identity}`),
      h('h4', {}, 'Conditions de victoire'),
      list(p.winConditions, 'Composition incomplète.'),
      h('h4', {}, 'Profil de dégâts'),
      h(
        'div',
        { class: `split-bar ${cls}`, title: `${p.physicalPct}% physiques / ${100 - p.physicalPct}% magiques` },
        h('div', { class: 'ad', style: `width:${p.physicalPct}%` }),
        h('div', { class: 'ap', style: `width:${100 - p.physicalPct}%` }),
      ),
      h('div', { class: 'muted' }, `${p.physicalPct}% physiques · ${100 - p.physicalPct}% magiques`),
      h('h4', {}, 'Archétypes'),
      p.archetypes.slice(0, 4).map((x) => h('div', { class: 'archetype' }, h('span', {}, x.label), h('span', {}, x.score.toFixed(1)))),
      h('h4', {}, 'Courbe de puissance (1 à 3)'),
      h('div', { class: 'muted' }, `Early ${p.curve.early} · Mid ${p.curve.mid} · Late ${p.curve.late}`),
    );
  return h(
    'div',
    { class: 'grid' },
    teamCard('Votre équipe', a.ally, 'ally'),
    teamCard('Équipe adverse', a.enemy, 'enemy'),
    h(
      'div',
      { class: 'card' },
      h('h3', {}, 'Comparaison des équipes'),
      h('div', { class: 'legend' }, h('span', {}, h('i', { style: 'background:var(--ally)' }), 'Votre équipe'), h('span', {}, h('i', { style: 'background:var(--enemy)' }), 'Équipe adverse')),
      STAT_LABELS.map(([k, label]) => cmpRow(label, a.ally.scores[k], a.enemy.scores[k])),
    ),
  );
}

function renderTimeline(a: GameAnalysis): HTMLElement {
  if (!a.timeline.length) return h('div', { class: 'empty' }, 'Les moments clés apparaîtront quand les deux équipes seront connues.');
  const now = state.mode === 'auto' && state.status.liveGame && state.live ? state.live.gameTime : -1;
  return h(
    'div',
    { class: 'card' },
    h(
      'div',
      { class: 'timeline' },
      a.timeline.map((t) =>
        h(
          'div',
          { class: `tl-item ${t.severity}${now > t.startSec + 90 ? ' past' : ''}` },
          h('div', {}, h('span', { class: 'tl-time' }, t.time), h('b', {}, t.title)),
          h('div', { class: 'muted' }, t.detail),
        ),
      ),
    ),
  );
}

/** Tiny, safe Markdown renderer (headings, bullet lists, bold, paragraphs). */
function markdown(text: string): HTMLElement {
  const root = h('div', { class: 'markdown' });
  let ul: HTMLUListElement | null = null;
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((part) => (part.startsWith('**') && part.endsWith('**') ? h('b', {}, part.slice(2, -2)) : part));
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      if (!ul) root.append((ul = h('ul')));
      ul.append(h('li', {}, inline(bullet[1])));
      continue;
    }
    ul = null;
    if (!line.trim()) continue;
    if (line.startsWith('### ')) root.append(h('h3', {}, inline(line.slice(4))));
    else if (line.startsWith('## ') || line.startsWith('# ')) root.append(h('h2', {}, inline(line.replace(/^#+\s/, ''))));
    else root.append(h('p', {}, inline(line)));
  }
  return root;
}

function renderAi(a: GameAnalysis | null): HTMLElement {
  const ai = state.ai;
  const ctx = currentContext();
  const run = async () => {
    if (!ctx) return;
    state.ai = { requestId: -1, status: 'running', text: '', error: '' };
    renderContent();
    const id = await api.runAi(ctx);
    if (state.ai.requestId === -1) state.ai.requestId = id;
  };
  return h(
    'div',
    { class: 'card' },
    h(
      'div',
      { class: 'ai-actions' },
      ai.status === 'running'
        ? h('button', { class: 'ghost', type: 'button', onclick: () => void api.cancelAi() }, 'Annuler')
        : h('button', { class: 'primary', type: 'button', disabled: !a || !a.ally.champions.length, onclick: () => void run() }, 'Lancer l’analyse IA'),
      h(
        'span',
        { class: 'muted' },
        ai.status === 'running'
          ? 'Analyse en cours…'
          : 'Analyse approfondie de la draft par Claude (nécessite une clé API Anthropic dans les paramètres).',
      ),
    ),
    ai.error ? h('p', { class: 'error' }, ai.error) : null,
    ai.text ? markdown(ai.text) : ai.status === 'idle' ? h('p', { class: 'muted' }, 'Aucune analyse IA pour cette partie.') : null,
  );
}

function renderContent(): void {
  const a = currentAnalysis();
  const el = $('content');
  if (state.tab === 'ai') {
    el.replaceChildren(renderAi(a));
    return;
  }
  if (!a || (!a.ally.champions.length && !a.enemy.champions.length)) {
    el.replaceChildren(
      state.mode === 'auto'
        ? h(
            'div',
            { class: 'empty' },
            h('h2', {}, 'En attente d’une partie'),
            h('p', {}, 'Lance une partie de League of Legends : l’analyse démarre dès la sélection des champions et se met à jour à chaque pick.'),
            h('p', { class: 'muted' }, 'Pour tester sans lancer de partie, utilise « Draft manuelle » en haut.'),
          )
        : h('div', { class: 'empty' }, h('h2', {}, 'Draft manuelle'), h('p', {}, 'Saisis les champions des deux équipes ci-dessus et choisis ton rôle avec « moi ».')),
    );
    return;
  }
  const views: Record<Exclude<Tab, 'ai'>, (a: GameAnalysis) => HTMLElement> = {
    plan: renderPlan,
    matchups: renderMatchups,
    compo: renderCompo,
    timeline: renderTimeline,
  };
  el.replaceChildren(views[state.tab](a));
}

// ---------------------------------------------------------------------------
// Settings & modes
// ---------------------------------------------------------------------------

async function openSettings(): Promise<void> {
  const dialog = $('settings') as HTMLDialogElement;
  const form = $('settings-form') as HTMLFormElement;
  const s = await api.getSettings();
  (form.elements.namedItem('anthropicApiKey') as HTMLInputElement).value = s.anthropicApiKey;
  (form.elements.namedItem('aiAutoRun') as HTMLInputElement).checked = s.aiAutoRun;
  (form.elements.namedItem('focusOnChampSelect') as HTMLInputElement).checked = s.focusOnChampSelect;
  (form.elements.namedItem('leagueInstallPath') as HTMLInputElement).value = s.leagueInstallPath;
  dialog.showModal();
  dialog.onclose = async () => {
    if (dialog.returnValue !== 'save') return;
    await api.saveSettings({
      anthropicApiKey: (form.elements.namedItem('anthropicApiKey') as HTMLInputElement).value,
      aiAutoRun: (form.elements.namedItem('aiAutoRun') as HTMLInputElement).checked,
      focusOnChampSelect: (form.elements.namedItem('focusOnChampSelect') as HTMLInputElement).checked,
      leagueInstallPath: (form.elements.namedItem('leagueInstallPath') as HTMLInputElement).value,
    });
  };
}

function setMode(mode: 'auto' | 'manual'): void {
  state.mode = mode;
  $('mode-auto').classList.toggle('active', mode === 'auto');
  $('mode-manual').classList.toggle('active', mode === 'manual');
  renderDraft();
  renderLive();
  renderContent();
  if (mode === 'manual') scheduleManualAnalysis();
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function boot(): Promise<void> {
  $('mode-auto').addEventListener('click', () => setMode('auto'));
  $('mode-manual').addEventListener('click', () => setMode('manual'));
  $('open-settings').addEventListener('click', () => void openSettings());

  api.onStatus((s) => {
    state.status = s;
    renderStatus();
    renderLive();
  });
  api.onCatalog((c) => {
    state.catalog = c;
    renderDraft();
  });
  api.onAnalysis((p) => {
    state.auto = p;
    if (state.mode === 'auto') {
      renderDraft();
      renderContent();
    }
  });
  api.onLive((p) => {
    state.live = p;
    renderLive();
    if (state.mode === 'auto' && (state.tab === 'timeline' || state.tab === 'plan')) {
      // refresh "past" markers / current phase without re-rendering every second
      const minute = Math.floor(p.gameTime / 30);
      if (minute !== lastLiveRefresh) {
        lastLiveRefresh = minute;
        renderContent();
      }
    }
  });
  api.onAi((e) => {
    if (e.type === 'start') state.ai = { requestId: e.requestId, status: 'running', text: '', error: '' };
    else if (e.requestId !== state.ai.requestId && state.ai.requestId !== -1) return;
    if (e.type === 'delta') state.ai.text += e.text ?? '';
    if (e.type === 'done') state.ai.status = 'done';
    if (e.type === 'error') {
      state.ai.status = 'error';
      state.ai.error = e.text ?? 'Erreur inconnue';
    }
    if (state.tab === 'ai') renderContent();
  });

  const initial = await api.getState();
  state.status = initial.status;
  state.auto = initial.auto;
  state.catalog = initial.catalog;
  renderStatus();
  renderTabs();
  renderDraft();
  renderLive();
  renderContent();
}

void boot();
