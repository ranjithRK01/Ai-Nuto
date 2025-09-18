// Tamil and English menu fuzzy mapping utilities

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
  'Parotta (2 pcs)': [/(கொத்து|kothu|egg|முட்டை|((ஏ|எ)க்+)|ஏக்க|அண்டு|chicken|சிக்கன்)/iu]
};

// Synonym patterns for alias keys. Aim ~10+ variations across key items.
function getSynonymPatterns() {
  return new Map([
    ['Veg Kothu Parotta', [
      /(கொத்து|குத்து|கோத்து|கொத்த)\s*பரோட்டா/iu,
      /kothu\s*parotta/iu,
      /kothu\s*parota/iu,
      /kuthu\s*parotta/iu,
      /kothu\s*barotta/iu,
      /kothu\s*porotta/iu
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

    ['Set Dosa (1 pcs)', [
      /செட்\s*தோசை/iu,
      /set\s*dosa/iu,
      /set\s*dosai/iu
    ]],
    ['Ghee Dosa', [
      /நெய்\s*தோசை/iu,
      /ghee\s*dosa/iu
    ]],
    ['Masala Dosa', [
      /மசா(ல|ல்)ா\s*தோசை/iu,
      /masala\s*dosa/iu,
      /m\s*dosa/iu
    ]],
    ['Egg Dosa', [
      /முட்டை\s*தோசை/iu,
      /egg\s*dosa/iu,
      /((ஏ|எ)க்).{0,12}தோசை/iu
    ]],
    ['Plain Dosa', [
      /தோசை/iu,
      /\bdosa\b/iu,
      /\bdosai\b/iu
    ]],

    ['Parotta (2 pcs)', [
      /ப(ு|)ரோட்டா/iu,
      /\bparotta\b/iu,
      /\bparota\b/iu,
      /\bbarotta\b/iu,
      /\bporotta\b/iu
    ]],

    // Egg Parotta (non-kothu)
    ['Egg Parotta', [
      /(முட்டை|((ஏ|எ)க்+)|ஏக்க|அண்டு)\s*(உடன்|ஓடு|ஒடு|தோடு|த்தோடு|கூட)?\s*(பரோட்டா)/iu,
      /(egg)\s*(with)?\s*(parotta|parota|porotta|barotta)/iu,
      /(parotta|parota|porotta|barotta)\s*(with)?\s*(egg)/iu
    ]],

    ['Kalakki', [
      /கலக்கி/iu,
      /kalakki/iu
    ]],
    ['Omelette', [
      /ஆம்லெட்/iu,
      /omelette?/iu,
      /omlette/iu,
      /omlet/iu
    ]],
    ['Idly (4 pcs)', [
      /இட்லி/iu,
      /\bidli\b/iu,
      /\bidly\b/iu,
      /\bitly\b/iu
    ]],

    ['Chicken Biryani', [
      /சிக்கன்\s*பிரியாணி/iu,
      /chicken\s*biryani/iu
    ]],

    // Beverages & others
    ['Tea', [
      /டீ/iu,
      /tea/iu
    ]],
    ['Curd Rice', [
      /தயிர்\s*(சாதம்|சோறு|சா)?/iu,
      /curd\s*rice/iu
    ]]
  ]);
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

  // 1) Numbers before the item, adjacent-ish
  const beforeNum = beforeTextFull.match(/(\d+)\s*$/);
  if (beforeNum) {
    const numStart = matchStartIndex - beforeNum[0].length;
    const numEnd = matchStartIndex;
    const parsed = parseInt(beforeNum[1], 10);
    if (!Number.isNaN(parsed) && parsed > 0 && isUnused(numStart, numEnd)) {
      return { quantity: parsed, start: numStart, end: numEnd };
    }
  }

  // 2) Tamil words before the item
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

  // 3) Numbers after the item (very close)
  const afterNum = afterTextFull.match(/^\s*(\d+)/);
  if (afterNum) {
    const numStart = matchStartIndex + afterTextFull.indexOf(afterNum[1]);
    const numEnd = numStart + afterNum[1].length;
    const parsed = parseInt(afterNum[1], 10);
    if (!Number.isNaN(parsed) && parsed > 0 && isUnused(numStart, numEnd)) {
      return { quantity: parsed, start: numStart, end: numEnd };
    }
  }

  // 4) Tamil words after the item
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
  const contains = (s, re) => re.test(s);
  const english = (s) => (s || '').toLowerCase();
  const tamil = (s) => (s || '').toLowerCase();

  const by = (predicate) => menuItems.find(predicate);
  const has = (item, re) => contains(english(item.name), re) || contains(tamil(item.tamilName || ''), re);

  return function resolve(aliasKey) {
    const keyLower = (aliasKey || '').toLowerCase();
    // Prefer exact canonical name match if present
    const exact = menuItems.find(mi => (mi.name || '').toLowerCase() === keyLower);
    if (exact) return exact;
    switch (aliasKey) {
      case 'Egg Parotta':
        return by(item => has(item, /egg/i) && has(item, /parotta|parota|porotta|barotta/i));
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
      case 'Tea':
        return by(item => has(item, /\btea\b/i) || has(item, /டீ/i));
      case 'Curd Rice':
        return by(item => has(item, /curd\s*rice/i) || has(item, /தயிர்\s*(சாதம்|சோறு)/i));
      default:
        return undefined;
    }
  };
}

function preprocessText(input) {
  return (input || '')
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width chars
    .replace(/[.,;:!?()\[\]{}"'`~@#%^*&_=+<>/\\|-]+/g, ' ') // punctuation to space
    .replace(/\s+/g, ' ') // collapse spaces
    .trim();
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
          const windowStart = Math.max(0, match.index - 28);
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
    items.push({
      itemName: menuItem.name,
      quantity,
      unitPrice,
      totalPrice
    });
  }

  return items;
}

module.exports = {
  parseOrderWithFuzzyMap
};


