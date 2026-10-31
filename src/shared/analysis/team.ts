import type { TeamProfile } from '../types';
import { avg, names, round1, withTag, type Resolved } from './util';

const ARCHETYPES = {
  engage: {
    label: 'Engage / teamfight',
    win: 'Forcer des combats à 5 autour des objectifs et engager sur la cible la plus exposée.',
  },
  poke: {
    label: 'Poke / siège',
    win: "Affaiblir l'ennemi à distance avant chaque objectif et assiéger les tours sans prendre de combat à PV égaux.",
  },
  pick: {
    label: 'Pick / catch',
    win: 'Contrôler la vision, attraper les cibles isolées puis convertir chaque kill en objectif.',
  },
  protect: {
    label: 'Protect the carry',
    win: 'Jouer autour du carry principal : fights frontaux, peel, et ne jamais le laisser seul.',
  },
  split: {
    label: 'Split push',
    win: 'Créer de la pression en side lane pour forcer des réponses (1-3-1 / 1-4) pendant que le reste joue les objectifs.',
  },
  dive: {
    label: 'Dive',
    win: 'Plonger directement sur la backline adverse et finir les combats vite.',
  },
  skirmish: {
    label: 'Early / escarmouches',
    win: 'Prendre l’avance tôt : invades, plongées, drakes et grubs avant 20 minutes, puis terminer avant que l’ennemi scale.',
  },
} as const;

export type ArchetypeId = keyof typeof ARCHETYPES;

export function archetypeLabel(id: string): string {
  return (ARCHETYPES as Record<string, { label: string }>)[id]?.label ?? id;
}

/** Builds the profile of a team. Missing champions count as empty slots (averages over 5). */
export function buildTeamProfile(team: Resolved[]): TeamProfile {
  const slots = 5;
  const sum = (f: (c: Resolved) => number) => team.reduce((a, c) => a + f(c), 0);
  const per = (f: (c: Resolved) => number) => sum(f) / slots;

  let physical = 0;
  let totalDmg = 0;
  for (const c of team) {
    const weight = 0.4 + (c.t.burst + c.t.dps) / 6;
    totalDmg += weight;
    physical += weight * (c.t.damage === 'AD' ? 1 : c.t.damage === 'MIX' ? 0.5 : 0);
  }

  const scores = {
    cc: sum((c) => c.t.cc),
    engage: sum((c) => c.t.engage),
    poke: sum((c) => c.t.poke),
    burst: sum((c) => c.t.burst),
    dps: sum((c) => c.t.dps),
    frontline: sum((c) => c.t.tank),
    mobility: sum((c) => c.t.mobility),
    sustain: sum((c) => c.t.sustain),
    waveclear: sum((c) => c.t.waveclear),
    split: sum((c) => c.t.split),
    peel: sum((c) => c.t.peel),
  };

  const curve = {
    early: round1(avg(team.map((c) => c.t.early))),
    mid: round1(avg(team.map((c) => c.t.mid))),
    late: round1(avg(team.map((c) => c.t.late))),
  };

  const hyper = withTag(team, 'hyper');
  const picks = withTag(team, 'pick').length;
  const dives = withTag(team, 'dive').length;
  const maxSplit = Math.max(0, ...team.map((c) => c.t.split));
  const rangedShare = team.filter((c) => c.t.range === 'R').length / slots;

  const raw: Record<ArchetypeId, number> = {
    engage: 0.45 * per((c) => c.t.engage) + 0.3 * per((c) => c.t.cc) + 0.25 * per((c) => c.t.tank),
    poke: 0.6 * per((c) => c.t.poke) + 0.2 * per((c) => c.t.waveclear) + 0.2 * rangedShare * 3,
    pick: 0.4 * Math.min(3, picks * 1.5) + 0.35 * per((c) => c.t.burst) + 0.25 * per((c) => c.t.cc),
    protect:
      0.5 * per((c) => c.t.peel) +
      0.5 * (hyper.length ? 3 : team.some((c) => c.t.late === 3 && c.t.dps === 3) ? 1.8 : 0),
    split: 0.6 * (maxSplit === 3 ? 3 : maxSplit * 0.6) + 0.4 * per((c) => c.t.split),
    dive: 0.4 * Math.min(3, dives * 1.5) + 0.3 * per((c) => c.t.mobility) + 0.3 * per((c) => c.t.engage),
    skirmish: Math.max(0, (curve.early - 1.6) * 2.2) + 0.25 * per((c) => c.t.dps),
  };

  const archetypes = (Object.keys(raw) as ArchetypeId[])
    .map((id) => ({ id, label: ARCHETYPES[id].label, score: round1(raw[id]) }))
    .sort((a, b) => b.score - a.score);

  const top = archetypes[0];
  const second = archetypes[1];
  const identity =
    team.length === 0
      ? 'Composition inconnue'
      : second && top.score - second.score < 0.25
        ? `${top.label} + ${second.label}`
        : top.label;

  const winConditions: string[] = [];
  if (team.length) {
    winConditions.push(ARCHETYPES[top.id as ArchetypeId].win);
    if (second && top.score - second.score < 0.35) winConditions.push(ARCHETYPES[second.id as ArchetypeId].win);
    if (hyper.length) {
      winConditions.push(`Amener ${names(hyper)} jusqu'au late game (3 objets) : c'est la condition de victoire principale.`);
    }
    const splitters = team.filter((c) => c.t.split === 3);
    if (splitters.length && top.id !== 'split') {
      winConditions.push(`${names(splitters)} peut créer de la pression en side lane en mid game.`);
    }
    if (curve.early - curve.late >= 0.5) {
      winConditions.push('Compo forte tôt : chaque minute qui passe joue contre elle, il faut accélérer.');
    } else if (curve.late - curve.early >= 0.5) {
      winConditions.push('Compo qui scale : chaque minute qui passe sans perdre d’objectif majeur la rend plus forte.');
    }
  }

  return {
    champions: team.map((c) => c.t.name),
    physicalPct: totalDmg ? Math.round((physical / totalDmg) * 100) : 50,
    scores,
    curve,
    archetypes,
    identity,
    winConditions,
  };
}
