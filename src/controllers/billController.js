/**
 * Voice → Bill controller (single-file, DB-free, LLM-optimized)
 * ------------------------------------------------------------------
 * - Assumes ONLY DEFAULT_MENU_ITEMS (no DB).
 * - Tries deterministic fuzzy parsing first (₹0).
 * - Falls back to Gemini 1.5 Flash with ultra-compact prompt (very low cost).
 * - LLM returns only { id, qty } against a short ID catalog to minimize tokens.
 * - All totals/prices are computed deterministically in code (no LLM math).
 * - In-memory storage for bills & menu endpoints preserved for easy testing.
 *
 * ENV:
 *   GEMINI_API_KEY=...
 *   ENABLE_GEMINI_BILLING=true|false   (optional, default true)
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// ------------------------------
// Config & LLM init
// ------------------------------
const ENABLE_GEMINI_BILLING = true; // Force-enable LLM usage
const MODEL_NAME = 'gemini-1.5-flash';
const PRICING_PER_MTOKENS_USD = {
  [MODEL_NAME]: {
    input: parseFloat(process.env.GEMINI_FLASH_INPUT_PER_MTOKENS_USD || '0'),
    output: parseFloat(process.env.GEMINI_FLASH_OUTPUT_PER_MTOKENS_USD || '0')
  }
};
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// ------------------------------
// In-memory persistence (no DB)
// ------------------------------
const BILLS = []; // simple store for demo
const nowISO = () => new Date().toISOString();
const rndId = () =>
  (Date.now().toString(16) + Math.random().toString(16).slice(2, 10)).slice(0, 24);

// ------------------------------
// Hardcoded Indian hotel menu items
// ------------------------------
const DEFAULT_MENU_ITEMS = [
  // ✅ DOSAS
  { name: 'Plain Dosa', tamilName: 'பிளைன் தோசை', price: 30, category: 'breakfast', unit: 'piece' },
  { name: 'Kal Dosa (2 pcs)', tamilName: 'கல் தோசை (2)', price: 40, category: 'breakfast', unit: 'piece' },
  { name: 'Set Dosa (1 pcs)', tamilName: 'செட் தோசை', price: 40, category: 'breakfast', unit: 'piece' },
  { name: 'Ghee Dosa', tamilName: 'நெய் தோசை', price: 50, category: 'breakfast', unit: 'piece' },
  { name: 'Masala Dosa', tamilName: 'மசாலா தோசை', price: 60, category: 'breakfast', unit: 'piece' },
  { name: 'Ghee Masala Dosa', tamilName: 'நெய் மசாலா தோசை', price: 80, category: 'breakfast', unit: 'piece' },
  { name: 'Onion Dosa', tamilName: 'வெங்காய தோசை', price: 50, category: 'breakfast', unit: 'piece' },
  { name: 'Onion Uthappam', tamilName: 'வெங்காய ஊத்தாப்பம்', price: 60, category: 'breakfast', unit: 'piece' },
  { name: 'Egg Dosa', tamilName: 'முட்டை தோசை', price: 50, category: 'breakfast', unit: 'piece' },
  { name: 'Egg Masala Dosa', tamilName: 'முட்டை மசாலா தோசை', price: 80, category: 'breakfast', unit: 'piece' },
  { name: 'Podi Dosa', tamilName: 'பொடி தோசை', price: 50, category: 'breakfast', unit: 'piece' },
  { name: 'Masala Podi Dosa', tamilName: 'மசாலா பொடி தோசை', price: 60, category: 'breakfast', unit: 'piece' },
  { name: 'Ghee Podi Dosa', tamilName: 'நெய் பொடி தோசை', price: 70, category: 'breakfast', unit: 'piece' },
  { name: 'Chicken Dosa', tamilName: 'சிக்கன் தோசை', price: 80, category: 'breakfast', unit: 'piece' },
  { name: 'Chicken Keema Dosa', tamilName: 'சிக்கன் கீமா தோசை', price: 100, category: 'breakfast', unit: 'piece' },
  { name: 'Liver Dosa', tamilName: 'கல்லீரல் தோசை', price: 100, category: 'breakfast', unit: 'piece' },

  // ✅ BREADS
  { name: 'Chapathi (2 pcs)', tamilName: 'சப்பாத்தி', price: 35, category: 'lunch', unit: 'piece' },
  { name: 'Egg Chapathi', tamilName: 'முட்டை சப்பாத்தி', price: 40, category: 'lunch', unit: 'piece' },
  { name: 'Parotta (2 pcs)', tamilName: 'பரோட்டா', price: 40, category: 'lunch', unit: 'piece' },
  { name: 'Egg Parotta', tamilName: 'முட்டை பரோட்டா', price: 40, category: 'lunch', unit: 'piece' },
  { name: 'Veg Kothu Parotta', tamilName: 'காய்கறி கொத்து பரோட்டா', price: 60, category: 'lunch', unit: 'plate' },
  { name: 'Egg Kothu Parotta', tamilName: 'முட்டை கொத்து பரோட்டா', price: 60, category: 'lunch', unit: 'plate' },
  { name: 'Chicken Kothu Parotta', tamilName: 'சிக்கன் கொத்து பரோட்டா', price: 100, category: 'lunch', unit: 'plate' },
  { name: 'Liver Kothu Parotta', tamilName: 'கல்லீரல் கொத்து பரோட்டா', price: 120, category: 'lunch', unit: 'plate' },

  // ✅ IDLY & VADA
  { name: 'Idly (4 pcs)', tamilName: 'இட்லி', price: 40, category: 'breakfast', unit: 'piece' },
  { name: 'Podi Idly', tamilName: 'பொடி இட்லி', price: 60, category: 'breakfast', unit: 'plate' },
  { name: 'Onion Idly', tamilName: 'வெங்காய இட்லி', price: 60, category: 'breakfast', unit: 'plate' },
  { name: 'Methu Vada', tamilName: 'மேது வடை', price: 10, category: 'breakfast', unit: 'piece' },

  // ✅ EGG ITEMS
  { name: 'Omelette', tamilName: 'ஆம்லெட்', price: 20, category: 'snacks', unit: 'piece' },
  { name: 'Double Omelette', tamilName: 'டபுள் ஆம்லெட்', price: 40, category: 'snacks', unit: 'piece' },
  { name: 'Half Boil', tamilName: 'ஹாஃப் போயில்', price: 20, category: 'snacks', unit: 'piece' },
  { name: 'Full Boil', tamilName: 'புல் போயில்', price: 20, category: 'snacks', unit: 'piece' },
  { name: 'Kalakki', tamilName: 'கலகி', price: 40, category: 'snacks', unit: 'piece' },
  { name: 'Egg Pepper', tamilName: 'முட்டை மிளகு', price: 40, category: 'snacks', unit: 'piece' },
  { name: 'Egg Masala', tamilName: 'முட்டை மசாலா', price: 60, category: 'snacks', unit: 'plate' },

  // ✅ KEBAB
  { name: 'Kebab 100 gms', tamilName: 'கெபாப் 100 கிராம்', price: 60, category: 'starters', unit: 'plate' },
  { name: 'Kebab 250 gms', tamilName: 'கெபாப் 250 கிராம்', price: 120, category: 'starters', unit: 'plate' },

  // ✅ RICE & NOODLES
  { name: 'Veg Fried Rice', tamilName: 'வெஜ் பிரைட் ரைஸ்', price: 60, category: 'lunch', unit: 'plate' },
  { name: 'Egg Fried Rice', tamilName: 'முட்டை பிரைட் ரைஸ்', price: 70, category: 'lunch', unit: 'plate' },
  { name: 'Double Egg Fried Rice', tamilName: 'டபுள் முட்டை பிரைட் ரைஸ்', price: 80, category: 'lunch', unit: 'plate' },
  { name: 'Gobi Fried Rice', tamilName: 'கோபி பிரைட் ரைஸ்', price: 70, category: 'lunch', unit: 'plate' },
  { name: 'Mushroom Fried Rice', tamilName: 'காளான் பிரைட் ரைஸ்', price: 90, category: 'lunch', unit: 'plate' },
  { name: 'Chicken Fried Rice', tamilName: 'சிக்கன் பிரைட் ரைஸ்', price: 100, category: 'lunch', unit: 'plate' },
  { name: 'Paneer Fried Rice', tamilName: 'பனீர் பிரைட் ரைஸ்', price: 100, category: 'lunch', unit: 'plate' },
  { name: 'Pepper Fried Rice', tamilName: 'மிளகு பிரைட் ரைஸ்', price: 100, category: 'lunch', unit: 'plate' },
  { name: 'Liver Fried Rice', tamilName: 'கல்லீரல் பிரைட் ரைஸ்', price: 120, category: 'lunch', unit: 'plate' },

  // ✅ BIRYANI
  { name: 'Chicken Biryani', tamilName: 'சிக்கன் பிரியாணி', price: 120, category: 'lunch', unit: 'plate' },
  { name: 'Kuska', tamilName: 'குஸ்கா', price: 60, category: 'lunch', unit: 'plate' },

  // ✅ VEG GRAVY
  { name: 'Gobi Manchurian', tamilName: 'கோபி மஞ்சூரியன்', price: 60, category: 'gravy', unit: 'plate' },
  { name: 'Gobi Chilli', tamilName: 'கோபி சில்லி', price: 70, category: 'gravy', unit: 'plate' },
  { name: 'Gobi Pepper', tamilName: 'கோபி மிளகு', price: 70, category: 'gravy', unit: 'plate' },
  { name: 'Paneer Manchurian', tamilName: 'பனீர் மஞ்சூரியன்', price: 120, category: 'gravy', unit: 'plate' },
  { name: 'Chilli Paneer', tamilName: 'சில்லி பனீர்', price: 120, category: 'gravy', unit: 'plate' },
  { name: 'Pepper Paneer', tamilName: 'மிளகு பனீர்', price: 120, category: 'gravy', unit: 'plate' },
  { name: 'Mushroom Chilli', tamilName: 'காளான் சில்லி', price: 100, category: 'gravy', unit: 'plate' },
  { name: 'Mushroom Manchurian', tamilName: 'காளான் மஞ்சூரியன்', price: 100, category: 'gravy', unit: 'plate' },
  { name: 'Mushroom Pepper', tamilName: 'காளான் மிளகு', price: 100, category: 'gravy', unit: 'plate' },

  // ✅ NON-VEG GRAVY
  { name: 'Chicken Manchurian', tamilName: 'சிக்கன் மஞ்சூரியன்', price: 120, category: 'gravy', unit: 'plate' },
  { name: 'Chilli Chicken', tamilName: 'சில்லி சிக்கன்', price: 120, category: 'gravy', unit: 'plate' },
  { name: 'Pepper Chicken', tamilName: 'மிளகு சிக்கன்', price: 120, category: 'gravy', unit: 'plate' },
  { name: 'Chettinad Chicken', tamilName: 'செட்டிநாடு சிக்கன்', price: 120, category: 'gravy', unit: 'plate' },
  { name: 'Liver Fry', tamilName: 'கல்லீரல் வறுவல்', price: 50, category: 'gravy', unit: 'plate' }
];

// ------------------------------
// Deterministic Tamil mapping helpers (free path first)
// ------------------------------
const TAMIL_NUMBER_MAP = new Map([
  ['ஓர்', 1], ['ஒரு', 1],
  ['இரண்டு', 2], ['ரெண்டு', 2],
  ['மூன்று', 3], ['மூணு', 3],
  ['நான்கு', 4], ['நாலு', 4],
  ['ஐந்து', 5],
  ['ஆறு', 6], ['ஆரு', 6],
  ['ஏழு', 7],
  ['எட்டு', 8],
  ['ஒன்பது', 9],
  ['பத்து', 10]
]);

const QUALIFIER_SKIP = {
  'Plain Dosa': [/(மசாலா|மசால்|நெய்|egg|முட்டை|masala|ghee)/iu],
  'Parotta (2 pcs)': [/(கொத்து|kothu|egg|முட்டை|chicken|சிக்கன்)/iu]
};

function getSynonymPatterns() {
  return new Map([
    ['Veg Kothu Parotta', [
      /(கொத்து|குத்து|கோத்து|கொத்த)\s*பரோட்டா/iu,
      /kothu\s*parotta/iu, /kothu\s*parota/iu, /kuthu\s*parotta/iu, /kothu\s*barotta/iu, /kothu\s*porotta/iu
    ]],
    ['Egg Kothu Parotta', [
      /முட்டை\s*(கொத்து|குத்து|கோத்து|கொத்த)\s*(பரோட்டா)?/iu,
      /((ஏ|எ)க்|எக|ஏக்க)\s*(கொத்து|குத்து|கோத்து|கொத்த)\s*(பரோட்டா)?/iu,
      /அண்ட(ு)?\s*(கொத்து|குத்து|கோத்து|கொத்த)\s*(பரோட்டா)?/iu,
      /egg\s*(kothu|kuthu|koththu)\s*(parotta|parota|porotta|barotta)?/iu
    ]],
    ['Chicken Kothu Parotta', [
      /சிக்கன்\s*(கொத்து|குத்து|கோத்து|கொத்த)\s*(பரோட்டா)?/iu,
      /chicken\s*(kothu|kuthu|koththu)\s*(parotta|parota|porotta|barotta)?/iu
    ]],
    ['Set Dosa (1 pcs)', [/செட்\s*தோசை/iu, /set\s*dosa/iu, /set\s*dosai/iu]],
    ['Ghee Dosa', [/நெய்\s*தோசை/iu, /ghee\s*dosa/iu]],
    ['Masala Dosa', [/மசா(ல|ல்)ா\s*தோசை/iu, /masala\s*dosa/iu, /\bm\s*dosa\b/iu]],
    ['Egg Dosa', [/முட்டை\s*தோசை/iu, /egg\s*dosa/iu, /((ஏ|எ)க்).{0,12}தோசை/iu]],
    ['Plain Dosa', [/தோசை/iu, /\bdosa\b/iu, /\bdosai\b/iu]],
    ['Parotta (2 pcs)', [/ப(ு|)ரோட்டா/iu, /\bparotta\b/iu, /\bparota\b/iu, /\bbarotta\b/iu, /\bporotta\b/iu]],
    ['Kalakki', [/கலக்கி/iu, /kalakki/iu]],
    ['Omelette', [/ஆம்லெட்/iu, /omelette?/iu, /omlette/iu, /omlet/iu]],
    ['Idly (4 pcs)', [/இட்லி/iu, /\bidli\b/iu, /\bidly\b/iu, /\bitly\b/iu]],
    ['Chicken Biryani', [/சிக்கன்\s*பிரியாணி/iu, /chicken\s*biryani/iu]]
  ]);
}

function preprocessText(input) {
  return (input || '')
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[.,;:!?()\[\]{}"'`~@#%^*&_=+<>/\\|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectQuantityNear(text, matchStartIndex, usedRanges) {
  const MAX_BEFORE = 14;
  const MAX_AFTER = 10;
  const windowStart = Math.max(0, matchStartIndex - MAX_BEFORE);
  const windowEnd = Math.min(text.length, matchStartIndex + MAX_AFTER);
  const beforeTextFull = text.slice(windowStart, matchStartIndex);
  const afterTextFull = text.slice(matchStartIndex, windowEnd);

  const tamilNumberWords = Array.from(TAMIL_NUMBER_MAP.keys()).sort((a, b) => b.length - a.length);

  const isUnused = (s, e) => !usedRanges.some(r => !(e <= r.start || s >= r.end));

  // 1) Numbers before the item
  const beforeNum = beforeTextFull.match(/(\d+)\s*$/);
  if (beforeNum) {
    const numStart = matchStartIndex - beforeNum[0].length;
    const numEnd = matchStartIndex;
    const parsed = parseInt(beforeNum[1], 10);
    if (!Number.isNaN(parsed) && parsed > 0 && isUnused(numStart, numEnd)) {
      return { quantity: parsed, start: numStart, end: numEnd };
    }
  }

  // 2) Tamil words before
  for (const word of tamilNumberWords) {
    const re = new RegExp(word + '\\s*$', 'iu');
    const m = beforeTextFull.match(re);
    if (m) {
      const numStart = matchStartIndex - m[0].length;
      const numEnd = matchStartIndex;
      if (isUnused(numStart, numEnd)) {
        return { quantity: TAMIL_NUMBER_MAP.get(word), start: numStart, end: numEnd };
      }
    }
  }

  // 3) Numbers after
  const afterNum = afterTextFull.match(/^\s*(\d+)/);
  if (afterNum) {
    const numStart = matchStartIndex + afterTextFull.indexOf(afterNum[1]);
    const numEnd = numStart + afterNum[1].length;
    const parsed = parseInt(afterNum[1], 10);
    if (!Number.isNaN(parsed) && parsed > 0 && isUnused(numStart, numEnd)) {
      return { quantity: parsed, start: numStart, end: numEnd };
    }
  }

  // 4) Tamil words after
  for (const word of tamilNumberWords) {
    const re = new RegExp('^\\s*' + word, 'iu');
    const m = afterTextFull.match(re);
    if (m) {
      const s = matchStartIndex + afterTextFull.indexOf(m[0]);
      const e = s + m[0].length;
      if (isUnused(s, e)) {
        return { quantity: TAMIL_NUMBER_MAP.get(word), start: s, end: e };
      }
    }
  }

  return { quantity: 1, start: -1, end: -1 };
}

function buildMenuResolver(menuItems) {
  const contains = (s, re) => re.test((s || '').toLowerCase());
  const by = (predicate) => menuItems.find(predicate);
  const has = (item, re) => contains(item.name, re) || contains(item.tamilName || '', re);
  return function resolve(aliasKey) {
    switch (aliasKey) {
      case 'Veg Kothu Parotta':
        return by(item => has(item, /kothu\s*parotta/i) && !has(item, /egg|chicken/i));
      case 'Egg Kothu Parotta':
        return by(item => has(item, /egg/i) && has(item, /kothu\s*parotta/i));
      case 'Chicken Kothu Parotta':
        return by(item => has(item, /chicken/i) && has(item, /kothu\s*parotta/i));
      case 'Set Dosa (1 pcs)':
        return by(item => has(item, /set\s*dosa/i));
      case 'Ghee Dosa':
        return by(item => has(item, /ghee\s*dosa/i) || has(item, /நெய்\s*தோசை/i));
      case 'Masala Dosa':
        return by(item => has(item, /masala\s*dosa/i) || has(item, /மசாலா\s*தோசை/i));
      case 'Egg Dosa':
        return by(item => has(item, /egg\s*dosa/i) || has(item, /முட்டை\s*தோசை/i));
      case 'Plain Dosa':
        return by(item => has(item, /\bdosa\b/i) && !has(item, /masala|ghee|onion|egg|uthappam|set|kal/i) && !has(item, /மசாலா|நெய்|வெங்காய|முட்டை|செட்/i));
      case 'Parotta (2 pcs)':
        return by(item => has(item, /parotta|parota/i) && !has(item, /kothu|egg|chicken/i));
      case 'Kalakki':
        return by(item => has(item, /kalakki/i) || has(item, /கலகி/i));
      case 'Omelette':
        return by(item => has(item, /omelet/i) || has(item, /ஆம்லெட்/i));
      case 'Idly (4 pcs)':
        return by(item => has(item, /idli|idly/i) || has(item, /இட்லி/i));
      case 'Chicken Biryani':
        return by(item => has(item, /chicken/i) && has(item, /biryani|பிரியாணி/i));
      default:
        return undefined;
    }
  };
}

function parseOrderWithFuzzyMap(voiceInputText, menuItems) {
  if (!voiceInputText || typeof voiceInputText !== 'string') return [];
  const text = preprocessText(voiceInputText);
  if (!text) return [];

  const patternsMap = getSynonymPatterns();
  const resolve = buildMenuResolver(menuItems);

  const orderMap = new Map();
  const usedRanges = [];

  for (const [aliasKey, patternList] of patternsMap.entries()) {
    for (const pat of patternList) {
      const regex = pat.global ? pat : new RegExp(pat.source, pat.flags + 'g');
      let match;
      while ((match = regex.exec(text)) !== null) {
        const skipQualifiers = QUALIFIER_SKIP[aliasKey];
        if (skipQualifiers && Array.isArray(skipQualifiers)) {
          const windowStart = Math.max(0, match.index - 16);
          const windowText = text.slice(windowStart, match.index);
          const shouldSkip = skipQualifiers.some(re => re.test(windowText));
          if (shouldSkip) continue;
        }

        const { quantity, start, end } = detectQuantityNear(text, match.index, usedRanges);
        if (start >= 0 && end > start) usedRanges.push({ start, end });
        orderMap.set(aliasKey, (orderMap.get(aliasKey) || 0) + quantity);
      }
    }
  }

  const items = [];
  for (const [aliasKey, quantity] of orderMap.entries()) {
    const menuItem = resolve(aliasKey);
    if (!menuItem) continue;
    const unitPrice = menuItem.price;
    const totalPrice = unitPrice * quantity;
    items.push({ itemName: menuItem.name, quantity, unitPrice, totalPrice });
  }
  return items;
}

// Legacy deterministic (kept as a second free parser; simplified to reuse fuzzy)
function parseTamilOrderToItems(voiceInputText, menuItems) {
  return parseOrderWithFuzzyMap(voiceInputText, menuItems);
}

// ------------------------------
// Ultra-low-token LLM fallback
// ------------------------------

// Build compact catalog with short IDs to minimize tokens
const MENU_CATALOG = (() => {
  const list = DEFAULT_MENU_ITEMS.map((it, i) => ({
    id: 'M' + i.toString(36), // short id
    name: it.name,
    ta: it.tamilName || '',
    price: it.price,
    unit: it.unit,
    category: it.category
  }));
  const byId = new Map(list.map(x => [x.id, x]));
  const byName = new Map(list.map(x => [x.name.toLowerCase(), x]));
  return { list, byId, byName };
})();

// Very small, deterministic JSON schema for LLM output
// { processed: string, lines: [{ id: "M1", qty: number }] }
async function llmParseToIds(voiceInput) {
  if (!genAI) {
    console.warn('⚠️ GEMINI_API_KEY not set; skipping LLM fallback.');
    return null;
  }

  const catalogLines = MENU_CATALOG.list
    .map(x => `${x.id}|${x.name}|${x.ta}`)
    .join('\n');

  const prompt =
`TASK: Convert noisy Tamil/English speech text to bill items by MENU ID.
MENU (id|en|ta):
${catalogLines}

RULES:
- Return ONLY JSON: {"processed":string,"lines":[{"id":string,"qty":number}]}
- Map slang/misspellings/accents (Tamil+Tanglish) to the closest menu item ID.
- Quantities can be digits or Tamil words (ஒரு, ரெண்டு, மூணு, நாலு...).
- Treat "Parotta" as "Parotta (2 pcs)" unless kothu/egg/chicken is said.
- If dosa has qualifiers (masala/ghee/egg), pick that specific item; else Plain Dosa.
- If idly is mentioned, default to "Idly (4 pcs)".
- Ignore anything not in MENU. Do not invent items.
- If the same item is repeated, sum quantities.
- Keep processed as a clean human-readable summary string.

TEXT:
"""${voiceInput}"""`;

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 256
    }
  });

  // ------- usage metrics & response text -------
  let text = '';
  const usage = (result && result.response && result.response.usageMetadata)
    || (result && result.usageMetadata)
    || {};
  const toInt = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const promptTokens = toInt(usage.promptTokenCount ?? usage.inputTokenCount);
  const outputTokens = toInt(usage.candidatesTokenCount ?? usage.outputTokenCount);
  const totalTokens = toInt(usage.totalTokenCount ?? ((promptTokens || 0) + (outputTokens || 0)));
  const pricing = PRICING_PER_MTOKENS_USD[MODEL_NAME] || { input: 0, output: 0 };
  const estimatedCostUsd = Number((((promptTokens || 0) * pricing.input + (outputTokens || 0) * pricing.output) / 1_000_000).toFixed(6));
  try {
    text = result.response.text();
  } catch {
    // Older SDKs
    text = (await result.response)?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  // Defensive un-fencing
  if (!text) return null;
  if (text.includes('```')) {
    text = text.replace(/```json\s*|```/g, '').trim();
  }
  // Extract JSON
  const match = text.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : text;
  try {
    const obj = JSON.parse(jsonStr);
    if (!obj || !Array.isArray(obj.lines)) return null;
    // sanitize
    const lines = obj.lines
      .filter(l => l && typeof l.id === 'string' && Number.isFinite(l.qty))
      .map(l => ({ id: l.id.trim(), qty: Math.max(1, Math.floor(l.qty)) }));
    const metrics = {
      model: MODEL_NAME,
      promptTokens: promptTokens ?? null,
      outputTokens: outputTokens ?? null,
      totalTokens: totalTokens ?? null,
      estimatedCostUsd,
      pricingPerMTokensUsd: { input: pricing.input, output: pricing.output }
    };
    if (metrics.totalTokens != null) {
      console.log(`🤖 Gemini usage → in: ${metrics.promptTokens || 0}, out: ${metrics.outputTokens || 0}, total: ${metrics.totalTokens || 0}, est. cost: $${metrics.estimatedCostUsd}`);
    }
    return { processed: String(obj.processed || '').slice(0, 300), lines, metrics };
  } catch {
    return null;
  }
}

// Cache LLM results per normalized input to save cost on repeats
const LLM_CACHE = new Map(); // key: normalized input, value: {processed, lines}
function cacheKeyFromInput(s) {
  return preprocessText((s || '').toLowerCase());
}

// ------------------------------
// Public endpoints
// ------------------------------
const initializeMenu = async () => {
  // No-op; menu is in-memory by DEFAULT_MENU_ITEMS
  console.log('✅ Default menu items loaded in-memory:', DEFAULT_MENU_ITEMS.length);
};

const generateBillFromVoice = async (req, res) => {
  try {
    const { voiceInput } = req.body || {};
    if (!voiceInput || typeof voiceInput !== 'string' || !voiceInput.trim()) {
      return res.status(400).json({
        error: 'Voice input required',
        message: 'Please provide the voice input text'
      });
    }

    const mergedMenuItems = DEFAULT_MENU_ITEMS; // only default menu

    // ---- LLM-only path -----
    const key = cacheKeyFromInput(voiceInput);
    let parsed = LLM_CACHE.get(key);
    if (!parsed) {
      parsed = await llmParseToIds(voiceInput);
      if (parsed) LLM_CACHE.set(key, parsed);
    }

    if (!parsed || !parsed.lines || parsed.lines.length === 0) {
      return res.status(422).json({
        success: false,
        error: 'Unrecognized order',
        message: 'Could not map voice input to any known menu items.'
      });
    }

    const processedText = parsed.processed || '';
    const usageMetrics = parsed.metrics || null;

    // Map IDs to actual items & compute totals deterministically
    const agg = new Map();
    for (const { id, qty } of parsed.lines) {
      const cat = MENU_CATALOG.byId.get(id);
      if (!cat) continue;
      const k = cat.name;
      agg.set(k, (agg.get(k) || 0) + qty);
    }
    const items = [];
    for (const [itemName, quantity] of agg.entries()) {
      const menuItem = mergedMenuItems.find(m => m.name === itemName);
      if (!menuItem) continue;
      const unitPrice = menuItem.price;
      const totalPrice = unitPrice * quantity;
      items.push({ itemName, quantity, unitPrice, totalPrice });
    }

    const subtotal = items.reduce((sum, it) => sum + it.totalPrice, 0);
    const tax = 0;
    const total = subtotal + tax;

    const bill = {
      _id: rndId(),
      voiceInput,
      processedText,
      items,
      subtotal,
      tax,
      total,
      usage: usageMetrics,
      createdAt: nowISO()
    };

    // Save in memory
    BILLS.unshift(bill);

    return res.status(201).json({
      success: true,
      message: 'Bill generated successfully',
      bill,
      usage: usageMetrics
    });
  } catch (error) {
    console.error('❌ Error generating bill:', error);
    if ((error.message || '').includes('Invalid bill structure')) {
      return res.status(500).json({
        error: 'AI processing error',
        message: 'Failed to process voice input. Please try again with clearer speech.'
      });
    }
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate bill. Please try again.'
    });
  }
};

const getAllBills = async (req, res) => {
  try {
    return res.json({ success: true, count: BILLS.length, bills: BILLS });
  } catch (error) {
    console.error('❌ Error fetching bills:', error);
    return res.status(500).json({ error: 'Internal server error', message: 'Failed to fetch bills' });
  }
};

const getBillById = async (req, res) => {
  try {
    const bill = BILLS.find(b => b._id === req.params.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found', message: 'The requested bill does not exist' });
    }
    return res.json({ success: true, bill });
  } catch (error) {
    console.error('❌ Error fetching bill:', error);
    return res.status(500).json({ error: 'Internal server error', message: 'Failed to fetch bill' });
  }
};

const getAllMenuItems = async (req, res) => {
  try {
    // Return catalog with IDs (handy for client UI), plus full menu
    return res.json({
      success: true,
      count: DEFAULT_MENU_ITEMS.length,
      menuItems: DEFAULT_MENU_ITEMS,
      catalog: MENU_CATALOG.list // id|name|ta|price
    });
  } catch (error) {
    console.error('❌ Error fetching menu items:', error);
    return res.status(500).json({ error: 'Internal server error', message: 'Failed to fetch menu items' });
  }
};

// The following CRUD endpoints are no-ops or simple in-memory
const addMenuItem = async (req, res) => {
  return res.status(400).json({
    error: 'Not supported',
    message: 'Menu is fixed in this build (DEFAULT_MENU_ONLY)'
  });
};
const updateMenuItem = async (req, res) => {
  return res.status(400).json({
    error: 'Not supported',
    message: 'Menu is fixed in this build (DEFAULT_MENU_ONLY)'
  });
};
const deleteMenuItem = async (req, res) => {
  return res.status(400).json({
    error: 'Not supported',
    message: 'Menu is fixed in this build (DEFAULT_MENU_ONLY)'
  });
};

module.exports = {
  generateBillFromVoice,
  getAllBills,
  getBillById,
  getAllMenuItems,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  initializeMenu
};
