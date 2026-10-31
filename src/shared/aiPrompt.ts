import { ROLE_LABELS, type GameAnalysis, type GameContext } from './types';

export const AI_SYSTEM_PROMPT = `Tu es un coach League of Legends de haut niveau (niveau Master+). Tu analyses une draft juste après la sélection des champions, pour un joueur qui va lancer la partie dans quelques secondes. La saison est 2026 (pas d'Atakhan, Baron à 20:00).

Ta réponse doit être en français, directement exploitable en jeu, et structurée en Markdown avec exactement ces sections :
## Résumé de la game
## Mon plan (rôle du joueur)
## Match-ups par lane
## Moments clés
## Teamfights

Règles :
- Sois concret : timings (minutes), niveaux, objets, cooldowns clés, positions sur la carte.
- Pour chaque lane, dis qui gagne la lane, pourquoi, et le principal piège à éviter.
- Le plan du joueur passe en premier en importance : adapte-le à son rôle et son champion.
- Les éléments fournis par l'analyse automatique sont des heuristiques : corrige-les si tu n'es pas d'accord.
- Reste concis : des puces courtes, pas de longs paragraphes. 350 à 600 mots au total.`;

export function buildAiUserPrompt(analysis: GameAnalysis, ctx: GameContext): string {
  const line = (p: { name: string; role: keyof typeof ROLE_LABELS | null }) =>
    `${p.role ? ROLE_LABELS[p.role] : 'Rôle inconnu'} : ${p.name || '(inconnu)'}`;
  const me = analysis.lineup.ally.find((p) => p.isLocalPlayer);
  const parts = [
    `Côté : ${ctx.side === 'blue' ? 'bleu' : ctx.side === 'red' ? 'rouge' : 'inconnu'}`,
    `Joueur : ${me ? `${me.name || 'champion pas encore choisi'} (${me.role ? ROLE_LABELS[me.role] : 'rôle inconnu'})` : 'inconnu'}`,
    '',
    'Mon équipe :',
    ...analysis.lineup.ally.map((p) => `- ${line(p)}${p.isLocalPlayer ? ' (MOI)' : ''}`),
    '',
    'Équipe adverse (rôles parfois déduits) :',
    ...analysis.lineup.enemy.map((p) => `- ${line(p)}`),
    '',
    'Analyse automatique (heuristique) :',
    `- Identité alliée : ${analysis.ally.identity} ; courbe early/mid/late ${analysis.ally.curve.early}/${analysis.ally.curve.mid}/${analysis.ally.curve.late} ; ${analysis.ally.physicalPct}% dégâts physiques`,
    `- Identité adverse : ${analysis.enemy.identity} ; courbe early/mid/late ${analysis.enemy.curve.early}/${analysis.enemy.curve.mid}/${analysis.enemy.curve.late} ; ${analysis.enemy.physicalPct}% dégâts physiques`,
    ...analysis.matchups.map((m) => `- ${m.lane} : ${m.allies.join(' + ')} vs ${m.enemies.join(' + ')} → ${m.verdict} (scaling ${m.scalingScore >= 0 ? '+' : ''}${m.scalingScore})`),
    ...analysis.insights.map((i) => `- ${i.title} : ${i.detail}`),
  ];
  return parts.join('\n');
}

/** Self-contained prompt to paste into a claude.ai conversation (no API key needed). */
export function buildClaudeAiPrompt(analysis: GameAnalysis, ctx: GameContext): string {
  return `${AI_SYSTEM_PROMPT}\n\nVoici la partie que je vais jouer :\n\n${buildAiUserPrompt(analysis, ctx)}`;
}
