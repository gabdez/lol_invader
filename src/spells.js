export default {
  barrier: {
    id: "barrier",
    name: "Barrier",
    description:
      "Shields your champion from 115-455 damage (depending on champion level) for 2 seconds.",
    tooltip:
      "Temporarily shields {{ f1 }} damage from your champion for 2 seconds.",
    cooldown: 180,
    datavalues: {},
    key: "21",
    summonerLevel: 4,
    maxammo: "-1",
    icon:
      "http://ddragon.leagueoflegends.com/cdn/8.11.1/img/spell/SummonerBarrier.png",
    sprite: {
      url:
        "http://ddragon.leagueoflegends.com/cdn/8.11.1/img/sprite/spell0.png",
      x: 0,
      y: 0
    }
  },
  cleanse: {
    id: "boost",
    name: "Cleanse",
    description:
      "Removes all disables (excluding suppression and airborne) and summoner spell debuffs affecting your champion and lowers the duration of incoming disables by 65% for 3 seconds.",
    tooltip:
      "Removes all disables (excluding suppression and airborne) and summoner spell debuffs affecting your champion and reduces the duration of disables by 65% for the next {{ f1 }} seconds.",
    cooldown: 210,
    datavalues: {},
    key: "1",
    summonerLevel: 9,
    maxammo: "-1",
    icon:
      "http://ddragon.leagueoflegends.com/cdn/8.11.1/img/spell/SummonerBoost.png",
    sprite: {
      url:
        "http://ddragon.leagueoflegends.com/cdn/8.11.1/img/sprite/spell0.png",
      x: 48,
      y: 0
    }
  },
  ignite: {
    id: "dot",
    name: "Ignite",
    description:
      "Ignites target enemy champion, dealing 80-505 true damage (depending on champion level) over 5 seconds, grants you vision of the target, and reduces healing effects on them for the duration.",
    tooltip:
      'Ignite deals <span class="colorFEFCFF">{{ f1 }}</span> true damage to target enemy champion over 5 seconds, grants you vision of the target and applies Grievous Wounds for the duration.<br /><br /><rules>(Grievous Wounds reduces healing effects by 40%. This vision does not reveal stealthed enemies.)</rules>',
    cooldown: 210,
    datavalues: {},
    key: "14",
    summonerLevel: 9,
    maxammo: "-1",
    icon:
      "http://ddragon.leagueoflegends.com/cdn/8.11.1/img/spell/SummonerDot.png",
    sprite: {
      url:
        "http://ddragon.leagueoflegends.com/cdn/8.11.1/img/sprite/spell0.png",
      x: 192,
      y: 0
    }
  },
  exhaust: {
    id: "exhaust",
    name: "Exhaust",
    description:
      "Exhausts target enemy champion, reducing their Movement Speed by 30%, and their damage dealt by 40% for 2.5 seconds.",
    tooltip:
      "Exhausts target enemy champion, reducing their Movement Speed by {{ f3 }}%, and their damage dealt by {{ f2 }}% for 2.5 seconds.",
    cooldown: 210,
    datavalues: {},
    key: "3",
    summonerLevel: 4,
    maxammo: "-1",
    icon:
      "http://ddragon.leagueoflegends.com/cdn/8.11.1/img/spell/SummonerExhaust.png",
    sprite: {
      url:
        "http://ddragon.leagueoflegends.com/cdn/8.11.1/img/sprite/spell0.png",
      x: 240,
      y: 0
    }
  },
  flash: {
    id: "flash",
    name: "Flash",
    description:
      "Teleports your champion a short distance toward your cursor's location.",
    tooltip:
      "Teleports your champion a short distance toward your cursor's location.",
    cooldown: 300,
    datavalues: {},
    key: "4",
    summonerLevel: 7,
    maxammo: "-1",
    icon:
      "http://ddragon.leagueoflegends.com/cdn/8.11.1/img/spell/SummonerFlash.png",
    sprite: {
      url:
        "http://ddragon.leagueoflegends.com/cdn/8.11.1/img/sprite/spell0.png",
      x: 288,
      y: 0
    }
  },
  ghost: {
    id: "haste",
    name: "Ghost",
    description:
      "Your champion gains increased Movement Speed and can move through units for 10 seconds. Grants a maximum of 28-45% (depending on champion level) Movement Speed after accelerating for 2 seconds.",
    tooltip:
      "Your champion gains increased Movement Speed and can move through units for 10 seconds. Grants a maximum of {{ f1 }}% Movement Speed after accelerating for 2 seconds.",
    cooldown: 180,
    datavalues: {},
    key: "6",
    summonerLevel: 1,
    maxammo: "-1",
    icon:
      "http://ddragon.leagueoflegends.com/cdn/8.11.1/img/spell/SummonerHaste.png",
    sprite: {
      url:
        "http://ddragon.leagueoflegends.com/cdn/8.11.1/img/sprite/spell0.png",
      x: 336,
      y: 0
    }
  },
  heal: {
    id: "heal",
    name: "Heal",
    description:
      "Restores 90-345 Health (depending on champion level) and grants 30% Movement Speed for 1 second to you and target allied champion. This healing is halved for units recently affected by Summoner Heal.",
    tooltip:
      'Restores {{ f1 }} Health and grants 30% Movement Speed for 1 second to your champion and target allied champion. This healing is halved for units recently affected by Summoner Heal.<br /><br /><span class="colorFFFF00">If this spell cannot find a target, it will cast on the most wounded allied champion in range.</span>',
    cooldown: 270,
    datavalues: {},
    key: "7",
    summonerLevel: 1,
    maxammo: "-1",
    icon:
      "http://ddragon.leagueoflegends.com/cdn/8.11.1/img/spell/SummonerHeal.png",
    sprite: {
      url:
        "http://ddragon.leagueoflegends.com/cdn/8.11.1/img/sprite/spell0.png",
      x: 384,
      y: 0
    }
  },
  smite: {
    id: "smite",
    name: "Smite",
    description:
      "Deals 390-1000 true damage (depending on champion level) to target epic, large, or medium monster or enemy minion. Restores Health based on your maximum life when used against monsters.",
    tooltip:
      'Deals <span class="colorFEFCFF">{{ f1 }}</span> true damage to target epic, large, or medium monster or enemy minion.  Against monsters, additionally restores <span class="colorFFFFFF">{{ f6 }}</span> <span class="colorFF6666">(+{{ f7 }})</span> Health.<br /><br />Smite regains a charge every {{ ammorechargetime }} seconds, up to a maximum of 2 charges.',
    cooldown: 15,
    datavalues: {},
    key: "11",
    summonerLevel: 9,
    maxammo: "2",
    icon:
      "http://ddragon.leagueoflegends.com/cdn/8.11.1/img/spell/SummonerSmite.png",
    sprite: {
      url:
        "http://ddragon.leagueoflegends.com/cdn/8.11.1/img/sprite/spell0.png",
      x: 192,
      y: 48
    }
  },
  teleport: {
    id: "teleport",
    name: "Teleport",
    description:
      "After channeling for 4.5 seconds, teleports your champion to target allied structure, minion, or ward.",
    tooltip:
      "After channeling for {{ f1 }} seconds, your champion teleports to target allied structure, minion, or ward.<br /><br />You may reactivate Teleport to cancel it, placing it on a {{ f3 }} second cooldown.",
    cooldown: 300,
    datavalues: {},
    key: "12",
    summonerLevel: 7,
    maxammo: "-1",
    icon:
      "http://ddragon.leagueoflegends.com/cdn/8.11.1/img/spell/SummonerTeleport.png",
    sprite: {
      url:
        "http://ddragon.leagueoflegends.com/cdn/8.11.1/img/sprite/spell0.png",
      x: 336,
      y: 48
    }
  }
};
