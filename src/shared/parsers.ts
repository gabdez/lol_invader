// Pure parsers turning raw League Client (LCU) / Live Client Data payloads into a GameContext.
// Kept free of Electron/Node APIs so they can be unit tested.

import type { ChampionCatalog } from './catalog';
import type { GameContext, ObjectiveEvent, PlayerSlot, Role } from './types';

const POSITION_MAP: Record<string, Role> = {
  top: 'TOP',
  jungle: 'JUNGLE',
  middle: 'MIDDLE',
  mid: 'MIDDLE',
  bottom: 'BOTTOM',
  bot: 'BOTTOM',
  utility: 'UTILITY',
  support: 'UTILITY',
};

export function parsePosition(value: unknown): Role | null {
  if (typeof value !== 'string') return null;
  return POSITION_MAP[value.toLowerCase()] ?? null;
}

// ---------------------------------------------------------------------------
// Champ select  (GET /lol-champ-select/v1/session)
// ---------------------------------------------------------------------------

interface CsPlayer {
  cellId: number;
  championId?: number;
  championPickIntent?: number;
  assignedPosition?: string;
  team?: number;
  spell1Id?: number;
  spell2Id?: number;
  gameName?: string;
}

interface CsAction {
  actorCellId: number;
  championId: number;
  completed: boolean;
  type: string;
}

export interface ChampSelectSession {
  localPlayerCellId: number;
  myTeam: CsPlayer[];
  theirTeam: CsPlayer[];
  actions?: CsAction[][];
}

export function parseChampSelect(session: ChampSelectSession): GameContext {
  const picks = (session.actions ?? []).flat().filter((a) => a.type === 'pick');
  const hasPickActions = picks.length > 0;

  const toSlot = (p: CsPlayer, isAlly: boolean): PlayerSlot => {
    const lockedPick = picks.find((a) => a.actorCellId === p.cellId && a.completed && a.championId > 0);
    const championId = lockedPick?.championId || p.championId || (isAlly ? p.championPickIntent : 0) || 0;
    const role = parsePosition(p.assignedPosition);
    const spells = [p.spell1Id, p.spell2Id].filter((s): s is number => !!s && s > 0);
    return {
      championId,
      role,
      roleSource: role ? 'assigned' : 'inferred',
      isLocalPlayer: isAlly && p.cellId === session.localPlayerCellId,
      locked: hasPickActions ? !!lockedPick : championId > 0,
      summonerName: p.gameName || undefined,
      spells: spells.length ? spells : undefined,
    };
  };

  const myTeamId = session.myTeam[0]?.team;
  return {
    source: 'champselect',
    phase: 'ChampSelect',
    side: myTeamId === 1 ? 'blue' : myTeamId === 2 ? 'red' : null,
    myTeam: session.myTeam.map((p) => toSlot(p, true)),
    enemyTeam: session.theirTeam.map((p) => toSlot(p, false)),
  };
}

// ---------------------------------------------------------------------------
// Loading screen  (GET /lol-gameflow/v1/session)
// ---------------------------------------------------------------------------

interface GfPlayer {
  championId?: number;
  puuid?: string;
  selectedPosition?: string;
  summonerName?: string;
}

export interface GameflowSession {
  phase?: string;
  gameData?: {
    teamOne?: GfPlayer[];
    teamTwo?: GfPlayer[];
    playerChampionSelections?: { championId: number; spell1Id?: number; spell2Id?: number; puuid?: string }[];
  };
}

export function parseGameflowSession(session: GameflowSession, myPuuid: string | null): GameContext | null {
  const one = session.gameData?.teamOne ?? [];
  const two = session.gameData?.teamTwo ?? [];
  if (!one.length && !two.length) return null;
  const meInTwo = !!myPuuid && two.some((p) => p.puuid === myPuuid);
  const mine = meInTwo ? two : one;
  const theirs = meInTwo ? one : two;
  const selections = session.gameData?.playerChampionSelections ?? [];

  const toSlot = (p: GfPlayer): PlayerSlot => {
    const sel = selections.find((s) => s.puuid && s.puuid === p.puuid);
    const role = parsePosition(p.selectedPosition);
    const spells = sel ? [sel.spell1Id, sel.spell2Id].filter((s): s is number => !!s) : [];
    return {
      championId: p.championId ?? 0,
      role,
      roleSource: role ? 'assigned' : 'inferred',
      isLocalPlayer: !!myPuuid && p.puuid === myPuuid,
      locked: true,
      summonerName: p.summonerName,
      spells: spells.length ? spells : undefined,
    };
  };

  return {
    source: 'ingame',
    phase: (session.phase as GameContext['phase']) ?? 'GameStart',
    side: meInTwo ? 'red' : 'blue',
    myTeam: mine.map(toSlot),
    enemyTeam: theirs.map(toSlot),
  };
}

// ---------------------------------------------------------------------------
// In game  (GET https://127.0.0.1:2999/liveclientdata/allgamedata)
// ---------------------------------------------------------------------------

interface LivePlayer {
  championName: string;
  rawChampionName?: string;
  team: 'ORDER' | 'CHAOS';
  position?: string;
  riotId?: string;
  riotIdGameName?: string;
  summonerName?: string;
  summonerSpells?: {
    summonerSpellOne?: { rawDisplayName?: string; displayName?: string };
    summonerSpellTwo?: { rawDisplayName?: string; displayName?: string };
  };
}

export interface LiveGameData {
  activePlayer?: { riotId?: string; riotIdGameName?: string; summonerName?: string };
  allPlayers?: LivePlayer[];
  events?: { Events?: { EventName: string; EventTime: number; KillerName?: string; DragonType?: string }[] };
  gameData?: { gameTime?: number };
}

const SPELL_IDS: Record<string, number> = {
  SummonerBarrier: 21,
  SummonerBoost: 1, // Cleanse
  SummonerDot: 14, // Ignite
  SummonerExhaust: 3,
  SummonerFlash: 4,
  SummonerHaste: 6, // Ghost
  SummonerHeal: 7,
  SummonerSmite: 11,
  SummonerTeleport: 12,
};

function spellId(raw?: string): number | undefined {
  if (!raw) return undefined;
  for (const [name, id] of Object.entries(SPELL_IDS)) {
    if (raw.includes(name)) return id;
  }
  return undefined;
}

function playerIds(p: { riotId?: string; riotIdGameName?: string; summonerName?: string }): string[] {
  return [p.riotId, p.riotIdGameName, p.summonerName].filter((x): x is string => !!x);
}

export function parseLiveGame(data: LiveGameData, catalog: ChampionCatalog): GameContext | null {
  const players = data.allPlayers ?? [];
  if (!players.length) return null;
  const meIds = data.activePlayer ? playerIds(data.activePlayer) : [];
  const me = players.find((p) => playerIds(p).some((id) => meIds.includes(id)));
  const myTeam = me?.team ?? 'ORDER';

  const toSlot = (p: LivePlayer): PlayerSlot => {
    const raw = p.rawChampionName?.replace('game_character_displayname_', '');
    const info = (raw && catalog.findByName(raw)) || catalog.findByName(p.championName);
    const role = parsePosition(p.position);
    const spells = [
      spellId(p.summonerSpells?.summonerSpellOne?.rawDisplayName),
      spellId(p.summonerSpells?.summonerSpellTwo?.rawDisplayName),
    ].filter((s): s is number => !!s);
    return {
      championId: info?.key ?? 0,
      role,
      roleSource: role ? 'assigned' : 'inferred',
      isLocalPlayer: p === me,
      locked: true,
      summonerName: p.riotIdGameName ?? p.summonerName,
      spells: spells.length ? spells : undefined,
    };
  };

  const teamOf = (killer?: string): ObjectiveEvent['killerTeam'] => {
    if (!killer) return 'unknown';
    const p = players.find((pl) => playerIds(pl).includes(killer));
    if (!p) return 'unknown';
    return p.team === myTeam ? 'ally' : 'enemy';
  };

  const objectives: ObjectiveEvent[] = [];
  for (const e of data.events?.Events ?? []) {
    const killerTeam = teamOf(e.KillerName);
    switch (e.EventName) {
      case 'DragonKill':
        objectives.push({
          type: e.DragonType === 'Elder' ? 'elder' : 'dragon',
          time: e.EventTime,
          killerTeam,
          dragonType: e.DragonType,
        });
        break;
      case 'BaronKill':
        objectives.push({ type: 'baron', time: e.EventTime, killerTeam });
        break;
      case 'HeraldKill':
        objectives.push({ type: 'herald', time: e.EventTime, killerTeam });
        break;
      case 'HordeKill':
        objectives.push({ type: 'grubs', time: e.EventTime, killerTeam });
        break;
      case 'AtakhanKill':
        objectives.push({ type: 'atakhan', time: e.EventTime, killerTeam });
        break;
    }
  }

  return {
    source: 'ingame',
    phase: 'InProgress',
    side: myTeam === 'ORDER' ? 'blue' : 'red',
    myTeam: players.filter((p) => p.team === myTeam).map(toSlot),
    enemyTeam: players.filter((p) => p.team !== myTeam).map(toSlot),
    gameTime: data.gameData?.gameTime,
    objectives,
  };
}

/** Signature of the composition only (ignores game time), used to avoid recomputing the analysis. */
export function compositionSignature(ctx: GameContext): string {
  const s = (team: PlayerSlot[]) =>
    team.map((p) => `${p.championId}:${p.role ?? '-'}:${p.locked ? 1 : 0}:${p.isLocalPlayer ? 1 : 0}`).join(',');
  return `${ctx.source}|${s(ctx.myTeam)}|${s(ctx.enemyTeam)}`;
}
