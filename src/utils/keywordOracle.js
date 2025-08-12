// src/utils/keywordOracle.js
// GoblinBox Keyword Oracle — seeds a new nest with smart starter keywords.

const STOPWORDS = new Set([
  'the','and','for','with','from','this','that','those','these','into','onto','over','under','about',
  'your','my','our','of','in','on','to','a','an','is','are','be','as','at','by','it','me','you',
  'box','nest','list','things','stuff','misc','notes','journal'
]);

const COLOR_MAP = {
  red:['scarlet','crimson','berry','warm','passion'],
  blue:['navy','indigo','azure','calm','ocean'],
  green:['moss','forest','fern','herbal','earthy'],
  purple:['violet','amethyst','royal','mystic'],
  pink:['rose','blush','soft','cute'],
  black:['noir','void','shadow','goth'],
  white:['pearl','milk','clean','minimal'],
  brown:['wood','oak','soil','cozy'],
  gold:['gilded','metallic','lux','warm'],
  silver:['chrome','lunar','reflective','cool'],
  orange:['copper','autumn','spice','bright'],
  yellow:['sun','honey','lemon','cheer']
};

const EMOJI_MAP = {
  '🌙':['moon','night','lunar','ritual','tarot'],
  '🔮':['divination','scry','seer','crystal'],
  '🧠':['brain','dopamine','neuro','focus','adhd'],
  '🍄':['mushroom','fungus','mycelium','forest'],
  '🌿':['herb','plant','green','garden'],
  '🔥':['fire','candle','burn','ritual','energy'],
  '💻':['code','terminal','script','debug','linux'],
  '🧵':['yarn','crochet','knit','fiber','pattern'],
  '🎮':['gaming','steam','quest','build'],
  '🕯️':['candle','altar','ritual','scent'],
  '🪙':['crypto','coin','wallet','defi','sol','eth','btc'],
  '🕊️':['pigeon','bird','seed','rooftop'],
  '🧪':['experiment','lab','test','tweak'],
  '☕':['coffee','brew','caffeine','morning'],
  '🍵':['tea','steep','herbal','calm']
};

const THESAURUS = {
  witch:['ritual','spell','altar','herbs','sigil','coven','tarot','lunar'],
  occult:['esoteric','arcana','symbol','divination','sigil'],
  ritual:['altar','candle','incense','invocation'],
  shadow:['subconscious','depth','integration','inner','dream'],
  goblin:['goblincore','trinket','hoard','moss','shiny','feral'],
  feral:['wild','howl','fang','claw','untamed','liminal'],
  liminal:['threshold','between','twilight','edge'],
  snack:['recipe','bake','crunch','salty','sweet','pantry'],
  recipe:['cook','measure','stir','oven','ingredients'],
  code:['script','function','debug','commit','refactor'],
  terminal:['shell','cli','bash','zsh'],
  linux:['kernel','distro','package','apt','mint','popos'],
  adhd:['dopamine','focus','routine','timer','checklist','habit'],
  executive:['planning','prioritize','routine','structure'],
  journal:['entry','prompt','reflection','quote','notebook'],
  write:['draft','edit','line','prose','voice'],
  mushroom:['mycelium','fungus','cap','spore'],
  garden:['herb','soil','seed','sprout','pot'],
  pigeon:['seed','coo','rooftop','perch','feather'],
  crochet:['yarn','hook','pattern','gauge','stitch'],
  knit:['needle','purl','stitch','row'],
  game:['quest','loot','build','cozy','savefile'],
  crypto:['wallet','chain','eth','btc','sol','defi'],
  budget:['ledger','track','spend','save','envelope'],
  aesthetic:['moodboard','palette','texture','vibe'],
  romance:['longing','soft','tender','crush'],
  grief:['weight','ebb','memory','tide'],
  photo:['lens','frame','exposure','edit'],
  music:['loop','beat','mix','track','tempo']
};

function normalize(str='') {
  return str.toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu,'')
    .replace(/[^\p{Letter}\p{Number}\s:]/gu,' ')
    .replace(/\s+/g,' ')
    .trim();
}
function splitWords(str='') {
  return normalize(str).split(' ')
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}
function dedupe(arr) {
  const out=[]; const seen=new Set();
  for (const x of arr) { const k=x.toLowerCase(); if(!seen.has(k)){seen.add(k); out.push(x);} }
  return out;
}
function expandWord(w) { return [w, ...(THESAURUS[w]||[])]; }

const TOPIC_PACKS = [
  { name:'Witchy Things',
    triggers:['witch','occult','tarot','ritual','altar','sigil','coven','spell','moon','lunar','astrology','eclipse'],
    baseKeywords:['ritual','spell','altar','sigil','tarot','lunar','herbs','incense','candle','divination','scry'] },
  { name:'Goblincore',
    triggers:['goblin','goblincore','moss','trinket','hoard','feral','shiny'],
    baseKeywords:['moss','trinket','hoard','shiny','feral','stone','drawer','bauble'] },
  { name:'Snacks',
    triggers:['snack','food','recipe','kitchen','cook','bake','meal','brunch'],
    baseKeywords:['recipe','cook','bake','pantry','crunch','salty','sweet','spice'] },
  { name:'Coffee & Tea',
    triggers:['coffee','tea','latte','espresso','brew','steep'],
    baseKeywords:['brew','grind','steep','caffeine','mug','ritual'] },
  { name:'Tech / Code',
    triggers:['code','dev','developer','program','script','function','debug','commit','refactor','terminal','shell'],
    baseKeywords:['script','function','debug','commit','refactor','cli','terminal','snippet'] },
  { name:'Linux',
    triggers:['linux','kernel','distro','ubuntu','mint','popos','arch','gnome','bash','zsh'],
    baseKeywords:['package','apt','flatpak','driver','grub','shell','dotfiles'] },
  { name:'Cyber / Security',
    triggers:['hack','cyber','security','infosec','ctf'],
    baseKeywords:['threat','hash','cipher','token','key','payload'] },
  { name:'Gaming',
    triggers:['game','gaming','steam','switch','stardew','deck','cozy'],
    baseKeywords:['quest','loot','build','savefile','mod','farm'] },
  { name:'ADHD & Systems',
    triggers:['adhd','routine','focus','executive','habit','dopamine','planner'],
    baseKeywords:['checklist','timer','cue','trigger','reward','streak'] },
  { name:'Journaling / Writing',
    triggers:['journal','log','entry','write','poem','prose','draft','quote'],
    baseKeywords:['prompt','reflection','notebook','edit','voice','line'] },
  { name:'Metaphysics / Philosophy',
    triggers:['metaphys','philosoph','conscious','soul','meaning','symbol','ontology'],
    baseKeywords:['symbol','pattern','myth','archetype','resonance','field'] },
  { name:'Nature / Garden',
    triggers:['mushroom','garden','plant','herb','forest','moss','fern','green'],
    baseKeywords:['mycelium','spore','soil','sprout','compost','herbal'] },
  { name:'Birds / Pigeons',
    triggers:['pigeon','dove','bird','rooftop','seed','feather'],
    baseKeywords:['seed','perch','roost','coo','feather'] },
  { name:'Craft / Crochet',
    triggers:['crochet','knit','yarn','fiber','pattern','hook','needle'],
    baseKeywords:['stitch','gauge','row','skein','pattern','swatch'] },
  { name:'Aesthetic / Style',
    triggers:['aesthetic','vibe','palette','moodboard','style','fashion'],
    baseKeywords:['palette','texture','tone','contrast','composition'] },
  { name:'Romance / Tender',
    triggers:['love','romance','tender','soft','crush','devotion'],
    baseKeywords:['longing','soft','heart','touch','yearn'] },
  { name:'Parenting / Kids',
    triggers:['kid','child','toddler','school','play','bedtime'],
    baseKeywords:['routine','transition','game','calm','reward'] },
  { name:'Finance / Crypto',
    triggers:['budget','money','finance','wallet','crypto','eth','btc','sol','defi'],
    baseKeywords:['ledger','track','spend','save','coin','price','portfolio'] },
  { name:'Photography',
    triggers:['photo','photography','camera','lens','exposure','edit'],
    baseKeywords:['frame','expose','crop','preset','contrast','grain'] },
  { name:'Music / Audio',
    triggers:['music','audio','beat','mix','track','tempo','daw','lmms','hydrogen'],
    baseKeywords:['loop','sample','synth','drum','bpm','arrange'] },
];

function splitEmojis(raw='') {
  return Array.from(raw).filter((ch) => EMOJI_MAP[ch]);
}

function packsForName(rawName) {
  const name = normalize(rawName);
  const words = new Set(splitWords(rawName));
  const colors = Object.keys(COLOR_MAP).filter((c) => name.includes(c));
  const emojis = splitEmojis(rawName);

  const hits = [];
  for (const pack of TOPIC_PACKS) {
    if (pack.triggers.some((t) => name.includes(t))) hits.push(pack);
  }

  let kw = [];
  for (const pack of hits) kw.push(...pack.baseKeywords);
  for (const c of colors) kw.push(...COLOR_MAP[c]);
  for (const e of emojis) kw.push(...EMOJI_MAP[e]);
  words.forEach((w) => kw.push(...expandWord(w)));

  return dedupe(kw).slice(0, 24);
}

export function generateInitialKeywords(nestName) {
  const base = packsForName(nestName);
  if (base.length < 6) {
    const extras = splitWords(nestName)
      .flatMap((w) => expandWord(w))
      .filter((w) => !STOPWORDS.has(w));
    return dedupe([...base, ...extras]).slice(0, 16);
  }
  return base;
}
