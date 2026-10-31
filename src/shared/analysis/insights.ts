import type { Insight, TeamProfile } from '../types';
import { names, withTag, type Resolved } from './util';

/** Global strengths / weaknesses comparing both compositions. */
export function buildInsights(
  ally: Resolved[],
  enemy: Resolved[],
  allyP: TeamProfile,
  enemyP: TeamProfile,
): Insight[] {
  const out: Insight[] = [];
  if (!ally.length || !enemy.length) return out;

  // --- Power curve ---------------------------------------------------------
  const earlyDiff = allyP.curve.early - enemyP.curve.early;
  const lateDiff = allyP.curve.late - enemyP.curve.late;
  if (earlyDiff >= 0.3 && lateDiff <= 0) {
    out.push({
      severity: 'good',
      title: 'Vous êtes plus forts tôt',
      detail:
        "Votre fenêtre de puissance est l'early/mid game. Jouez agressif : invades, plongées, drakes et grubs. L'ennemi scale mieux, il faut finir ou étouffer la partie avant 25-30 min.",
    });
  } else if (lateDiff >= 0.3 && earlyDiff <= 0) {
    out.push({
      severity: 'info',
      title: 'Vous scalez mieux',
      detail:
        "L'ennemi est plus fort en début de partie. Ne forcez rien avant vos objets clés, cédez un objectif plutôt que de prendre un combat défavorable, et jouez les teamfights après 25 min.",
    });
  } else if (earlyDiff >= 0.3 && lateDiff >= 0.3) {
    out.push({
      severity: 'good',
      title: 'Avantage sur toute la partie',
      detail: 'Votre compo est plus forte tôt ET en late. Évitez les erreurs et les combats dispersés : jouez proprement.',
    });
  } else if (earlyDiff <= -0.3 && lateDiff <= -0.3) {
    out.push({
      severity: 'warning',
      title: 'Compo ennemie solide à tous les stades',
      detail:
        "Il faudra jouer sur l'exécution : picks, mauvais positionnements adverses, et votre condition de victoire spécifique.",
    });
  }

  // --- Damage profile ------------------------------------------------------
  if (allyP.physicalPct >= 78) {
    out.push({
      severity: 'warning',
      title: 'Dégâts trop physiques',
      detail: `${allyP.physicalPct}% de vos dégâts sont physiques : l'ennemi peut stacker de l'armure. Privilégiez la pénétration d'armure.`,
    });
  } else if (allyP.physicalPct <= 25) {
    out.push({
      severity: 'warning',
      title: 'Dégâts trop magiques',
      detail: `${100 - allyP.physicalPct}% de vos dégâts sont magiques : l'ennemi peut stacker de la résistance magique. Pensez pénétration magique.`,
    });
  }
  if (enemyP.physicalPct >= 75) {
    out.push({
      severity: 'good',
      title: 'Ennemi très AD',
      detail: `${enemyP.physicalPct}% des dégâts adverses sont physiques : l'armure (bottes Plaquées, objets d'armure) est très rentable.`,
    });
  } else if (enemyP.physicalPct <= 30) {
    out.push({
      severity: 'good',
      title: 'Ennemi très AP',
      detail: `${100 - enemyP.physicalPct}% des dégâts adverses sont magiques : la résistance magique (Mercures, objets RM) est très rentable.`,
    });
  }

  // --- Frontline / engage --------------------------------------------------
  if (allyP.scores.frontline <= 3 && enemyP.scores.engage >= 8) {
    out.push({
      severity: 'danger',
      title: 'Peu de frontline face à beaucoup d’engage',
      detail:
        "L'ennemi peut engager sur vous sans que personne n'absorbe. Restez groupés, gardez vos sorts défensifs (Flash, Zhonya) et ne facecheckez jamais.",
    });
  } else if (allyP.scores.frontline <= 3) {
    out.push({
      severity: 'warning',
      title: 'Peu de frontline',
      detail: 'Votre compo manque de tank : évitez les combats prolongés de face, préférez le kiting et les flancs.',
    });
  }
  if (allyP.scores.engage <= 4 && enemyP.scores.poke >= 8) {
    out.push({
      severity: 'danger',
      title: 'Ils poke, vous ne pouvez pas engager',
      detail:
        "Les sièges adverses vont vous user. Ne restez pas sous la tour à vous faire poke : contestez la vision tôt, ou cédez la tour et prenez de l'espace ailleurs.",
    });
  }
  if (allyP.scores.engage >= 9 && enemyP.scores.peel <= 5) {
    out.push({
      severity: 'good',
      title: 'Engage puissant',
      detail: 'Votre engage est fort et l’ennemi manque de peel : cherchez les combats à 5 autour des objectifs.',
    });
  }
  if (allyP.scores.waveclear <= 7) {
    out.push({
      severity: 'warning',
      title: 'Waveclear faible',
      detail: 'Vous aurez du mal à défendre un siège : ne laissez pas les vagues s’accumuler et évitez de perdre les tours externes tôt.',
    });
  }

  // --- Specific mechanics ----------------------------------------------------
  const heal = withTag(enemy, 'heal').concat(enemy.filter((c) => c.t.sustain >= 3 && !c.t.tags.includes('heal')));
  if (heal.length) {
    out.push({
      severity: 'warning',
      title: 'Anti-heal nécessaire',
      detail: `${names(heal)} ${heal.length > 1 ? 'ont' : 'a'} beaucoup de soins : achetez un objet de Blessures graves tôt (Ignite, Morellonomicon, Mortal Reminder, Chempunk, Thornmail…).`,
    });
  }
  const stealth = withTag(enemy, 'stealth');
  if (stealth.length) {
    out.push({
      severity: 'info',
      title: 'Camouflage adverse',
      detail: `${names(stealth)} : Pink wards et Oracle Lens indispensables, surtout autour des objectifs.`,
    });
  }
  const ptcc = withTag(enemy, 'ptcc');
  if (ptcc.length >= 2) {
    out.push({
      severity: 'warning',
      title: 'Beaucoup de CC ciblés',
      detail: `${names(ptcc)} : vos carries devraient envisager Mercures / QSS (Ceinture-sabre de Mercure).`,
    });
  }
  const hyper = withTag(enemy, 'hyper').concat(withTag(enemy, 'scaling'));
  if (hyper.length) {
    out.push({
      severity: 'danger',
      title: 'Hyper carry adverse',
      detail: `${names(hyper)} devient très dangereux en late. Punissez-le tôt (ganks, dives) et visez une fin de partie avant qu'il ait 3 objets.`,
    });
  }
  const global = withTag(enemy, 'global');
  if (global.length) {
    out.push({
      severity: 'info',
      title: 'Ultimes globaux adverses',
      detail: `${names(global)} peut intervenir partout : surveillez leurs niveaux 6 et ne surpushez pas sans vision.`,
    });
  }
  const splitters = enemy.filter((c) => c.t.split === 3);
  if (splitters.length) {
    out.push({
      severity: 'info',
      title: 'Split pusher adverse',
      detail: `${names(splitters)} va splitpush en mid/late. Assignez un joueur capable de le tenir, ou forcez des objectifs à 5 contre 4 quand il est en side.`,
    });
  }
  const divers = withTag(enemy, 'dive');
  if (divers.length >= 2) {
    out.push({
      severity: 'warning',
      title: 'Plongeurs adverses',
      detail: `${names(divers)} vont plonger sur votre backline : vos carries doivent rester derrière leur frontline et garder leurs sorts défensifs.`,
    });
  }
  return out;
}
