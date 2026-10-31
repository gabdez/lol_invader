// Types shared between the Electron main process, the analysis engine and the UI.

export type Role = 'TOP' | 'JUNGLE' | 'MIDDLE' | 'BOTTOM' | 'UTILITY';
export const ROLES: Role[] = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'];

export const ROLE_LABELS: Record<Role, string> = {
  TOP: 'Top',
  JUNGLE: 'Jungle',
  MIDDLE: 'Mid',
  BOTTOM: 'ADC',
  UTILITY: 'Support',
};

export type DamageType = 'AD' | 'AP' | 'MIX';
export type RangeType = 'M' | 'R';

/** Special mechanics used by the rule engine to generate advice. */
export type ChampionTag =
  | 'hyper' // late-game hyper carry
  | 'scaling' // infinite stacks / scales very hard
  | 'stealth' // invisibility / camouflage
  | 'global' // global or very long range ultimate
  | 'invade' // dominant early jungle duelist
  | 'roam' // roams a lot from lane
  | 'bully' // lane bully in levels 1-5
  | 'dive' // dives the backline
  | 'shred' // %HP / true damage, good against tanks
  | 'ptcc' // point-and-click hard CC
  | 'heal' // heavy healing (anti-heal matters)
  | 'pick' // catches isolated targets
  | 'disengage'; // strong disengage

export interface ChampionTraits {
  /** Data Dragon id, e.g. "MissFortune". */
  id: string;
  /** Numeric key used by the LoL client, e.g. 21. */
  key: number;
  name: string;
  roles: Role[];
  damage: DamageType;
  range: RangeType;
  /** Power curve, 1 (weak) to 3 (strong). */
  early: number;
  mid: number;
  late: number;
  /** 0-3 scores. */
  cc: number;
  engage: number;
  poke: number;
  burst: number;
  dps: number;
  tank: number;
  mobility: number;
  sustain: number;
  waveclear: number;
  split: number;
  peel: number;
  tags: ChampionTag[];
  /** True when traits were estimated from Data Dragon instead of the curated table. */
  estimated?: boolean;
}

export interface ChampionInfo {
  id: string;
  key: number;
  name: string;
  /** Data Dragon class tags: Fighter, Tank, Mage, Assassin, Marksman, Support. */
  ddTags: string[];
  image: string;
}

export interface PlayerSlot {
  championId: number; // 0 when unknown / not yet picked
  role: Role | null;
  roleSource: 'assigned' | 'inferred' | 'manual';
  isLocalPlayer: boolean;
  /** Champion is locked in (false = only hovered / pick intent). */
  locked: boolean;
  summonerName?: string;
  /** Summoner spell ids when known (11 = Smite). */
  spells?: number[];
}

export type GamePhase =
  | 'Disconnected'
  | 'None'
  | 'Lobby'
  | 'Matchmaking'
  | 'ReadyCheck'
  | 'ChampSelect'
  | 'GameStart'
  | 'InProgress'
  | 'WaitingForStats'
  | 'EndOfGame'
  | 'Manual';

export interface ObjectiveEvent {
  type: 'dragon' | 'baron' | 'herald' | 'grubs' | 'elder';
  time: number; // seconds of game time
  killerTeam: 'ally' | 'enemy' | 'unknown';
  dragonType?: string;
}

export interface GameContext {
  source: 'champselect' | 'ingame' | 'manual';
  phase: GamePhase;
  side: 'blue' | 'red' | null;
  myTeam: PlayerSlot[];
  enemyTeam: PlayerSlot[];
  /** Game time in seconds (in-game only). */
  gameTime?: number;
  objectives?: ObjectiveEvent[];
}

export interface ConnectionStatus {
  client: 'connected' | 'searching';
  liveGame: boolean;
  phase: GamePhase;
  message?: string;
}

// ---------------------------------------------------------------------------
// Analysis output
// ---------------------------------------------------------------------------

export type Severity = 'info' | 'good' | 'warning' | 'danger';

export interface Insight {
  severity: Severity;
  title: string;
  detail: string;
}

export interface TeamProfile {
  champions: string[];
  physicalPct: number; // 0-100 share of physical damage
  scores: {
    cc: number;
    engage: number;
    poke: number;
    burst: number;
    dps: number;
    frontline: number;
    mobility: number;
    sustain: number;
    waveclear: number;
    split: number;
    peel: number;
  };
  curve: { early: number; mid: number; late: number };
  archetypes: { id: string; label: string; score: number }[];
  identity: string;
  winConditions: string[];
}

export interface LaneMatchup {
  lane: 'TOP' | 'JUNGLE' | 'MIDDLE' | 'BOTTOM';
  allies: string[];
  enemies: string[];
  /** -3 (very unfavourable) .. +3 (very favourable) for the allied side, early game. */
  earlyScore: number;
  /** Positive when allies scale better. */
  scalingScore: number;
  verdict: string;
  summary: string;
  tips: string[];
  isMyLane: boolean;
}

export interface TimelineEntry {
  time: string; // "05:00" or "14:00-20:00"
  startSec: number;
  title: string;
  detail: string;
  severity: Severity;
}

export interface PhasePlan {
  phase: 'early' | 'mid' | 'late';
  label: string;
  window: string;
  advantage: 'ally' | 'enemy' | 'even';
  actions: string[];
}

export interface PersonalPlan {
  role: Role | null;
  champion: string | null;
  headline: string;
  laning: string[];
  roleTips: string[];
  teamfight: string[];
  build: string[];
  threats: { champion: string; reason: string }[];
  focus: { champion: string; reason: string }[];
}

export interface GameAnalysis {
  complete: boolean; // all 10 champions known
  generatedAt: number;
  ally: TeamProfile;
  enemy: TeamProfile;
  insights: Insight[];
  matchups: LaneMatchup[];
  phases: PhasePlan[];
  timeline: TimelineEntry[];
  plan: PersonalPlan;
  /** Allied and enemy champions with their (assigned or inferred) roles. */
  lineup: {
    ally: { name: string; id: string; role: Role | null; isLocalPlayer: boolean; locked: boolean }[];
    enemy: { name: string; id: string; role: Role | null; locked: boolean }[];
  };
}

export interface Settings {
  anthropicApiKey: string;
  aiAutoRun: boolean;
  focusOnChampSelect: boolean;
  leagueInstallPath: string;
}

export interface AiStreamEvent {
  requestId: number;
  type: 'start' | 'delta' | 'done' | 'error';
  text?: string;
}
