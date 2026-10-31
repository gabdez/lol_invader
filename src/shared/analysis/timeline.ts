import { OBJECTIVES } from '../objectives';
import type { PhasePlan, TeamProfile, TimelineEntry } from '../types';
import { byRole, formatTime, names, withTag, type Resolved } from './util';

function adv(diff: number): 'ally' | 'enemy' | 'even' {
  if (diff >= 0.2) return 'ally';
  if (diff <= -0.2) return 'enemy';
  return 'even';
}

/** Prioritise drakes or grubs depending on which side lanes are stronger. */
function objectiveSide(ally: Resolved[], enemy: Resolved[]): 'bot' | 'top' | 'none' {
  const power = (team: Resolved[], roles: string[]) =>
    team.filter((c) => c.role && roles.includes(c.role)).reduce((s, c) => s + c.t.early + c.t.engage * 0.3, 0);
  const bot = power(ally, ['BOTTOM', 'UTILITY']) - power(enemy, ['BOTTOM', 'UTILITY']);
  const top = power(ally, ['TOP']) - power(enemy, ['TOP']);
  if (bot >= 0.8 && bot >= top) return 'bot';
  if (top >= 0.6) return 'top';
  if (bot >= 0.4) return 'bot';
  return 'none';
}

export function buildPhases(ally: Resolved[], enemy: Resolved[], a: TeamProfile, e: TeamProfile): PhasePlan[] {
  const early = adv(a.curve.early - e.curve.early);
  const mid = adv(a.curve.mid - e.curve.mid);
  const late = adv(a.curve.late - e.curve.late);
  const side = objectiveSide(ally, enemy);
  const myHyper = withTag(ally, 'hyper');
  const theirHyper = withTag(enemy, 'hyper');
  const allySplit = ally.filter((c) => c.t.split === 3);
  const topArchetype = a.archetypes[0]?.id;

  const earlyActions: string[] = [];
  if (early === 'ally') {
    earlyActions.push('Jouez agressif : trades en lane, invades du jungler soutenues par mid/support.');
    earlyActions.push('Prenez les plaques de tour avant 14:00 : c’est de l’or gratuit pour votre fenêtre de puissance.');
  } else if (early === 'enemy') {
    earlyActions.push("Survivez à l'early : wards défensives, pas de facecheck, ne contestez pas les invades.");
    earlyActions.push('Cédez un drake plutôt que de prendre un combat défavorable à 4v5.');
  } else {
    earlyActions.push('Early équilibré : la priorité des lanes décide des objectifs. Poussez avant de bouger.');
  }
  if (side === 'bot') earlyActions.push(`Votre bot lane a l'avantage : jouez les premiers drakes (${formatTime(OBJECTIVES.firstDragon)}).`);
  if (side === 'top') earlyActions.push(`Votre top side est plus fort : priorisez les Voidgrubs (${formatTime(OBJECTIVES.voidgrubs)}).`);

  const midActions: string[] = [];
  if (mid === 'ally') midActions.push('Groupez autour des objectifs (drakes, Atakhan, Herald) et forcez les combats quand vos objets sont là.');
  else if (mid === 'enemy') midActions.push('Évitez les combats à 5 sans avantage : farmez les side lanes en sécurité et punissez les erreurs.');
  else midActions.push('Mid game équilibré : la vision autour des objectifs fait la différence.');
  if (topArchetype === 'pick') midActions.push('Placez de la vision profonde et cherchez les catchs sur les joueurs qui farment seuls.');
  if (topArchetype === 'poke') midActions.push('Poke avant chaque objectif : ne lancez le drake/Baron que quand l’ennemi est affaibli.');
  if (topArchetype === 'engage' || topArchetype === 'dive') midActions.push('Engagez sur les objectifs : forcez l’ennemi à se battre dans les couloirs étroits de la jungle.');
  if (allySplit.length) midActions.push(`${names(allySplit)} peut split push pendant que le reste de l'équipe menace un objectif.`);

  const lateActions: string[] = [];
  if (late === 'ally') lateActions.push('Votre compo est plus forte en late : jouez safe, attendez la faute adverse puis prenez Baron/Elder.');
  else if (late === 'enemy') lateActions.push("L'ennemi est plus fort en late : chaque combat est risqué, misez sur un pick avant les objectifs majeurs.");
  else lateActions.push('Late équilibré : une seule erreur de positionnement peut décider la partie, restez groupés.');
  if (myHyper.length) lateActions.push(`Tout tourne autour de ${names(myHyper)} : protégez-le, il gagne les fights à 3 objets.`);
  if (theirHyper.length) lateActions.push(`Ciblez ou bloquez ${names(theirHyper)} en priorité dans chaque combat.`);
  lateActions.push('Ne vous faites jamais attraper seul avant un Baron ou un Elder : une mort = un objectif perdu.');

  return [
    { phase: 'early', label: 'Early game', window: '0 - 14 min', advantage: early, actions: earlyActions },
    { phase: 'mid', label: 'Mid game', window: '14 - 25 min', advantage: mid, actions: midActions },
    { phase: 'late', label: 'Late game', window: '25 min +', advantage: late, actions: lateActions },
  ];
}

export function buildTimeline(ally: Resolved[], enemy: Resolved[], a: TeamProfile, e: TeamProfile): TimelineEntry[] {
  const t: TimelineEntry[] = [];
  const allyJg = byRole(ally, 'JUNGLE');
  const enemyJg = byRole(enemy, 'JUNGLE');
  const allyEarly = ally.reduce((s, c) => s + c.t.early, 0);
  const enemyEarly = enemy.reduce((s, c) => s + c.t.early, 0);

  if (allyEarly - enemyEarly >= 2) {
    t.push({ time: '00:00', startSec: 0, severity: 'good', title: 'Invade niveau 1 possible', detail: 'Votre compo est plus forte au niveau 1 : une invade groupée sur le buff adverse est envisageable.' });
  } else if (enemyEarly - allyEarly >= 2) {
    t.push({ time: '00:00', startSec: 0, severity: 'warning', title: 'Attention invade niveau 1', detail: "L'ennemi est plus fort niveau 1 : wardez l'entrée de votre jungle et restez groupés jusqu'à 1:30." });
  }
  if (allyJg && enemyJg) {
    const duel = allyJg.t.early - enemyJg.t.early + (allyJg.t.tags.includes('invade') ? 0.5 : 0) - (enemyJg.t.tags.includes('invade') ? 0.5 : 0);
    t.push({
      time: '03:15',
      startSec: 195,
      severity: duel > 0 ? 'good' : duel < 0 ? 'warning' : 'info',
      title: 'Fin du premier clear / scuttles',
      detail:
        duel > 0
          ? `${allyJg.t.name} gagne le duel contre ${enemyJg.t.name} : conteste le scuttle et punis son pathing.`
          : duel < 0
            ? `${enemyJg.t.name} est plus fort tôt : premier gank ou scuttle risqué, les laners doivent couvrir ${allyJg.t.name}.`
            : 'Premiers ganks et scuttles : la lane avec la priorité doit aider son jungler.',
    });
  }
  t.push({
    time: formatTime(OBJECTIVES.firstDragon),
    startSec: OBJECTIVES.firstDragon,
    severity: 'info',
    title: 'Premier drake',
    detail: 'Poussez bot et mid 45 s avant, placez la vision autour de la rivière. Ne le contestez qu’avec la priorité.',
  });
  const spikes6 = [...ally, ...enemy].filter((c) => c.t.burst >= 3 || c.t.engage >= 3 || c.t.tags.includes('global'));
  const ally6 = spikes6.filter((c) => ally.includes(c));
  const enemy6 = spikes6.filter((c) => enemy.includes(c));
  if (spikes6.length) {
    t.push({
      time: '~06:00',
      startSec: 360,
      severity: 'warning',
      title: 'Pics de puissance niveau 6',
      detail: [
        ally6.length ? `Vous : ${names(ally6)}.` : '',
        enemy6.length ? `Ennemis : ${names(enemy6)} — respectez leurs ultimes (kill threat / engage / TP + ult).` : '',
      ].filter(Boolean).join(' '),
    });
  }
  t.push({
    time: formatTime(OBJECTIVES.voidgrubs),
    startSec: OBJECTIVES.voidgrubs,
    severity: 'info',
    title: 'Voidgrubs',
    detail: 'Utiles aux compos qui split/push des tours. Le top et le jungler doivent avoir la priorité côté top.',
  });
  t.push({
    time: '10:00-13:00',
    startSec: 600,
    severity: 'info',
    title: 'Premiers objets complets',
    detail: 'Les premiers objets légendaires changent les rapports de force : vérifiez qui a back avec beaucoup d’or avant de combattre.',
  });
  t.push({
    time: formatTime(OBJECTIVES.platesFall),
    startSec: OBJECTIVES.platesFall,
    severity: 'info',
    title: 'Fin des plaques de tour',
    detail: 'Les plaques tombent : les laners commencent à bouger vers les objectifs, c’est le début du mid game.',
  });
  t.push({
    time: formatTime(OBJECTIVES.herald),
    startSec: OBJECTIVES.herald,
    severity: 'info',
    title: 'Héraut de la Faille',
    detail: 'Idéal pour ouvrir une tour externe et étendre la carte.',
  });
  const midDiff = a.curve.mid - e.curve.mid;
  t.push({
    time: formatTime(OBJECTIVES.atakhan),
    startSec: OBJECTIVES.atakhan,
    severity: midDiff >= 0.2 ? 'good' : midDiff <= -0.2 ? 'warning' : 'info',
    title: 'Atakhan',
    detail:
      midDiff >= 0.2
        ? 'Vous êtes plus forts en mid game : forcez le combat autour d’Atakhan.'
        : midDiff <= -0.2
          ? "L'ennemi est plus fort à ce moment : ne le contestez qu'avec un avantage numérique."
          : 'Objectif équilibré : préparez la vision 1 minute avant.',
  });
  const lateDiff = a.curve.late - e.curve.late;
  t.push({
    time: formatTime(OBJECTIVES.baron),
    startSec: OBJECTIVES.baron,
    severity: lateDiff >= 0.2 ? 'good' : lateDiff <= -0.2 ? 'danger' : 'info',
    title: 'Baron Nashor',
    detail:
      lateDiff >= 0.2
        ? 'Votre compo prend le dessus : jouez Baron après un pick ou un combat gagné.'
        : lateDiff <= -0.2
          ? "L'ennemi devient plus fort : surveillez le Baron, ne laissez pas leur compo l'obtenir gratuitement."
          : 'Baron = fin de partie possible : vision et regroupement avant tout.',
  });
  const hyper = [...withTag(ally, 'hyper'), ...withTag(enemy, 'hyper')];
  if (hyper.length) {
    t.push({
      time: '~30:00',
      startSec: 1800,
      severity: withTag(enemy, 'hyper').length ? 'danger' : 'good',
      title: 'Hyper carries à 3 objets',
      detail: `${names(hyper)} atteint son pic de puissance.`,
    });
  }
  return t.sort((x, y) => x.startSec - y.startSec);
}
