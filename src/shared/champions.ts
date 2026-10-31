// Curated champion knowledge used by the analysis engine.
//
// Each row:  [id, key, name, roles, damage, range, curve, stats, tags]
//   roles  : letters in order of preference  T=Top J=Jungle M=Mid B=Bottom(ADC) S=Support
//   curve  : 3 digits, power early / mid / late (1 weak .. 3 strong)
//   stats  : 11 digits (0..3) in this order:
//            cc, engage, poke, burst, dps, tank, mobility, sustain, waveclear, split, peel
//   tags   : space separated ChampionTag values
//
// Values are subjective coaching estimates, meant to be tuned. Champions missing from
// this table (new releases) get estimated traits from their Data Dragon class tags.

import type { ChampionInfo, ChampionTag, ChampionTraits, DamageType, RangeType, Role } from './types';

type Row = [string, number, string, string, DamageType, RangeType, string, string, string?];

const ROWS: Row[] = [
  ['Aatrox', 266, 'Aatrox', 'T', 'AD', 'M', '332', '22122123220', 'heal'],
  ['Ahri', 103, 'Ahri', 'M', 'AP', 'R', '232', '21231031301', 'pick roam'],
  ['Akali', 84, 'Akali', 'MT', 'AP', 'M', '232', '01132031220', 'dive stealth'],
  ['Akshan', 166, 'Akshan', 'MT', 'AD', 'R', '232', '00122020220', 'roam'],
  ['Alistar', 12, 'Alistar', 'S', 'AP', 'M', '231', '33010312003', 'ptcc'],
  ['Ambessa', 799, 'Ambessa', 'TM', 'AD', 'M', '332', '22022131220', 'dive'],
  ['Amumu', 32, 'Amumu', 'JS', 'AP', 'M', '232', '33012311201', ''],
  ['Anivia', 34, 'Anivia', 'M', 'AP', 'R', '123', '30212100302', ''],
  ['Annie', 1, 'Annie', 'MS', 'AP', 'R', '232', '32131000201', 'ptcc'],
  ['Aphelios', 523, 'Aphelios', 'B', 'AD', 'R', '123', '10113001300', 'hyper'],
  ['Ashe', 22, 'Ashe', 'BS', 'AD', 'R', '222', '32202000202', 'pick global'],
  ['AurelionSol', 136, 'Aurelion Sol', 'M', 'AP', 'R', '123', '21223020301', 'scaling'],
  ['Aurora', 893, 'Aurora', 'MT', 'AP', 'R', '232', '20231030211', ''],
  ['Azir', 268, 'Azir', 'M', 'AP', 'R', '123', '22213020312', 'hyper'],
  ['Bard', 432, 'Bard', 'S', 'AP', 'R', '222', '31210121002', 'roam'],
  ['Belveth', 200, "Bel'Veth", 'J', 'AD', 'M', '233', '11013132230', 'scaling'],
  ['Blitzcrank', 53, 'Blitzcrank', 'S', 'AP', 'M', '221', '33010210002', 'pick'],
  ['Brand', 63, 'Brand', 'SM', 'AP', 'R', '222', '21323000300', ''],
  ['Braum', 201, 'Braum', 'S', 'AD', 'M', '321', '32000310003', 'bully disengage'],
  ['Briar', 233, 'Briar', 'J', 'AD', 'M', '322', '22023123210', 'heal invade'],
  ['Caitlyn', 51, 'Caitlyn', 'B', 'AD', 'R', '322', '10313010211', 'bully'],
  ['Camille', 164, 'Camille', 'T', 'AD', 'M', '233', '22022131131', 'dive shred'],
  ['Cassiopeia', 69, 'Cassiopeia', 'M', 'AP', 'R', '223', '20113001302', ''],
  ['Chogath', 31, "Cho'Gath", 'TM', 'AP', 'M', '223', '31121302202', 'scaling'],
  ['Corki', 42, 'Corki', 'M', 'MIX', 'R', '123', '00322020200', ''],
  ['Darius', 122, 'Darius', 'T', 'AD', 'M', '332', '22013202220', 'bully'],
  ['Diana', 131, 'Diana', 'MJ', 'AP', 'M', '232', '23032121310', 'dive'],
  ['DrMundo', 36, 'Dr. Mundo', 'TJ', 'AD', 'M', '123', '11102303220', 'heal'],
  ['Draven', 119, 'Draven', 'B', 'AD', 'R', '322', '10033010200', 'bully'],
  ['Ekko', 245, 'Ekko', 'JM', 'AP', 'M', '232', '21031031220', 'dive'],
  ['Elise', 60, 'Elise', 'J', 'AP', 'R', '321', '21131021100', 'invade dive'],
  ['Evelynn', 28, 'Evelynn', 'J', 'AP', 'M', '132', '11031021100', 'stealth'],
  ['Ezreal', 81, 'Ezreal', 'B', 'AD', 'R', '232', '00322030200', ''],
  ['Fiddlesticks', 9, 'Fiddlesticks', 'J', 'AP', 'R', '232', '33022011200', ''],
  ['Fiora', 114, 'Fiora', 'T', 'AD', 'M', '233', '10023022130', 'shred'],
  ['Fizz', 105, 'Fizz', 'M', 'AP', 'M', '232', '11031030210', 'dive'],
  ['Galio', 3, 'Galio', 'MS', 'AP', 'M', '231', '33121310202', 'global'],
  ['Gangplank', 41, 'Gangplank', 'T', 'MIX', 'M', '123', '10332001320', 'global scaling'],
  ['Garen', 86, 'Garen', 'T', 'AD', 'M', '222', '11022212220', ''],
  ['Gnar', 150, 'Gnar', 'T', 'AD', 'R', '222', '33212220211', ''],
  ['Gragas', 79, 'Gragas', 'JTS', 'AP', 'M', '222', '33121221202', 'disengage'],
  ['Graves', 104, 'Graves', 'J', 'AD', 'R', '332', '00123121310', 'invade'],
  ['Gwen', 887, 'Gwen', 'T', 'AP', 'M', '223', '11013122230', 'shred'],
  ['Hecarim', 120, 'Hecarim', 'J', 'AD', 'M', '232', '33022232310', 'dive'],
  ['Heimerdinger', 74, 'Heimerdinger', 'MTS', 'AP', 'R', '321', '10322000311', 'bully'],
  ['Hwei', 910, 'Hwei', 'MS', 'AP', 'R', '223', '20322000302', ''],
  ['Illaoi', 420, 'Illaoi', 'T', 'AD', 'M', '222', '11113203320', 'heal'],
  ['Irelia', 39, 'Irelia', 'TM', 'AD', 'M', '232', '22023132220', 'dive'],
  ['Ivern', 427, 'Ivern', 'J', 'AP', 'R', '122', '21000111103', ''],
  ['Janna', 40, 'Janna', 'S', 'AP', 'R', '222', '30100012003', 'disengage'],
  ['JarvanIV', 59, 'Jarvan IV', 'J', 'AD', 'M', '321', '33021220201', 'invade dive'],
  ['Jax', 24, 'Jax', 'TJ', 'AD', 'M', '223', '22013221230', 'scaling'],
  ['Jayce', 126, 'Jayce', 'TM', 'AD', 'R', '321', '10331010220', 'bully'],
  ['Jhin', 202, 'Jhin', 'B', 'AD', 'R', '222', '20231000200', 'pick'],
  ['Jinx', 222, 'Jinx', 'B', 'AD', 'R', '123', '10113010301', 'hyper'],
  ['KSante', 897, "K'Sante", 'T', 'AD', 'M', '222', '32011321212', ''],
  ['Kaisa', 145, "Kai'Sa", 'B', 'MIX', 'R', '133', '01132030200', 'dive'],
  ['Kalista', 429, 'Kalista', 'B', 'AD', 'R', '321', '11013030201', 'bully'],
  ['Karma', 43, 'Karma', 'SM', 'AP', 'R', '321', '11311011203', 'bully'],
  ['Karthus', 30, 'Karthus', 'JM', 'AP', 'R', '123', '10123000300', 'global scaling'],
  ['Kassadin', 38, 'Kassadin', 'M', 'AP', 'M', '113', '10032131210', 'hyper'],
  ['Katarina', 55, 'Katarina', 'M', 'AP', 'M', '232', '00032030210', 'roam'],
  ['Kayle', 10, 'Kayle', 'T', 'AP', 'R', '113', '00113011321', 'hyper'],
  ['Kayn', 141, 'Kayn', 'J', 'AD', 'M', '133', '12032132200', 'dive'],
  ['Kennen', 85, 'Kennen', 'T', 'AP', 'R', '232', '33222020210', ''],
  ['Khazix', 121, "Kha'Zix", 'J', 'AD', 'M', '232', '00031031200', 'stealth'],
  ['Kindred', 203, 'Kindred', 'J', 'AD', 'R', '223', '10113020202', 'scaling'],
  ['Kled', 240, 'Kled', 'T', 'AD', 'M', '321', '23022121120', 'bully dive'],
  ['KogMaw', 96, "Kog'Maw", 'B', 'MIX', 'R', '123', '10203000200', 'hyper shred'],
  ['Leblanc', 7, 'LeBlanc', 'M', 'AP', 'R', '232', '20130030210', 'pick roam'],
  ['LeeSin', 64, 'Lee Sin', 'J', 'AD', 'M', '321', '22121131201', 'invade'],
  ['Leona', 89, 'Leona', 'S', 'AP', 'M', '321', '33010310002', 'bully dive'],
  ['Lillia', 876, 'Lillia', 'J', 'AP', 'M', '223', '21113132310', ''],
  ['Lissandra', 127, 'Lissandra', 'M', 'AP', 'R', '222', '33021110202', 'dive'],
  ['Lucian', 236, 'Lucian', 'BM', 'AD', 'R', '321', '00123020200', 'bully'],
  ['Lulu', 117, 'Lulu', 'S', 'AP', 'R', '222', '20100011103', ''],
  ['Lux', 99, 'Lux', 'SM', 'AP', 'R', '222', '20331000302', 'pick'],
  ['Malphite', 54, 'Malphite', 'TS', 'AP', 'M', '222', '33120310201', ''],
  ['Malzahar', 90, 'Malzahar', 'M', 'AP', 'R', '222', '31112000301', 'ptcc'],
  ['Maokai', 57, 'Maokai', 'SJT', 'AP', 'M', '222', '33101312202', ''],
  ['MasterYi', 11, 'Master Yi', 'J', 'AD', 'M', '123', '00013022220', 'hyper'],
  ['Mel', 800, 'Mel', 'MS', 'AP', 'R', '223', '10331010302', ''],
  ['Milio', 902, 'Milio', 'S', 'AP', 'R', '123', '10100012003', ''],
  ['MissFortune', 21, 'Miss Fortune', 'B', 'AD', 'R', '222', '10223010300', 'bully'],
  ['MonkeyKing', 62, 'Wukong', 'TJ', 'AD', 'M', '232', '33022221220', 'dive'],
  ['Mordekaiser', 82, 'Mordekaiser', 'T', 'AP', 'M', '222', '11113202220', ''],
  ['Morgana', 25, 'Morgana', 'SMJ', 'AP', 'R', '222', '31111000203', 'pick'],
  ['Naafiri', 950, 'Naafiri', 'M', 'AD', 'M', '321', '01131031210', 'roam dive'],
  ['Nami', 267, 'Nami', 'S', 'AP', 'R', '222', '31210012002', ''],
  ['Nasus', 75, 'Nasus', 'T', 'AD', 'M', '123', '10012202130', 'scaling'],
  ['Nautilus', 111, 'Nautilus', 'S', 'AP', 'M', '221', '33010310002', 'ptcc'],
  ['Neeko', 518, 'Neeko', 'MS', 'AP', 'R', '222', '33231010301', ''],
  ['Nidalee', 76, 'Nidalee', 'J', 'AP', 'R', '321', '00331031210', 'invade'],
  ['Nilah', 895, 'Nilah', 'B', 'AD', 'M', '133', '11013022201', 'hyper'],
  ['Nocturne', 56, 'Nocturne', 'JM', 'AD', 'M', '232', '23022122210', 'global dive'],
  ['Nunu', 20, 'Nunu & Willump', 'J', 'AP', 'M', '221', '32121322201', ''],
  ['Olaf', 2, 'Olaf', 'JT', 'AD', 'M', '331', '12113213210', 'invade heal'],
  ['Orianna', 61, 'Orianna', 'M', 'AP', 'R', '223', '32222000303', ''],
  ['Ornn', 516, 'Ornn', 'T', 'AP', 'M', '123', '33011301202', ''],
  ['Pantheon', 80, 'Pantheon', 'SMTJ', 'AD', 'M', '321', '22231110211', 'bully roam'],
  ['Poppy', 78, 'Poppy', 'TJS', 'AD', 'M', '222', '32021310113', ''],
  ['Pyke', 555, 'Pyke', 'S', 'AD', 'M', '221', '32030031000', 'pick roam'],
  ['Qiyana', 246, 'Qiyana', 'MJ', 'AD', 'M', '321', '32031030200', 'roam dive'],
  ['Quinn', 133, 'Quinn', 'T', 'AD', 'R', '321', '10132030130', 'roam bully'],
  ['Rakan', 497, 'Rakan', 'S', 'AP', 'M', '222', '33010131002', ''],
  ['Rammus', 33, 'Rammus', 'J', 'AP', 'M', '222', '33011320201', 'ptcc'],
  ['RekSai', 421, "Rek'Sai", 'J', 'AD', 'M', '321', '22022221200', 'invade'],
  ['Rell', 526, 'Rell', 'S', 'AP', 'M', '221', '33010320002', ''],
  ['Renata', 888, 'Renata Glasc', 'S', 'AP', 'R', '222', '21100011003', ''],
  ['Renekton', 58, 'Renekton', 'T', 'AD', 'M', '321', '22022222220', 'bully dive'],
  ['Rengar', 107, 'Rengar', 'JT', 'AD', 'M', '232', '11031031110', 'stealth'],
  ['Riven', 92, 'Riven', 'T', 'AD', 'M', '232', '21032131220', ''],
  ['Rumble', 68, 'Rumble', 'TM', 'AP', 'M', '222', '12123110310', 'bully'],
  ['Ryze', 13, 'Ryze', 'MT', 'AP', 'R', '123', '20113111311', 'scaling'],
  ['Samira', 360, 'Samira', 'B', 'AD', 'M', '232', '11033031200', 'dive'],
  ['Sejuani', 113, 'Sejuani', 'J', 'AP', 'M', '222', '33011311202', ''],
  ['Senna', 235, 'Senna', 'SB', 'AD', 'R', '223', '20312011102', 'scaling global'],
  ['Seraphine', 147, 'Seraphine', 'SM', 'AP', 'R', '223', '21212001303', ''],
  ['Sett', 875, 'Sett', 'TS', 'AD', 'M', '321', '22022211211', 'bully'],
  ['Shaco', 35, 'Shaco', 'JS', 'AD', 'M', '321', '10131020110', 'stealth invade'],
  ['Shen', 98, 'Shen', 'TS', 'AD', 'M', '222', '22011311133', 'global'],
  ['Shyvana', 102, 'Shyvana', 'J', 'MIX', 'M', '222', '11123221310', ''],
  ['Singed', 27, 'Singed', 'T', 'AP', 'M', '122', '21002220231', ''],
  ['Sion', 14, 'Sion', 'TS', 'AD', 'M', '123', '33011311221', 'scaling'],
  ['Sivir', 15, 'Sivir', 'B', 'AD', 'R', '223', '01103010301', ''],
  ['Skarner', 72, 'Skarner', 'JT', 'AP', 'M', '222', '33011321202', 'ptcc'],
  ['Smolder', 901, 'Smolder', 'BM', 'AD', 'R', '123', '00213011300', 'hyper scaling'],
  ['Sona', 37, 'Sona', 'S', 'AP', 'R', '123', '20211012102', 'scaling'],
  ['Soraka', 16, 'Soraka', 'S', 'AP', 'R', '222', '10100003003', 'heal global'],
  ['Swain', 50, 'Swain', 'SMT', 'AP', 'R', '222', '22113203201', 'heal'],
  ['Sylas', 517, 'Sylas', 'MJT', 'AP', 'M', '232', '22032123210', 'heal dive'],
  ['Syndra', 134, 'Syndra', 'M', 'AP', 'R', '232', '20230000301', 'pick'],
  ['TahmKench', 223, 'Tahm Kench', 'TS', 'AP', 'M', '222', '21012312113', ''],
  ['Taliyah', 163, 'Taliyah', 'JM', 'AP', 'R', '232', '21222020301', 'roam'],
  ['Talon', 91, 'Talon', 'MJ', 'AD', 'M', '321', '11031030210', 'roam'],
  ['Taric', 44, 'Taric', 'S', 'AP', 'M', '222', '21000202003', ''],
  ['Teemo', 17, 'Teemo', 'T', 'AP', 'R', '222', '10212010220', 'bully'],
  ['Thresh', 412, 'Thresh', 'S', 'AP', 'M', '222', '32010210003', 'pick'],
  ['Tristana', 18, 'Tristana', 'BM', 'AD', 'R', '223', '11123020311', ''],
  ['Trundle', 48, 'Trundle', 'JT', 'AD', 'M', '222', '11013212230', 'shred'],
  ['Tryndamere', 23, 'Tryndamere', 'T', 'AD', 'M', '233', '01013022230', ''],
  ['TwistedFate', 4, 'Twisted Fate', 'M', 'AP', 'R', '222', '20221010311', 'global roam pick'],
  ['Twitch', 29, 'Twitch', 'BJ', 'AD', 'R', '123', '10123010200', 'stealth hyper'],
  ['Udyr', 77, 'Udyr', 'JT', 'AD', 'M', '222', '22012222220', ''],
  ['Urgot', 6, 'Urgot', 'T', 'AD', 'M', '222', '21113202220', ''],
  ['Varus', 110, 'Varus', 'BM', 'AD', 'R', '222', '21322000301', ''],
  ['Vayne', 67, 'Vayne', 'BT', 'AD', 'R', '123', '10013021111', 'hyper shred'],
  ['Veigar', 45, 'Veigar', 'M', 'AP', 'R', '123', '31131000302', 'scaling'],
  ['Velkoz', 161, "Vel'Koz", 'MS', 'AP', 'R', '222', '20332000301', ''],
  ['Vex', 711, 'Vex', 'M', 'AP', 'R', '232', '22131020301', ''],
  ['Vi', 254, 'Vi', 'J', 'AD', 'M', '321', '33022221200', 'ptcc dive'],
  ['Viego', 234, 'Viego', 'J', 'AD', 'M', '232', '11023122210', ''],
  ['Viktor', 112, 'Viktor', 'M', 'AP', 'R', '123', '20223000302', ''],
  ['Vladimir', 8, 'Vladimir', 'MT', 'AP', 'M', '123', '01123113210', 'heal scaling'],
  ['Volibear', 106, 'Volibear', 'TJ', 'AD', 'M', '321', '23022222210', 'dive'],
  ['Warwick', 19, 'Warwick', 'JT', 'AD', 'M', '321', '32013223210', 'heal ptcc invade'],
  ['Xayah', 498, 'Xayah', 'B', 'AD', 'R', '223', '20123010301', ''],
  ['Xerath', 101, 'Xerath', 'MS', 'AP', 'R', '222', '20331000301', ''],
  ['XinZhao', 5, 'Xin Zhao', 'J', 'AD', 'M', '321', '23023122210', 'invade dive'],
  ['Yasuo', 157, 'Yasuo', 'MTB', 'AD', 'M', '223', '21123130320', ''],
  ['Yone', 777, 'Yone', 'MT', 'AD', 'M', '233', '22133131320', 'dive'],
  ['Yorick', 83, 'Yorick', 'T', 'AD', 'M', '223', '10013101230', ''],
  ['Yunara', 804, 'Yunara', 'B', 'AD', 'R', '123', '00113021300', 'hyper'],
  ['Yuumi', 350, 'Yuumi', 'S', 'AP', 'R', '123', '10100023003', 'heal'],
  ['Zac', 154, 'Zac', 'JT', 'AP', 'M', '222', '33011332201', 'dive'],
  ['Zed', 238, 'Zed', 'M', 'AD', 'M', '232', '01131030220', 'roam'],
  ['Zeri', 221, 'Zeri', 'B', 'AD', 'R', '123', '10113030200', 'hyper'],
  ['Ziggs', 115, 'Ziggs', 'MB', 'AP', 'R', '222', '10322010301', ''],
  ['Zilean', 26, 'Zilean', 'SM', 'AP', 'R', '222', '20210010103', ''],
  ['Zoe', 142, 'Zoe', 'M', 'AP', 'R', '232', '20330010200', 'pick'],
  ['Zyra', 143, 'Zyra', 'SM', 'AP', 'R', '222', '21222000301', ''],
];

const ROLE_LETTERS: Record<string, Role> = { T: 'TOP', J: 'JUNGLE', M: 'MIDDLE', B: 'BOTTOM', S: 'UTILITY' };

function parseRow(row: Row): ChampionTraits {
  const [id, key, name, roles, damage, range, curve, stats, tags] = row;
  if (curve.length !== 3 || stats.length !== 11) {
    throw new Error(`Invalid champion row for ${id}`);
  }
  const s = stats.split('').map(Number);
  return {
    id,
    key,
    name,
    roles: roles.split('').map((l) => ROLE_LETTERS[l]),
    damage,
    range,
    early: Number(curve[0]),
    mid: Number(curve[1]),
    late: Number(curve[2]),
    cc: s[0],
    engage: s[1],
    poke: s[2],
    burst: s[3],
    dps: s[4],
    tank: s[5],
    mobility: s[6],
    sustain: s[7],
    waveclear: s[8],
    split: s[9],
    peel: s[10],
    tags: (tags ?? '').split(' ').filter(Boolean) as ChampionTag[],
  };
}

export const CURATED: ChampionTraits[] = ROWS.map(parseRow);

export function normalizeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const ALIASES: Record<string, string> = {
  wukong: 'monkeyking',
  nunuwillump: 'nunu',
  renataglasc: 'renata',
};

const byNormId = new Map<string, ChampionTraits>();
const byKey = new Map<number, ChampionTraits>();
for (const c of CURATED) {
  byNormId.set(normalizeId(c.id), c);
  byNormId.set(normalizeId(c.name), c);
  byKey.set(c.key, c);
}

export function findCurated(idOrName: string): ChampionTraits | undefined {
  const n = normalizeId(idOrName);
  return byNormId.get(ALIASES[n] ?? n);
}

export function findCuratedByKey(key: number): ChampionTraits | undefined {
  return byKey.get(key);
}

/** Rough traits for champions not in the curated table, based on Data Dragon class tags. */
export function estimateTraits(info: ChampionInfo): ChampionTraits {
  const t = new Set(info.ddTags);
  const ranged = t.has('Marksman') || (t.has('Mage') && !t.has('Fighter') && !t.has('Tank'));
  const base: ChampionTraits = {
    id: info.id,
    key: info.key,
    name: info.name,
    roles: [],
    damage: t.has('Mage') || (t.has('Support') && !t.has('Marksman')) ? 'AP' : 'AD',
    range: ranged ? 'R' : 'M',
    early: 2,
    mid: 2,
    late: 2,
    cc: 1,
    engage: 1,
    poke: 1,
    burst: 1,
    dps: 1,
    tank: 1,
    mobility: 1,
    sustain: 1,
    waveclear: 2,
    split: 1,
    peel: 1,
    tags: [],
    estimated: true,
  };
  if (t.has('Tank')) Object.assign(base, { tank: 3, cc: 3, engage: 2, peel: 2, dps: 0, burst: 0 });
  if (t.has('Fighter')) Object.assign(base, { dps: 2, sustain: 2, split: 2, tank: Math.max(base.tank, 1) });
  if (t.has('Assassin')) Object.assign(base, { burst: 3, mobility: 3, tank: 0 });
  if (t.has('Mage')) Object.assign(base, { burst: 2, poke: 2, waveclear: 3, cc: 2 });
  if (t.has('Marksman')) Object.assign(base, { dps: 3, early: 1, late: 3, tank: 0, waveclear: 2 });
  if (t.has('Support')) Object.assign(base, { peel: 3, dps: 0, waveclear: 0 });

  if (t.has('Marksman')) base.roles.push('BOTTOM');
  if (t.has('Support')) base.roles.push('UTILITY');
  if (t.has('Mage') || t.has('Assassin')) base.roles.push('MIDDLE');
  if (t.has('Fighter') || t.has('Tank')) base.roles.push('TOP', 'JUNGLE');
  if (base.roles.length === 0) base.roles.push('MIDDLE');
  return base;
}
