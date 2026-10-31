import { describe, expect, it } from 'vitest';
import { ChampionCatalog } from '../src/shared/catalog';
import { upcomingObjectives } from '../src/shared/live';
import { compositionSignature, parseChampSelect, parseGameflowSession, parseLiveGame } from '../src/shared/parsers';
import { parseCommandLine, parseLockfile } from '../src/main/credentials';

const catalog = ChampionCatalog.offline();

describe('LCU credentials', () => {
  it('parses the lockfile', () => {
    expect(parseLockfile('LeagueClient:1234:54321:s3cr3t-Pass:https')).toEqual({ port: 54321, password: 's3cr3t-Pass' });
    expect(parseLockfile('garbage')).toBeNull();
  });
  it('parses the LeagueClientUx command line', () => {
    const cmd = '"C:/Riot Games/League of Legends/LeagueClientUx.exe" "--riotclient-auth-token=xyz" "--app-port=61234" "--remoting-auth-token=AbC_d-9" "--install-directory=C:\\Riot Games\\League of Legends"';
    expect(parseCommandLine(cmd)).toEqual({ port: 61234, password: 'AbC_d-9' });
    expect(parseCommandLine('notepad.exe')).toBeNull();
  });
});

describe('parseChampSelect', () => {
  const session = {
    localPlayerCellId: 2,
    myTeam: [
      { cellId: 0, championId: 122, assignedPosition: 'top', team: 1, spell1Id: 4, spell2Id: 12 },
      { cellId: 1, championId: 0, championPickIntent: 64, assignedPosition: 'jungle', team: 1 },
      { cellId: 2, championId: 61, assignedPosition: 'middle', team: 1 },
      { cellId: 3, championId: 0, assignedPosition: 'bottom', team: 1 },
      { cellId: 4, championId: 0, assignedPosition: 'utility', team: 1 },
    ],
    theirTeam: [
      { cellId: 5, championId: 17, assignedPosition: '', team: 2 },
      { cellId: 6, championId: 0, championPickIntent: 120, team: 2 },
    ],
    actions: [
      [{ actorCellId: 0, championId: 122, completed: true, type: 'pick' }],
      [{ actorCellId: 2, championId: 61, completed: false, type: 'pick' }],
      [{ actorCellId: 5, championId: 17, completed: true, type: 'pick' }],
    ],
  };
  const ctx = parseChampSelect(session);

  it('maps teams, roles and lock state', () => {
    expect(ctx.side).toBe('blue');
    expect(ctx.myTeam[0]).toMatchObject({ championId: 122, role: 'TOP', locked: true, spells: [4, 12] });
    expect(ctx.myTeam[1]).toMatchObject({ championId: 64, role: 'JUNGLE', locked: false });
    expect(ctx.myTeam[2]).toMatchObject({ championId: 61, isLocalPlayer: true, locked: false });
    expect(ctx.enemyTeam[0]).toMatchObject({ championId: 17, role: null, locked: true });
  });
  it('never leaks enemy pick intents', () => {
    expect(ctx.enemyTeam[1].championId).toBe(0);
  });
});

describe('parseGameflowSession', () => {
  it('puts the local player in the allied team', () => {
    const ctx = parseGameflowSession(
      {
        phase: 'GameStart',
        gameData: {
          teamOne: [{ championId: 1, puuid: 'a', selectedPosition: 'MIDDLE' }],
          teamTwo: [{ championId: 2, puuid: 'me', selectedPosition: 'TOP' }],
          playerChampionSelections: [{ championId: 2, puuid: 'me', spell1Id: 4, spell2Id: 12 }],
        },
      },
      'me',
    )!;
    expect(ctx.side).toBe('red');
    expect(ctx.myTeam[0]).toMatchObject({ championId: 2, role: 'TOP', isLocalPlayer: true, spells: [4, 12] });
    expect(ctx.enemyTeam[0]).toMatchObject({ championId: 1, role: 'MIDDLE' });
  });
});

describe('parseLiveGame', () => {
  const data = {
    activePlayer: { riotId: 'Moi#EUW' },
    allPlayers: [
      { championName: 'Ahri', rawChampionName: 'game_character_displayname_Ahri', team: 'ORDER' as const, position: 'MIDDLE', riotId: 'Moi#EUW' },
      {
        championName: 'Wukong',
        rawChampionName: 'game_character_displayname_MonkeyKing',
        team: 'CHAOS' as const,
        position: '',
        riotId: 'Ennemi#EUW',
        summonerSpells: {
          summonerSpellOne: { rawDisplayName: 'GeneratedTip_SummonerSpell_SummonerFlash_DisplayName' },
          summonerSpellTwo: { rawDisplayName: 'GeneratedTip_SummonerSpell_SummonerSmite_DisplayName' },
        },
      },
    ],
    events: {
      Events: [
        { EventName: 'GameStart', EventTime: 0 },
        { EventName: 'DragonKill', EventTime: 330, KillerName: 'Ennemi#EUW', DragonType: 'Fire' },
      ],
    },
    gameData: { gameTime: 400 },
  };
  const ctx = parseLiveGame(data, catalog)!;

  it('detects teams, champions and spells', () => {
    expect(ctx.myTeam).toHaveLength(1);
    expect(ctx.myTeam[0]).toMatchObject({ championId: 103, isLocalPlayer: true, role: 'MIDDLE' });
    expect(ctx.enemyTeam[0]).toMatchObject({ championId: 62, role: null, spells: [4, 11] });
    expect(ctx.objectives).toEqual([{ type: 'dragon', time: 330, killerTeam: 'enemy', dragonType: 'Fire' }]);
  });

  it('computes the next objectives', () => {
    const next = upcomingObjectives(400, ctx.objectives!);
    expect(next[0]).toMatchObject({ label: 'Voidgrubs', inSec: 80 });
    expect(next.find((o) => o.label === 'Drake')).toMatchObject({ at: 630 });
  });

  it('composition signature ignores game time', () => {
    expect(compositionSignature(ctx)).toBe(compositionSignature({ ...ctx, gameTime: 999 }));
  });
});
