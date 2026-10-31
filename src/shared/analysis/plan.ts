import { OBJECTIVES } from '../objectives';
import { ROLE_LABELS, type LaneMatchup, type PersonalPlan, type Role, type TeamProfile } from '../types';
import { gankTargets } from './matchups';
import { byRole, formatTime, isCarry, names, withTag, type Resolved } from './util';

function threats(enemy: Resolved[]): { champion: string; reason: string }[] {
  return enemy
    .map((c) => {
      const reasons: string[] = [];
      if (c.t.burst >= 3) reasons.push('burst capable de one-shot');
      if (c.t.engage >= 3) reasons.push('engage / initiation');
      if (c.t.tags.includes('dive')) reasons.push('plonge sur la backline');
      if (c.t.tags.includes('hyper')) reasons.push('hyper carry en late');
      if (c.t.tags.includes('pick')) reasons.push('pick / catch');
      if (c.t.dps >= 3) reasons.push('gros DPS soutenu');
      const score = c.t.burst + c.t.engage + c.t.dps * 0.8 + (c.t.tags.includes('hyper') ? 1.5 : 0) + (c.t.tags.includes('dive') ? 1 : 0);
      return { champion: c.t.name, reason: reasons.join(', '), score };
    })
    .filter((x) => x.reason)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ champion, reason }) => ({ champion, reason }));
}

function focusTargets(enemy: Resolved[]): { champion: string; reason: string }[] {
  return enemy
    .map((c) => {
      const value = c.t.dps + c.t.burst + (c.t.tags.includes('hyper') ? 2 : 0);
      const reach = 3 - c.t.tank + (2 - c.t.mobility) * 0.5;
      return { c, score: value + reach };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(({ c }) => ({
      champion: c.t.name,
      reason:
        c.t.tank <= 1 && c.t.mobility <= 1
          ? 'carry fragile et peu mobile'
          : c.t.tank <= 1
            ? 'source principale de dégâts, fragile'
            : 'source principale de dégâts',
    }));
}

function teamfightRole(me: Resolved, ally: Resolved[], enemy: Resolved[]): string[] {
  const t = me.t;
  const out: string[] = [];
  const allyCarries = ally.filter((c) => c !== me && isCarry(c));
  const divers = enemy.filter((c) => c.t.tags.includes('dive') || c.t.burst >= 3);
  if (t.tank >= 3 && t.engage >= 2) {
    out.push('Tu es la frontline : engage sur la cible prioritaire ou absorbe les sorts adverses avant que tes carries entrent.');
  } else if (t.peel >= 3) {
    out.push(`Ton rôle est de protéger ${allyCarries.length ? names(allyCarries.slice(0, 2)) : 'tes carries'} : garde tes sorts pour les plongeurs (${divers.length ? names(divers.slice(0, 3)) : 'divers'}).`);
  } else if (t.engage >= 3) {
    out.push('Tu as l’engage : cherche l’angle pour attraper plusieurs ennemis ou la cible la plus exposée.');
  } else if (t.burst >= 3 && t.mobility >= 2) {
    out.push('Tu es l’assassin : attends que les sorts clés adverses soient utilisés, puis tombe sur leur carry depuis un flanc.');
  } else if (t.dps >= 3 && t.range === 'R') {
    out.push('Tu es le DPS principal : reste derrière ta frontline et tape ce qui est à portée en sécurité. Survivre > tout.');
  } else if (t.poke >= 3) {
    out.push('Tu es le poke : affaiblis l’ennemi avant le combat, et ne laisse pas leur engage t’atteindre.');
  } else if (t.split >= 3) {
    out.push('Tu es le split pusher : mets la pression en side lane et ne rejoins que si ton équipe peut forcer un objectif.');
  } else {
    out.push('Joue avec ton équipe : entre dans le combat après l’engage et focus la cible la plus proche.');
  }
  if (divers.length && t.tank <= 1 && t.mobility <= 1) {
    out.push(`Positionne-toi loin de ${names(divers.slice(0, 2))} : ils vont te chercher.`);
  }
  return out;
}

function buildHints(me: Resolved, enemyP: TeamProfile, enemy: Resolved[]): string[] {
  const out: string[] = [];
  const t = me.t;
  const defensive = t.tank >= 2;
  if (enemyP.physicalPct >= 65) out.push(`Ennemi majoritairement AD (${enemyP.physicalPct}%) : bottes Plaquées${defensive ? ' et objets d’armure' : ''} sont rentables.`);
  else if (enemyP.physicalPct <= 35) out.push(`Ennemi majoritairement AP (${100 - enemyP.physicalPct}%) : Mercures${defensive ? ' et objets de résistance magique' : ''} sont rentables.`);
  const heal = enemy.filter((c) => c.t.tags.includes('heal') || c.t.sustain >= 3);
  if (heal.length && (t.dps >= 2 || t.burst >= 2)) out.push(`Anti-heal à prévoir contre ${names(heal)}.`);
  const ptcc = withTag(enemy, 'ptcc');
  if (ptcc.length >= 2 && isCarry(me)) out.push(`QSS / Mercures contre les CC ciblés de ${names(ptcc)}.`);
  const assassins = enemy.filter((c) => c.t.burst >= 3 && c.t.mobility >= 2);
  if (assassins.length && isCarry(me) && t.damage !== 'AD') out.push(`Sablier de Zhonya contre ${names(assassins)}.`);
  if (assassins.length && isCarry(me) && t.damage === 'AD') out.push(`Ange gardien ou objet défensif (Lame de Mercure, Danse de la mort) contre ${names(assassins)}.`);
  const tanks = enemy.filter((c) => c.t.tank >= 3);
  if (tanks.length >= 2 && (t.dps >= 2 || t.burst >= 2)) out.push(`${names(tanks)} : prévois de la pénétration (${t.damage === 'AP' ? 'Bâton du vide' : 'Rappel mortel / Lord Dominik'}).`);
  const stealth = withTag(enemy, 'stealth');
  if (stealth.length) out.push('Pink ward à chaque retour (camouflage adverse).');
  return out;
}

function roleTips(role: Role, me: Resolved, ally: Resolved[], enemy: Resolved[], allyP: TeamProfile, enemyP: TeamProfile): string[] {
  const out: string[] = [];
  const t = me.t;
  const allyBot = [byRole(ally, 'BOTTOM'), byRole(ally, 'UTILITY')].filter(Boolean) as Resolved[];
  const enemyJg = byRole(enemy, 'JUNGLE');
  const allyLate = allyP.curve.late - enemyP.curve.late;

  switch (role) {
    case 'JUNGLE': {
      const targets = gankTargets(ally, enemy);
      if (targets.length) {
        out.push(`Plan de clear : commence côté opposé et termine ton premier clear vers ${targets[0]} pour un gank vers 3:15.`);
      }
      if (enemyJg && enemyJg.t.tags.includes('invade')) {
        out.push(`${enemyJg.t.name} aime invader : ward l'entrée de ta jungle vers 1:30 et 2:45.`);
      }
      out.push(`Objectifs : drake à ${formatTime(OBJECTIVES.firstDragon)}, Voidgrubs à ${formatTime(OBJECTIVES.voidgrubs)} (une seule fois, disparaissent à ${formatTime(OBJECTIVES.voidgrubsDespawn)}), Héraut à ${formatTime(OBJECTIVES.herald)}, Baron à ${formatTime(OBJECTIVES.baron)}. Choisis selon la priorité de tes laners.`);
      if (allyP.scores.split >= enemyP.scores.split) out.push('Les Voidgrubs servent bien votre compo (pression sur les tours).');
      if (allyLate >= 0.3) out.push('Ta compo scale : prends les drakes en sécurité, l’âme du dragon est une vraie condition de victoire.');
      if (allyLate <= -0.3) out.push('Ta compo doit accélérer : enchaîne ganks + objectifs, ne fais pas que farm.');
      break;
    }
    case 'MIDDLE': {
      if (t.tags.includes('roam') || t.mobility >= 3) out.push('Ton champion roam bien : pousse la vague puis va aider bot/top ou sécurise le scuttle avec ton jungler.');
      else out.push('Garde la priorité de ta vague : elle permet à ton jungler de contester les scuttles et les drakes.');
      out.push('Suis les mouvements de ton jungler : si un objectif se lance, sois le premier arrivé.');
      if (t.waveclear >= 3) out.push('Ton waveclear te permet de tenir le mid seul en mid game pendant que les autres jouent les objectifs.');
      break;
    }
    case 'TOP': {
      if (t.split >= 3) out.push('Après 14 min, mets la pression en side lane : force au moins un ennemi à venir te répondre.');
      else out.push('Après la phase de lane, rejoins ton équipe pour les objectifs : ton TP doit servir les drakes et le Baron (20:00).');
      out.push(`Les Voidgrubs (${formatTime(OBJECTIVES.voidgrubs)}, une seule fois) puis le Héraut (${formatTime(OBJECTIVES.herald)}) se jouent avec toi : garde la priorité sur ta vague à ces moments-là.`);
      if (t.tank >= 3) out.push('Tu es la frontline : achète tes objets défensifs en fonction des dégâts adverses.');
      break;
    }
    case 'BOTTOM': {
      out.push('Farm prioritaire : chaque vague manquée retarde ton pic de puissance.');
      out.push(`Pousse ta vague avant chaque drake (${formatTime(OBJECTIVES.firstDragon)} puis toutes les 5 min après un drake).`);
      const divers = enemy.filter((c) => c.t.tags.includes('dive') || (c.t.burst >= 3 && c.t.mobility >= 2));
      if (divers.length) out.push(`${names(divers)} vont te chercher en teamfight : ne fais jamais le premier pas en avant.`);
      break;
    }
    case 'UTILITY': {
      if (t.engage >= 3) out.push('Tu as l’engage : cherche le moment où l’ADC adverse est hors de position ou a utilisé son Flash.');
      if (t.peel >= 3) out.push(`Reste collé à ${allyBot.find((c) => c.role === 'BOTTOM')?.t.name ?? 'ton ADC'} en teamfight : ton peel gagne les combats.`);
      if (t.tags.includes('roam') || t.mobility >= 3) out.push('Roam mid après avoir poussé ou pris le back : un kill mid ouvre toute la carte.');
      out.push('Vision : ward la rivière avant chaque drake (dès 4:00) et utilise l’Oracle Lens autour des objectifs.');
      break;
    }
  }
  return out;
}

export function buildPersonalPlan(
  ally: Resolved[],
  enemy: Resolved[],
  allyP: TeamProfile,
  enemyP: TeamProfile,
  matchups: LaneMatchup[],
): PersonalPlan {
  const me = ally.find((c) => c.isLocal);
  const role = me?.role ?? null;
  const base: PersonalPlan = {
    role,
    champion: me?.t.name ?? null,
    headline: '',
    laning: [],
    roleTips: [],
    teamfight: [],
    build: [],
    threats: threats(enemy),
    focus: focusTargets(enemy),
  };
  if (!me || !role) {
    base.headline = 'Choisis ton champion pour obtenir un plan personnalisé.';
    return base;
  }
  const myLane = matchups.find((m) => m.isMyLane);
  const winCondition = allyP.winConditions[0] ?? '';
  const where = role === 'JUNGLE' ? 'dans le duel de junglers' : 'en lane';
  base.headline = `${me.t.name} ${ROLE_LABELS[role]} — ${myLane ? `${myLane.verdict.toLowerCase()} ${where}. ` : ''}Identité de votre compo : ${allyP.identity}. ${winCondition}`;
  base.laning = myLane ? [myLane.summary, ...myLane.tips] : [];
  base.roleTips = roleTips(role, me, ally, enemy, allyP, enemyP);
  base.teamfight = teamfightRole(me, ally, enemy);
  base.build = buildHints(me, enemyP, enemy);
  return base;
}
