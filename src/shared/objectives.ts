// Objective timings (seconds of game time) for the 2026 season (Season 16, patch 26.x).
//
// 2026 changes (patch 26.1): Atakhan removed, Baron back to 20:00.
// Voidgrubs: a single camp of 3 at 8:00, no respawn, gone at 14:45 if untaken.
// Rift Herald: once at 15:00, despawns at 19:45 (Baron spawns in the same pit at 20:00).
// If Riot changes the map again, only this file needs to be updated.

export const OBJECTIVES = {
  firstDragon: 5 * 60,
  dragonRespawn: 5 * 60,
  elderRespawn: 6 * 60,
  voidgrubs: 8 * 60,
  voidgrubsDespawn: 14 * 60 + 45,
  platesFall: 14 * 60,
  herald: 15 * 60,
  heraldDespawn: 19 * 60 + 45,
  baron: 20 * 60,
  baronRespawn: 6 * 60,
};
