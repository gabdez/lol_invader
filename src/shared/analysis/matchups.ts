import type { ChampionTraits, LaneMatchup, Role } from '../types';
import { byRole, clamp, round1, type Resolved } from './util';

/** Laning strength of a champion against a given opponent (solo lanes). */
function lanePower(t: ChampionTraits, opp: ChampionTraits): number {
  let p = t.early * 1.2 + t.burst * 0.35 + t.dps * 0.3 + t.poke * 0.3 + t.sustain * 0.25 + t.mobility * 0.15;
  if (t.range === 'R' && opp.range === 'M') p += 0.7;
  if (t.tags.includes('bully')) p += 0.8;
  if (opp.poke >= 2 && t.sustain >= 2) p += 0.2; // sustain counters poke
  if (t.tags.includes('shred') && opp.tank >= 3) p += 0.5;
  return p;
}

/** Early skirmish power of a jungler. */
function junglePower(t: ChampionTraits): number {
  return t.early * 1.3 + (t.tags.includes('invade') ? 0.8 : 0) + t.dps * 0.3 + t.burst * 0.25 + t.sustain * 0.2;
}

function verdict(score: number): string {
  if (score >= 1.5) return 'Avantage net';
  if (score >= 0.6) return 'Léger avantage';
  if (score > -0.6) return 'Équilibré';
  if (score > -1.5) return 'Léger désavantage';
  return 'Désavantage net';
}

function scalingSentence(scaling: number, ally: string, enemy: string): string {
  if (scaling >= 0.8) return `${ally} scale nettement mieux : le temps joue pour vous.`;
  if (scaling >= 0.4) return `${ally} scale un peu mieux.`;
  if (scaling <= -0.8) return `${enemy} scale nettement mieux : il faut creuser l'écart tôt.`;
  if (scaling <= -0.4) return `${enemy} scale un peu mieux.`;
  return 'Scaling comparable.';
}

function soloLaneTips(me: ChampionTraits, opp: ChampionTraits, early: number, scaling: number): string[] {
  const tips: string[] = [];
  if (early >= 0.6) {
    tips.push(`Tu domines les premiers niveaux : trade agressivement niveau 1-3 et prends le contrôle de la vague.`);
    if (scaling < 0) tips.push(`Convertis ton avance avant que ${opp.name} rattrape : plaques de tour (jusqu'à 14:00), roams, objectifs.`);
  } else if (early <= -0.6) {
    tips.push(`${opp.name} est plus fort en lane : joue safe, farm sous ta tour si besoin et demande l'aide du jungler.`);
    tips.push(`Laisse-le pousser et garde la vague près de ta tour pour rendre les ganks faciles.`);
  } else {
    tips.push('Matchup serré : les cooldowns décident des trades. Attaque quand il gaspille un sort clé.');
  }
  if (me.range === 'M' && opp.range === 'R') {
    tips.push(`Il a la portée : n'avance que quand il utilise ses sorts sur la vague. Envisage Second Souffle / Doran's Shield.`);
  } else if (me.range === 'R' && opp.range === 'M') {
    tips.push(`Tu as la portée : punis chaque last-hit au corps à corps avec des auto-attaques et sorts.`);
  }
  if (opp.burst >= 3 && me.mobility <= 1) {
    tips.push(`Respecte son burst (surtout à partir du niveau 6) : garde Flash et reste à distance de son engage.`);
  }
  if (opp.tags.includes('roam')) {
    tips.push(`${opp.name} roam beaucoup : ping dès qu'il disparaît, pousse sa vague et suis-le ou prends des plaques.`);
  }
  if (opp.tags.includes('heal') || opp.sustain >= 3) {
    tips.push(`Il a beaucoup de soins : Ignite et anti-heal tôt rendent tes all-ins possibles.`);
  }
  if (opp.tags.includes('stealth')) tips.push('Achète une Pink ward pour couvrir ses approches camouflées.');
  if (scaling >= 0.8) tips.push(`Tu scales mieux : ne prends pas de risques inutiles, chaque farm te rapproche de ta fenêtre de puissance.`);
  if (opp.split >= 3) tips.push(`${opp.name} va split push : il faudra le tenir en side lane ou punir ailleurs quand il split.`);
  return tips;
}

function junglerTips(me: ChampionTraits, opp: ChampionTraits, early: number, ally: Resolved[], enemy: Resolved[]): string[] {
  const tips: string[] = [];
  if (early >= 0.6) {
    tips.push(`Tu es plus fort que ${opp.name} en early : invade son deuxième buff ou ses camps et conteste le scuttle (vers 3:30).`);
  } else if (early <= -0.6) {
    tips.push(`${opp.name} est plus fort en duel early : évite de le croiser seul avant tes premiers objets, joue côté opposé à lui.`);
    tips.push('Ward ta jungle (raptors / buff) et ne conteste le scuttle que si tes laners ont la priorité.');
  } else {
    tips.push('Duel équilibré : la priorité des lanes décide qui gagne les scuttles et les invades.');
  }
  const best = gankTargets(ally, enemy);
  if (best.length) tips.push(`Meilleures cibles de gank : ${best.join(', ')}.`);
  if (opp.tags.includes('stealth')) tips.push(`${opp.name} est difficile à tracker : pink wards dans les zones de passage de ta jungle.`);
  if (opp.late > me.late) tips.push(`${opp.name} scale mieux : contre-jungle et ganks tôt pour le retarder.`);
  return tips;
}

/** Lanes where a gank is most likely to succeed (allied CC vs enemy mobility). */
export function gankTargets(ally: Resolved[], enemy: Resolved[]): string[] {
  const lanes: { lane: Role; label: string }[] = [
    { lane: 'TOP', label: 'top' },
    { lane: 'MIDDLE', label: 'mid' },
    { lane: 'BOTTOM', label: 'bot' },
  ];
  const scored = lanes
    .map(({ lane, label }) => {
      const a = lane === 'BOTTOM' ? [byRole(ally, 'BOTTOM'), byRole(ally, 'UTILITY')] : [byRole(ally, lane)];
      const e = lane === 'BOTTOM' ? [byRole(enemy, 'BOTTOM'), byRole(enemy, 'UTILITY')] : [byRole(enemy, lane)];
      const allyCc = a.reduce((s, c) => s + (c?.t.cc ?? 0), 0);
      const enemyEscape = e.reduce((s, c) => s + (c?.t.mobility ?? 0), 0) / Math.max(1, e.filter(Boolean).length);
      const score = allyCc * 0.6 - enemyEscape * 0.8 + (e.some((c) => c?.t.tags.includes('hyper')) ? 0.8 : 0);
      const target = e.filter(Boolean).map((c) => c!.t.name).join(' + ');
      return { label, score, target };
    })
    .filter((x) => x.target)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 2).map((s) => `${s.label} (${s.target})`);
}

function botTips(a: (Resolved | undefined)[], e: (Resolved | undefined)[], early: number): string[] {
  const tips: string[] = [];
  const [adc, sup] = a;
  const [eAdc, eSup] = e;
  if (early >= 0.6) tips.push('Votre 2v2 est plus fort tôt : jouez pour le niveau 2 (première vague + 3 sbires) et cherchez les trades.');
  else if (early <= -0.6) tips.push("Leur bot lane est plus forte tôt : évitez le all-in niveau 2-3, laissez la vague venir à vous.");
  if (eSup && eSup.t.engage >= 3) {
    tips.push(`${eSup.t.name} engage fort : restez derrière vos sbires et gardez Flash pour son engage.`);
  }
  if (eSup && eSup.t.tags.includes('pick')) tips.push(`${eSup.t.name} cherche des picks : ne marchez jamais dans le brouillard sans vision.`);
  if (sup && sup.t.engage >= 3 && eAdc && eAdc.t.mobility <= 1) {
    tips.push(`${eAdc.t.name} manque de mobilité : ${sup.t.name} peut engager dès que son sort défensif est down.`);
  }
  if (sup && sup.t.peel >= 3 && adc) tips.push(`${sup.t.name} doit jouer en peel autour de ${adc.t.name} en teamfight.`);
  if (eAdc && (eAdc.t.tags.includes('hyper') || eAdc.t.late === 3) && early >= 0) {
    tips.push(`${eAdc.t.name} scale très fort : mettez-lui un maximum de pression avant ses 2 objets.`);
  }
  if (adc && adc.t.tags.includes('hyper') && early < 0) {
    tips.push(`${adc.t.name} doit survivre à la lane : farm prioritaire, aucune prise de risque, le late est pour vous.`);
  }
  const heal = e.filter((c) => c && (c.t.tags.includes('heal') || c.t.sustain >= 3));
  if (heal.length) tips.push(`Soins adverses (${heal.map((c) => c!.t.name).join(', ')}) : Ignite sur le support et anti-heal tôt.`);
  return tips;
}

export function buildMatchups(ally: Resolved[], enemy: Resolved[], myRole: Role | null): LaneMatchup[] {
  const out: LaneMatchup[] = [];

  for (const lane of ['TOP', 'JUNGLE', 'MIDDLE'] as const) {
    const a = byRole(ally, lane);
    const e = byRole(enemy, lane);
    if (!a || !e) continue;
    const early =
      lane === 'JUNGLE'
        ? junglePower(a.t) - junglePower(e.t)
        : (lanePower(a.t, e.t) - lanePower(e.t, a.t)) * 0.8;
    const earlyScore = round1(clamp(early, -3, 3));
    const scalingScore = round1((a.t.late - e.t.late) * 0.8 + (a.t.mid - e.t.mid) * 0.2 + (a.t.tags.includes('scaling') ? 0.4 : 0) - (e.t.tags.includes('scaling') ? 0.4 : 0));
    out.push({
      lane,
      allies: [a.t.name],
      enemies: [e.t.name],
      earlyScore,
      scalingScore,
      verdict: verdict(earlyScore),
      summary: `${verdict(earlyScore)} en début de partie. ${scalingSentence(scalingScore, a.t.name, e.t.name)}`,
      tips:
        lane === 'JUNGLE'
          ? junglerTips(a.t, e.t, earlyScore, ally, enemy)
          : soloLaneTips(a.t, e.t, earlyScore, scalingScore),
      isMyLane: myRole === lane,
    });
  }

  const a = [byRole(ally, 'BOTTOM'), byRole(ally, 'UTILITY')];
  const e = [byRole(enemy, 'BOTTOM'), byRole(enemy, 'UTILITY')];
  if (a.some(Boolean) && e.some(Boolean)) {
    const power = (team: (Resolved | undefined)[], opp: (Resolved | undefined)[]) =>
      team.reduce((s, c, i) => {
        if (!c) return s;
        const vs = opp[i] ?? opp.find(Boolean);
        return s + (vs ? lanePower(c.t, vs.t) : c.t.early * 1.2) + c.t.engage * 0.25 + c.t.cc * 0.15;
      }, 0);
    const earlyScore = round1(clamp((power(a, e) - power(e, a)) * 0.6, -3, 3));
    const late = (team: (Resolved | undefined)[]) => team.reduce((s, c) => s + (c ? c.t.late + (c.t.tags.includes('hyper') ? 0.5 : 0) : 0), 0);
    const scalingScore = round1((late(a) - late(e)) * 0.6);
    const aNames = a.filter(Boolean).map((c) => c!.t.name);
    const eNames = e.filter(Boolean).map((c) => c!.t.name);
    out.push({
      lane: 'BOTTOM',
      allies: aNames,
      enemies: eNames,
      earlyScore,
      scalingScore,
      verdict: verdict(earlyScore),
      summary: `${verdict(earlyScore)} en début de partie. ${scalingSentence(scalingScore, 'Votre duo', 'Leur duo')}`,
      tips: botTips(a, e, earlyScore),
      isMyLane: myRole === 'BOTTOM' || myRole === 'UTILITY',
    });
  }
  return out;
}
