# LoL Invader — coach de draft pour League of Legends

Application de bureau Windows (Electron + TypeScript) qui se connecte au client League of Legends
et analyse la partie **dès la sélection des champions** :

- **Équipes** : champions des deux côtés, mis à jour à chaque pick (hover, lock), rôles adverses déduits.
- **Mon plan** : plan personnalisé selon ton rôle et ton champion (lane, rôle, teamfights, cibles prioritaires,
  menaces, adaptations d'objets) + plan early / mid / late de la partie.
- **Match-ups** : verdict pour chaque lane (top, jungle, mid, bot 2v2), qui scale le mieux, et conseils concrets.
- **Compositions** : identité de chaque équipe (engage, poke, pick, split, dive, protect the carry…),
  conditions de victoire, profil de dégâts AD/AP, comparaison des forces.
- **Moments clés** : timeline (invade niveau 1, scuttles, drake, niveau 6, Voidgrubs, plaques, Héraut,
  Atakhan, Baron, pic des hyper carries) adaptée aux deux compos.
- **En partie** : chrono et prochains objectifs (drake, grubs, Héraut, Atakhan, Baron) depuis l'API live du jeu.
- **Analyse IA (optionnelle)** : avec une clé API Anthropic, Claude rédige un plan de jeu détaillé
  automatiquement quand les 10 champions sont lockés.
- **Draft manuelle** : saisis n'importe quelle draft pour l'analyser sans lancer de partie.

L'analyse de base est **100 % locale** (aucune clé, aucun compte nécessaire) : elle repose sur une base
de traits de champions (`src/shared/champions.ts`) et un moteur de règles (`src/shared/analysis/`).

## Installation (Windows)

Prérequis : [Node.js 20+](https://nodejs.org).

```bash
npm install
npm start          # lance l'application
npm run dist       # crée l'installateur + la version portable dans release/
```

Lance l'application avant ou pendant que le client LoL est ouvert : elle détecte le client automatiquement
(processus `LeagueClientUx.exe`, sinon le fichier `lockfile` du dossier d'installation — configurable
dans ⚙ Paramètres si League n'est pas dans `C:\Riot Games\League of Legends`).

## Comment ça marche

| Moment | Source de données |
| --- | --- |
| Sélection des champions | API du client (LCU) : `/lol-champ-select/v1/session` via WebSocket, temps réel |
| Écran de chargement | LCU : `/lol-gameflow/v1/session` |
| En partie | Live Client Data API : `https://127.0.0.1:2999/liveclientdata/allgamedata` |
| Noms / images des champions | Data Dragon (patch courant, mis en cache ; table intégrée hors ligne) |

Ces API sont locales et en lecture seule (Riot les met à disposition des applications tierces) :
l'application ne modifie rien dans le client ou le jeu.

Les rôles ennemis ne sont pas fournis par le client en sélection classée : ils sont déduits (rôles
habituels du champion, Smite une fois en jeu) et marqués « (déduit) ».

## Ajuster l'analyse

- `src/shared/champions.ts` : une ligne par champion (rôles, courbe de puissance early/mid/late, notes 0-3
  de CC, engage, poke, burst, DPS, tank, mobilité, sustain, waveclear, split push, peel, et des tags comme
  `hyper`, `invade`, `roam`, `heal`…). Les champions absents (nouvelles sorties) sont estimés à partir
  de leur classe Data Dragon.
- `src/shared/objectives.ts` : timings des objectifs (à mettre à jour si Riot change la carte).
- `src/shared/analysis/` : règles (profils d'équipe, match-ups, plan par rôle, timeline).

## Analyse IA

Dans ⚙ Paramètres, colle une clé API Anthropic (stockée chiffrée via le coffre de Windows). L'analyse
utilise le modèle `claude-opus-5-5` en streaming, avec le fallback côté serveur activé
(`fallbacks: "default"`). Elle peut être lancée à la main depuis l'onglet « Analyse IA ».

## Développement

```bash
npm test           # tests (moteur d'analyse, parsers, faux client LoL de bout en bout)
npm run typecheck
npm run preview    # aperçu de l'interface dans un navigateur (pont Electron simulé) → dist-preview/
```

Structure :

```
src/main/        processus principal Electron (connexion LCU, API live, Data Dragon, IA, paramètres)
src/preload/     pont sécurisé main ↔ interface
src/renderer/    interface (HTML/CSS/TS, sans framework)
src/shared/      moteur d'analyse, parsers et types (testables sans Electron)
test/            tests Vitest
```
