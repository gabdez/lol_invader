// Live economy: item gold per player (as on the in-game Tab scoreboard), lane diffs,
// advice depending on the gold state, and alerts when an enemy completes an item.
//
// The Live Client Data API only exposes the local player's current gold. For the other
// players we value their inventory with Data Dragon item prices, which is what the Tab
// scoreboard compares. Unspent gold of other players is not visible.

import { upcomingObjectives } from './live';
import { ROLES, ROLE_LABELS, type GameAnalysis, type Insight, type LiveItem, type LivePlayerStats, type LiveStats, type ObjectiveEvent, type Role } from './types';

export interface ItemInfo {
  name: string;
  /** Total cost including components. */
  total: number;
  /** True for finished items that build into nothing (legendaries, finished boots…). */
  final: boolean;
}
export type ItemPrices = Record<number, ItemInfo>;

/** An item counts as a "completed" power spike when it is final and costs at least this much. */
export const COMPLETED_ITEM_MIN_GOLD = 2200;

export interface PlayerEcon extends LivePlayerStats {
  name: string;
  role: Role | null;
  itemGold: number;
  completedItems: string[];
}

export interface LaneEcon {
  role: Role;
  ally: PlayerEcon;
  enemy: PlayerEcon;
  goldDiff: number;
  csDiff: number;
  levelDiff: number;
  isMyLane: boolean;
}

export interface EconAlert {
  time: number;
  text: string;
  severity: 'warning' | 'danger' | 'good';
}

export interface EconomySnapshot {
  gameTime: number;
  myGold: number | null;
  allyGold: number;
  enemyGold: number;
  goldDiff: number;
  allyKills: number;
  enemyKills: number;
  ally: PlayerEcon[];
  enemy: PlayerEcon[];
  lanes: LaneEcon[];
  advice: Insight[];
}

function itemValue(item: LiveItem, prices: ItemPrices): number {
  const known = prices[item.id];
  if (known) return known.total * item.count;
  return (item.price ?? 0) * item.count;
}

function completed(items: LiveItem[], prices: ItemPrices): string[] {
  return items
    .filter((i) => prices[i.id]?.final && prices[i.id].total >= COMPLETED_ITEM_MIN_GOLD)
    .map((i) => prices[i.id].name);
}

function toEcon(stats: LivePlayerStats, name: string, role: Role | null, prices: ItemPrices): PlayerEcon {
  return {
    ...stats,
    name,
    role,
    itemGold: Math.round(stats.items.reduce((s, i) => s + itemValue(i, prices), 0)),
    completedItems: completed(stats.items, prices),
  };
}

export function formatGold(n: number): string {
  const abs = Math.abs(n);
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';
  return abs >= 1000 ? `${sign}${(abs / 1000).toFixed(1).replace('.', ',')}k` : `${sign}${abs}`;
}

/** Unsigned compact gold amount, e.g. 3200 -> "3,2k". */
export function goldAmount(n: number): string {
  return formatGold(Math.abs(n)).replace('+', '');
}

const kda = (p: PlayerEcon) => `${p.kills}/${p.deaths}/${p.assists}`;

export function computeEconomy(
  stats: LiveStats,
  analysis: GameAnalysis,
  prices: ItemPrices,
  gameTime: number,
  objectives: ObjectiveEvent[],
): EconomySnapshot {
  const ally = stats.ally.map((s, i) => toEcon(s, analysis.lineup.ally[i]?.name ?? '?', analysis.lineup.ally[i]?.role ?? null, prices));
  const enemy = stats.enemy.map((s, i) => toEcon(s, analysis.lineup.enemy[i]?.name ?? '?', analysis.lineup.enemy[i]?.role ?? null, prices));
  const me = ally.find((_, i) => analysis.lineup.ally[i]?.isLocalPlayer);

  const lanes: LaneEcon[] = [];
  for (const role of ROLES) {
    const a = ally.find((p) => p.role === role);
    const e = enemy.find((p) => p.role === role);
    if (!a || !e) continue;
    lanes.push({
      role,
      ally: a,
      enemy: e,
      goldDiff: a.itemGold - e.itemGold,
      csDiff: a.cs - e.cs,
      levelDiff: a.level - e.level,
      isMyLane: a === me,
    });
  }

  const allyGold = ally.reduce((s, p) => s + p.itemGold, 0);
  const enemyGold = enemy.reduce((s, p) => s + p.itemGold, 0);
  const snapshot: EconomySnapshot = {
    gameTime,
    myGold: stats.myGold,
    allyGold,
    enemyGold,
    goldDiff: allyGold - enemyGold,
    allyKills: ally.reduce((s, p) => s + p.kills, 0),
    enemyKills: enemy.reduce((s, p) => s + p.kills, 0),
    ally,
    enemy,
    lanes,
    advice: [],
  };
  snapshot.advice = economyAdvice(snapshot, analysis, gameTime, objectives);
  return snapshot;
}

function economyAdvice(s: EconomySnapshot, analysis: GameAnalysis, gameTime: number, objectives: ObjectiveEvent[]): Insight[] {
  const out: Insight[] = [];
  const next = upcomingObjectives(gameTime, objectives).find((o) => o.inSec <= 90);
  const nextText = next ? (next.inSec <= 0 ? `${next.label} est disponible` : `${next.label} apparaît dans ${Math.max(0, next.inSec)} s`) : null;
  const scalesBetter = analysis.ally.curve.late - analysis.enemy.curve.late >= 0.3;
  const scalesWorse = analysis.enemy.curve.late - analysis.ally.curve.late >= 0.3;
  const threshold = gameTime < 15 * 60 ? 1500 : 2500;

  // --- Team gold state ---------------------------------------------------------
  if (s.goldDiff >= threshold) {
    out.push({
      severity: 'good',
      title: `Avance de ${goldAmount(s.goldDiff)} d'or`,
      detail: `${nextText ? `${nextText} : ` : ''}groupez et forcez les objectifs tant que l'avance est là.${scalesWorse ? " L'ennemi scale mieux : chaque minute sans objectif réduit votre avantage." : ''}`,
    });
  } else if (s.goldDiff <= -threshold) {
    out.push({
      severity: 'danger',
      title: `Retard de ${goldAmount(s.goldDiff)} d'or`,
      detail: `Ne contestez pas sans vision ni avantage numérique, farmez les side lanes en sécurité et attendez une erreur.${scalesBetter ? ' Votre compo scale mieux : le retard peut se combler, ne le creusez pas.' : ''}${nextText ? ` (${nextText} : ne le contestez qu'avec un pick d'avance.)` : ''}`,
    });
  } else if (nextText) {
    out.push({ severity: 'info', title: 'Partie serrée', detail: `${nextText} : poussez les lanes autour et placez la vision avant de vous engager.` });
  }

  // --- Dead players = windows ------------------------------------------------------
  const deadEnemies = s.enemy.filter((p) => p.isDead && p.respawnTimer >= 10);
  const deadAllies = s.ally.filter((p) => p.isDead && p.respawnTimer >= 10);
  if (deadEnemies.length >= 2 || (deadEnemies.length === 1 && gameTime >= 20 * 60 && deadEnemies[0].respawnTimer >= 25)) {
    out.push({
      severity: 'good',
      title: `${deadEnemies.length} ennemi${deadEnemies.length > 1 ? 's' : ''} mort${deadEnemies.length > 1 ? 's' : ''}`,
      detail: `${deadEnemies.map((p) => `${p.name} (${Math.round(p.respawnTimer)} s)`).join(', ')} : fenêtre pour prendre un objectif ou une tour.`,
    });
  }
  if (deadAllies.length >= 2) {
    out.push({
      severity: 'warning',
      title: `${deadAllies.length} alliés morts`,
      detail: `${deadAllies.map((p) => `${p.name} (${Math.round(p.respawnTimer)} s)`).join(', ')} : reculez et défendez, ne contestez rien à ${5 - deadAllies.length}.`,
    });
  }

  // --- Fed enemies ------------------------------------------------------------------
  for (const p of s.enemy) {
    if (p.kills >= 5 && p.kills - p.deaths >= 4) {
      out.push({
        severity: 'danger',
        title: `${p.name} est fed (${kda(p)})`,
        detail: 'Ne le combattez jamais seul. En teamfight, gardez vos contrôles pour lui. Sa prime rapporte beaucoup d’or.',
      });
    }
  }

  // --- Lanes ------------------------------------------------------------------------
  for (const l of s.lanes) {
    if (l.isMyLane) {
      if (l.goldDiff <= -1000 || l.levelDiff <= -2) {
        out.push({
          severity: 'warning',
          title: `Tu es en retard sur ${l.enemy.name}`,
          detail: `${formatGold(l.goldDiff)} d'or d'objets, ${l.csDiff >= 0 ? '+' : ''}${l.csDiff} CS, ${l.levelDiff >= 0 ? '+' : ''}${l.levelDiff} niveau(x). Évite les 1v1, farm en sécurité et joue avec ton équipe.`,
        });
      } else if (l.goldDiff >= 1000 || l.levelDiff >= 2) {
        out.push({
          severity: 'good',
          title: `Tu as l'avantage sur ${l.enemy.name}`,
          detail: `${formatGold(l.goldDiff)} d'or d'objets, ${l.csDiff >= 0 ? '+' : ''}${l.csDiff} CS. Punis-le en lane ou utilise ton avance pour roam / prendre des plaques et des objectifs.`,
        });
      }
    } else if (l.levelDiff <= -2 || l.goldDiff <= -2000) {
      out.push({
        severity: 'info',
        title: `${ROLE_LABELS[l.role]} allié en difficulté`,
        detail: `${l.ally.name} est derrière ${l.enemy.name} (${formatGold(l.goldDiff)}, ${l.levelDiff} niv.) : ne le laisse pas seul face à lui en teamfight.`,
      });
    }
  }

  // --- Local player's unspent gold ----------------------------------------------------
  if (s.myGold !== null && s.myGold >= 1500) {
    out.push({
      severity: 'info',
      title: `${Math.floor(s.myGold)} or non dépensé`,
      detail: 'Trouve un moment pour back (après avoir poussé ta vague) : l’or dans la poche ne sert à rien en combat.',
    });
  }
  return out;
}

/** Alerts for items newly completed by enemies (power spikes). */
export function newItemAlerts(prev: EconomySnapshot | null, next: EconomySnapshot): EconAlert[] {
  if (!prev) return [];
  const alerts: EconAlert[] = [];
  next.enemy.forEach((p, i) => {
    const before = prev.enemy[i]?.completedItems ?? [];
    if (p.completedItems.length > before.length) {
      const remaining = [...before];
      const added = p.completedItems.filter((name) => {
        const idx = remaining.indexOf(name);
        if (idx >= 0) {
          remaining.splice(idx, 1);
          return false;
        }
        return true;
      });
      const n = p.completedItems.length;
      alerts.push({
        time: next.gameTime,
        severity: n >= 2 ? 'danger' : 'warning',
        text: `${p.name} a terminé ${added.join(', ') || 'un objet'} (${n}${n === 1 ? 'er' : 'e'} objet) : pic de puissance, respecte-le.`,
      });
    }
  });
  return alerts;
}
